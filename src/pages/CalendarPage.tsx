import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Trash2, Edit3, X, Check, ImageIcon, Plus, 
  Loader2, Clock, Utensils, Music, Stethoscope, Briefcase, Star,
  Grid, List
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 14); }, [center]);
  return null;
}

const EVENT_TYPES = [
  { id: 'food', icon: Utensils, label: 'Restaurant', color: 'bg-orange-500' },
  { id: 'party', icon: Music, label: 'Party', color: 'bg-purple-500' },
  { id: 'med', icon: Stethoscope, label: 'Medical', color: 'bg-red-500' },
  { id: 'work', icon: Briefcase, label: 'Work', color: 'bg-blue-500' },
  { id: 'other', icon: Star, label: 'Other', color: 'bg-stone-500' },
];

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [form, setForm] = useState({
    title: '', date: '', time: '', location: '', note: '', type: 'other', image: ''
  });
  const [coords, setCoords] = useState<[number, number]>([24.7136, 46.6753]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = auth.currentUser?.uid || "guest";
  const eventsDocRef = doc(db, "events", userId);

  useEffect(() => {
    const unsub = onSnapshot(eventsDocRef, (d) => {
      if (d.exists()) setEvents(d.data().events || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleLocationSearch = async (val: string) => {
    setForm({ ...form, location: val });
    if (val.length > 3) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 3));
    } else setSuggestions([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm({ ...form, image: ev.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  const saveEvent = async () => {
    if (!form.title || !form.date) return toast.error('Title and Date are required');
    const newEvent = { ...form, id: selectedEvent?.id || `ev_${Date.now()}`, coords };
    let updatedEvents = selectedEvent ? events.map(e => e.id === selectedEvent.id ? newEvent : e) : [...events, newEvent];
    await updateDoc(eventsDocRef, { events: updatedEvents });
    toast.success('Saved Successfully');
    setShowAddModal(false);
    setSelectedEvent(null);
    setForm({ title: '', date: '', time: '', location: '', note: '', type: 'other', image: '' });
  };

  const deleteEvent = async (id: string) => {
    const updated = events.filter(e => e.id !== id);
    await updateDoc(eventsDocRef, { events: updated });
    toast.success('Deleted');
    setSelectedEvent(null);
  };

  if (loading) return <div className="fixed inset-0 bg-stone-50 flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" /></div>;

  return (
    <div className="min-h-screen bg-[#f8f5f2] p-6 pb-24 font-sans text-stone-800">
      
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-stone-900 capitalize">
            {currentDate.toLocaleString('default', { month: 'long' })}
            <span className="text-blue-600 ml-2">{currentDate.getFullYear()}</span>
          </h1>
          <div className="flex gap-4 mt-2 items-center">
            <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">Schedule Control</p>
            {/* أزرار التبديل - أيقونات فقط */}
            <div className="flex bg-stone-200/50 p-1.5 rounded-[1rem] border border-stone-200">
              <button 
                onClick={() => setViewMode('grid')} 
                className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600 scale-110" : "text-stone-400")}
              >
                <Grid size={20}/>
              </button>
              <button 
                onClick={() => setViewMode('timeline')} 
                className={cn("p-2 rounded-lg transition-all", viewMode === 'timeline' ? "bg-white shadow-sm text-blue-600 scale-110" : "text-stone-400")}
              >
                <List size={20}/>
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-stone-100">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {viewMode === 'grid' ? (
          /* Grid View - التصميم الشبكي */
          <div className="grid grid-cols-7 gap-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-stone-300 uppercase mb-2 tracking-widest">{d}</div>
            ))}
            {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              return (
                <motion.div 
                  key={day} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => dayEvents.length > 0 && (setSelectedEvent(dayEvents[0]), setForm(dayEvents[0]))}
                  className={cn(
                    "aspect-square bg-white rounded-[1.5rem] p-2 border transition-all relative cursor-pointer",
                    isToday ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" : "border-stone-100 shadow-sm hover:shadow-md"
                  )}
                >
                  <span className={cn("text-sm font-black", isToday ? "text-blue-600" : "text-stone-400")}>{day}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dayEvents.map(e => {
                      const type = EVENT_TYPES.find(t => t.id === e.type);
                      return <div key={e.id} className={cn("w-1.5 h-1.5 rounded-full shadow-sm", type?.color || 'bg-blue-500')} />;
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Timeline View - English Content */
          <div className="relative border-l-2 border-stone-200 ml-4 pl-8 space-y-8 py-4">
            {events.sort((a, b) => a.date.localeCompare(b.date)).map((e) => {
              const type = EVENT_TYPES.find(t => t.id === e.type);
              return (
                <motion.div key={e.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative group">
                  <div className={cn("absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-[#f8f5f2] shadow-sm transition-transform group-hover:scale-125", type?.color || 'bg-blue-500')} />
                  <div 
                    onClick={() => { setSelectedEvent(e); setForm(e); }}
                    className="bg-white p-6 rounded-[2.2rem] shadow-sm border border-stone-100 flex gap-6 items-center cursor-pointer hover:shadow-md transition-all"
                  >
                    {e.image && <img src={e.image} className="w-16 h-16 rounded-2xl object-cover" alt="event" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={12} className="text-blue-500" />
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{e.date} at {e.time}</span>
                      </div>
                      <h3 className="text-xl font-black text-stone-900">{e.title}</h3>
                      <div className="flex items-center gap-1 text-stone-400 mt-1">
                        <MapPin size={12} />
                        <p className="text-xs font-medium">{e.location || 'No location set'}</p>
                      </div>
                    </div>
                    {type && (
                      <div className="text-right">
                        <type.icon size={24} className="text-stone-200 mb-1" />
                        <p className="text-[8px] font-black uppercase tracking-tighter text-stone-300">{type.label}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {events.length === 0 && <p className="text-stone-400 font-bold italic text-center py-10">Your timeline is empty. Add your first event!</p>}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button 
        onClick={() => { setSelectedEvent(null); setForm({title:'', date:'', time:'', location:'', note:'', type:'other', image:''}); setShowAddModal(true); }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-stone-900 text-white rounded-full shadow-2xl flex items-center justify-center z-[500] active:scale-90 transition-all"
      >
        <Plus size={32} />
      </button>

      {/* Advanced Add/Edit Modal (Arabic UI) */}
      <AnimatePresence>
        {(showAddModal || selectedEvent) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-stone-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-8 overflow-y-auto max-h-[90vh] shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">{selectedEvent ? 'تفاصيل الحدث' : 'إضافة حدث'}</h2>
                <button onClick={() => { setShowAddModal(false); setSelectedEvent(null); }} className="p-2 bg-stone-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                <input placeholder="اسم الحدث" className="w-full p-4 bg-stone-100 rounded-2xl font-bold outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl font-bold outline-none text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  <input type="time" className="w-full p-4 bg-stone-100 rounded-2xl font-bold outline-none text-sm" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                  <input placeholder="ابحث عن مكان..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl font-bold outline-none" value={form.location} onChange={e => handleLocationSearch(e.target.value)} />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-[1200] border overflow-hidden">
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => { setForm({...form, location: s.display_name}); setCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-4 hover:bg-stone-50 text-xs cursor-pointer border-b last:border-0">{s.display_name}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="h-32 rounded-2xl overflow-hidden border grayscale-[0.3]">
                  <MapContainer center={coords} zoom={13} style={{height:'100%'}} zoomControl={false}><TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" /><Marker position={coords} /><ChangeView center={coords} /></MapContainer>
                </div>
                <div className="flex justify-between p-2 bg-stone-50 rounded-2xl">
                  {EVENT_TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm({...form, type: t.id})} className={cn("p-3 rounded-xl transition-all", form.type === t.id ? "bg-white shadow-sm text-blue-600 scale-110" : "text-stone-400")}><t.icon size={20} /></button>
                  ))}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 bg-stone-100 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                  <ImageIcon size={18} /> {form.image ? 'تم إرفاق صورة' : 'إرفاق صورة'}
                </button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                <button onClick={saveEvent} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-lg">حفظ</button>
                {selectedEvent && <button onClick={() => deleteEvent(selectedEvent.id)} className="w-full py-4 text-red-500 font-bold flex items-center justify-center gap-2"><Trash2 size={18}/> حذف</button>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
