import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Plus, Calendar as CalendarIcon, Clock, MapPin, 
  Trash2, Edit3, X, Check, ImageIcon, Utensils, Stethoscope, 
  ShoppingBag, Plane, PartyPopper, Bell, Loader2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth, storage } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// أنواع الأحداث مع الأيقونات
const EVENT_TYPES = [
  { id: 'party', icon: <PartyPopper size={18} />, label: 'حفلة' },
  { id: 'meeting', icon: <CalendarIcon size={18} />, label: 'موعد' },
  { id: 'restaurant', icon: <Utensils size={18} />, label: 'مطعم' },
  { id: 'doctor', icon: <Stethoscope size={18} />, label: 'طبيب' },
  { id: 'shopping', icon: <ShoppingBag size={18} />, label: 'تسوق' },
  { id: 'travel', icon: <Plane size={18} />, label: 'سفر' },
  { id: 'other', icon: <Bell size={18} />, label: 'أخرى' },
];

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 14); }, [center]);
  return null;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // حالات الحقول
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('other');
  const [imageUrl, setImageUrl] = useState('');
  const [coords, setCoords] = useState<[number, number]>([24.7136, 46.6753]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const userId = auth.currentUser?.uid || "guest";
  const eventDocRef = doc(db, "events", userId);

  useEffect(() => {
    const unsub = onSnapshot(eventDocRef, (d) => {
      if (d.exists()) {
        const sorted = (d.data().events || []).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setEvents(sorted);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleLocationSearch = async (val: string) => {
    setLocation(val);
    if (val.length >= 3) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 3));
    } else { setSuggestions([]); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTitle(''); setDate(''); setTime(''); setLocation('');
    setType('other'); setImageUrl(''); setIsEditing(false);
    setSelectedEvent(null); setSuggestions([]);
  };

  const handleSave = async () => {
    if (!title || !date) return toast.error("يرجى إكمال البيانات الأساسية");
    
    const eventData = {
      id: isEditing ? selectedEvent.id : `event_${Date.now()}`,
      title, date, time, location, type, imageUrl,
      lat: coords[0], lng: coords[1],
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEditing) {
        const updated = events.map(e => e.id === selectedEvent.id ? eventData : e);
        await setDoc(eventDocRef, { events: updated }, { merge: true });
      } else {
        await updateDoc(eventDocRef, { events: arrayUnion(eventData) });
      }
      toast.success(isEditing ? "تم التعديل" : "تمت الإضافة");
      setShowModal(false);
      resetForm();
    } catch (e) { toast.error("حدث خطأ"); }
  };

  const handleDelete = async (event: any) => {
    await updateDoc(eventDocRef, { events: arrayRemove(event) });
    toast.success("تم الحذف");
    setShowModal(false);
    setSelectedEvent(null);
  };

  if (loading) return <div className="fixed inset-0 bg-[#f8f9fa] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24">
      {/* Header */}
      <div className="p-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-3 bg-stone-100 rounded-2xl"><ChevronLeft /></button>
        <h1 className="text-xl font-black text-stone-800">الجدول الزمني</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200"><Plus /></button>
      </div>

      {/* Timeline List */}
      <div className="p-6 space-y-8 relative">
        <div className="absolute left-[31px] top-10 bottom-10 w-0.5 bg-stone-200" />
        {events.map((ev, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            key={ev.id} className="flex gap-6 relative"
            onClick={() => { setSelectedEvent(ev); setShowModal(true); setIsEditing(false); }}
          >
            <div className="w-8 h-8 rounded-full bg-white border-4 border-blue-600 z-10 flex-shrink-0" />
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-stone-100 flex-1 hover:shadow-md transition-all active:scale-[0.98]">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">
                  {ev.date}
                </span>
                <div className="text-stone-400">{EVENT_TYPES.find(t => t.id === ev.type)?.icon}</div>
              </div>
              <h3 className="text-lg font-bold text-stone-800">{ev.title}</h3>
              {ev.location && <div className="flex items-center gap-1 text-stone-500 text-xs mt-1"><MapPin size={12}/> {ev.location}</div>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal - View / Edit / Create */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white w-full max-w-lg rounded-[3rem] p-8 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between mb-6">
                <h2 className="text-2xl font-black">{isEditing ? "تعديل الحدث" : selectedEvent ? "تفاصيل الحدث" : "حدث جديد"}</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 bg-stone-100 rounded-full"><X /></button>
              </div>

              <div className="space-y-5">
                {/* Mode: View */}
                {selectedEvent && !isEditing ? (
                  <div className="space-y-6">
                    {selectedEvent.imageUrl && <img src={selectedEvent.imageUrl} className="w-full h-48 object-cover rounded-[2rem]" />}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-stone-50 rounded-2xl"><div className="text-xs text-stone-400 mb-1">التاريخ</div><div className="font-bold flex items-center gap-2"><CalendarIcon size={16}/> {selectedEvent.date}</div></div>
                      <div className="p-4 bg-stone-50 rounded-2xl"><div className="text-xs text-stone-400 mb-1">الوقت</div><div className="font-bold flex items-center gap-2"><Clock size={16}/> {selectedEvent.time || '--:--'}</div></div>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl"><div className="text-xs text-stone-400 mb-1">الموقع</div><div className="font-bold flex items-center gap-2 text-sm"><MapPin size={16}/> {selectedEvent.location || 'لا يوجد موقع'}</div></div>
                    
                    <div className="flex gap-3">
                      <button onClick={() => { 
                        setTitle(selectedEvent.title); setDate(selectedEvent.date); setTime(selectedEvent.time); 
                        setLocation(selectedEvent.location); setType(selectedEvent.type); setImageUrl(selectedEvent.imageUrl);
                        setIsEditing(true); 
                      }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"><Edit3 size={18}/> تعديل</button>
                      <button onClick={() => handleDelete(selectedEvent)} className="p-4 bg-red-50 text-red-600 rounded-2xl"><Trash2 /></button>
                    </div>
                  </div>
                ) : (
                  /* Mode: Create / Edit */
                  <>
                    <div className="space-y-4">
                      <input type="text" placeholder="اسم الحدث" className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold" value={title} onChange={e => setTitle(e.target.value)} />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="date" className="p-4 bg-stone-100 rounded-2xl font-bold" value={date} onChange={e => setDate(e.target.value)} />
                        <input type="time" className="p-4 bg-stone-100 rounded-2xl font-bold" value={time} onChange={e => setTime(e.target.value)} />
                      </div>
                      
                      {/* Event Types */}
                      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {EVENT_TYPES.map(cat => (
                          <button key={cat.id} onClick={() => setType(cat.id)} className={cn("min-w-[70px] p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1", type === cat.id ? "border-blue-500 bg-blue-50" : "border-stone-50 bg-white")}>
                            <div className="p-2 bg-stone-100 rounded-xl">{cat.icon}</div>
                            <span className="text-[10px] font-bold">{cat.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Location Search & Map */}
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                        <input type="text" placeholder="ابحث عن عنوان..." className="w-full p-4 pl-12 bg-stone-100 rounded-2xl outline-none" value={location} onChange={e => handleLocationSearch(e.target.value)} />
                        {suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl z-[100] border overflow-hidden">
                            {suggestions.map((s, i) => (
                              <div key={i} onClick={() => { setLocation(s.display_name); setCoords([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }} className="p-4 hover:bg-blue-50 text-xs border-b cursor-pointer">{s.display_name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="h-32 rounded-3xl overflow-hidden border">
                        <MapContainer center={coords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                          <Marker position={coords} />
                          <ChangeView center={coords} />
                        </MapContainer>
                      </div>

                      {/* Image Upload */}
                      <div className="relative group border-2 border-dashed border-stone-200 rounded-[2rem] p-4 flex flex-col items-center justify-center min-h-[120px]">
                        {imageUrl ? (
                          <div className="relative w-full h-32">
                            <img src={imageUrl} className="w-full h-full object-cover rounded-xl" />
                            <button onClick={() => setImageUrl('')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X size={14}/></button>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="text-stone-300 mb-2" size={32} />
                            <label className="text-sm font-bold text-blue-600 cursor-pointer">
                              أضف صورة للحدث
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                          </>
                        )}
                      </div>

                      <button onClick={handleSave} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-all">
                        <Check size={22} /> {isEditing ? "حفظ التعديلات" : "تأكيد الإضافة"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
