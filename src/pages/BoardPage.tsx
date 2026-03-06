import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, X, Check, MapPin, Bell, BellOff, ArrowLeft, ArrowRight
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  // تعديل: إضافة العناصر بجانب بعضها البعض دون اختفاء
  const addNewElement = async (type: 'note' | 'image', content: string = '') => {
    const lastElement = elements[elements.length - 1];
    const newX = lastElement ? lastElement.x + 50 : 40; // إزاحة بسيطة ليظهروا بجانب بعض
    const newY = lastElement ? lastElement.y : 150;

    const newEl = {
      id: `${type === 'note' ? 'n' : 'i'}_${Date.now()}`,
      type,
      content,
      x: newX,
      y: newY,
      rotate: Math.floor(Math.random() * 4) - 2,
      alertEnabled: false 
    };

    try {
      await updateDoc(boardDocRef, { elements: arrayUnion(newEl) });
    } catch (e) {
      await setDoc(boardDocRef, { elements: [newEl] });
    }
    toast.success(type === 'note' ? 'Note Pinned' : 'Photo Pinned');
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

  const changeDay = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f] touch-none">
      <div className="absolute inset-0 z-0 shadow-inner" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')`, backgroundColor: '#bc8a5f' }} />
      
      {/* ٥- بنر التاريخ المطور في المنتصف الأعلى */}
      <div className="absolute top-6 left-0 right-0 z-[100] flex justify-center px-4">
        <div className="bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-[2rem] shadow-2xl flex items-center gap-1 border border-white/20">
          <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-stone-100 rounded-full transition-colors"><ChevronLeft size={20}/></button>
          <div className="h-6 w-[1px] bg-stone-200 mx-1" />
          <button onClick={() => changeDay(-1)} className="p-2 hover:bg-stone-50 rounded-full text-stone-400"><ArrowLeft size={16}/></button>
          <div className="relative flex items-center px-2">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <span className="font-black text-[11px] uppercase tracking-tighter text-stone-800">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <button onClick={() => changeDay(1)} className="p-2 hover:bg-stone-50 rounded-full text-stone-400"><ArrowRight size={16}/></button>
        </div>
      </div>

      {/* البورد بمقاس ضعفين الشاشة فقط */}
      <motion.div 
        drag dragConstraints={{ left: -window.innerWidth, right: 0, top: -window.innerHeight, bottom: 0 }}
        className="w-[200vw] h-[200vh] relative cursor-move"
      >
        {elements.map((el) => (
          <motion.div
            key={el.id} drag dragMomentum={false}
            onDragEnd={(_, info) => handleDragEnd(el.id, info)}
            animate={{ x: el.x, y: el.y, rotate: el.rotate }}
            className="absolute cursor-grab active:cursor-grabbing p-4 z-10 group"
          >
            {/* ٣- إبرة التثبيت الحمراء الواقعية */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 z-[80] pointer-events-none drop-shadow-md">
              <div className="w-4 h-4 bg-red-600 rounded-full border-b-4 border-red-800" />
              <div className="w-0.5 h-3 bg-stone-400 mx-auto -mt-1" />
            </div>

            {/* ١- النوت الديناميكي بشكل قصاصة ورق وخط يد */}
            <div className={cn(
              "relative shadow-xl transition-all flex flex-col items-center",
              el.type === 'note' ? "bg-[#fff9c4] p-5 pt-10 rounded-sm" : "bg-white p-2 pb-10 border-[6px] border-white shadow-lg"
            )}
            style={{ 
              width: el.type === 'note' ? 'auto' : '200px',
              minWidth: el.type === 'note' ? '140px' : 'none',
              maxWidth: '260px',
              boxShadow: '2px 5px 15px rgba(0,0,0,0.15), 0 2px 5px rgba(0,0,0,0.1)'
            }}>
              {el.type === 'note' ? (
                <textarea
                  autoFocus
                  className="w-full bg-transparent border-none outline-none resize-none text-stone-800 text-xl font-bold leading-tight"
                  style={{ fontFamily: '"Indie Flower", "Comic Sans MS", cursive', height: 'auto', minHeight: '60px' }}
                  defaultValue={el.content}
                  onChange={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onBlur={(e) => {
                    const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                    updateDoc(boardDocRef, { elements: updated });
                  }}
                />
              ) : (
                <img src={el.content} className="w-full h-auto block" alt="" />
              )}
              
              {/* ٤- أيقونات التحكم الجانبية المتطورة */}
              <div className="absolute -right-10 top-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="p-2 bg-white text-red-500 rounded-full shadow-lg"><Trash2 size={14}/></button>
                <button className="p-2 bg-white text-blue-500 rounded-full shadow-lg"><Bell size={14}/></button>
                <button onClick={() => navigate('/calendar')} className="p-2 bg-white text-emerald-500 rounded-full shadow-lg"><Calendar size={14}/></button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* البنر السفلي */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-3xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={() => addNewElement('note')} className="h-14 flex-1 mr-3 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
            <Plus size={20} strokeWidth={3} />
            <span className="tracking-tighter uppercase">ADD NOTE</span>
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="h-14 w-14 bg-stone-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-all border border-white/5 shadow-inner">
            <ImageIcon size={22} />
          </button>

          <button onClick={() => toast.success('Current board synced')} className="h-14 w-14 ml-3 bg-white text-stone-900 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg">
            <Save size={22} />
          </button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
      
      {/* ستايل الخط ليكون مثل خط اليد */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');
      `}</style>
    </div>
  );
}
