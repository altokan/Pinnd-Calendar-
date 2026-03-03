import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronLeft, ImageIcon, Plus, Calendar, Loader2, Save, X, Check, MapPin, AlignLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// مكون لتحديث مركز الخريطة المصغرة
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
  
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [targetElement, setTargetElement] = useState<any>(null);
  const [eventDate, setEventDate] = useState('');
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

  // دالة البحث عن العنوان (Geocoding)
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

  const saveToCalendar = async () => {
    if (!eventDate) return toast.error('Please select a date');
    try {
      const eventRef = doc(db, "events", userId);
      const newEvent = {
        id: `event_${Date.now()}`,
        title: targetElement.type === 'note' ? (targetElement.content || "New Note") : "Photo Event",
        image: targetElement.type === 'image' ? targetElement.content : null,
        date: eventDate,
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
    } catch (error) { toast.error('Error'); }
  };

  const addNote = async () => {
    const id = `note_${Date.now()}`;
    const newNote = { id, type: 'note', content: '', x: 100, y: 150, rotate: 0 };
    await updateDoc(boardDocRef, { elements: arrayUnion(newNote) });
  };

  const handleUpload = async (e: any) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const id = `img_${Date.now()}`;
        const sRef = ref(storage, `board/${userId}/${id}`);
        await uploadString(sRef, ev.target?.result as string, 'data_url');
        const url = await getDownloadURL(sRef);
        await updateDoc(boardDocRef, { elements: arrayUnion({ id, type: 'image', content: url, x: 150, y: 200, rotate: 0 }) });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-[100] p-3 bg-white rounded-2xl shadow-xl"><ChevronLeft /></button>

      <div className="w-full h-full relative" onClick={() => setActiveId(null)}>
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div key={el.id} drag dragMomentum={false} initial={{ scale: 0 }} animate={{ scale: 1, x: el.x, y: el.y }} className="absolute p-4">
              <div className={cn("relative shadow-2xl bg-white p-4", el.type === 'note' ? "bg-[#fff9c4] min-w-[200px]" : "p-2 pb-10")}>
                {el.type === 'note' ? (
                  <textarea className="w-full bg-transparent border-none outline-none text-xl font-bold" defaultValue={el.content} onBlur={(e) => {
                    const updated = elements.map(item => item.id === el.id ? {...item, content: e.target.value} : item);
                    setDoc(boardDocRef, { elements: updated }, { merge: true });
                  }} />
                ) : ( <img src={el.content} className="w-40" onClick={() => setSelectedImage(el.content)} /> )}
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="bg-red-500 text-white p-1 rounded-md"><Trash2 size={12}/></button>
                  <button onClick={() => { setTargetElement(el); setShowCalendarModal(true); }} className="bg-blue-500 text-white p-1 rounded-md"><Calendar size={12}/></button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCalendarModal && (
          <motion.div className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-4">
            <motion.div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black mb-6">Schedule Event</h3>
              <div className="space-y-4">
                <input type="date" className="w-full p-4 bg-stone-100 rounded-2xl" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                  <input type="text" placeholder="Search address..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl" value={eventLocation} onChange={(e) => searchLocation(e.target.value)} />
                </div>
                {/* الخريطة المصغرة التفاعلية */}
                <div className="h-40 w-full rounded-2xl overflow-hidden border-2 border-stone-100">
                  <MapContainer center={coords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>
                <textarea placeholder="Description..." className="w-full p-4 bg-stone-100 rounded-2xl" value={eventNote} onChange={(e) => setEventNote(e.target.value)} />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCalendarModal(false)} className="flex-1 py-4 bg-stone-100 rounded-2xl font-bold">Cancel</button>
                <button onClick={saveToCalendar} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 bg-black/80 p-4 rounded-full">
        <button onClick={addNote} className="bg-yellow-400 p-4 rounded-full"><Plus/></button>
        <button onClick={() => fileInputRef.current?.click()} className="bg-white/20 p-4 rounded-full text-white"><ImageIcon/></button>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} multiple />
    </div>
  );
}
