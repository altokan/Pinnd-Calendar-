import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronLeft, ImageIcon, Plus, Calendar, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

/* دالة مساعدة للتنسيق */
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

  // تحميل الخط اليدوي من Google Fonts برمجياً
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
    const newNote = { 
      id, 
      type: 'note', 
      content: '', 
      x: 50 + Math.random() * 50, 
      y: 150, 
      rotate: Math.random() * 4 - 2 
    };
    await updateDoc(boardDocRef, { elements: arrayUnion(newNote) });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    toast.loading('تثبيت الصور...', { id: 'up' });
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
    toast.success('تم التثبيت', { id: 'up' });
  };

  const removeElement = async (el: any) => {
    await updateDoc(boardDocRef, { elements: arrayRemove(el) });
    toast.success('تمت الإزالة');
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden touch-none bg-[#bc8a5f]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl active:scale-95">
        <ChevronLeft size={24} />
      </button>

      <div className="w-full h-full relative z-10" onClick={() => setActiveId(null)}>
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag dragMomentum={false}
              onDragStart={() => setActiveId(el.id)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, x: el.x, y: el.y, rotate: el.rotate }}
              whileDrag={{ scale: 1.05, zIndex: 100 }}
              className="absolute cursor-grab active:cursor-grabbing p-4"
            >
              {/* الدبوس الأحمر الواقعي فوق العنصر */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
                <div className="w-4 h-4 bg-red-600 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] border-b-4 border-red-800 relative">
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent to-white/30 rounded-full" />
                </div>
                {/* ظل الدبوس على الورقة */}
                <div className="w-1 h-1 bg-black/20 rounded-full blur-[1px] mx-auto mt-0.5" />
              </div>

              {/* جسم الورقة أو الصورة */}
              <div className={cn(
                "relative shadow-2xl transition-transform",
                el.type === 'note' 
                    ? "bg-[#fff9c4] p-6 pt-12 w-56 h-56 shadow-[8px_8px_20px_rgba(0,0,0,0.2)]" 
                    : "bg-white p-2 pb-12 shadow-xl border border-stone-200"
              )}>
                {/* تأثير الطعجة الواقعي */}
                {el.type === 'note' && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#f0e68c] rotate-45 shadow-inner border-l border-t border-black/5" />
                )}

                {el.type === 'note' ? (
                  <textarea
                    style={{ fontFamily: "'Caveat', cursive" }}
                    className="w-full h-full bg-transparent border-none outline-none resize-none text-stone-800 leading-tight text-2xl font-bold"
                    placeholder="اكتب فكرتك هنا..."
                    defaultValue={el.content}
                    onChange={(e) => {
                      const updated = elements.map(item => item.id === el.id ? {...item, content: e.target.value} : item);
                      setDoc(boardDocRef, { elements: updated }, { merge: true });
                    }}
                  />
                ) : (
                  <img src={el.content} className="w-48 h-auto pointer-events-none block grayscale-[0.1]" alt="" />
                )}

                {/* خيارات العنصر النشط (حذف + تحويل للتقويم) */}
                {activeId === el.id && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-4 -right-4 flex flex-col gap-2 z-[90]">
                    <button onClick={(e) => { e.stopPropagation(); removeElement(el); }} className="bg-red-600 text-white p-2 rounded-full shadow-lg active:scale-90">
                      <Trash2 size={16} />
                    </button>
                    {el.type === 'note' && (
                      <button onClick={(e) => { e.stopPropagation(); toast('قريباً: تحويل هذه الملاحظة لحدث في التقويم!'); }} className="bg-blue-600 text-white p-2 rounded-full shadow-lg active:scale-90">
                        <Calendar size={16} />
                      </button>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* البنر السفلي المطور (Floating Dock) */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={addNote} className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-sm active:scale-90 transition-all shadow-md">
            <Plus size={18} strokeWidth={3} />
            <span>ADD IDEA</span>
          </button>
          <div className="flex gap-2 pr-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-stone-800 text-white rounded-full active:scale-90">
              <ImageIcon size={22} />
            </button>
            <button onClick={() => toast.success('تم الحفظ في السحابة')} className="p-4 bg-emerald-500 text-white rounded-full active:scale-90">
              <Save size={22} />
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleUpload} />
    </div>
  );
}
