import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronLeft, ImageIcon, Plus, StickyNote, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid || "guest";

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "boards", userId), (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  const addNote = async () => {
    const newNote = { id: `n_${Date.now()}`, type: 'note', content: '', x: 50, y: 150, rotate: Math.random() * 6 - 3 };
    await updateDoc(doc(db, "boards", userId), { elements: arrayUnion(newNote) });
  };

  const handleUpload = async (e: any) => {
    const files = Array.from(e.target.files);
    toast.loading('جاري الرفع...', { id: 'up' });
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (ev: any) => {
        const id = `img_${Date.now()}_${Math.random()}`;
        const sRef = ref(storage, `board/${userId}/${id}`);
        await uploadString(sRef, ev.target.result, 'data_url');
        const url = await getDownloadURL(sRef);
        await updateDoc(doc(db, "boards", userId), {
          elements: arrayUnion({ id, type: 'image', content: url, x: 100, y: 200, rotate: Math.random() * 4 - 2 })
        });
      };
      reader.readAsDataURL(file as Blob);
    }
    toast.success('تمت الإضافة', { id: 'up' });
  };

  const removeEl = async (el: any) => {
    await updateDoc(doc(db, "boards", userId), { elements: arrayRemove(el) });
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden touch-none bg-[#bc8a5f]" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-[100] p-3 bg-white/90 rounded-2xl shadow-xl"><ChevronLeft /></button>

      <div className="w-full h-full relative">
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div key={el.id} drag dragMomentum={false} className="absolute z-20 cursor-grab active:cursor-grabbing" style={{ x: el.x, y: el.y, rotate: el.rotate }}>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white p-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                <button onClick={() => removeEl(el)}><Trash2 size={16}/></button>
              </div>
              
              {el.type === 'note' ? (
                <div className="relative bg-[#fff9c4] p-6 shadow-xl w-52 min-h-[150px]">
                   <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-red-600"><Plus size={20} className="fill-current"/></div>
                   <textarea className="w-full bg-transparent border-none outline-none resize-none font-serif text-stone-800" defaultValue={el.content} onBlur={async (e) => {
                     const updated = elements.map(item => item.id === el.id ? {...item, content: e.target.value} : item);
                     await setDoc(doc(db, "boards", userId), { elements: updated });
                   }} />
                </div>
              ) : (
                <div className="bg-white p-2 pb-8 shadow-2xl border border-stone-200">
                  <img src={el.content} className="w-44 h-auto pointer-events-none" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* البنر الأسود مرفوع فوق النبر السفلي */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-xl rounded-full p-2 flex items-center justify-between shadow-2xl border border-white/10">
          <button onClick={addNote} className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-black rounded-full font-bold text-xs">
            <Plus size={16} /> ADD NOTE
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-white"><ImageIcon /></button>
          <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleUpload} />
        </div>
      </div>
    </div>
  );
}
