import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, X, Check, MapPin, AlignLeft, 
  Clock, Utensils, Stethoscope, PartyPopper, Briefcase, Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SOUNDS = {
  PIN: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  TEAR: 'https://assets.mixkit.co/active_storage/sfx/31/31-preview.mp3',
  DRAG: 'https://assets.mixkit.co/active_storage/sfx/1113/1113-preview.mp3'
};

const EVENT_TYPES = [
  { id: 'restaurant', icon: <Utensils size={18} />, label: 'Resto', color: 'bg-orange-100 text-orange-600' },
  { id: 'doctor', icon: <Stethoscope size={18} />, label: 'Dr', color: 'bg-red-100 text-red-600' },
  { id: 'party', icon: <PartyPopper size={18} />, label: 'Party', color: 'bg-purple-100 text-purple-600' },
  { id: 'work', icon: <Briefcase size={18} />, label: 'Work', color: 'bg-blue-100 text-blue-600' },
];

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 14); }, [center, map]);
  return null;
}

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [targetElement, setTargetElement] = useState<any>(null);
  
  // Suggestion Logic
  const [eventLocation, setEventLocation] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [coords, setCoords] = useState<[number, number]>([24.7136, 46.6753]);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('12:00');

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

  const playSound = (url: string) => { const a = new Audio(url); a.volume = 0.2; a.play().catch(()=>{}); };

  useEffect(() => {
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleLocationInput = async (val: string) => {
    setEventLocation(val);
    if (val.length > 3) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (s: any) => {
    setEventLocation(s.display_name);
    setCoords([parseFloat(s.lat), parseFloat(s.lon)]);
    setSuggestions([]);
  };

  const addNote = async () => {
    playSound(SOUNDS.PIN);
    const id = `note_${Date.now()}`;
    await updateDoc(boardDocRef, { elements: arrayUnion({ id, type: 'note', content: '', x: 50, y: 150, rotate: 0 }) });
  };

  const saveToCalendar = async () => {
    if (!eventDate) return toast.error('Date required');
    const eventRef = doc(db, "events", userId);
    const newEvent = {
      id: `ev_${Date.now()}`,
      title: targetElement.content || "Idea from Board",
      date: eventDate, time: eventTime, location: eventLocation,
      lat: coords[0], lng: coords[1], image: targetElement.type === 'image' ? targetElement.content : null
    };
    await setDoc(eventRef, { events: arrayUnion(newEvent) }, { merge: true });
    setShowCalendarModal(false);
    toast.success('Scheduled!');
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-stone-100"><Loader2 className="animate-spin text-stone-400" /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f] select-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl"><ChevronLeft/></button>

      <div className="w-full h-full relative">
        {elements.map((el) => (
          <motion.div key={el.id} drag dragMomentum={false} initial={{ scale: 0 }} animate={{ scale: 1, x: el.x, y: el.y }} className="absolute p-4 touch-none">
            <div className={cn("relative shadow-2xl bg-white group", el.type === 'note' ? "bg-[#fff9c4] p-6 pt-10 min-w-[180px]" : "p-2 pb-8")}>
              {el.type === 'note' ? (
                <textarea className="bg-transparent border-none outline-none font-serif text-lg w-full" defaultValue={el.content} onBlur={(e) => {
                  const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                  setDoc(boardDocRef, { elements: updated }, { merge: true });
                }} />
              ) : ( <img src={el.content} className="w-32 md:w-48 h-auto" alt="" /> )}
              
              <div className="absolute -right-10 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setTargetElement(el); setShowCalendarModal(true); }} className="p-2 bg-blue-600 text-white rounded-full"><Calendar size={16}/></button>
                <button onClick={() => { playSound(SOUNDS.TEAR); updateDoc(boardDocRef, { elements: arrayRemove(el) }); }} className="p-2 bg-white text-red-500 rounded-full shadow-md"><Trash2 size={16}/></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* التعديل: البنر السفلي المتجاوب */}
      <div className="fixed bottom-10 md:bottom-16 left-1/2 -translate-x-1/2 z-[200] w-[95%] max-w-md">
        <div className="bg-stone-900/95 backdrop-blur-xl rounded-[2.5rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={addNote} className="px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black flex items-center gap-2 active:scale-95 transition-all">
            <Plus size={18} /> <span>NEW IDEA</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-stone-800 text-white rounded-full active:scale-90 transition-all">
            <ImageIcon size={22} />
          </button>
        </div>
      </div>

      {/* مودال الجدولة مع الاقتراحات */}
      <AnimatePresence>
        {showCalendarModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-white rounded-[2.5rem] p-6 w-full max-w-lg overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-stone-800">Schedule to Calendar</h3>
                <button onClick={() => setShowCalendarModal(false)} className="p-2 bg-stone-100 rounded-full"><X/></button>
              </div>
              <div className="space-y-4">
                <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                  <input type="text" placeholder="Search address..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl outline-none" value={eventLocation} onChange={e => handleLocationInput(e.target.value)} />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl mt-2 z-50 overflow-hidden border border-stone-100">
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => selectSuggestion(s)} className="p-4 hover:bg-blue-50 cursor-pointer text-sm border-b border-stone-50">{s.display_name}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="h-40 rounded-2xl overflow-hidden shadow-inner border border-stone-100">
                  <MapContainer center={coords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>
                <button onClick={saveToCalendar} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200">Save to Calendar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleUpload} />
    </div>
  );
}
