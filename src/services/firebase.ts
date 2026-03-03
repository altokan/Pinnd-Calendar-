import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Save, 
  Plus, Maximize2, Loader2, GripHorizontal 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

// استيراد الأدوات من ملف Firebase الخاص بك
import { db, storage, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

interface BoardElement {
  id: string;
  type: 'image' | 'note';
  content: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
}

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // استخدام معرف المستخدم الحالي أو معرف افتراضي للتجربة
  const userId = auth.currentUser?.uid || "guest_user";
  const boardDocRef = doc(db, "boards", userId);

  // 1. تحميل البيانات سحابياً عند فتح الصفحة
  useEffect(() => {
    const unsubscribe = onSnapshot(boardDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setElements(docSnap.data().elements || []);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // 2. وظيفة رفع الصور إلى Firebase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Image = ev.target?.result as string;
      const imageId = `img_${Date.now()}`;
      
      const uploadToast = toast.loading('جاري رفع الصورة للسحاب...');
      try {
        const storageRef = ref(storage, `users/${userId}/board/${imageId}`);
        await uploadString(storageRef, base64Image, 'data_url');
        const url = await getDownloadURL(storageRef);
        
        const newEl: BoardElement = {
          id: imageId,
          type: 'image',
          content: url,
          x: 150,
          y: 150,
          width: 250,
          rotation: Math.floor(Math.random() * 6) - 3,
        };
        setElements(prev => [...prev, newEl]);
        toast.success('تم رفع الصورة', { id: uploadToast });
      } catch (error) {
        toast.error('فشل الرفع، تأكد من إعدادات Storage', { id: uploadToast });
      }
    };
    reader.readAsDataURL(file);
  };

  // 3. إضافة نوت جديدة
  const addNote = () => {
    const newNote: BoardElement = {
      id: `note_${Date.now()}`,
      type: 'note',
      content: '',
      x: 120,
      y: 120,
      width: 220,
      rotation: Math.floor(Math.random() * 8) - 4,
    };
    setElements([...elements, newNote]);
    setActiveId(newNote.id);
  };

  // 4. حفظ اللوحة بالكامل في Firestore
  const saveBoard = async () => {
    setSaving(true);
    try {
      await setDoc(boardDocRef, {
        elements,
        lastUpdated: new Date().toISOString()
      });
      toast.success('تم الحفظ سحابياً بنجاح');
    } catch (error) {
      toast.error('فشل في مزامنة البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center">
      <Loader2 className="animate-spin text-white" size={48} />
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden touch-none font-sans select-none">
      
      {/* الخلفية الخشبية */}
      <div 
        className="absolute inset-0 z-0"
        style={{ 
          backgroundColor: '#bc8a5f',
          backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')`,
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)'
        }}
      />

      {/* الهيدر */}
      <div className="absolute top-6 left-6 z-[100] flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/90 backdrop-blur rounded-2xl shadow-xl active:scale-95 transition-transform">
          <ChevronLeft size={24} className="text-stone-900" />
        </button>
        <h1 className="text-white font-black tracking-widest text-sm uppercase drop-shadow-lg">Board</h1>
      </div>

      {/* مساحة العناصر */}
      <div className="w-full h-full relative" onClick={() => setActiveId(null)}>
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag
              dragMomentum={false}
              onDragStart={() => setActiveId(el.id)}
              onClick={(e) => { e.stopPropagation(); setActiveId(el.id); }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: el.rotation }}
              className={cn("absolute z-20 touch-none p-4", activeId === el.id ? "z-50" : "z-20")}
              style={{ x: el.x, y: el.y, width: el.width }}
            >
              {/* شريط أدوات العنصر */}
              {activeId === el.id && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: -50 }}
                  className="absolute left-1/2 -translate-x-1/2 bg-stone-900 text-white rounded-xl px-4 py-2 flex items-center gap-4 shadow-2xl border border-white/10"
                >
                  <button onClick={() => setElements(elements.filter(x => x.id !== el.id))} className="text-rose-400"><Trash2 size={18}/></button>
                  <div className="w-px h-4 bg-stone-700" />
                  <button onClick={() => setElements(elements.map(item => item.id === el.id ? {...item, width: item.width + 40} : item))}><Maximize2 size={18}/></button>
                </motion.div>
              )}

              {/* دبوس التثبيت */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 shadow-md border-b-2 border-red-800 z-30" />

              {/* البطاقة */}
              <div className={cn(
                "relative rounded-sm transition-all duration-300",
                el.type === 'note' ? "bg-[#fff9c4] shadow-[5px_5px_15px_rgba(0,0,0,0.3)]" : "bg-white p-2 shadow-2xl",
                activeId === el.id && "ring-4 ring-white/30"
              )}>
                {el.type === 'note' ? (
                  <textarea 
                    className="bg-transparent border-none outline-none w-full h-32 resize-none text-stone-800 font-medium p-2"
                    placeholder="اكتب شيئاً..."
                    defaultValue={el.content}
                    onChange={(e) => {
                      const val = e.target.value;
                      setElements(prev => prev.map(item => item.id === el.id ? {...item, content: val} : item));
                    }}
                  />
                ) : (
                  <img src={el.content} className="w-full h-auto rounded-sm pointer-events-none" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* البنر السفلي المرتفع والمناسب للجوال */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] p-2 flex items-center justify-between border border-white/10">
          
          <div className="flex items-center gap-3 pl-3">
             <div className="bg-stone-800 px-3 py-1 rounded-full text-[10px] text-white/50 font-bold uppercase tracking-widest">
               {elements.length} Items
             </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={addNote} 
              className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-xs shadow-lg active:scale-90 transition-transform"
            >
              <Plus size={16} />
              <span>NOTE</span>
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-4 bg-stone-800 text-white rounded-full active:scale-90 shadow-md"
            >
              <ImageIcon size={20} />
            </button>
          </div>

          <div className="pr-1">
             <button 
                onClick={saveBoard} 
                disabled={saving}
                className="p-4 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center min-w-[52px]"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
             </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
