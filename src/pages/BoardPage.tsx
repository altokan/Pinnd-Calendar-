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

  const addNewElement = async (type: 'note' | 'image', content: string = '') => {
    const newEl = {
      id: `${type === 'note' ? 'n' : 'i'}_${Date.now()}`,
      type,
      content,
      x: 50 + (elements.length * 20) % 150,
      y: 150 + (elements.length * 20) % 150,
      rotate: Math.floor(Math.random() * 6) - 3,
    };

    try {
      const docSnap = await getDoc(boardDocRef);
      const currentElements = docSnap.exists() ? docSnap.data().elements || [] : [];
      await setDoc(boardDocRef, { elements: [...currentElements, newEl] }, { merge: true });
      toast.success(type === 'note' ? 'Note Pinned' : 'Image Pinned');
    } catch (e) {
      toast.error("Error adding element");
    }
  };

  const changeDay = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f] touch-none">
      <div className="absolute inset-0 z-0 shadow-inner" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')`, backgroundColor: '#bc8a5f' }} />
      
      {/* بنر التاريخ العلوي - تم الإصلاح */}
      <div className="absolute top-6 left-0 right-0 z-[10000] flex justify-center px-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-[2rem] shadow-2xl flex items-center gap-2 border border-white/20 pointer-events-auto">
          <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft size={20}/></button>
          <div className="h-6 w-[1px] bg-stone-200 mx-1" />
          <button onClick={(e) => { e.stopPropagation(); changeDay(-1); }} className="p-2 hover:bg-stone-50 rounded-full text-stone-400"><ArrowLeft size={18}/></button>
          <div className="relative flex items-center px-2 min-w-[100px] justify-center">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <span className="font-black text-xs uppercase tracking-tighter text-stone-800">
              {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); changeDay(1); }} className="p-2 hover:bg-stone-50 rounded-full text-stone-400"><ArrowRight size={18}/></button>
        </div>
      </div>

      <motion.div drag dragConstraints={{ left: -window.innerWidth, right: 0, top: -window.innerHeight, bottom: 0 }} className="w-[200vw] h-[200vh] relative cursor-move">
        {elements.map((el) => (
          <motion.div
            key={el.id} drag dragMomentum={false}
            onDragEnd={async (_, info) => {
              const updated = elements.map(item => item.id === el.id ? { ...item, x: item.x + info.offset.x, y: item.y + info.offset.y } : item);
              await updateDoc(boardDocRef, { elements: updated });
            }}
            animate={{ x: el.x, y: el.y, rotate: el.rotate }}
            className="absolute p-6 z-10 group"
          >
            <div className={cn("relative shadow-xl flex flex-col items-center", el.type === 'note' ? "bg-[#fff9c4] p-5 pt-12 rounded-sm" : "bg-white p-2 pb-12 border-[8px] border-white")}>
              {el.type === 'note' ? (
                <textarea
                  className="w-full bg-transparent border-none outline-none resize-none text-stone-800 text-xl font-bold"
                  style={{ fontFamily: '"Indie Flower", cursive', height: 'auto' }}
                  defaultValue={el.content}
                  onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />
              ) : ( <img src={el.content} className="w-[180px] h-auto rounded-sm pointer-events-none" /> )}
              
              <div className="absolute -right-12 top-2 flex flex-col gap-2 scale-90 pointer-events-auto">
                <button onClick={(e) => { e.stopPropagation(); updateDoc(boardDocRef, { elements: arrayRemove(el) }); }} className="p-2 bg-white text-red-500 rounded-full shadow-lg"><Trash2 size={16}/></button>
                <button onClick={(e) => { e.stopPropagation(); setEventData({...eventData, title: el.type === 'note' ? el.content : 'Pinned'}); setShowEventModal(true); }} className="p-2 bg-white text-emerald-500 rounded-full shadow-lg"><Calendar size={16}/></button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
      {/* ... (بقية المودال والبنر السفلي كما هي) ... */}
    </div>
  );
}
