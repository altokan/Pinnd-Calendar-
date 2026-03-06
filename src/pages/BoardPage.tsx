import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, X, Check, MapPin, Bell, BellOff 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // نظام التاريخ اليومي
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const userId = auth.currentUser?.uid || "guest";
  // المسار الآن يعتمد على التاريخ ليكون البورد يومياً
  const boardDocRef = doc(db, "boards", `${userId}_${selectedDate}`);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) {
        setElements(d.data().elements || []);
      } else {
        setElements([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [selectedDate, userId]);

  const addNewElement = async (type: 'note' | 'image', content: string = '') => {
    const newEl = {
      id: `${type === 'note' ? 'n' : 'i'}_${Date.now()}`,
      type,
      content,
      x: 100, // وضع افتراضي قريب من المركز
      y: 100,
      rotate: Math.floor(Math.random() * 6) - 3,
      alertEnabled: false 
    };

    try {
      await updateDoc(boardDocRef, { elements: arrayUnion(newEl) });
    } catch (e) {
      await setDoc(boardDocRef, { elements: [newEl] });
    }
    toast.success(type === 'note' ? 'Note Added' : 'Image Added');
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

  const handleDragEnd = async (id: string, info: any) => {
    const updated = elements.map(el => 
      el.id === id ? { ...el, x: el.x + info.offset.x, y: el.y + info.offset.y } : el
    );
    await updateDoc(boardDocRef, { elements: updated });
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f] touch-none">
      <div 
        className="absolute inset-0 z-0 shadow-[inner_0_0_100px_rgba(0,0,0,0.2)]"
        style={{ 
          backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')`,
          backgroundColor: '#bc8a5f'
        }}
      />
      
      {/* Header مع اختيار التاريخ */}
      <div className="absolute top-6 left-6 right-6 z-[100] flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/90 rounded-2xl shadow-xl active:scale-95">
          <ChevronLeft size={24} />
        </button>
        <div className="bg-white/90 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
          <Calendar size={18} className="text-stone-500" />
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent font-black text-xs outline-none text-stone-800"
          />
        </div>
      </div>

      {/* البورد بمقاس ضعفين حجم الشاشة فقط */}
      <motion.div 
        drag
        dragConstraints={{ 
          left: -window.innerWidth, 
          right: 0, 
          top: -window.innerHeight, 
          bottom: 0 
        }}
        className="w-[200vw] h-[200vh] relative cursor-move"
        style={{ x: offset.x, y: offset.y }}
      >
        {elements.map((el) => (
          <motion.div
            key={el.id}
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => handleDragEnd(el.id, info)}
            animate={{ x: el.x, y: el.y, rotate: el.rotate }}
            className="absolute cursor-grab active:cursor-grabbing p-4 z-10"
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
              <div className="w-5 h-5 bg-red-600 rounded-full shadow-lg border-b-4 border-red-800" />
            </div>

            <div className={cn(
              "relative shadow-2xl transition-all",
              el.type === 'note' ? "bg-[#fff9c4] p-6 pt-12 min-w-[200px] max-w-[260px]" : "bg-white p-2 pb-12 border-8 border-white shadow-xl"
            )}>
              {el.type === 'note' ? (
                <textarea
                  className="w-full bg-transparent border-none outline-none resize-none text-stone-800 text-lg font-bold font-serif leading-tight"
                  defaultValue={el.content}
                  onBlur={(e) => {
                    const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                    updateDoc(boardDocRef, { elements: updated });
                  }}
                />
              ) : (
                <img src={el.content} className="w-48 h-auto block rounded-sm" alt="" />
              )}
              
              <div className="absolute -right-3 -top-3 flex flex-col gap-2 z-[90]">
                <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="bg-white text-red-600 p-2 rounded-full shadow-lg border border-stone-100 active:scale-90"><Trash2 size={14} /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* البنر السفلي مع تعديل كلمة ADD NOTE */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-3xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button 
            onClick={() => addNewElement('note')} 
            className="h-14 flex-1 mr-3 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={3} />
            <span className="tracking-tighter uppercase">ADD NOTE</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="h-14 w-14 bg-stone-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-all border border-white/5 shadow-inner"
          >
            <ImageIcon size={22} />
          </button>

          <button 
            onClick={() => toast.success('Saved to ' + selectedDate)} 
            className="h-14 w-14 ml-3 bg-white text-stone-900 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg"
          >
            <Save size={22} />
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple 
        onChange={handleImageUpload} 
      />
    </div>
  );
}
