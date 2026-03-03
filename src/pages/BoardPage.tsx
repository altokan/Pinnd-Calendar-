import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, X, Check, MapPin, AlignLeft, 
  Clock, Bell, Edit2, Upload, Utensils, Stethoscope, PartyPopper, Briefcase, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// تعريف أنواع الأحداث مع الأيقونات والألوان
const EVENT_CATEGORIES = [
  { id: 'restaurant', icon: <Utensils size={18} />, label: 'Dinner', color: 'bg-orange-100 text-orange-600' },
  { id: 'doctor', icon: <Stethoscope size={18} />, label: 'Doctor', color: 'bg-red-100 text-red-600' },
  { id: 'party', icon: <PartyPopper size={18} />, label: 'Party', color: 'bg-purple-100 text-purple-600' },
  { id: 'work', icon: <Briefcase size={18} />, label: 'Work', color: 'bg-blue-100 text-blue-600' },
  { id: 'mood', icon: <Heart size={18} />, label: 'Mood', color: 'bg-pink-100 text-pink-600' },
];

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 14); }, [center, map]);
  return null;
}

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [targetElement, setTargetElement] = useState<any>(null);
  
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('12:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [eventCategory, setEventCategory] = useState('mood');
  const [coords, setCoords] = useState<[number, number]>([24.7136, 46.6753]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

  useEffect(() => {
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    toast.loading('Uploading...', { id: 'up' });
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const id = `img_${Date.now()}`;
        const sRef = ref(storage, `board/${userId}/${id}`);
        await uploadString(sRef, ev.target?.result as string, 'data_url');
        const url = await getDownloadURL(sRef);
        await updateDoc(boardDocRef, { elements: arrayUnion({ id, type: 'image', content: url, x: 100, y: 200, rotate: 0 }) });
      };
      reader.readAsDataURL(file);
    }
    toast.success('Added!', { id: 'up' });
  };

  const saveToCalendar = async () => {
    if (!eventDate) return toast.error('Date required');
    const eventRef = doc(db, "events", userId);
    const newEvent = {
      id: `ev_${Date.now()}`,
      title: targetElement.content || "Board Idea",
      date: eventDate, time: eventTime, location: eventLocation,
      category: eventCategory,
      extraNote: eventNote, lat: coords[0], lng: coords[1],
      image: targetElement.type === 'image' ? targetElement.content : null
    };
    await setDoc(eventRef, { events: arrayUnion(newEvent) }, { merge: true });
    setShowCalendarModal(false);
    toast.success('Saved to Calendar');
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-stone-100"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl active:scale-90"><ChevronLeft/></button>

      <div className="w-full h-full relative">
        {elements.map((el) => (
          <motion.div key={el.id} drag dragMomentum={false} initial={{ scale: 0 }} animate={{ scale: 1, x: el.x, y: el.y }} className="absolute p-4 touch-none">
            <div className={cn("relative shadow-2xl bg-white group", el.type === 'note' ? "bg-[#fff9c4] p-6 pt-10 min-w-[180px]" : "p-2 pb-8")}>
              {el.type === 'note' ? (
                <textarea className="bg-transparent border-none outline-none font-serif text-lg w-full h-24" defaultValue={el.content} onBlur={(e) => {
                  const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                  setDoc(boardDocRef, { elements: updated }, { merge: true });
                }} />
              ) : ( <img src={el.content} className="w-32 md:w-48 h-auto" alt="" /> )}
              <div className="absolute -right-10 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setTargetElement(el); setShowCalendarModal(true); }} className="p-2 bg-blue-600 text-white rounded-full shadow-lg"><Calendar size={16}/></button>
                <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="p-2 bg-white text-red-500 rounded-full shadow-lg"><Trash2 size={16}/></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="fixed bottom-12 md:bottom-20 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-xl rounded-[2.5rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={() => updateDoc(boardDocRef, { elements: arrayUnion({ id: `n_${Date.now()}`, type: 'note', content: '', x: 50, y: 150, rotate: 0 }) })} className="px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center gap-2 active:scale-95 transition-all">
            <Plus size={18} /> <span>ADD IDEA</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-stone-800 text-white rounded-full active:scale-90"><ImageIcon size={22} /></button>
        </div>
      </div>

      <AnimatePresence>
        {showCalendarModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-white rounded-[2.5rem] p-6 w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-stone-900">Plan Category</h3>
                <button onClick={() => setShowCalendarModal(false)} className="p-2 bg-stone-100 rounded-full"><X/></button>
              </div>

              {/* اختيار نوع الحدث بالأيقونات */}
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {EVENT_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setEventCategory(cat.id)} className={cn(
                    "min-w-[75px] p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    eventCategory === cat.id ? "border-blue-500 bg-blue-50" : "border-stone-50 bg-white"
                  )}>
                    <div className={cn("p-2 rounded-xl", cat.color)}>{cat.icon}</div>
                    <span className="text-[9px] font-bold uppercase">{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase ml-2">Date</label>
                    <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl outline-none text-sm font-bold" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase ml-2">Time</label>
                    <input type="time" className="w-full p-4 bg-stone-100 rounded-2xl outline-none text-sm font-bold" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                  </div>
                </div>

                <div className="relative space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase ml-2">Location</label>
                  <MapPin className="absolute left-4 top-11 text-stone-400" size={16} />
                  <input type="text" placeholder="Search address..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl outline-none text-sm" value={eventLocation} onChange={e => {
                    setEventLocation(e.target.value);
                    if (e.target.value.length > 3) {
                      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`).then(r => r.json()).then(d => setSuggestions(d.slice(0,3)));
                    }
                  }} />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-50 border overflow-hidden">
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => { setEventLocation(s.display_name); setCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-3 hover:bg-stone-50 text-[10px] cursor-pointer border-b">{s.display_name}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-32 rounded-2xl overflow-hidden border">
                  <MapContainer center={coords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>

                <textarea placeholder="Extra details/mood notes..." className="w-full p-4 bg-stone-100 rounded-2xl h-24 text-sm resize-none outline-none" value={eventNote} onChange={e => setEventNote(e.target.value)} />

                <button onClick={saveToCalendar} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">SAVE TO CALENDAR</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnPresence>

      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleUpload} />
    </div>
  );
}
