import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, X, MapPin, Clock, Utensils, Stethoscope, 
  PartyPopper, Briefcase, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

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
        await updateDoc(boardDocRef, { elements: arrayUnion({ id, type: 'image', content: url, x: 100, y: 200 }) });
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
      category: eventCategory, extraNote: eventNote, 
      lat: coords[0], lng: coords[1],
      image: targetElement.type === 'image' ? targetElement.content : null
    };
    await setDoc(eventRef, { events: arrayUnion(newEvent) }, { merge: true });
    setShowCalendarModal(false);
    toast.success('Saved to Calendar');
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-stone-100"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="absolute top-8 left-8 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl active:scale-90 transition-transform">
        <ChevronLeft size={24}/>
      </button>

      {/* Elements Area */}
      <div className="w-full h-full relative">
        {elements.map((el) => (
          <motion.div key={el.id} drag dragMomentum={false} initial={{ scale: 0 }} animate={{ scale: 1, x: el.x, y: el.y }} className="absolute p-4 touch-none">
            <div className={cn("relative shadow-2xl bg-white group", el.type === 'note' ? "bg-[#fff9c4] p-6 pt-10 min-w-[200px]" : "p-2 pb-8")}>
              {el.type === 'note' ? (
                <textarea 
                  className="bg-transparent border-none outline-none font-serif text-lg w-full h-32 resize-none" 
                  defaultValue={el.content} 
                  onBlur={(e) => {
                    const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                    setDoc(boardDocRef, { elements: updated }, { merge: true });
                  }} 
                />
              ) : ( 
                <img src={el.content} className="w-40 md:w-56 h-auto pointer-events-none select-none" alt="" /> 
              )}
              
              {/* Pin UI */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full shadow-inner" />

              <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setTargetElement(el); setShowCalendarModal(true); }} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-110"><Calendar size={18}/></button>
                <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="p-3 bg-white text-red-500 rounded-xl shadow-lg hover:scale-110"><Trash2 size={18}/></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* المرفوع للأعلى والمنسق بنسبة ١٠٠٪ */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-full px-6 flex justify-center">
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] p-2 flex items-center gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10">
          
          {/* زر إضافة نوت */}
          <button 
            onClick={() => updateDoc(boardDocRef, { elements: arrayUnion({ id: `n_${Date.now()}`, type: 'note', content: '', x: 100, y: 150 }) })} 
            className="h-14 px-8 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center gap-3 active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={3} />
            <span>ADD IDEA</span>
          </button>

          {/* زر إضافة صورة - نفس القياس (مربع بحواف دائرية ليتناسب مع الطول) */}
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="h-14 w-14 bg-stone-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-all border border-white/5"
          >
            <ImageIcon size={22} />
          </button>
          
        </div>
      </div>

      {/* Calendar Scheduling Modal */}
      <AnimatePresence>
        {showCalendarModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ y: 50, scale: 0.9 }} animate={{ y: 0, scale: 1 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-stone-900">Schedule Plan</h3>
                <button onClick={() => setShowCalendarModal(false)} className="p-3 bg-stone-100 rounded-full"><X/></button>
              </div>

              <div className="space-y-6">
                {/* Category Icons */}
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {EVENT_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setEventCategory(cat.id)} className={cn(
                      "min-w-[85px] p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                      eventCategory === cat.id ? "border-blue-500 bg-blue-50" : "border-stone-50 bg-white"
                    )}>
                      <div className={cn("p-2 rounded-xl", cat.color)}>{cat.icon}</div>
                      <span className="text-[10px] font-bold uppercase">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase ml-2">When?</label>
                    <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase ml-2">Time</label>
                    <input type="time" className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-2">Where?</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                    <input 
                      type="text" placeholder="Search for location..." 
                      className="w-full p-4 pl-12 bg-stone-100 rounded-2xl outline-none" 
                      value={eventLocation} 
                      onChange={e => {
                        setEventLocation(e.target.value);
                        if (e.target.value.length > 3) {
                          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${e.target.value}`).then(r => r.json()).then(d => setSuggestions(d.slice(0,3)));
                        }
                      }} 
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-50 border mt-2 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <div key={i} onClick={() => { setEventLocation(s.display_name); setCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-4 hover:bg-stone-50 text-xs cursor-pointer border-b last:border-0">{s.display_name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-40 rounded-3xl overflow-hidden border-4 border-stone-50 shadow-inner">
                  <MapContainer center={coords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>

                <textarea placeholder="Any extra notes for this plan?" className="w-full p-5 bg-stone-100 rounded-3xl h-28 text-sm outline-none resize-none" value={eventNote} onChange={e => setEventNote(e.target.value)} />

                <button onClick={saveToCalendar} className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black shadow-xl active:scale-95 transition-all">
                  CONFIRM & SAVE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleUpload} />
    </div>
  );
}
