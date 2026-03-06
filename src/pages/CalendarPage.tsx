import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, Bell, ArrowLeft, ArrowRight, BellOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
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

  const addNewElement = async (type: 'note' | 'image', content: string = '') => {
    const newX = 50 + (elements.length * 25) % 120;
    const newY = 150 + (elements.length * 15) % 120;

    const newEl = {
      id: `${type === 'note' ? 'n' : 'i'}_${Date.now()}`,
      type,
      content,
      x: newX,
      y: newY,
      rotate: Math.floor(Math.random() * 6) - 3,
      alertEnabled: false 
    };

    try {
      const docSnap = await getDoc(boardDocRef);
      if (!docSnap.exists()) {
        await setDoc(boardDocRef, { elements: [newEl] });
      } else {
        await updateDoc(boardDocRef, { elements: arrayUnion(newEl) });
      }
      toast.success(type === 'note' ? 'Note Pinned' : 'Image Pinned');
    } catch (error) {
      console.error(error);
      toast.error("Failed to add element. Try a smaller image.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 1048487) { // الحد الأقصى لـ Firestore للوثيقة الواحدة
        toast.error("Image is too large. Max 1MB.");
        return;
      }
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
      <div className="absolute inset-0 z-0 shadow-inner pointer-events-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')`, backgroundColor: '#bc8a5f' }} />
      
      {/* 1 - بنر التاريخ العلوي المطور والمستجيب */}
      <div className="absolute top-6 left-0 right-0 z-[1000] flex justify-center px-4">
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-[2rem] shadow-2xl flex items-center gap-2 border border-white/20 pointer-events-auto">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full active:scale-90 transition-transform"><ChevronLeft size={20}/></button>
          <div className="h-6 w-[1px] bg-stone-200 mx-1" />
          <button onClick={() => changeDay(-1)} className="p-2 hover:bg-stone-50 rounded-full text-stone-400 active:scale-90 transition-transform"><ArrowLeft size={18}/></button>
          
          <div className="relative flex items-center px-2 min-w-[100px] justify-center cursor-pointer">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <span className="font-black text-xs uppercase tracking-tighter text-stone-800">
              {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button onClick={() => changeDay(1)} className="p-2 hover:bg-stone-50 rounded-full text-stone-400 active:scale-90 transition-transform"><ArrowRight size={18}/></button>
        </div>
      </div>

      <motion.div 
        drag dragConstraints={{ left: -window.innerWidth, right: 0, top: -window.innerHeight, bottom: 0 }}
        className="w-[200vw] h-[200vh] relative cursor-move z-10"
      >
        {elements.map((el) => (
          <motion.div
            key={el.id} drag dragMomentum={false}
            onDragEnd={(_, info) => handleDragEnd(el.id, info)}
            animate={{ x: el.x, y: el.y, rotate: el.rotate }}
            className="absolute p-6 z-20"
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none drop-shadow-md">
              <div className="w-5 h-5 bg-red-600 rounded-full border-b-4 border-red-800" />
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
                  style={{ fontFamily: '"Indie Flower", cursive', minHeight: '80px' }}
                  defaultValue={el.content}
                  onPointerDown={(e) => e.stopPropagation()} 
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
                <img src={el.content} className="w-full h-auto block rounded-sm pointer-events-none" alt="" />
              )}
              
              {/* 3 - أيقونات التحكم مع ربط التقويم المباشر */}
              <div className="absolute -right-12 top-2 flex flex-col gap-2 scale-90 origin-left pointer-events-auto">
                <button onClick={(e) => { e.stopPropagation(); updateDoc(boardDocRef, { elements: arrayRemove(el) }); }} className="p-2.5 bg-white text-red-500 rounded-full shadow-xl border border-stone-100 active:scale-90"><Trash2 size={16}/></button>
                <button onClick={(e) => { e.stopPropagation(); }} className={cn("p-2.5 rounded-full shadow-xl border border-stone-100", el.alertEnabled ? "bg-blue-600 text-white" : "bg-white text-blue-500")}>
                  {el.alertEnabled ? <Bell size={16}/> : <BellOff size={16}/>}
                </button>
                {/* فتح صفحة إضافة حدث مع بيانات النوتة */}
                <button onClick={(e) => { 
                  e.stopPropagation(); 
                  navigate('/calendar/add', { state: { initialTitle: el.type === 'note' ? el.content : 'Pinned Photo', date: selectedDate } }); 
                }} className="p-2.5 bg-white text-emerald-500 rounded-full shadow-xl border border-stone-100 active:scale-90">
                  <Calendar size={16}/>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-sm pointer-events-auto">
        <div className="bg-stone-900/95 backdrop-blur-3xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={() => addNewElement('note')} className="h-14 flex-1 mr-3 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg">
            <Plus size={20} strokeWidth={3} />
            <span className="tracking-tighter uppercase">ADD NOTE</span>
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="h-14 w-14 bg-stone-800 text-white rounded-full flex items-center justify-center active:scale-95 border border-white/5 shadow-inner">
            <ImageIcon size={22} />
          </button>

          <button onClick={() => toast.success('Syncing with Cloud...')} className="h-14 w-14 ml-3 bg-white text-stone-900 rounded-full flex items-center justify-center active:scale-95 shadow-lg">
            <Save size={22} />
          </button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');`}</style>
    </div>
  );
}
