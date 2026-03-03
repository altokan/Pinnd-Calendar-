import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Trash2, Edit3, X, Check, ImageIcon, Plus, 
  Loader2, Clock, Utensils, Music, Stethoscope, Briefcase, Star,
  Grid, List, Bell, BellOff
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
  { id: 'med', icon: Stethoscope, label: 'Doctor', color: 'bg-red-500' },
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
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[] | null>(null);
  
  const [form, setForm] = useState({
    title: '', date: '', time: '', location: '', note: '', type: 'other', image: '', alert: false
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

  const handleDayClick = (day: number) => {
    const dayEvs = getEventsForDay(day);
    if (dayEvs.length > 0) {
      setSelectedDayEvents(dayEvs);
    } else {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setForm({ ...form, date: dateStr, title: '', time: '', location: '', note: '', type: 'other', image: '', alert: false });
      setShowAddModal(true);
    }
  };

  const handleLocationSearch = async (val: string) => {
    setForm({ ...form, location: val });
    if (val.length >= 3) {
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
    toast.success('Saved successfully');
    setShowAddModal(false);
    setSelectedEvent(null);
    setSelectedDayEvents(null);
  };

  const deleteEvent = async (id: string) => {
    const updated = events.filter(e => e.id !== id);
    await updateDoc(eventsDocRef, { events: updated });
    toast.success('Deleted');
    setSelectedEvent(null);
    setSelectedDayEvents(null);
  };

  if (loading) return <div className="fixed inset-0 bg-stone-50 flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" /></div>;

  return (
    <div className="min-h-screen bg-[#f8f5f2] px-4 py-4 sm:py-6 pb-28 font-sans text-stone-800 overflow-x-hidden">
      
      {/* Header - Mobile Optimized Container */}
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div className="w-full sm:w-auto flex justify-between items-center sm:block">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-stone-900 capitalize">
              {currentDate.toLocaleString('en-US', { month: 'long' })}
              <span className="text-blue-600 ml-2">{currentDate.getFullYear()}</span>
            </h1>
            <div className="flex gap-2 sm:gap-3 mt-1 items-center">
              <p className="text-stone-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest">Admin Dashboard</p>
              <div className="flex bg-stone-200/50 p-0.5 sm:p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={cn("p-1 rounded-md transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-stone-400")}><Grid size={12}/></button>
                <button onClick={() => setViewMode('timeline')} className={cn("p-1 rounded-md transition-all", viewMode === 'timeline' ? "bg-white shadow-sm text-blue-600" : "text-stone-400")}><List size={12}/></button>
              </div>
            </div>
          </div>
        </div>

        {/* Date Controls - Full width on mobile */}
        <div className="flex w-full sm:w-auto justify-between sm:justify-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-stone-100">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors flex-1 sm:flex-none justify-center flex"><ChevronLeft size={18}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-tighter hover:bg-stone-50 rounded-xl transition-colors">Today</button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors flex-1 sm:flex-none justify-center flex"><ChevronRight size={18}/></button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-7 gap-1 sm:gap-3">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
              <div key={d} className="text-center text-[9px] sm:text-[10px] font-black text-stone-300 uppercase mb-1 tracking-widest">{d}</div>
            ))}
            {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              return (
                <motion.div 
                  key={day} whileTap={{ scale: 0.95 }}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "aspect-square bg-white rounded-lg sm:rounded-[1.5rem] p-1 sm:p-2 border transition-all relative cursor-pointer",
                    isToday ? "border-blue-500 ring-2 sm:ring-4 ring-blue-500/10 shadow-md" : "border-stone-100 shadow-sm"
                  )}
                >
                  <span className={cn("text-[10px] sm:text-sm font-black", isToday ? "text-blue-600" : "text-stone-400")}>{day}</span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayEvents.map(e => (
                      <div key={e.id} className={cn("w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full", EVENT_TYPES.find(t => t.id === e.type)?.color || 'bg-blue-500')} />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="relative border-l-2 border-stone-200 ml-2 sm:ml-4 pl-6 sm:pl-8 space-y-6 py-2">
            {events.sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
              <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative group">
                <div className={cn("absolute -left-[35px] sm:-left-[41px] top-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-4 border-[#f8f5f2] shadow-sm", EVENT_TYPES.find(t => t.id === e.type)?.color || 'bg-blue-500')} />
                <div onClick={() => { setSelectedEvent(e); setForm(e); }} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm border border-stone-100 flex gap-4 sm:gap-6 items-center cursor-pointer active:scale-[0.98] transition-all">
                  {e.image && <img src={e.image} className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl object-cover" alt="" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest block truncate">{e.date} • {e.time}</span>
                    <h3 className="text-base sm:text-xl font-black text-stone-900 truncate">{e.title}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals - Optimized for Mobile Viewports */}
      <AnimatePresence>
        {selectedDayEvents && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm p-6 sm:p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-xl font-black">Day Events</h2>
                <button onClick={() => setSelectedDayEvents(null)} className="p-2"><X size={20}/></button>
              </div>
              <div className="space-y-3 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto pr-1">
                {selectedDayEvents.map(e => (
                  <div key={e.id} className="p-3 sm:p-4 bg-stone-50 rounded-2xl flex items-center justify-between border border-stone-100">
                    <div className="flex-1 cursor-pointer" onClick={() => { setSelectedEvent(e); setForm(e); }}>
                      <p className="font-black text-stone-800 text-xs sm:text-sm">{e.title}</p>
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-bold uppercase">{e.time || 'No Time'}</p>
                    </div>
                    <div className="flex gap-1 sm:gap-2">
                      <button onClick={() => { setForm(e); setSelectedEvent(e); setShowAddModal(true); setSelectedDayEvents(null); }} className="p-2 text-blue-500"><Edit3 size={16}/></button>
                      <button onClick={() => deleteEvent(e.id)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { setShowAddModal(true); setSelectedDayEvents(null); }} className="w-full mt-6 py-4 bg-stone-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all text-xs sm:text-sm">Add New Event</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showAddModal || selectedEvent) && !selectedDayEvents && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-stone-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 overflow-y-auto max-h-[92vh] shadow-2xl relative">
              <div className="flex justify-between items-center mb-5 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-black">{selectedEvent ? 'Edit Event' : 'New Event'}</h2>
                <button onClick={() => { setShowAddModal(false); setSelectedEvent(null); }} className="p-2 bg-stone-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-4 pb-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-stone-400 uppercase ml-1">Event Name</label>
                  <input placeholder="Ex: Team Meeting" className="w-full p-4 bg-stone-100 rounded-2xl font-bold outline-none text-xs sm:text-sm" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-stone-400 uppercase ml-1">Date</label>
                    <input type="date" className="w-full p-3 sm:p-4 bg-stone-100 rounded-2xl font-bold outline-none text-[10px] sm:text-xs" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-stone-400 uppercase ml-1">Time</label>
                    <input type="time" className="w-full p-3 sm:p-4 bg-stone-100 rounded-2xl font-bold outline-none text-[10px] sm:text-xs" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 bg-stone-50 rounded-2xl">
                  <div className="flex items-center gap-2 font-bold text-[10px] sm:text-xs text-stone-600">
                    {form.alert ? <Bell className="text-blue-500" size={16}/> : <BellOff className="text-stone-300" size={16}/>}
                    Enable Alert
                  </div>
                  <button onClick={() => setForm({...form, alert: !form.alert})} className={cn("w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all relative", form.alert ? "bg-blue-500" : "bg-stone-300")}>
                    <div className={cn("absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all", form.alert ? "left-5 sm:left-7" : "left-1")} />
                  </button>
                </div>

                <div className="relative space-y-1">
                  <label className="text-[9px] font-black text-stone-400 uppercase ml-1">Location Search</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input placeholder="Search for a place..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl font-bold outline-none text-xs sm:text-sm" value={form.location} onChange={e => handleLocationSearch(e.target.value)} />
                    {suggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-[1200] border mb-1 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <div key={i} onClick={() => { 
                            setForm({...form, location: s.display_name}); 
                            setCoords([parseFloat(s.lat), parseFloat(s.lon)]); 
                            setSuggestions([]); 
                          }} className="p-3 hover:bg-stone-50 text-[9px] sm:text-[10px] cursor-pointer border-b last:border-0">{s.display_name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-24 sm:h-32 rounded-2xl overflow-hidden border grayscale-[0.3]">
                  <MapContainer center={coords} zoom={13} style={{height:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} /><ChangeView center={coords} />
                  </MapContainer>
                </div>

                <div className="flex justify-between p-1.5 bg-stone-50 rounded-2xl overflow-x-auto">
                  {EVENT_TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm({...form, type: t.id})} className={cn("p-2 sm:p-3 rounded-xl transition-all flex-shrink-0", form.type === t.id ? "bg-white shadow-sm text-blue-600 scale-105" : "text-stone-400")}><t.icon size={18} /></button>
                  ))}
                </div>

                <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 bg-stone-100 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest border-2 border-dashed border-stone-200">
                  <ImageIcon size={16} /> {form.image ? 'Image Attached' : 'Attach Event Photo'}
                </button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />

                <button onClick={saveEvent} className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-lg shadow-blue-200 active:scale-95 transition-all text-xs sm:text-sm uppercase tracking-tighter">Confirm & Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <button onClick={() => { setSelectedEvent(null); setForm({title:'', date:'', time:'', location:'', note:'', type:'other', image:'', alert:false}); setShowAddModal(true); }} className="fixed bottom-6 right-6 w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[500] active:scale-90 transition-all"><Plus size={24} /></button>
    </div>
  );
}
