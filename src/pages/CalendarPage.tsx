import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Trash2, Edit3, X, Check, ImageIcon, Plus, 
  Loader2, Clock, Map as MapIcon, List, Grid, Utensils, 
  Music, Stethoscope, Briefcase, Star, Search
} from 'lucide-react';
import { db, auth, storage } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// دالة تحريك الخريطة
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 14); }, [center]);
  return null;
}

const EVENT_TYPES = [
  { id: 'food', icon: Utensils, label: 'مطعم', color: 'bg-orange-500' },
  { id: 'party', icon: Music, label: 'حفلة', color: 'bg-purple-500' },
  { id: 'med', icon: Stethoscope, label: 'طبيب', color: 'bg-red-500' },
  { id: 'work', icon: Briefcase, label: 'عمل', color: 'bg-blue-500' },
  { id: 'other', icon: Star, label: 'أخرى', color: 'bg-stone-500' },
];

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // حالات الإضافة والتعديل
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
    if (!form.title || !form.date) return toast.error('الاسم والتاريخ مطلوبان');
    const newEvent = { ...form, id: selectedEvent?.id || `ev_${Date.now()}`, coords };
    
    let updatedEvents;
    if (selectedEvent) {
      updatedEvents = events.map(e => e.id === selectedEvent.id ? newEvent : e);
    } else {
      updatedEvents = [...events, newEvent];
    }

    await updateDoc(eventsDocRef, { events: updatedEvents });
    toast.success('تم الحفظ بنجاح');
    setShowAddModal(false);
    setSelectedEvent(null);
    setForm({ title: '', date: '', time: '', location: '', note: '', type: 'other', image: '' });
  };

  const deleteEvent = async (id: string) => {
    const updated = events.filter(e => e.id !== id);
    await updateDoc(eventsDocRef, { events: updated });
    toast.success('تم الحذف');
    setSelectedDayEvents(null);
  };

  if (loading) return <div className="fixed inset-0 bg-white flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-stone-900 pb-20">
      {/* Header */}
      <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black capitalize">{currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}</h1>
            <p className="text-stone-400 font-bold text-xs tracking-widest uppercase">الجدول الزمني الرئيسي</p>
          </div>
          <div className="flex gap-2 bg-stone-100 p-1.5 rounded-2xl">
            <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-xl transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-stone-400")}><Grid size={20}/></button>
            <button onClick={() => setViewMode('timeline')} className={cn("p-2 rounded-xl transition-all", viewMode === 'timeline' ? "bg-white shadow-sm text-blue-600" : "text-stone-400")}><List size={20}/></button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 bg-white border rounded-2xl shadow-sm"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 py-3 bg-white border rounded-2xl shadow-sm font-bold text-sm">Today</button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 bg-white border rounded-2xl shadow-sm"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-7 gap-3">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-[10px] font-black text-stone-300 mb-2">{d}</div>)}
            {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={i} />)}
            {days.map(day => {
              const dayEvs = getEventsForDay(day);
              return (
                <div 
                  key={day} 
                  onClick={() => dayEvs.length > 0 && setSelectedDayEvents(dayEvs)}
                  className="aspect-square bg-white border border-stone-100 rounded-[1.5rem] p-2 relative shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <span className="text-sm font-bold text-stone-400">{day}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dayEvs.map(e => {
                      const type = EVENT_TYPES.find(t => t.id === e.type);
                      return <div key={e.id} className={cn("w-1.5 h-1.5 rounded-full", type?.color || 'bg-blue-500')} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative border-l-2 border-stone-100 ml-4 pl-8 space-y-10 py-4">
            {events.sort((a, b) => a.date.localeCompare(b.date)).map((e, idx) => {
               const type = EVENT_TYPES.find(t => t.id === e.type);
               return (
                <motion.div key={e.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="relative">
                  <div className={cn("absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-[#fcfcfc] shadow-sm", type?.color || 'bg-blue-500')} />
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-50 flex gap-6 items-center cursor-pointer" onClick={() => { setSelectedEvent(e); setForm(e); setShowAddModal(true); }}>
                    {e.image && <img src={e.image} className="w-20 h-20 rounded-2xl object-cover" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{e.date} • {e.time}</span>
                      </div>
                      <h3 className="text-xl font-black">{e.title}</h3>
                      <p className="text-stone-400 text-sm font-medium">{e.location}</p>
                    </div>
                    {type && <type.icon size={24} className="text-stone-200" />}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button 
        onClick={() => { setSelectedEvent(null); setForm({ title: '', date: '', time: '', location: '', note: '', type: 'other', image: '' }); setShowAddModal(true); }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-stone-900 text-white rounded-full shadow-2xl flex items-center justify-center z-[100]"
      >
        <Plus size={32} />
      </button>

      {/* Modal: Add/Edit Event */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-8 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between mb-6">
                <h2 className="text-2xl font-black">{selectedEvent ? 'تعديل حدث' : 'إضافة حدث جديد'}</h2>
                <button onClick={() => setShowAddModal(false)}><X/></button>
              </div>

              <div className="space-y-4">
                <input placeholder="اسم الحدث" className="w-full p-4 bg-stone-100 rounded-2xl font-bold outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="p-4 bg-stone-100 rounded-2xl font-bold outline-none text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  <input type="time" className="p-4 bg-stone-100 rounded-2xl font-bold outline-none text-sm" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                  <input placeholder="الموقع..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl font-bold outline-none" value={form.location} onChange={e => handleLocationSearch(e.target.value)} />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-[1200] border overflow-hidden">
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => { setForm({...form, location: s.display_name}); setCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-4 hover:bg-stone-50 text-xs cursor-pointer border-b last:border-0">{s.display_name}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-32 rounded-2xl overflow-hidden border">
                  <MapContainer center={coords} zoom={13} style={{height:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>

                {/* Event Types */}
                <div className="flex justify-between p-2 bg-stone-50 rounded-2xl">
                  {EVENT_TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm({...form, type: t.id})} className={cn("p-3 rounded-xl transition-all", form.type === t.id ? "bg-white shadow-sm text-blue-600 scale-110" : "text-stone-400")}>
                      <t.icon size={20} />
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 p-4 bg-stone-100 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                    <ImageIcon size={18} /> {form.image ? 'تم إرفاق صورة' : 'إرفاق صورة'}
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                </div>

                <button onClick={saveEvent} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-lg shadow-blue-200">حفظ الحدث</button>
                {selectedEvent && (
                  <button onClick={() => deleteEvent(selectedEvent.id)} className="w-full py-4 text-red-500 font-bold flex items-center justify-center gap-2"><Trash2 size={18}/> حذف الحدث</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Day Events List */}
      <AnimatePresence>
        {selectedDayEvents && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-end justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-8">
              <div className="flex justify-between mb-6">
                <h2 className="text-xl font-black">أحداث اليوم</h2>
                <button onClick={() => setSelectedDayEvents(null)}><X/></button>
              </div>
              <div className="space-y-3">
                {selectedDayEvents.map(e => (
                  <div key={e.id} className="p-4 bg-stone-50 rounded-2xl flex items-center justify-between">
                    <div onClick={() => { setSelectedEvent(e); setForm(e); setShowAddModal(true); setSelectedDayEvents(null); }}>
                      <p className="font-black">{e.title}</p>
                      <p className="text-xs text-stone-400">{e.time}</p>
                    </div>
                    <button onClick={() => deleteEvent(e.id)} className="text-red-400 p-2"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
