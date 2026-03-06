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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale] = useState(1);

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

  useEffect(() => {
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  // إصلاح: إضافة العنصر في مركز الشاشة المعروض حالياً
  const addNewElement = async (type: 'note' | 'image', content: string = '') => {
    // حساب المركز النسبي بناءً على تحريك البورد الحالي (Offset)
    const centerX = -offset.x;
    const centerY = -offset.y;

    const newEl = {
      id: `${type === 'note' ? 'n' : 'i'}_${Date.now()}`,
      type,
      content,
      x: centerX, 
      y: centerY,
      rotate: Math.floor(Math.random() * 6) - 3, // ميلان خفيف للجمالية
      alertEnabled: false // نظام التنبيهات المدمج
    };

    try {
      await updateDoc(boardDocRef, {
        elements: arrayUnion(newEl)
      });
      toast.success(type === 'note' ? 'Idea Added' : 'Image Added');
    } catch (e) {
      // إذا لم يكن المستند موجوداً
      await setDoc(boardDocRef, { elements: [newEl] });
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

  const handleDragEnd = async (id: string, info: any) => {
    const updated = elements.map(el => 
      el.id === id ? { ...el, x: el.x + info.offset.x, y: el.y + info.offset.y } : el
    );
    await updateDoc(boardDocRef, { elements: updated });
  };

  const toggleAlert = async (id: string) => {
    const updated = elements.map(el => 
      el.id === id ? { ...el, alertEnabled: !el.alertEnabled } : el
    );
    await updateDoc(boardDocRef, { elements: updated });
    const el = updated.find(i => i.id === id);
    toast(el.alertEnabled ? 'Alert Activated' : 'Alert Disabled', { icon: el.alertEnabled ? '🔔' : '🔕' });
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
      
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl active:scale-95">
        <ChevronLeft size={24} />
      </button>

      {/* البورد اللانهائي مع دعم السحب بالأصابع */}
      <motion.div 
        ref={containerRef}
        drag
        dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
        onDrag={(e, info) => setOffset({ x: info.point.x, y: info.point.y })}
        className="w-[6000px] h-[6000px] relative cursor-move"
        initial={{ x: -2000, y: -2000 }}
      >
        {elements.map((el) => (
          <motion.div
            key={el.id}
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => handleDragEnd(el.id, info)}
            animate={{ x: el.x + 3000, y: el.y + 3000, rotate: el.rotate }}
            className="absolute cursor-grab active:cursor-grabbing p-4 z-10"
          >
            {/* الدبوس الأحمر */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
              <div className="w-5 h-5 bg-red-600 rounded-full shadow-lg border-b-4 border-red-800" />
            </div>

            <div className={cn(
              "relative shadow-2xl transition-all",
              el.type === 'note' ? "bg-[#fff9c4] p-6 pt-12 min-w-[220px] max-w-[280px]" : "bg-white p-2 pb-14 border-8 border-white shadow-xl"
            )}>
              {el.type === 'note' ? (
                <textarea
                  className="w-full bg-transparent border-none outline-none resize-none text-stone-800 text-xl font-bold font-serif leading-tight"
                  defaultValue={el.content}
                  onBlur={(e) => {
                    const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                    updateDoc(boardDocRef, { elements: updated });
                  }}
                />
              ) : (
                <img src={el.content} className="w-56 h-auto block rounded-sm" alt="" />
              )}
              
              {/* أدوات التحكم المتطورة داخل العنصر */}
              <div className="absolute -right-4 -top-4 flex flex-col gap-2 z-[90]">
                <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="bg-white text-red-600 p-2.5 rounded-full shadow-xl border border-stone-100 active:scale-90"><Trash2 size={16} /></button>
                <button onClick={() => toggleAlert(el.id)} className={cn("p-2.5 rounded-full shadow-xl border border-stone-100 active:scale-90", el.alertEnabled ? "bg-blue-600 text-white" : "bg-white text-stone-400")}>
                  {el.alertEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* البنر السفلي - توحيد القياسات وتعديل وظيفة الإضافة */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-3xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button 
            onClick={() => addNewElement('note')} 
            className="h-14 flex-1 mr-3 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={3} />
            <span className="tracking-tighter">ADD IDEA</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="h-14 w-14 bg-stone-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-all border border-white/5 shadow-inner"
          >
            <ImageIcon size={22} />
          </button>

          <button 
            onClick={() => toast.success('Syncing with Cloud...')} 
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
