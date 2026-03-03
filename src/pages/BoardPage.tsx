import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, X, Check, MapPin, AlignLeft, 
  Clock, Utensils, Stethoscope, PartyPopper, Briefcase 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// أنواع المواعيد
const EVENT_TYPES = [
  { id: 'restaurant', icon: <Utensils size={18} />, label: 'Restaurant', color: 'bg-orange-100 text-orange-600' },
  { id: 'doctor', icon: <Stethoscope size={18} />, label: 'Doctor', color: 'bg-red-100 text-red-600' },
  { id: 'party', icon: <PartyPopper size={18} />, label: 'Party', color: 'bg-purple-100 text-purple-600' },
  { id: 'work', icon: <Briefcase size={18} />, label: 'Work', color: 'bg-blue-100 text-blue-600' },
  { id: 'other', icon: <Calendar size={18} />, label: 'Other', color: 'bg-stone-100 text-stone-600' },
];

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 14);
  return null;
}

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // حالات مودال التقويم
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [targetElement, setTargetElement] = useState<any>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('12:00');
  const [eventType, setEventType] = useState('other');
  const [eventLocation, setEventLocation] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [coords, setCoords] = useState<[number, number]>([24.7136, 46.6753]);

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

  useEffect(() => {
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  const searchLocation = async (query: string) => {
    setEventLocation(query);
    if (query.length < 3) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (e) {}
  };

  const addNote = async () => {
    const id = `note_${Date.now()}`;
    const newNote = { id, type: 'note', content: '', x: 50 + Math.random() * 50, y: 150, rotate: Math.random() * 4 - 2 };
    await updateDoc(boardDocRef, { elements: arrayUnion(newNote) });
  };

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
    toast.success('Pinned!', { id: 'up' });
  };

  const saveToCalendar = async () => {
    if (!eventDate) return toast.error('Select a date');
    try {
      const eventRef = doc(db, "events", userId);
      const newEvent = {
        id: `event_${Date.now()}`,
        title: targetElement.type === 'note' ? (targetElement.content || "New Plan") : "Photo Event",
        image: targetElement.type === 'image' ? targetElement.content : null,
        date: eventDate,
        time: eventTime,
        type: eventType,
        location: eventLocation,
        lat: coords[0],
        lng: coords[1],
        extraNote: eventNote,
        createdAt: new Date().toISOString()
      };
      await setDoc(eventRef, { events: arrayUnion(newEvent) }, { merge: true });
      toast.success('Scheduled!');
      setShowCalendarModal(false);
      setEventLocation(''); setEventNote('');
    } catch (error) { toast.error('Error saving'); }
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden touch-none bg-[#bc8a5f]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl active:scale-95 transition-all">
        <ChevronLeft size={24} />
      </button>

      {/* لوحة المسامير */}
      <div className="w-full h-full relative z-10" onClick={() => setActiveId(null)}>
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag dragMomentum={false}
              onDragStart={() => setActiveId(el.id)}
              initial={{ scale: 0 }}
              animate={{ scale: 1, x: el.x, y: el.y, rotate: el.rotate }}
              className="absolute cursor-grab active:cursor-grabbing p-4"
            >
              {/* المسمار الأحمر */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80]">
                <div className="w-4 h-4 bg-red-600 rounded-full shadow-md border-b-4 border-red-800" />
              </div>

              <div className={cn(
                "relative shadow-2xl bg-white transition-all",
                el.type === 'note' ? "bg-[#fff9c4] p-6 pt-10 min-w-[200px]" : "p-2 pb-10"
              )}>
                {el.type === 'note' ? (
                  <textarea 
                    className="w-full bg-transparent border-none outline-none text-xl font-bold font-serif" 
                    defaultValue={el.content}
                    onBlur={(e) => {
                      const updated = elements.map(item => item.id === el.id ? {...item, content: e.target.value} : item);
                      setDoc(boardDocRef, { elements: updated }, { merge: true });
                    }}
                  />
                ) : (
                  <img src={el.content} className="w-40 h-auto" onClick={() => setSelectedImage(el.content)} alt="" />
                )}

                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="bg-red-500 text-white p-1 rounded-md"><Trash2 size={12}/></button>
                </div>
                
                {/* أزرار التحكم الجانبية */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    <button onClick={() => { setTargetElement(el); setShowCalendarModal(true); }} className="bg-blue-600 text-white p-2 rounded-full shadow-lg active:scale-90 transition-all"><Calendar size={16}/></button>
                    <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="bg-white text-red-500 p-2 rounded-full shadow-lg active:scale-90 transition-all"><Trash2 size={16}/></button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* مودال التقويم المطور */}
      <AnimatePresence>
        {showCalendarModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3rem] p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black">Plan this Idea</h3>
                <button onClick={() => setShowCalendarModal(false)} className="p-2 bg-stone-100 rounded-full"><X/></button>
              </div>

              <div className="space-y-4">
                <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl font-bold" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                
                <div className="grid grid-cols-2 gap-3">
                   <div className="p-4 bg-stone-50 rounded-2xl flex items-center gap-2">
                      <Clock size={18} className="text-stone-400" />
                      <input type="time" className="bg-transparent font-bold outline-none" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                   </div>
                   <div className="p-4 bg-stone-50 rounded-2xl flex items-center gap-2 text-stone-400 font-bold text-sm">
                      <Check size={18} /> Auto Remind
                   </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {EVENT_TYPES.map(type => (
                    <button key={type.id} onClick={() => setEventType(type.id)} className={cn("p-3 rounded-2xl border-2 transition-all min-w-[70px] flex flex-col items-center gap-1", eventType === type.id ? "border-blue-500 bg-blue-50" : "border-stone-100")}>
                      <div className={cn("p-2 rounded-lg", type.color)}>{type.icon}</div>
                      <span className="text-[9px] font-black uppercase">{type.label}</span>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                  <input type="text" placeholder="Location..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl" value={eventLocation} onChange={(e) => searchLocation(e.target.value)} />
                </div>

                <div className="h-32 rounded-3xl overflow-hidden border-2 border-stone-100">
                  <MapContainer center={coords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>

                <textarea placeholder="Notes..." className="w-full p-4 bg-stone-100 rounded-2xl h-24 resize-none" value={eventNote} onChange={(e) => setEventNote(e.target.value)} />
              </div>

              <button onClick={saveToCalendar} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black mt-6 shadow-xl shadow-blue-200 active:scale-95 transition-all">Save Event</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* البنر السفلي (مرفوع للأعلى) */}
      <div className="fixed bottom-44 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={addNote} className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-sm active:scale-90 transition-all shadow-md">
            <Plus size={18} strokeWidth={3} />
            <span>ADD IDEA</span>
          </button>
          <div className="flex gap-2 pr-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-stone-800 text-white rounded-full active:scale-90">
              <ImageIcon size={22} />
            </button>
            <button onClick={() => toast.success('Syncing with Cloud...')} className="p-4 bg-emerald-500 text-white rounded-full active:scale-90">
              <Save size={22} />
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleUpload} />
    </div>
  );
}
