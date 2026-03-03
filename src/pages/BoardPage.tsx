import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, X, Check, MapPin, Edit3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

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
  
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [targetNote, setTargetNote] = useState<any>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [eventLocation, setEventLocation] = useState('');
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

  const handleDragEnd = async (id: string, info: any) => {
    const updated = elements.map(el => 
      el.id === id ? { ...el, x: el.x + info.offset.x, y: el.y + info.offset.y } : el
    );
    await setDoc(boardDocRef, { elements: updated }, { merge: true });
  };

  const handleLocationSearch = async (val: string) => {
    setEventLocation(val);
    if (val.length > 3) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 3));
    } else { setSuggestions([]); }
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
        location: eventLocation,
        extraNote: eventNote,
        lat: coords[0],
        lng: coords[1],
        sourceElementId: targetNote.id,
        image: targetNote.type === 'image' ? targetNote.content : null,
        createdAt: new Date().toISOString()
      };
      await setDoc(eventRef, { events: arrayUnion(newEvent) }, { merge: true });
      toast.success('Added as an Event!');
      setShowCalendarModal(false);
      setEventTitle(''); setEventDate(''); setEventLocation(''); setEventNote('');
    } catch (error) {
      toast.error('Failed to save event');
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
              onDragEnd={(_, info) => handleDragEnd(el.id, info)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, x: el.x, y: el.y, rotate: el.rotate }}
              whileDrag={{ scale: 1.05, zIndex: 100 }}
              className="absolute cursor-grab active:cursor-grabbing p-4"
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
                <div className="w-4 h-4 bg-red-600 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] border-b-4 border-red-800 relative">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent to-white/30 rounded-full" />
                </div>
                <div className="w-1 h-1 bg-black/20 rounded-full blur-[1px] mx-auto mt-0.5" />
              </div>

              <div className={cn(
                "relative shadow-2xl transition-all duration-200",
                el.type === 'note' 
                    ? "bg-[#fff9c4] p-6 pt-12 min-w-[200px] max-w-[280px] shadow-[8px_8px_20px_rgba(0,0,0,0.2)]" 
                    : "bg-white p-2 pb-12 shadow-xl border border-stone-200"
              )}>
                {el.type === 'note' && (
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#f0e68c] rotate-45 shadow-inner border-l border-t border-black/5 pointer-events-none" />
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
                    className="w-48 h-auto pointer-events-auto block grayscale-[0.1] cursor-zoom-in" 
                    alt="" 
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(el.content); }}
                  />
                )}

                <div className="absolute top-2 right-2 flex flex-col gap-2 z-[90]">
                  <button onClick={(e) => { e.stopPropagation(); removeElement(el); }} className="bg-red-600/90 text-white p-1.5 rounded-lg shadow-md hover:bg-red-700 active:scale-90 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setTargetNote(el);
                      setEventTitle(el.type === 'note' ? el.content : 'New Event');
                      setShowCalendarModal(true);
                    }} 
                    className="bg-blue-600/90 text-white p-1.5 rounded-lg shadow-md hover:bg-blue-700 active:scale-90 transition-colors"
                  >
                    <Calendar size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCalendarModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h3 className="text-2xl font-black text-stone-800 mb-6">Create Event</h3>
              
              <div className="space-y-4">
                {/* Title Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Event Title</label>
                  <input 
                    type="text" placeholder="Enter title..." 
                    className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold text-stone-700"
                    value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                  />
                </div>

                {/* Date Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Pick Date</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold text-stone-700"
                    value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>

                {/* Location Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                    <input 
                      type="text" placeholder="Search address..." 
                      className="w-full p-4 pl-12 bg-stone-100 rounded-2xl outline-none font-bold text-stone-700"
                      value={eventLocation} onChange={(e) => handleLocationSearch(e.target.value)}
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-[1200] border mt-1 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <div key={i} onClick={() => { 
                            setEventLocation(s.display_name); 
                            setCoords([parseFloat(s.lat), parseFloat(s.lon)]); 
                            setSuggestions([]); 
                          }} className="p-4 hover:bg-blue-50 text-xs cursor-pointer border-b last:border-0">{s.display_name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Map */}
                <div className="h-32 rounded-2xl overflow-hidden border">
                  <MapContainer center={coords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <Marker position={coords} />
                    <ChangeView center={coords} />
                  </MapContainer>
                </div>

                {/* Notes Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Additional Notes</label>
                  <textarea 
                    placeholder="Write something extra..."
                    className="w-full p-4 bg-stone-100 rounded-2xl h-24 outline-none resize-none font-medium text-stone-700"
                    value={eventNote} onChange={(e) => setEventNote(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowCalendarModal(false)} className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold">Cancel</button>
                  <button onClick={saveToCalendar} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-colors">
                    <Check size={20} /> Save Event
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.img 
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              src={selectedImage} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" alt="Preview"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={addNote} className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-sm active:scale-90 transition-all shadow-md">
            <Plus size={18} strokeWidth={3} />
            <span>ADD IDEA</span>
          </button>
          <div className="flex gap-2 pr-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-stone-800 text-white rounded-full active:scale-90 h-14 w-14 flex items-center justify-center">
              <ImageIcon size={22} />
            </button>
            <button onClick={() => toast.success('Saved to cloud')} className="p-4 bg-emerald-500 text-white rounded-full active:scale-90 h-14 w-14 flex items-center justify-center">
              <Save size={22} />
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleUpload} />
    </div>
  );
}
