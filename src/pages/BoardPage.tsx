import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronLeft, ImageIcon, Plus, StickyNote, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

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
        const newImg = { 
          id, 
          type: 'image', 
          content: url, 
          x: 100 + Math.random() * 50, 
          y: 200, 
          rotate: Math.random() * 8 - 4 
        };
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
              {/* الدبوس الأحمر فوق كل شيء */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
                <div className="w-4 h-4 bg-red-600 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] border-b-4 border-red-800 relative">
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent to-white/30 rounded-full" />
                </div>
              </div>

              {/* محتوى العنصر */}
              <div className={cn(
                "relative shadow-2xl transition-transform",
                el.type === 'note' 
                    ? "bg-yellow-100 p-6 pt-10 w-52 h-52 shadow-[5px_5px_15px_rgba(0,0,0,0.2)] overflow-hidden" 
                    : "bg-white p-2 pb-10 shadow-xl"
              )}>
                {/* تأثير الطي (الطعجة) */}
                {el.type === 'note' && (
                  <>
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-black/10 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-200 rotate-45 shadow-inner pointer-events-none border-l border-t border-black/5" />
                  </>
                )}

                {el.type === 'note' ? (
                  <textarea
                    className="w-full h-full bg-transparent border-none outline-none resize-none font-handwriting text-stone-800 leading-relaxed text-lg"
                    placeholder="اكتب هنا..."
                    defaultValue={el.content}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      const updated = elements.map(item => item.id === el.id ? {...item, content: newContent} : item);
                      setDoc(boardDocRef, { elements: updated }, { merge: true });
                    }}
                  />
                ) : (
                  <img src={el.content} className="w-48 h-auto pointer-events-none block rounded-sm" alt="" />
                )}

                {/* زر الحذف - يظهر الآن داخل الورقة في الزاوية العلوية */}
                {activeId === el.id && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => { e.stopPropagation(); removeElement(el); }}
                    className="absolute top-2 right-2 bg-red-600/90 text-white p-1.5 rounded-lg shadow-md hover:bg-red-700 z-[90] active:scale-90 transition-all"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* البنر السفلي */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[85%] max-w-md">
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] p-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
          <button 
            onClick={addNote}
            className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Plus size={18} strokeWidth={3} />
            <span>NOTE</span>
          </button>

          <div className="flex gap-2 pr-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 bg-stone-800 text-white rounded-full hover:bg-stone-700 active:scale-95 transition-all"
            >
              <ImageIcon size={22} />
            </button>
            <button 
              onClick={() => toast.success('محفوظ سحابياً')}
              className="p-4 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 active:scale-95 transition-all"
            >
              <Save size={22} />
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleUpload} />
    </div>
  );
}
