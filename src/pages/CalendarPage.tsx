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

// استيراد مكتبة الخرائط
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إصلاح أيقونات Leaflet
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

  // Greeting State
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

  // منطق التحية: يتضمن الوقت ونهاية الأسبوع
  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = day === 0 || day === 6;

      let timeMsg = '';
      if (hour >= 5 && hour < 12) timeMsg = 'Good Morning';
      else if (hour >= 12 && hour < 17) timeMsg = 'Good Afternoon';
      else if (hour >= 17 && hour < 21) timeMsg = 'Good Evening';
      else timeMsg = 'Good Night';

      if (isWeekend) {
        setGreeting(`Happy Weekend, ${timeMsg}`);
      } else {
        setGreeting(timeMsg);
      }
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

  useEffect(() => {
    const dateParam = searchParams.get('date');
    const openEventId = searchParams.get('openEvent');
    if (dateParam && pins.length > 0) {
      try {
        const parsedDate = parseISO(dateParam);
        setSelectedDate(parsedDate);
        setCurrentDate(parsedDate);
        setIsTimelineOpen(true);
        if (openEventId) {
          const pinToOpen = pins.find(p => p.id === openEventId);
          if (pinToOpen) { setSelectedPin(pinToOpen); setIsPreviewOpen(true); }
        }
      } catch (e) { console.error(e); }
    }
  }, [searchParams, pins]);

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
    setNotes(pin.notes || ''); setCategory(pin.category || 'other');
    setPreviewUrl(pin.imageUrl || null); setIsPreviewOpen(false); setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setTime('12:00'); setLocation('');
    setLat(null); setLng(null); setNotes(''); setCategory('other');
    setImageFile(null); setPreviewUrl(null); setIsModalOpen(false); setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    try { await deleteDoc(doc(db, 'pins', id)); setIsPreviewOpen(false); toast.success('Deleted'); }
    catch (e) { toast.error('Delete failed'); }
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
      if (editingId) { await updateDoc(doc(db, 'pins', editingId), { ...pinData, updatedAt: serverTimestamp() }); }
      else { await addDoc(collection(db, 'pins'), { ...pinData, userId: user.uid, createdAt: serverTimestamp() }); }
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
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
      {/* Header مع اسم التطبيق الأكبر والتحية المحدثة */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-16">
        <div className="space-y-8">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-serif italic text-black tracking-tight">
              Pinned Calendar
            </h1>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xl font-serif italic text-stone-400">
                {greeting},
              </span>
              <span className="text-xl font-serif italic text-red-600 capitalize">
                {user?.displayName || user?.email?.split('@')[0] || 'Member'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-7xl md:text-8xl font-serif italic text-stone-900 tracking-tighter leading-none">
              {format(currentDate, 'MMMM')}
            </h2>
            <p className="text-stone-400 font-black tracking-[0.4em] uppercase text-[10px] mt-4 ml-2">
              Lifestyle Planning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-xl p-2 rounded-2xl border-white border-2 shadow-xl self-start md:mt-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 text-[11px] font-black uppercase tracking-widest text-stone-700">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/70 backdrop-blur-md rounded-[3.5rem] overflow-hidden border-white border-4 shadow-2xl relative z-10">
        <div className="grid grid-cols-7 border-b border-stone-100 bg-white/30 text-center py-6 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
            const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentDate));
            return (
              <div key={idx} onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }}
                className={cn(
                  "min-h-[140px] p-4 border-r border-b border-stone-50 cursor-pointer hover:bg-white transition-all group",
                  !isCurrentMonth && "opacity-20 pointer-events-none",
                  isSameDay(day, selectedDate) && "bg-white/80"
                )}>
                <span className={cn("inline-flex w-9 h-9 items-center justify-center rounded-xl text-sm font-bold mb-4", isToday(day) ? "bg-stone-900 text-white shadow-lg" : "text-stone-800 border border-stone-100")}>{format(day, 'd')}</span>
                <div className="flex flex-col gap-1.5">
                  {dayPins.slice(0, 2).map((pin) => (
                    <div key={pin.id} className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-stone-50 shadow-sm overflow-hidden">
                       <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", CATEGORIES.find(c => c.id === pin.category)?.color)} />
                       <span className="text-[8px] font-bold truncate uppercase text-stone-500">{pin.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Panel */}
      <AnimatePresence>
        {isTimelineOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTimelineOpen(false)} className="fixed inset-0 bg-stone-900/10 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[4rem] shadow-2xl z-50 max-h-[80vh] overflow-y-auto border-t-4 border-white">
              <div className="w-16 h-1 bg-stone-100 rounded-full mx-auto mt-6 mb-2" />
              <div className="max-w-3xl mx-auto px-8 pb-20">
                <div className="flex items-center justify-between mb-10 sticky top-0 bg-white/10 py-6 z-10 backdrop-blur-sm">
                  <h3 className="text-4xl font-serif italic text-stone-900">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="p-5 bg-stone-900 text-white rounded-[2rem] shadow-xl hover:scale-105 transition-transform"><Plus size={28} /></button>
                </div>
                <div className="space-y-4">
                  {selectedDayPins.length > 0 ? selectedDayPins.map((pin) => (
                    <div key={pin.id} onClick={() => { setSelectedPin(pin); setIsPreviewOpen(true); }} className="flex items-center gap-6 p-6 bg-white rounded-[2.5rem] border-2 border-stone-50 shadow-sm group cursor-pointer hover:border-stone-200 transition-all">
                      <div className="text-center min-w-[70px] border-r-2 border-stone-50 pr-6 font-black text-stone-900 uppercase text-sm">{pin.time}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <h4 className="text-lg font-bold text-stone-900">{pin.title}</h4>
                        </div>
                        {pin.notes && <p className="text-xs text-stone-400 mt-1 italic line-clamp-1">{pin.notes}</p>}
                        {pin.location && <p className="text-[11px] font-bold text-blue-500 flex items-center gap-1 mt-1 truncate"><MapPin size={12} /> {pin.location}</p>}
                      </div>
                      {pin.imageUrl && <img src={pin.imageUrl} className="w-14 h-14 object-cover rounded-2xl" />}
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-300 gap-4">
                        <CalendarIcon size={64} strokeWidth={1} />
                        <p className="font-serif italic text-xl">No events scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal (يحتوي على الخريطة) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-3xl relative border-4 border-white max-h-[90vh] overflow-y-auto">
              <button onClick={resetForm} className="absolute top-8 right-8 text-stone-300 hover:text-stone-900"><X size={24}/></button>
              <form onSubmit={handleSubmit} className="space-y-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What's happening?" className="text-2xl font-serif italic border-none focus:ring-0 p-0 text-stone-900 outline-none w-full bg-transparent" />
                
                <div className="flex gap-3">
                  <div className="bg-stone-50 p-4 rounded-2xl flex-1 flex items-center gap-3 border border-stone-100">
                    <Clock size={18} className="text-stone-300" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                  <div className="relative flex-[2]">
                    <div className="bg-stone-50 p-4 rounded-2xl flex items-center gap-3 border border-stone-100">
                      <MapPin size={18} className="text-stone-300" />
                      <input value={location} onChange={e => handleLocationChange(e.target.value)} placeholder="Location..." className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-100 max-h-40 overflow-auto">
                        {suggestions.map((s, i) => (
                          <button key={i} type="button" onClick={() => { 
                            setLocation(s.display_name); setLat(parseFloat(s.lat)); setLng(parseFloat(s.lon)); 
                            setSuggestions([]); setShowSuggestions(false); 
                          }} className="w-full text-left p-3 text-[10px] font-bold text-stone-500 hover:bg-stone-50 border-b border-stone-50">{s.display_name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-48 w-full rounded-[2rem] overflow-hidden border-2 border-stone-50 relative z-0">
                  <MapContainer center={[lat || 24.7136, lng || 46.6753]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {lat && lng && <Marker position={[lat, lng]} />}
                    <MapUpdater center={[lat || 24.7136, lng || 46.6753]} />
                  </MapContainer>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none h-16 resize-none" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", category === cat.id ? "bg-stone-900 border-stone-900 text-white shadow-md" : "bg-white border-stone-50 text-stone-300")}>
                      <cat.icon size={18} />
                      <span className="text-[8px] font-black uppercase">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <button disabled={loading} type="submit" className="w-full py-5 bg-stone-900 text-white rounded-[1.8rem] font-black shadow-xl hover:bg-black transition-all">
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-lg">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-3xl border-4 border-white">
              <div className="h-64 relative bg-stone-100">
                {selectedPin.imageUrl ? <img src={selectedPin.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-200"><Camera size={48} /></div>}
                <button onClick={() => setIsPreviewOpen(false)} className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white hover:text-stone-900 transition-all"><X size={20}/></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-4xl font-serif italic text-stone-900">{selectedPin.title}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(selectedPin)} className="p-4 bg-stone-50 text-stone-900 rounded-2xl hover:bg-stone-100 transition-all"><Edit3 size={20} /></button>
                    <button onClick={() => handleDelete(selectedPin.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all"><Trash2 size={20} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
                    <Clock className="text-stone-400" size={20} />
                    <p className="text-sm font-bold text-stone-900">{selectedPin.time}</p>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
                    <MapPin className="text-blue-500" size={20} />
                    <p className="text-sm font-bold text-stone-900 truncate">{selectedPin.location || 'No Location'}</p>
                  </div>
                </div>
                {selectedPin.notes && <p className="p-6 bg-stone-50 rounded-[2rem] text-stone-600 text-sm">{selectedPin.notes}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
