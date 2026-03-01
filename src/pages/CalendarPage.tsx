import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, parseISO 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Camera, 
  X, Save, Loader2, MapPin, Clock, Trash2, Edit3, 
  Briefcase, HeartPulse, Plane, PartyPopper, Dumbbell, Star, Calendar as CalendarIcon, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { collection, addDoc, updateDoc, query, where, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

// لإظهار الخريطة، نحتاج لمكتبة Leaflet
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إصلاح أيقونات Leaflet الافتراضية
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      const day = new Date().getDay();
      const isWeekend = day === 0 || day === 6;
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

  const resetForm = () => {
    setEditingId(null); setTitle(''); setTime('12:00'); setLocation('');
    setLat(null); setLng(null); setNotes(''); setCategory('other');
    setImageFile(null); setPreviewUrl(null); setIsModalOpen(false); setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Title is required');
    setLoading(true);
    try {
      let finalImageUrl = previewUrl || '';
      if (imageFile) {
        const imageRef = ref(storage, `pins/${user.uid}/${Date.now()}`);
        await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(imageRef);
      }
      const pinData = {
        title, time, location, lat, lng, notes, category,
        imageUrl: finalImageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        updatedAt: new Date(),
      };
      if (editingId) {
        await updateDoc(doc(db, 'pins', editingId), { ...pinData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'pins'), { ...pinData, userId: user.uid, createdAt: serverTimestamp() });
      }
      toast.success('Saved');
      resetForm();
    } catch (error) {
      toast.error("Error saving");
    } finally { setLoading(false); }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-16">
        <div className="space-y-10">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-serif italic text-black tracking-tight">Pinned Calendar</h1>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xl font-serif italic text-stone-400">{greeting},</span>
              <span className="text-xl font-serif italic text-red-600">{user?.displayName || 'User'}</span>
            </div>
          </div>
          <div className="pt-2">
            <h2 className="text-7xl md:text-8xl font-serif italic text-stone-900 tracking-tighter leading-none">{format(currentDate, 'MMMM')}</h2>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-xl p-2 rounded-2xl border-white border-2 shadow-xl self-start">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 text-[11px] font-black uppercase">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white/70 backdrop-blur-md rounded-[3.5rem] overflow-hidden border-white border-4 shadow-2xl">
        <div className="grid grid-cols-7 text-center py-6 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => (
            <div key={idx} onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }} className={cn("min-h-[140px] p-4 border-r border-b border-stone-50 cursor-pointer hover:bg-white", !isSameDay(startOfMonth(day), startOfMonth(currentDate)) && "opacity-20")}>
              <span className={cn("inline-flex w-9 h-9 items-center justify-center rounded-xl text-sm font-bold", isToday(day) && "bg-stone-900 text-white")}>{format(day, 'd')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal with MAP */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-3xl relative border-4 border-white max-h-[90vh] overflow-y-auto">
              <button onClick={resetForm} className="absolute top-8 right-8 text-stone-300"><X size={24}/></button>
              <form onSubmit={handleSubmit} className="space-y-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What's happening?" className="text-2xl font-serif italic w-full outline-none" />
                
                <div className="flex gap-3">
                  <div className="bg-stone-50 p-4 rounded-2xl flex-1"><input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent w-full outline-none font-bold" /></div>
                  <div className="relative flex-[2]">
                    <div className="bg-stone-50 p-4 rounded-2xl flex items-center gap-3">
                      <MapPin size={18} className="text-stone-300" />
                      <input value={location} onChange={e => handleLocationChange(e.target.value)} placeholder="Location..." className="bg-transparent w-full outline-none font-bold" />
                    </div>
                    {showSuggestions && (
                      <div className="absolute z-50 w-full bg-white shadow-xl rounded-xl mt-1 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <div key={i} className="p-3 hover:bg-stone-50 cursor-pointer text-xs" onClick={() => { setLocation(s.display_name); setLat(s.lat); setLng(s.lon); setShowSuggestions(false); }}>{s.display_name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* الخريطة المصغرة */}
                <div className="h-48 w-full rounded-[2rem] overflow-hidden border-2 border-stone-50">
                  <MapContainer center={[lat || 24.7136, lng || 46.6753]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {lat && lng && <Marker position={[lat, lng]} />}
                    <MapUpdater center={[lat || 24.7136, lng || 46.6753]} />
                  </MapContainer>
                </div>

                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." className="bg-stone-50 p-4 rounded-2xl w-full h-24 outline-none font-bold" />

                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn("p-4 rounded-2xl border-2 flex flex-col items-center gap-2", category === cat.id ? "bg-stone-900 text-white" : "text-stone-300")}>
                      <cat.icon size={18} /> <span className="text-[8px] font-black">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <button disabled={loading} type="submit" className="w-full py-5 bg-stone-900 text-white rounded-[1.8rem] font-black">
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : (editingId ? 'Update Event' : 'Create Event')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
