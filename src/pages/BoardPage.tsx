import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, Bell, ArrowLeft, ArrowRight, BellOff,
  MapPin, X, Check, Utensils, Music, Stethoscope, Briefcase, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const EVENT_TYPES = [
  { id: 'food', icon: Utensils }, { id: 'music', icon: Music },
  { id: 'med', icon: Stethoscope }, { id: 'work', icon: Briefcase }, { id: 'star', icon: Star },
];

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventData, setEventData] = useState({ title: '', time: '12:00', type: 'star', alert: false });

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", `${userId}_${selectedDate}`);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      else setElements([]);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedDate, userId]);

  // ١- إصلاح إضافة الصور: استخدام النسخة الأحدث من المصفوفة لضمان الظهور الفوري
  const addNewElement = async (type: 'note' | 'image', content: string = '') => {
    try {
      const docSnap = await getDoc(boardDocRef);
      const currentElements = docSnap.exists() ? docSnap.data().elements || [] : [];
      
      const newEl = {
        id: `${type === 'note' ? 'n' : 'i'}_${Date.now()}`,
        type,
        content,
        x: 50 + (currentElements.length * 20) % 150,
        y: 150 + (currentElements.length * 20) % 150,
        rotate: Math.floor(Math.random() * 6) - 3,
        alertEnabled: false 
      };

      const updatedElements = [...currentElements, newEl];
      await setDoc(boardDocRef, { elements: updatedElements }, { merge: true });
      toast.success(type === 'note' ? 'Note Pinned' : 'Image Pinned');
    } catch (e) {
      console.error(e);
      toast.error("Error adding element");
    }
  };

  // ٣- حفظ الحدث في مجموعة events ليعرض في التقويم باليوم المحدد
  const handleSaveToCalendar = async () => {
    try {
      await addDoc(collection(db, "events"), {
        ...eventData,
        userId,
        date: selectedDate, // اليوم المختار في البورد
        createdAt: Timestamp.now()
      });
      setShowEventModal(false);
      toast.success("Event Added to Calendar!");
    } catch (e) {
      toast.error("Failed to save event");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => addNewElement('image', ev.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  // ٢- إصلاح التنقل بالتاريخ: إضافة stopPropagation لمنع تداخل سحب البورد مع النقر
  const changeDay = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f] touch-none">
      <div className="absolute inset-0 z-0 shadow-inner" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')`, backgroundColor: '#bc8a5f' }} />
      
      {/* ٢- تعديل بنر التاريخ: رفع الـ z-index وتفعيل التفاعل */}
      <div className="absolute top-6 left-0 right-0 z-[1001] flex justify-center px-4">
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-[2rem] shadow-2xl flex items-center gap-2 border border-white/20 pointer-events-auto">
          <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="p-2 hover:bg-stone-100 rounded-full active:scale-90"><ChevronLeft size={20}/></button>
          <div className="h-6 w-[1px] bg-stone-200 mx-1" />
          <button onClick={(e) => { e.stopPropagation(); changeDay(-1); }} className="p-2 hover:bg-stone-50 rounded-full text-stone-400 active:scale-90"><ArrowLeft size={18}/></button>
          
          <div className="relative flex items-center px-2 min-w-[100px] justify-center pointer-events-auto">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
            <span className="font-black text-xs uppercase tracking-tighter text-stone-800 pointer-events-none">
              {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button onClick={(e) => { e.stopPropagation(); changeDay(1); }} className="p-2 hover:bg-stone-50 rounded-full text-stone-400 active:scale-90"><ArrowRight size={18}/></button>
        </div>
      </div>

      <motion.div 
        drag dragConstraints={{ left: -window.innerWidth, right: 0, top: -window.innerHeight, bottom: 0 }}
        className="w-[200vw] h-[200vh] relative cursor-move z-10"
      >
        {elements.map((el) => (
          <motion.div
            key={el.id} drag dragMomentum={false}
            onDragEnd={async (_, info) => {
              const updated = elements.map(item => item.id === el.id ? { ...item, x: item.x + info.offset.x, y: item.y + info.offset.y } : item);
              await updateDoc(boardDocRef, { elements: updated });
            }}
            animate={{ x: el.x, y: el.y, rotate: el.rotate }}
            className="absolute p-6 z-20 group"
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
              <div className="w-5 h-5 bg-red-600 rounded-full border-b-4 border-red-800 shadow-md" />
              <div className="w-0.5 h-4 bg-stone-400 mx-auto -mt-1" />
            </div>

            <div className={cn(
              "relative shadow-xl transition-all flex flex-col items-center",
              el.type === 'note' ? "bg-[#fff9c4] p-5 pt-12 rounded-sm" : "bg-white p-2 pb-12 border-[8px] border-white shadow-lg"
            )}
            style={{ width: el.type === 'note' ? 'auto' : '220px', minWidth: el.type === 'note' ? '160px' : 'none', maxWidth: '280px' }}>
              {el.type === 'note' ? (
                <textarea
                  className="w-full bg-transparent border-none outline-none resize-none text-stone-800 text-xl font-bold leading-tight pointer-events-auto"
                  style={{ fontFamily: '"Indie Flower", cursive', height: 'auto' }}
                  defaultValue={el.content}
                  onPointerDown={(e) => e.stopPropagation()} 
                  onInput={(e: any) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onBlur={async (e) => {
                    const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                    await updateDoc(boardDocRef, { elements: updated });
                  }}
                />
              ) : (
                <img src={el.content} className="w-full h-auto block rounded-sm pointer-events-none shadow-sm" alt="" />
              )}
              
              <div className="absolute -right-12 top-2 flex flex-col gap-2 scale-90 origin-left pointer-events-auto">
                <button onClick={(e) => { e.stopPropagation(); updateDoc(boardDocRef, { elements: arrayRemove(el) }); }} className="p-2.5 bg-white text-red-500 rounded-full shadow-xl border border-stone-100"><Trash2 size={16}/></button>
                <button onClick={(e) => e.stopPropagation()} className="p-2.5 bg-white text-blue-500 rounded-full shadow-xl border border-stone-100"><Bell size={16}/></button>
                <button onClick={(e) => { 
                  e.stopPropagation(); 
                  setEventData({...eventData, title: el.type === 'note' ? el.content : 'Pinned Photo'});
                  setShowEventModal(true);
                }} className="p-2.5 bg-white text-emerald-500 rounded-full shadow-xl border border-stone-100 active:scale-90">
                  <Calendar size={16}/>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* مودال إضافة حدث - تم إصلاحه ليعمل مثل الصورة المرفقة */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEventModal(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl pointer-events-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-stone-800 italic uppercase">New Event</h2>
                <button onClick={() => setShowEventModal(false)} className="p-2 bg-stone-100 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Event Name</label>
                  <input type="text" value={eventData.title} onChange={(e) => setEventData({...eventData, title: e.target.value})} className="w-full bg-stone-50 rounded-2xl p-4 text-stone-800 font-bold border-none outline-none" placeholder="Task description..." />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Selected Date</label>
                    <div className="w-full bg-stone-50 rounded-2xl p-4 text-stone-800 font-bold text-center text-xs">{selectedDate}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Time</label>
                    <input type="time" value={eventData.time} onChange={(e) => setEventData({...eventData, time: e.target.value})} className="w-full bg-stone-50 rounded-2xl p-4 text-stone-800 font-bold border-none outline-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                  <div className="flex items-center gap-2 font-bold text-stone-600 text-xs">
                    <Bell size={16} className={eventData.alert ? "text-blue-500" : "text-stone-300"} /> Enable Reminder
                  </div>
                  <button onClick={() => setEventData({...eventData, alert: !eventData.alert})} className={cn("w-10 h-5 rounded-full transition-all relative", eventData.alert ? "bg-blue-600" : "bg-stone-300")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm", eventData.alert ? "right-1" : "left-1")} />
                  </button>
                </div>

                <div className="flex justify-between p-2 bg-stone-50 rounded-2xl">
                  {EVENT_TYPES.map(t => (
                    <button key={t.id} onClick={() => setEventData({...eventData, type: t.id})} className={cn("p-3 rounded-xl transition-all", eventData.type === t.id ? "bg-white shadow-sm text-blue-600" : "text-stone-400")}>
                      <t.icon size={20} />
                    </button>
                  ))}
                </div>
                
                <button onClick={handleSaveToCalendar} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-lg active:scale-95 transition-all uppercase tracking-tighter">Confirm & Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* البنر السفلي */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-sm pointer-events-auto">
        <div className="bg-stone-900/95 backdrop-blur-3xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={() => addNewElement('note')} className="h-14 flex-1 mr-3 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg uppercase">
            <Plus size={20} strokeWidth={3} /> ADD NOTE
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="h-14 w-14 bg-stone-800 text-white rounded-full flex items-center justify-center active:scale-95 border border-white/5"><ImageIcon size={22} /></button>
          <button onClick={() => toast.success('Board Synced')} className="h-14 w-14 ml-3 bg-white text-stone-900 rounded-full flex items-center justify-center active:scale-95 shadow-lg"><Save size={22} /></button>
        </div>
      </div>
      
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');`}</style>
    </div>
  );
}
