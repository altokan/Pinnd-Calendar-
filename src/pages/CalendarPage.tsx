import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Trash2, Loader2, MapPin, X, Clock, Bell, Image as ImageIcon, Check, Edit2, Upload,
  Utensils, Stethoscope, PartyPopper, Briefcase, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const CATEGORIES = {
  restaurant: { icon: <Utensils size={14} />, color: 'bg-orange-100 text-orange-600', label: 'Dinner' },
  doctor: { icon: <Stethoscope size={14} />, color: 'bg-red-100 text-red-600', label: 'Doctor' },
  party: { icon: <PartyPopper size={14} />, color: 'bg-purple-100 text-purple-600', label: 'Party' },
  work: { icon: <Briefcase size={14} />, color: 'bg-blue-100 text-blue-600', label: 'Work' },
  mood: { icon: <Heart size={14} />, color: 'bg-pink-100 text-pink-600', label: 'Mood' },
};

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
  const [tempTime, setTempTime] = useState('12:00');
  const [tempNote, setTempNote] = useState('');
  const [tempCategory, setTempCategory] = useState('mood');
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
      reader.onload = (ev) => setTempImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveEvent = async () => {
    if (!tempTitle || !selectedDay) return toast.error('Title required');
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
        title: tempTitle, location: tempLocation, date: dateStr,
        time: tempTime, extraNote: tempNote, category: tempCategory,
        image: finalImageUrl, lat: tempCoords[0], lng: tempCoords[1]
      };

      const filtered = events.filter(e => e.id !== (editingEvent?.id || ''));
      await setDoc(eventDocRef, { events: [...filtered, newEv] }, { merge: true });
      
      setEditingEvent(null); setTempTitle(''); setTempImage(null); setTempLocation('');
      toast.success('Saved');
    } catch (e) { toast.error("Error saving"); }
  };

  const calendarDays = [];
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const dInM = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= dInM; i++) calendarDays.push(i);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Loader2 className="animate-spin text-stone-300" /></div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="bg-white border-b border-stone-100 px-6 py-5 sticky top-0 z-[100]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft size={28} /></button>
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('traditional')} className={cn("px-5 py-1.5 rounded-lg text-xs font-bold", viewMode === 'traditional' ? "bg-white text-black shadow-sm" : "text-stone-400")}>Calendar</button>
            <button onClick={() => setViewMode('timeline')} className={cn("px-5 py-1.5 rounded-lg text-xs font-bold", viewMode === 'timeline' ? "bg-white text-black shadow-sm" : "text-stone-400")}>Timeline</button>
          </div>
          <button onClick={() => navigate('/map')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><MapPin size={24} /></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10">
        {viewMode === 'traditional' ? (
          <div className="grid grid-cols-7 border-t border-l border-stone-100 bg-white rounded-xl overflow-hidden shadow-sm">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
              <div key={d} className="border-r border-b border-stone-100 p-4 text-center text-[10px] font-bold text-stone-400 uppercase">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const dStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasE = events.some(e => e.date === dStr);
              const isT = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
              return (
                <div key={i} onClick={() => day && setSelectedDay(day)} className={cn("aspect-square border-r border-b border-stone-100 p-2 relative cursor-pointer hover:bg-stone-50", isT && "bg-blue-50/30")}>
                  {day && <span className={cn("text-sm font-medium", isT ? "text-blue-600 font-bold" : "text-stone-700")}>{day}</span>}
                  {hasE && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-4">
             {events.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => {
               const cat = (CATEGORIES as any)[ev.category || 'mood'];
               return (
                <div key={ev.id} className="bg-white p-5 rounded-2xl border border-stone-100 flex items-center gap-4 shadow-sm">
                  <div className={cn("p-3 rounded-xl", cat.color)}>{cat.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-stone-800">{ev.title}</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{cat.label} • {ev.time}</p>
                  </div>
                  {ev.image && <img src={ev.image} className="w-12 h-12 rounded-lg object-cover" />}
                </div>
               );
             })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedDay && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">{selectedDay} {currentDate.toLocaleString('default', { month: 'long' })}</h3>
                <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-stone-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                  {events.filter(e => e.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).map(ev => {
                    const cat = (CATEGORIES as any)[ev.category || 'mood'];
                    return (
                      <div key={ev.id} className="p-4 bg-stone-50 rounded-2xl border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", cat.color)}>{cat.icon}</div>
                          <div><p className="font-bold text-sm">{ev.title}</p><p className="text-[10px] text-stone-400 uppercase font-black">{cat.label} • {ev.time}</p></div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingEvent(ev); setTempTitle(ev.title); setTempCategory(ev.category || 'mood'); }} className="p-2 text-stone-400 hover:text-blue-600"><Edit2 size={16}/></button>
                          <button onClick={() => updateDoc(eventDocRef, { events: arrayRemove(ev) })} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-stone-100 space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {Object.entries(CATEGORIES).map(([id, cat]) => (
                      <button key={id} onClick={() => setTempCategory(id)} className={cn(
                        "p-3 rounded-xl border flex flex-col items-center gap-1 min-w-[65px] transition-all",
                        tempCategory === id ? "border-blue-500 bg-blue-50" : "border-stone-100 bg-white"
                      )}>
                        <div className={cn("p-1.5 rounded-lg", cat.color)}>{cat.icon}</div>
                        <span className="text-[8px] font-black uppercase">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  <input type="text" placeholder="What's happening?" className="w-full p-4 bg-stone-100 rounded-2xl text-sm font-bold outline-none" value={tempTitle} onChange={e => setTempTitle(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-100 p-4 rounded-2xl flex items-center gap-2 font-bold text-xs"><Clock size={16}/> <input type="time" className="bg-transparent outline-none" value={tempTime} onChange={e => setTempTime(e.target.value)} /></div>
                    <div className="bg-stone-100 p-4 rounded-2xl flex items-center gap-2 text-stone-400 font-bold text-xs"><Bell size={16}/> Alert</div>
                  </div>
                  <textarea placeholder="Note..." className="w-full p-4 bg-stone-100 rounded-2xl h-20 text-sm outline-none resize-none" value={tempNote} onChange={e => setTempNote(e.target.value)} />
                  <div className="flex items-center justify-between">
                     <button onClick={() => fileRef.current?.click()} className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><Upload size={12}/> {tempImage ? 'Change Photo' : 'Add Photo'}</button>
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
