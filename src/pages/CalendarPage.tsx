import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Trash2, Loader2, MapPin, X, Clock, Bell, Image as ImageIcon, Check, Edit2, Upload
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
  
  // States for Event Detail
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempLocation, setTempLocation] = useState('');
  const [tempTime, setTempTime] = useState('12:00');
  const [tempNote, setTempNote] = useState('');
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
    if (!tempTitle || !selectedDay) return toast.error('Title and Date are required');
    
    toast.loading("Saving...", { id: "saveEv" });
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
        time: tempTime,
        extraNote: tempNote,
        image: finalImageUrl,
        lat: tempCoords[0],
        lng: tempCoords[1]
      };

      const filtered = events.filter(e => e.id !== (editingEvent?.id || ''));
      await setDoc(eventDocRef, { events: [...filtered, newEv] }, { merge: true });
      
      setEditingEvent(null); setTempTitle(''); setTempImage(null); setTempLocation(''); setTempNote('');
      toast.success('Plan Saved', { id: "saveEv" });
    } catch (e) { toast.error("Error saving", { id: "saveEv" }); }
  };

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth(currentDate.getFullYear(), currentDate.getMonth()); i++) calendarDays.push(i);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Loader2 className="animate-spin text-stone-300" /></div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="bg-white border-b border-stone-100 px-6 py-5 sticky top-0 z-[100]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft size={28} /></button>
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('traditional')} className={cn("px-5 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === 'traditional' ? "bg-white shadow-sm text-black" : "text-stone-400")}>Calendar</button>
            <button onClick={() => setViewMode('timeline')} className={cn("px-5 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === 'timeline' ? "bg-white shadow-sm text-black" : "text-stone-400")}>Timeline</button>
          </div>
          <button onClick={() => navigate('/map')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><MapPin size={24} /></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10">
        {viewMode === 'traditional' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-stone-900 tracking-tight">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 border border-stone-200 rounded-lg"><ChevronLeft size={20}/></button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 border border-stone-200 rounded-lg"><ChevronRight size={20}/></button>
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
                  <div key={i} onClick={() => day && setSelectedDay(day)} className={cn("aspect-square border-r border-b border-stone-100 p-2 relative cursor-pointer hover:bg-stone-50 transition-colors", isToday && "bg-blue-50/30")}>
                    {day && (
                      <>
                        <span className={cn("text-sm font-medium", isToday ? "text-blue-600 font-bold" : "text-stone-700")}>{day}</span>
                        {hasEvents && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
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
                 <div className="text-center min-w-[50px]"><p className="text-[10px] font-bold text-stone-400 uppercase">{new Date(ev.date).toLocaleString('default', {month:'short'})}</p><p className="text-lg font-bold">{new Date(ev.date).getDate()}</p></div>
                 <div className="flex-1"><p className="font-bold text-stone-800">{ev.title}</p><p className="text-xs text-stone-400">{ev.location}</p></div>
                 {ev.image && <img src={ev.image} className="w-12 h-12 rounded-lg object-cover" />}
               </div>
             ))}
          </div>
        )}
      </div>

      {/* المودال المطور بجميع الحقول */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-xl font-bold">{selectedDay} {currentDate.toLocaleString('default', { month: 'long' })}</h3>
                  <p className="text-xs text-stone-400">Manage your day</p>
                </div>
                <button onClick={() => { setSelectedDay(null); setEditingEvent(null); }} className="p-2 hover:bg-stone-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* قائمة المهام الحالية */}
                <div className="space-y-3">
                  {events.filter(e => e.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).map(ev => (
                    <div key={ev.id} className="group p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {ev.image && <img src={ev.image} className="w-12 h-12 rounded-xl object-cover" />}
                        <div><p className="font-bold text-sm">{ev.title}</p><p className="text-[10px] text-stone-400">{ev.time} • {ev.location}</p></div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingEvent(ev); setTempTitle(ev.title); setTempLocation(ev.location); setTempImage(ev.image); setTempTime(ev.time); setTempNote(ev.extraNote || ''); }} className="p-2 text-stone-400 hover:text-blue-600"><Edit2 size={16}/></button>
                        <button onClick={() => updateDoc(eventDocRef, { events: arrayRemove(ev) })} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-stone-100 space-y-4">
                  <input type="text" placeholder="Event title..." className="w-full p-4 bg-stone-100 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-100" value={tempTitle} onChange={e => setTempTitle(e.target.value)} />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-100 p-4 rounded-2xl flex items-center gap-2">
                       <Clock size={16} className="text-stone-400" />
                       <input type="time" className="bg-transparent text-sm font-bold outline-none" value={tempTime} onChange={e => setTempTime(e.target.value)} />
                    </div>
                    <div className="bg-stone-100 p-4 rounded-2xl flex items-center gap-2 text-stone-400">
                       <Bell size={16} /> <span className="text-xs font-bold">Alert On</span>
                    </div>
                  </div>

                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-stone-400" size={16} />
                    <input type="text" placeholder="Location..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl text-sm outline-none" value={tempLocation} onChange={e => handleLocationSearch(e.target.value)} />
                  </div>

                  <div className="h-32 rounded-2xl overflow-hidden border">
                    <MapContainer center={tempCoords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      <Marker position={tempCoords} />
                      <ChangeView center={tempCoords} />
                    </MapContainer>
                  </div>

                  <textarea placeholder="Additional notes..." className="w-full p-4 bg-stone-100 rounded-2xl h-24 text-sm outline-none resize-none" value={tempNote} onChange={e => setTempNote(e.target.value)} />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center border border-dashed border-stone-300 overflow-hidden">
                        {tempImage ? <img src={tempImage} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-stone-300"/>}
                      </div>
                      <button onClick={() => fileRef.current?.click()} className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><Upload size={12}/> Attach Photo</button>
                    </div>
                    <button onClick={saveEvent} className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">Save Plan</button>
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
