import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, X, MapPin, Clock, Utensils, Stethoscope, 
  PartyPopper, Briefcase, Heart, Check
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
  
  const [eventTitle, setEventTitle] = useState('');
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

  const handleLocationSearch = async (val: string) => {
    setEventLocation(val);
    if (val.length > 3) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 4));
    } else { setSuggestions([]); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    toast.loading('Pinning photo...', { id: 'up' });
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const id = `img_${Date.now()}`;
        const sRef = ref(storage, `board/${userId}/${id}`);
        await uploadString(sRef, ev.target?.result as string, 'data_url');
        const url = await getDownloadURL(sRef);
        await updateDoc(boardDocRef, { elements: arrayUnion({ id, type: 'image', content: url, x: 150, y: 150 }) });
      };
      reader.readAsDataURL(file);
    }
    toast.success('Done!', { id: 'up' });
  };

  const saveToCalendar = async () => {
    if (!eventDate || !eventTitle) return toast.error('Title & Date required');
    const eventRef = doc(db, "events", userId);
    await setDoc(eventRef, { 
      events: arrayUnion({
        id: `ev_${Date.now()}`, title: eventTitle, date: eventDate, time: eventTime,
        location: eventLocation, category: eventCategory, extraNote: eventNote,
        lat: coords[0], lng: coords[1], image: targetElement.type === 'image' ? targetElement.content : null
      }) 
    }, { merge: true });
    setShowCalendarModal(false);
    toast.success('Added to Calendar');
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-stone-100"><Loader2 className="animate-spin text-stone-400" /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      
      <button onClick={() => navigate(-1)} className="absolute top-8 left-8 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl active:scale-90"><ChevronLeft size={24}/></button>

      <div className="w-full h-full relative">
        {elements.map((el) => (
          <motion.div key={el.id} drag dragMomentum={false} initial={{ scale: 0 }} animate={{ scale: 1, x: el.x, y: el.y }} className="absolute p-4 touch-none cursor-grab active:cursor-grabbing">
            
            {/* تصميم النوتة الورقية المطعوجة */}
            <div className={cn(
              "relative shadow-xl group transition-transform", 
              el.type === 'note' 
                ? "bg-[#fff27d] p-6 pt-12 min-w-[220px] min-h-[220px] text-stone-800" 
                : "bg-white p-2 pb-10 border border-stone-200"
            )}
            style={el.type === 'note' ? {
              clipPath: "polygon(0% 0%, 100% 0%, 100% 85%, 85% 100%, 0% 100%)",
              boxShadow: "5px 5px 15px rgba(0,0,0,0.2)"
            } : {}}>
              
              {/* طعجة الورقة (Bottom Right Corner Fold) */}
              {el.type === 'note' && (
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#e6d85a] shadow-[inset_5px_5px_10px_rgba(0,0,0,0.1)]" 
                     style={{ clipPath: "polygon(0% 100%, 100% 0%, 0% 0%)" }} />
              )}

              {el.type === 'note' ? (
                <textarea 
                  className="bg-transparent border-none outline-none font-serif text-lg w-full h-32 resize-none leading-relaxed" 
                  defaultValue={el.content} 
                  placeholder="Start writing..."
                  onBlur={(e) => {
                    const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                    setDoc(boardDocRef, { elements: updated }, { merge: true });
                  }} 
                />
              ) : ( 
                <img src={el.content} className="w-44 md:w-60 h-auto rounded-sm pointer-events-none" alt="" /> 
              )}
              
              {/* الدبوس الأحمر الواقعي */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                <div className="w-5 h-5 bg-red-600 rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4),0_3px_6px_rgba(0,0,0,0.5)] border border-red-700" />
                <div className="w-[2px] h-3 bg-stone-400 mx-auto -mt-1 shadow-sm" />
              </div>

              {/* أزرار التحكم على زوايا النوتة */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { 
                  setTargetElement(el); 
                  setEventTitle(el.type === 'note' ? el.content : 'New Photo');
                  setShowCalendarModal(true); 
                }} className="p-2 bg-blue-500/20 text-blue-700 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Calendar size={14}/></button>
                <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="p-2 bg-red-500/20 text-red-700 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* البنر السفلي المنسق */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] w-full px-6 flex justify-center">
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-full p-2 flex items-center gap-2 shadow-2xl border border-white/10">
          <button 
            onClick={() => updateDoc(boardDocRef, { elements: arrayUnion({ id: `n_${Date.now()}`, type: 'note', content: '', x: 100, y: 150 }) })} 
            className="h-14 px-10 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center gap-3 active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={3} /> <span>ADD NOTE</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="h-14 w-14 bg-stone-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-all border border-white/5"
          >
            <ImageIcon size={22} />
          </button>
        </div>
      </div>

      {/* مودال الجدولة مع البحث الذكي */}
      <AnimatePresence>
        {showCalendarModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg overflow-y-auto max-h-[90vh] shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-stone-900">Schedule Event</h3>
                <button onClick={() => setShowCalendarModal(false)} className="p-2 bg-stone-100 rounded-full"><X/></button>
              </div>

              <div className="space-y-5">
                <input type="text" className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Title" />
                
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {EVENT_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setEventCategory(cat.id)} className={cn(
                      "min-w-[80px] p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1",
                      eventCategory === cat.id ? "border-blue-500 bg-blue-50" : "border-stone-50 bg-white"
                    )}>
                      <div className={cn("p-2 rounded-xl", cat.color)}>{cat.icon}</div>
                      <span className="text-[9px] font-bold uppercase">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl font-bold" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                  <input type="time" className="w-full p-4 bg-stone-100 rounded-2xl font-bold" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                  <input type="text" placeholder="Search Location..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl outline-none" value={eventLocation} onChange={e => handleLocationSearch(e.target.value)} />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-[1200] border mt-1 overflow-hidden">
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => { setEventLocation(s.display_name); setCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-4 hover:bg-blue-50 text-xs border-b last:border-0 cursor-pointer">{s.display_name}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-40 rounded-3xl overflow-hidden shadow-inner">
                  <MapContainer center={coords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>

                <textarea placeholder="Notes..." className="w-full p-4 bg-stone-100 rounded-2xl h-24 outline-none resize-none" value={eventNote} onChange={e => setEventNote(e.target.value)} />

                <button onClick={saveToCalendar} className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                   <Check size={20} /> SAVE
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
