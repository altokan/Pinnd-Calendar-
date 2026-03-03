import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Trash2, Loader2, MapPin, AlignLeft, List, Grid, X, 
  Clock, Bell, Image as ImageIcon, Check, Edit2, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function CalendarPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'traditional' | 'timeline'>('traditional');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Edit/Add States
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

  const handleLocationSearch = async (val: string) => {
    setTempLocation(val);
    if (val.length > 3) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 3));
    }
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setTempImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveEditedEvent = async () => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    let finalImageUrl = tempImage;

    // Upload to Firebase if it's base64
    if (tempImage?.startsWith('data:image')) {
      const sRef = ref(storage, `events/${userId}/${Date.now()}`);
      await uploadString(sRef, tempImage, 'data_url');
      finalImageUrl = await getDownloadURL(sRef);
    }

    const updatedEvent = {
      id: editingEvent?.id || `ev_${Date.now()}`,
      title: tempTitle,
      location: tempLocation,
      date: dateStr,
      time: "12:00",
      image: finalImageUrl,
      lat: tempCoords[0],
      lng: tempCoords[1]
    };

    if (editingEvent) {
      const filtered = events.filter(e => e.id !== editingEvent.id);
      await setDoc(eventDocRef, { events: [...filtered, updatedEvent] });
    } else {
      await updateDoc(eventDocRef, { events: arrayUnion(updatedEvent) });
    }
    
    setEditingEvent(null);
    setTempTitle(''); setTempImage(null);
    toast.success('Saved!');
  };

  // التقويم منطق
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth(currentDate.getFullYear(), currentDate.getMonth()); i++) calendarDays.push(i);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-stone-50 text-stone-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-10">
      {/* Header - متجاوب */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-stone-200 p-4 md:p-6 sticky top-0 z-[100]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-stone-100 rounded-2xl active:scale-90"><ChevronLeft/></button>
          
          <div className="flex bg-stone-100 p-1 rounded-2xl flex-1 max-w-[300px]">
            <button onClick={() => setViewMode('traditional')} className={cn("flex-1 py-2 rounded-xl text-xs font-black transition-all", viewMode === 'traditional' ? "bg-white shadow-md text-blue-600" : "text-stone-400")}>Grid</button>
            <button onClick={() => setViewMode('timeline')} className={cn("flex-1 py-2 rounded-xl text-xs font-black transition-all", viewMode === 'timeline' ? "bg-white shadow-md text-blue-600" : "text-stone-400")}>Timeline</button>
          </div>

          <button onClick={() => navigate('/map')} className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90"><MapPin/></button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        {viewMode === 'traditional' ? (
          <div className="bg-white rounded-[3rem] p-4 md:p-10 shadow-sm border border-stone-100 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-4xl font-black text-stone-800 tracking-tighter">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 bg-stone-50 rounded-xl"><ChevronLeft size={20}/></button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 bg-stone-50 rounded-xl"><ChevronRight size={20}/></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-stone-300 uppercase py-2">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasEvents = events.some(e => e.date === dayStr);
                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

                return (
                  <div 
                    key={i} onClick={() => day && setSelectedDay(day)}
                    className={cn(
                      "aspect-square rounded-[1.5rem] md:rounded-[2.5rem] p-2 flex flex-col items-center justify-center relative transition-all cursor-pointer border-2",
                      day ? "bg-white border-stone-50 hover:border-blue-200" : "bg-transparent border-transparent pointer-events-none",
                      isToday && "bg-blue-50/50 border-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.1)]", // التعديل: ظل خفيف لليوم
                      selectedDay === day && "border-blue-600"
                    )}
                  >
                    {day && (
                      <>
                        <span className={cn("text-lg md:text-2xl font-black", isToday ? "text-blue-600" : "text-stone-800")}>{day}</span>
                        {hasEvents && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 animate-pulse" />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl mx-auto">
             {events.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(ev => (
               <div key={ev.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex items-center gap-6">
                 <div className="w-16 h-16 bg-stone-50 rounded-full flex flex-col items-center justify-center font-black">
                   <span className="text-[10px] text-stone-400 uppercase">{new Date(ev.date).toLocaleString('default', {month:'short'})}</span>
                   <span className="text-xl">{new Date(ev.date).getDate()}</span>
                 </div>
                 <div className="flex-1">
                   <h3 className="font-black text-lg">{ev.title}</h3>
                   <div className="flex items-center gap-2 text-stone-400 text-xs mt-1"><MapPin size={12}/>{ev.location}</div>
                 </div>
                 {ev.image && <img src={ev.image} className="w-16 h-16 rounded-2xl object-cover" />}
               </div>
             ))}
          </div>
        )}
      </div>

      {/* مودال تفاصيل اليوم المختار وإضافة/تعديل حدث */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[200] flex items-end justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => setSelectedDay(null)} />
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-6 md:p-10 shadow-2xl relative z-10 max-h-[85vh] overflow-y-auto overflow-x-hidden">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-stone-800">{selectedDay} {currentDate.toLocaleString('default', { month: 'long' })}</h3>
                  <p className="text-xs font-black text-blue-500 tracking-[0.2em] uppercase">Day Schedule</p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-3 bg-stone-100 rounded-full"><X/></button>
              </div>

              {/* قائمة الأحداث لليوم */}
              <div className="space-y-4 mb-10">
                {events.filter(e => e.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).map(ev => (
                  <div key={ev.id} className="bg-stone-50 p-5 rounded-[2rem] border border-stone-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      {ev.image && <img src={ev.image} className="w-14 h-14 rounded-2xl object-cover" />}
                      <div>
                        <p className="font-black text-stone-800">{ev.title}</p>
                        <p className="text-xs text-stone-400 flex items-center gap-1 mt-1"><MapPin size={10}/>{ev.location}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingEvent(ev); setTempTitle(ev.title); setTempLocation(ev.location); setTempImage(ev.image); }} className="p-3 bg-white text-stone-400 rounded-xl shadow-sm hover:text-blue-600"><Edit2 size={16}/></button>
                      <button onClick={() => updateDoc(eventDocRef, { events: arrayRemove(ev) })} className="p-3 bg-white text-stone-400 rounded-xl shadow-sm hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* قسم إضافة/تعديل حدث */}
              <div className="bg-blue-50 p-6 rounded-[2.5rem] space-y-4 border border-blue-100 shadow-inner">
                <h4 className="font-black text-blue-800">{editingEvent ? 'Edit Event' : 'Add New Event'}</h4>
                <div className="space-y-4">
                  <input type="text" placeholder="Event name..." className="w-full p-4 bg-white rounded-2xl outline-none font-bold shadow-sm" value={tempTitle} onChange={e => setTempTitle(e.target.value)} />
                  <div className="relative">
                    <input type="text" placeholder="Search location..." className="w-full p-4 bg-white rounded-2xl outline-none shadow-sm text-sm" value={tempLocation} onChange={e => handleLocationSearch(e.target.value)} />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-2xl mt-1 z-[300] border border-stone-100 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <div key={i} onClick={() => { setTempLocation(s.display_name); setTempCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-3 hover:bg-blue-50 text-xs cursor-pointer border-b border-stone-50">{s.display_name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* رفع الصورة */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-blue-200 overflow-hidden">
                      {tempImage ? <img src={tempImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-blue-300"/>}
                    </div>
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl text-blue-600 font-bold text-xs shadow-sm"><Upload size={14}/> {tempImage ? 'Change Image' : 'Add Image'}</button>
                  </div>
                  
                  <button onClick={saveEditedEvent} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Check size={20}/> {editingEvent ? 'Update Changes' : 'Pin to Calendar'}
                  </button>
                  {editingEvent && <button onClick={() => setEditingEvent(null)} className="w-full py-2 text-blue-400 font-bold text-xs underline">Cancel Editing</button>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
