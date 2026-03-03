import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Trash2, Loader2, MapPin, AlignLeft, List, Grid, X, 
  Clock, Image as ImageIcon, Check, Edit2, Upload, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 14); }, [center, map]);
  return null;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'traditional' | 'timeline'>('traditional');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempLocation, setTempLocation] = useState('');
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [tempCoords, setTempCoords] = useState<[number, number]>([24.7136, 46.6753]);

  const userId = auth.currentUser?.uid || "guest";
  const eventDocRef = doc(db, "events", userId);

  useEffect(() => {
    const unsub = onSnapshot(eventDocRef, (d) => {
      if (d.exists()) setEvents(d.data().events || []);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  // --- إصلاح الخطأ: تعريف دالة رفع الصور ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTempImage(ev.target?.result as string);
        toast.success("Image attached!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationSearch = async (val: string) => {
    setTempLocation(val);
    if (val.length > 3) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 3));
    } else { setSuggestions([]); }
  };

  const saveEvent = async () => {
    if (!tempTitle) return toast.error('Title is required');
    if (!selectedDay) return;
    
    toast.loading("Saving plan...", { id: "saveEv" });
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    let finalImageUrl = tempImage;

    try {
      if (tempImage?.startsWith('data:image')) {
        const sRef = ref(storage, `events/${userId}/${Date.now()}`);
        await uploadString(sRef, tempImage, 'data_url');
        finalImageUrl = await getDownloadURL(sRef);
      }

      const newEv = {
        id: editingEvent?.id || `ev_${Date.now()}`,
        title: tempTitle,
        location: tempLocation,
        date: dateStr,
        image: finalImageUrl,
        lat: tempCoords[0],
        lng: tempCoords[1],
        time: "12:00"
      };

      const filtered = events.filter(e => e.id !== (editingEvent?.id || ''));
      await setDoc(eventDocRef, { events: [...filtered, newEv] }, { merge: true });
      
      setEditingEvent(null); setTempTitle(''); setTempImage(null); setTempLocation('');
      toast.success('Event Saved', { id: "saveEv" });
    } catch (e) {
      toast.error("Error saving", { id: "saveEv" });
    }
  };

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth(currentDate.getFullYear(), currentDate.getMonth()); i++) calendarDays.push(i);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Loader2 className="animate-spin text-stone-300" /></div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-6 py-5 sticky top-0 z-[100]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full transition-colors"><ChevronLeft size={28} /></button>
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('traditional')} className={cn("px-5 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === 'traditional' ? "bg-white shadow-sm text-black" : "text-stone-400")}>Calendar</button>
            <button onClick={() => setViewMode('timeline')} className={cn("px-5 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === 'timeline' ? "bg-white shadow-sm text-black" : "text-stone-400")}>Timeline</button>
          </div>
          <button onClick={() => navigate('/map')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><MapPin size={24} /></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10">
        {viewMode === 'traditional' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-stone-900 tracking-tight">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 border border-stone-200 rounded-lg hover:bg-white"><ChevronLeft size={20}/></button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 border border-stone-200 rounded-lg hover:bg-white"><ChevronRight size={20}/></button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-t border-l border-stone-100 bg-white rounded-xl overflow-hidden shadow-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="border-r border-b border-stone-100 p-4 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasEvents = events.some(e => e.date === dayStr);
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

                return (
                  <div 
                    key={i} onClick={() => day && setSelectedDay(day)}
                    className={cn(
                      "aspect-square border-r border-b border-stone-100 p-2 relative cursor-pointer transition-colors group",
                      day ? "hover:bg-stone-50" : "bg-stone-50/30",
                      isToday && "bg-blue-50/30"
                    )}
                  >
                    {day && (
                      <>
                        <span className={cn("text-sm font-medium", isToday ? "text-blue-600 font-bold" : "text-stone-700")}>{day}</span>
                        {hasEvents && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
                        {isToday && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="max-w-xl mx-auto space-y-4">
             {events.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => (
               <div key={ev.id} className="bg-white p-5 rounded-2xl border border-stone-100 flex items-center gap-4 shadow-sm">
                 <div className="text-center min-w-[50px]">
                   <p className="text-[10px] font-bold text-stone-400 uppercase">{new Date(ev.date).toLocaleString('default', {month:'short'})}</p>
                   <p className="text-lg font-bold">{new Date(ev.date).getDate()}</p>
                 </div>
                 <div className="flex-1">
                   <p className="font-bold text-stone-800">{ev.title}</p>
                   <p className="text-xs text-stone-400">{ev.location}</p>
                 </div>
                 {ev.image && <img src={ev.image} className="w-12 h-12 rounded-lg object-cover" />}
               </div>
             ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{selectedDay} {currentDate.toLocaleString('default', { month: 'long' })}</h3>
                  <p className="text-xs text-stone-400 font-medium">Daily Schedule</p>
                </div>
                <button onClick={() => { setSelectedDay(null); setEditingEvent(null); }} className="p-2 hover:bg-stone-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                  {events.filter(e => e.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).map(ev => (
                    <div key={ev.id} className="group p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {ev.image && <img src={ev.image} className="w-12 h-12 rounded-xl object-cover" />}
                        <div>
                          <p className="font-bold text-stone-800 text-sm">{ev.title}</p>
                          <p className="text-[10px] text-stone-400 flex items-center gap-1"><MapPin size={10}/> {ev.location}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingEvent(ev); setTempTitle(ev.title); setTempLocation(ev.location); setTempImage(ev.image); setTempCoords([ev.lat, ev.lng]); }} className="p-2 text-stone-400 hover:text-blue-600"><Edit2 size={16}/></button>
                        <button onClick={() => updateDoc(eventDocRef, { events: arrayRemove(ev) })} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-stone-100 space-y-4">
                  <input 
                    type="text" placeholder="Plan title..." 
                    className="w-full p-4 bg-stone-100 rounded-2xl text-sm font-bold outline-none"
                    value={tempTitle} onChange={e => setTempTitle(e.target.value)}
                  />

                  <div className="relative">
                    <input 
                      type="text" placeholder="Search location..." 
                      className="w-full p-4 pl-10 bg-stone-100 rounded-2xl text-sm outline-none"
                      value={tempLocation} onChange={e => handleLocationSearch(e.target.value)}
                    />
                    <MapPin className="absolute left-3 top-4 text-stone-400" size={16} />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-xl z-50 border border-stone-100">
                        {suggestions.map((s, i) => (
                          <div key={i} onClick={() => { setTempLocation(s.display_name); setTempCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-3 hover:bg-stone-50 text-[10px] cursor-pointer border-b border-stone-50">{s.display_name}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-32 rounded-2xl overflow-hidden border border-stone-100 relative">
                    <MapContainer center={tempCoords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      <Marker position={tempCoords} />
                      <ChangeView center={tempCoords} />
                    </MapContainer>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center border border-dashed border-stone-300 overflow-hidden">
                        {tempImage ? <img src={tempImage} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-stone-300"/>}
                      </div>
                      <button onClick={() => fileRef.current?.click()} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                        <Upload size={12}/> Attach Photo
                      </button>
                    </div>
                    <button onClick={saveEvent} className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">
                      Save Plan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
