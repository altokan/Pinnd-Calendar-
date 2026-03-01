import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, parseISO 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Camera, 
  X, Save, Loader2, MapPin, Clock, Trash2, Edit3, 
  Briefcase, HeartPulse, Plane, PartyPopper, Dumbbell, Star, FileText, Bell, Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { collection, addDoc, updateDoc, query, where, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

// Maps
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet Icon Fix
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CATEGORIES = [
  { id: 'work', icon: Briefcase, label: 'Work', color: 'bg-blue-500' },
  { id: 'doctor', icon: HeartPulse, label: 'Doctor', color: 'bg-red-500' },
  { id: 'travel', icon: Plane, label: 'Travel', color: 'bg-amber-500' },
  { id: 'party', icon: PartyPopper, label: 'Party', color: 'bg-purple-500' },
  { id: 'gym', icon: Dumbbell, label: 'Gym', color: 'bg-emerald-500' },
  { id: 'other', icon: Star, label: 'Other', color: 'bg-stone-500' },
];

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pins, setPins] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('other');
  const [reminder, setReminder] = useState('none');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      let msg = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
      setGreeting(isWeekend ? `Happy Weekend, ${msg}` : msg);
    };
    updateGreeting();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pins'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleLocationChange = async (val: string) => {
    setLocation(val);
    if (val.length > 2) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    }
  };

  const openEditModal = (pin: any) => {
    setEditingId(pin.id); setTitle(pin.title); setTime(pin.time);
    setLocation(pin.location || ''); setLat(pin.lat || null); setLng(pin.lng || null);
    setNotes(pin.notes || ''); setCategory(pin.category || 'other'); setReminder(pin.reminder || 'none');
    setPreviewUrl(pin.imageUrl || null); setIsPreviewOpen(false); setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setTime('12:00'); setLocation('');
    setLat(null); setLng(null); setNotes(''); setCategory('other'); setReminder('none');
    setImageFile(null); setPreviewUrl(null); setIsModalOpen(false); setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Title is required');
    setLoading(true);
    const toastId = toast.loading("Saving...");
    try {
      let finalImageUrl = previewUrl || '';
      if (imageFile) {
        const imageRef = ref(storage, `pins/${user.uid}/${Date.now()}`);
        await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(imageRef);
      }
      const pinData = {
        title, time, location, lat, lng, notes, category, reminder,
        imageUrl: finalImageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        updatedAt: new Date(),
      };
      if (editingId) await updateDoc(doc(db, 'pins', editingId), { ...pinData, updatedAt: serverTimestamp() });
      else await addDoc(collection(db, 'pins'), { ...pinData, userId: user.uid, createdAt: serverTimestamp() });
      toast.success('Success!', { id: toastId }); resetForm();
    } catch (error) { toast.error("Error saving", { id: toastId }); }
    finally { setLoading(false); }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const selectedDayPins = pins.filter(p => p.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="w-full min-h-screen bg-stone-50/50 p-3 md:p-8 pb-24 md:pb-32 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col gap-6 mb-8 md:mb-16 max-w-6xl mx-auto">
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-serif italic text-black tracking-tight leading-tight">
              Pinned Calendar
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg md:text-xl font-serif italic text-stone-400">{greeting},</span>
              <span className="text-lg md:text-xl font-serif italic text-red-600 capitalize">
                {user?.displayName || user?.email?.split('@')[0] || 'Member'}
              </span>
            </div>
          </div>
          <h2 className="text-6xl md:text-8xl font-serif italic text-stone-900 tracking-tighter leading-none">
            {format(currentDate, 'MMMM')}
          </h2>
        </div>

        <div className="flex items-center justify-between bg-white/60 backdrop-blur-xl p-1.5 rounded-2xl border-white border-2 shadow-sm w-full md:w-fit">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 hover:bg-white rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 text-[11px] font-black uppercase tracking-widest text-stone-700">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 hover:bg-white rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border-white border-[4px] md:border-[6px] shadow-xl relative z-10">
        <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/50 text-center py-4 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-stone-400">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
            const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentDate));
            return (
              <div key={idx} onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }}
                className={cn(
                  "min-h-[85px] md:min-h-[140px] p-2 md:p-4 border-r border-b border-stone-50 cursor-pointer hover:bg-stone-50/50 transition-all",
                  !isCurrentMonth && "opacity-20 pointer-events-none",
                  isSameDay(day, selectedDate) && "bg-stone-100/50"
                )}>
                <span className={cn("inline-flex w-7 h-7 md:w-9 md:h-9 items-center justify-center rounded-lg md:rounded-xl text-xs md:text-sm font-bold", isToday(day) ? "bg-stone-900 text-white shadow-lg" : "text-stone-800")}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-col gap-1 mt-2">
                  {dayPins.slice(0, 2).map((pin) => (
                    <div key={pin.id} className="w-full h-1 md:h-1.5 rounded-full overflow-hidden">
                       <div className={cn("w-full h-full", CATEGORIES.find(c => c.id === pin.category)?.color)} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Panel - Responsive Width */}
      <AnimatePresence>
        {isTimelineOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTimelineOpen(false)} className="fixed inset-0 bg-black/10 backdrop-blur-md z-40" />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-4xl w-full bg-white rounded-t-[2.5rem] md:rounded-t-[4rem] shadow-2xl z-50 max-h-[85vh] overflow-y-auto border-t-4 border-white"
            >
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mt-4 mb-2" />
              <div className="px-6 md:px-12 pb-12">
                <div className="flex items-center justify-between py-6 sticky top-0 bg-white z-10">
                  <h3 className="text-2xl md:text-3xl font-serif italic text-stone-900">{format(selectedDate, 'MMM do, EEEE')}</h3>
                  <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="p-4 bg-stone-900 text-white rounded-2xl shadow-lg"><Plus size={24} /></button>
                </div>
                <div className="space-y-3">
                  {selectedDayPins.length > 0 ? selectedDayPins.map((pin) => (
                    <div key={pin.id} onClick={() => { setSelectedPin(pin); setIsPreviewOpen(true); }} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer">
                      <div className="min-w-[55px] text-[10px] font-black text-stone-400 uppercase border-r border-stone-200 pr-3">{pin.time}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-stone-900 truncate">{pin.title}</h4>
                        {pin.location && <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1 truncate mt-0.5"><MapPin size={10} /> {pin.location}</p>}
                      </div>
                      {pin.imageUrl && <img src={pin.imageUrl} className="w-10 h-10 object-cover rounded-lg shrink-0" />}
                    </div>
                  )) : (
                    <div className="text-center py-12 text-stone-300 italic font-serif">No plans for today...</div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-xl h-[95vh] md:h-auto md:max-h-[90vh] md:rounded-[3rem] p-6 md:p-10 shadow-3xl overflow-y-auto relative rounded-t-[2.5rem]">
              <button onClick={resetForm} className="absolute top-6 right-6 p-2 bg-stone-100 rounded-full text-stone-400"><X size={20}/></button>
              <form onSubmit={handleSubmit} className="space-y-6 pt-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" className="text-2xl md:text-3xl font-serif italic border-none focus:ring-0 p-0 text-stone-900 outline-none w-full bg-transparent" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-stone-50 p-4 rounded-2xl flex items-center gap-3 border border-stone-100">
                    <Clock size={18} className="text-stone-300" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl flex items-center gap-3 border border-stone-100">
                    <MapPin size={18} className="text-stone-300" />
                    <input value={location} onChange={e => handleLocationChange(e.target.value)} placeholder="Location" className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                </div>

                {/* Map Area */}
                <div className="h-40 md:h-48 w-full rounded-2xl overflow-hidden border-2 border-stone-50">
                  <MapContainer center={[lat || 24.7136, lng || 46.6753]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {lat && lng && <Marker position={[lat, lng]} />}
                    <MapUpdater center={[lat || 24.7136, lng || 46.6753]} />
                  </MapContainer>
                </div>

                {/* Notes Input */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                   <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add some notes..." className="bg-transparent border-none p-0 text-sm font-medium w-full outline-none h-20 resize-none" />
                </div>

                {/* Reminder Option */}
                <div className="bg-stone-50 p-4 rounded-2xl flex items-center justify-between border border-stone-100">
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-stone-400" />
                    <span className="text-sm font-bold text-stone-600">Reminder</span>
                  </div>
                  <select value={reminder} onChange={e => setReminder(e.target.value)} className="bg-transparent text-sm font-black text-stone-900 outline-none border-none focus:ring-0">
                    <option value="none">None</option>
                    <option value="at-time">At time</option>
                    <option value="15-min">15 min before</option>
                    <option value="1-hour">1 hour before</option>
                  </select>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all", category === cat.id ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-50 text-stone-300")}>
                      <cat.icon size={16} />
                      <span className="text-[7px] font-black uppercase">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <button disabled={loading} type="submit" className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95">
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : (editingId ? 'Update Event' : 'Create Event')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && selectedPin && (
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/20 backdrop-blur-md">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="h-48 relative bg-stone-100">
                {selectedPin.imageUrl ? <img src={selectedPin.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-200"><Camera size={40} /></div>}
                <button onClick={() => setIsPreviewOpen(false)} className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md text-white rounded-full"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-serif italic text-stone-900">{selectedPin.title}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(selectedPin)} className="p-3 bg-stone-50 text-stone-900 rounded-xl"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(selectedPin.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs font-bold text-stone-500 uppercase">
                  <div className="flex items-center gap-1"><Clock size={14} /> {selectedPin.time}</div>
                  {selectedPin.location && <div className="flex items-center gap-1 text-blue-500"><MapPin size={14} /> {selectedPin.location}</div>}
                </div>
                {selectedPin.notes && <p className="text-sm text-stone-600 bg-stone-50 p-4 rounded-xl leading-relaxed">{selectedPin.notes}</p>}
                {selectedPin.reminder !== 'none' && (
                   <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase">
                     <Bell size={12} /> Reminder: {selectedPin.reminder}
                   </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
