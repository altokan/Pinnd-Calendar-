import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Trash2, Edit3, X, Check, ImageIcon, Plus, 
  Loader2, Clock, Utensils, Music, Stethoscope, Briefcase, Star
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// دالة تحريك الخريطة تلقائياً عند اختيار موقع
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // حالات النموذج (الإضافة والتعديل)
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
    return events.filter(e => e.date === dateStr);
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
    let updatedEvents = selectedEvent 
      ? events.map(e => e.id === selectedEvent.id ? newEvent : e)
      : [...events, newEvent];

    await updateDoc(eventsDocRef, { events: updatedEvents });
    toast.success(selectedEvent ? 'تم التحديث' : 'تمت الإضافة');
    setShowAddModal(false);
    setSelectedEvent(null);
    setForm({ title: '', date: '', time: '', location: '', note: '', type: 'other', image: '' });
  };

  const deleteEvent = async (id: string) => {
    const updated = events.filter(e => e.id !== id);
    await updateDoc(eventsDocRef, { events: updated });
    toast.success('تم الحذف');
    setSelectedEvent(null);
  };

  if (loading) return <div className="fixed inset-0 bg-stone-50 flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" /></div>;

  return (
    <div className="min-h-screen bg-[#f8f5f2] p-6 pb-24 font-sans text-stone-800">
      
      {/* Header (نفس التصميم الأصلي) */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-stone-900 capitalize">
            {currentDate.toLocaleString('default', { month: 'long' })}
            <span className="text-blue-600 ml-2">{currentDate.getFullYear()}</span>
          </h1>
          <p className="text-stone-400 font-bold text-sm uppercase tracking-widest mt-1">Main Schedule</p>
        </div>
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-stone-100">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Grid (نفس التصميم الشبكي الأصلي) */}
      <div className="max-w-4xl mx-auto grid grid-cols-7 gap-3">
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
              onClick={() => {
                if (dayEvents.length > 0) {
                  setSelectedEvent(dayEvents[0]);
                  setForm(dayEvents[0]);
                }
              }}
              className={cn(
                "aspect-square bg-white rounded-[1.5rem] p-2 border transition-all relative cursor-pointer group",
                isToday ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" : "border-stone-100 shadow-sm hover:shadow-md"
              )}
            >
              <span className={cn("text-sm font-black", isToday ? "text-blue-600" : "text-stone-400")}>{day}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {dayEvents.map(e => {
                  const type = EVENT_TYPES.find(t => t.id === e.type);
                  return <div key={e.id} className={cn("w-2 h-2 rounded-full shadow-sm", type?.color || 'bg-blue-500')} />;
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => { setSelectedEvent(null); setForm({title:'', date:'', time:'', location:'', note:'', type:'other', image:''}); setShowAddModal(true); }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[500] active:scale-90 transition-transform"
      >
        <Plus size={32} />
      </button>

      {/* Modal الإضافة المتطور */}
      <AnimatePresence>
        {(showAddModal || selectedEvent) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-stone-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-8 overflow-y-auto max-h-[90vh] shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-stone-900">{selectedEvent ? 'تفاصيل الحدث' : 'إضافة حدث'}</h2>
                <button onClick={() => { setShowAddModal(false); setSelectedEvent(null); }} className="p-2 bg-stone-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                {/* الاسم */}
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 ml-1">اسم الحدث</label>
                  <input placeholder="مثلاً: موعد عشاء" className="w-full p-4 bg-stone-100 rounded-2xl font-bold outline-none focus:ring-2 ring-blue-500/20" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>

                {/* التاريخ والوقت */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">التاريخ</label>
                    <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl font-bold outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-1">الوقت</label>
                    <input type="time" className="w-full p-4 bg-stone-100 rounded-2xl font-bold outline-none" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                </div>

                {/* الموقع والبحث الذكي */}
                <div className="relative">
                  <label className="text-[10px] font-black uppercase text-stone-400 ml-1">الموقع</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                    <input placeholder="ابحث عن مكان..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl font-bold outline-none" value={form.location} onChange={e => handleLocationSearch(e.target.value)} />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-[1200] border mt-1 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <div key={i} onClick={() => { setForm({...form, location: s.display_name}); setCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-4 hover:bg-stone-50 text-xs cursor-pointer border-b last:border-0">{s.display_name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* الخريطة */}
                <div className="h-32 rounded-2xl overflow-hidden border grayscale-[0.3]">
                  <MapContainer center={coords} zoom={13} style={{height:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>

                {/* أنواع الأحداث */}
                <div className="flex justify-between p-2 bg-stone-50 rounded-2xl">
                  {EVENT_TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm({...form, type: t.id})} className={cn("p-3 rounded-xl transition-all", form.type === t.id ? "bg-white shadow-sm text-blue-600 scale-110" : "text-stone-400")}>
                      <t.icon size={20} />
                    </button>
                  ))}
                </div>

                {/* إرفاق صورة */}
                <div className="flex gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 p-4 bg-stone-100 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                    <ImageIcon size={18} /> {form.image ? 'تم إرفاق صورة' : 'إرفاق صورة'}
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                </div>

                {/* أزرار التحكم */}
                <div className="pt-4 space-y-2">
                  <button onClick={saveEvent} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Check size={20} /> {selectedEvent ? 'تحديث الحدث' : 'حفظ الحدث'}
                  </button>
                  {selectedEvent && (
                    <button onClick={() => deleteEvent(selectedEvent.id)} className="w-full py-4 text-red-500 font-bold flex items-center justify-center gap-2"><Trash2 size={18}/> حذف الحدث</button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
