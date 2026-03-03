import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, X, Check, MapPin, Clock, Utensils, 
  Stethoscope, PartyPopper, Briefcase, Heart 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// تصنيفات الأحداث مع الأيقونات
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // حالات التقويم والجدولة الجديدة
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
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  const addNote = async () => {
    const id = `note_${Date.now()}`;
    const newNote = { id, type: 'note', content: '', x: 50 + Math.random() * 50, y: 150, rotate: Math.random() * 4 - 2 };
    await updateDoc(boardDocRef, { elements: arrayUnion(newNote) });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    toast.loading('Fixing images...', { id: 'up' });
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const id = `img_${Date.now()}_${Math.random()}`;
        const sRef = ref(storage, `board/${userId}/${id}`);
        await uploadString(sRef, ev.target?.result as string, 'data_url');
        const url = await getDownloadURL(sRef);
        const newImg = { id, type: 'image', content: url, x: 100, y: 200, rotate: Math.random() * 8 - 4 };
        await updateDoc(boardDocRef, { elements: arrayUnion(newImg) });
      };
      reader.readAsDataURL(file);
    }
    toast.success('Pinned!', { id: 'up' });
  };

  // دالة البحث التلقائي عن الموقع
  const handleLocationSearch = async (val: string) => {
    setEventLocation(val);
    if (val.length > 3) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 4));
    } else { setSuggestions([]); }
  };

  const removeElement = async (el: any) => {
    await updateDoc(boardDocRef, { elements: arrayRemove(el) });
    toast.success('Removed');
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>, id: string) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
    const updated = elements.map(item => item.id === id ? {...item, content: target.value} : item);
    setDoc(boardDocRef, { elements: updated }, { merge: true });
  };

  const saveToCalendar = async () => {
    if (!eventDate || !eventTitle) {
      toast.error('Title and Date required');
      return;
    }
    try {
      const eventRef = doc(db, "events", userId);
      const newEvent = {
        id: `event_${Date.now()}`,
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        location: eventLocation,
        category: eventCategory,
        extraNote: eventNote,
        lat: coords[0],
        lng: coords[1],
        image: targetElement.type === 'image' ? targetElement.content : null,
        createdAt: new Date().toISOString()
      };
      await setDoc(eventRef, { events: arrayUnion(newEvent) }, { merge: true });
      toast.success('Added to Calendar!');
      setShowCalendarModal(false);
      setEventTitle(''); setEventLocation(''); setEventDate('');
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden touch-none bg-[#bc8a5f]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl active:scale-95 transition-all">
        <ChevronLeft size={24} />
      </button>

      <div className="w-full h-full relative z-10" onClick={() => setActiveId(null)}>
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag dragMomentum={false}
              onDragStart={() => setActiveId(el.id)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, x: el.x, y: el.y, rotate: el.rotate }}
              whileDrag={{ scale: 1.05, zIndex: 100 }}
              className="absolute cursor-grab active:cursor-grabbing p-4"
            >
              {/* الدبوس الأحمر الواقعي */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
                <div className="w-5 h-5 bg-red-600 rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4),0_3px_6px_rgba(0,0,0,0.5)] border border-red-700 relative">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent to-white/30 rounded-full" />
                </div>
                <div className="w-1 h-3 bg-stone-400 mx-auto -mt-1 shadow-sm opacity-50" />
              </div>

              <div className={cn(
                "relative shadow-2xl transition-all duration-200 group",
                el.type === 'note' 
                    ? "bg-[#fff9c4] p-6 pt-12 min-w-[200px] max-w-[280px]" 
                    : "bg-white p-2 pb-12 shadow-xl border border-stone-200"
              )}
              style={el.type === 'note' ? {
                clipPath: "polygon(0% 0%, 100% 0%, 100% 88%, 88% 100%, 0% 100%)",
                boxShadow: "5px 5px 15px rgba(0,0,0,0.15)"
              } : {}}>
                
                {/* طعجة الورقة الواقعية */}
                {el.type === 'note' && (
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#f0e68c] shadow-[inset_5px_5px_10px_rgba(0,0,0,0.1)] pointer-events-none" 
                       style={{ clipPath: "polygon(0% 100%, 100% 0%, 0% 0%)" }} />
                )}

                {el.type === 'note' ? (
                  <textarea
                    style={{ fontFamily: "'Caveat', cursive" }}
                    rows={1}
                    className="w-full bg-transparent border-none outline-none resize-none text-stone-800 leading-tight text-2xl font-bold overflow-hidden"
                    placeholder="Write your idea here..."
                    defaultValue={el.content}
                    onInput={(e) => handleInput(e as any, el.id)}
                  />
                ) : (
                  <img 
                    src={el.content} 
                    className="w-48 h-auto pointer-events-auto block grayscale-[0.1] rounded-sm" 
                    alt="" 
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(el.content); }}
                  />
                )}

                {/* أزرار التحكم المختفية التي تظهر عند الـ Hover */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-[90]">
                  <button onClick={(e) => { e.stopPropagation(); removeElement(el); }} className="bg-red-500/80 text-white p-2 rounded-lg shadow-md hover:bg-red-600 active:scale-90">
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setTargetElement(el);
                      setEventTitle(el.type === 'note' ? el.content : 'New Photo Plan');
                      setShowCalendarModal(true);
                    }} 
                    className="bg-blue-600/80 text-white p-2 rounded-lg shadow-md hover:bg-blue-700 active:scale-90"
                  >
                    <Calendar size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* نافذة التقويم مع التصنيفات والبحث والخريطة */}
      <AnimatePresence>
        {showCalendarModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-stone-900">Add to Calendar</h3>
                <button onClick={() => setShowCalendarModal(false)} className="p-2 bg-stone-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                <input 
                   type="text" placeholder="Title" 
                   className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold" 
                   value={eventTitle} onChange={e => setEventTitle(e.target.value)} 
                />

                {/* شريط التصنيفات (أيقونات) */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {EVENT_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setEventCategory(cat.id)} className={cn(
                      "min-w-[70px] p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1",
                      eventCategory === cat.id ? "border-blue-500 bg-blue-50" : "border-stone-50 bg-white"
                    )}>
                      <div className={cn("p-2 rounded-xl", cat.color)}>{cat.icon}</div>
                      <span className="text-[9px] font-bold uppercase">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl font-bold" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                  <input type="time" className="w-full p-4 bg-stone-100 rounded-2xl font-bold" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                </div>

                {/* الموقع مع الاقتراحات */}
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                  <input 
                    type="text" placeholder="Search address..." 
                    className="w-full p-4 pl-12 bg-stone-100 rounded-2xl outline-none" 
                    value={eventLocation} onChange={e => handleLocationSearch(e.target.value)} 
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-[1200] border mt-1 overflow-hidden">
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => { 
                          setEventLocation(s.display_name); 
                          setCoords([parseFloat(s.lat), parseFloat(s.lon)]); 
                          setSuggestions([]); 
                        }} className="p-4 hover:bg-blue-50 text-xs border-b last:border-0 cursor-pointer">{s.display_name}</div>
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

                <div className="flex gap-3">
                  <button onClick={() => setShowCalendarModal(false)} className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold active:scale-95 transition-all">Cancel</button>
                  <button onClick={saveToCalendar} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"><Check size={20} /> Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نافذة عرض الصورة المكبرة */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full" onClick={() => setSelectedImage(null)}>
              <X size={32} />
            </motion.button>
            <motion.img 
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              src={selectedImage} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" alt="Preview"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* البنر السفلي المرفوع والمنسق */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={addNote} className="flex items-center gap-2 px-8 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-sm active:scale-90 transition-all shadow-md">
            <Plus size={18} strokeWidth={3} />
            <span>ADD IDEA</span>
          </button>
          <div className="flex gap-2 pr-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-stone-800 text-white rounded-full active:scale-90 flex items-center justify-center h-14 w-14 border border-white/10">
              <ImageIcon size={22} />
            </button>
            <button onClick={() => toast.success('Board saved!')} className="p-4 bg-emerald-500 text-white rounded-full active:scale-90 flex items-center justify-center h-14 w-14">
              <Save size={22} />
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleUpload} />
    </div>
  );
}
