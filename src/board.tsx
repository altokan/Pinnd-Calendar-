import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronLeft, ImageIcon, Save, Plus, Maximize2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userId = auth.currentUser?.uid || "guest";
    const unsub = onSnapshot(doc(db, "boards", userId), (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const id = `img_${Date.now()}`;
      toast.loading('جاري الرفع...', { id: 'u' });
      try {
        const sRef = ref(storage, `board/${id}`);
        await uploadString(sRef, ev.target?.result as string, 'data_url');
        const url = await getDownloadURL(sRef);
        setElements(prev => [...prev, { id, type: 'image', content: url, x: 50, y: 50, width: 200 }]);
        toast.success('تمت الإضافة', { id: 'u' });
      } catch { toast.error('خطأ في الرفع'); }
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "boards", auth.currentUser?.uid || "guest"), { elements });
      toast.success('تم الحفظ');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#bc8a5f]">
      <div className="absolute top-4 left-4 z-50 p-3 bg-white/90 rounded-xl" onClick={() => navigate(-1)}><ChevronLeft /></div>
      <div className="w-full h-full relative" onClick={() => setActiveId(null)}>
        {elements.map((el) => (
          <motion.div key={el.id} drag dragMomentum={false} onDragStart={() => setActiveId(el.id)} className="absolute p-2 bg-white shadow-lg" style={{ x: el.x, y: el.y, width: el.width, zIndex: activeId === el.id ? 50 : 20 }}>
            {el.type === 'image' ? <img src={el.content} className="w-full" alt="" /> : <textarea className="w-full h-24 p-1 border-none outline-none" defaultValue={el.content} onChange={(e) => setElements(elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i))} />}
            {activeId === el.id && <button className="absolute -top-8 left-0 bg-red-500 text-white p-1 rounded" onClick={() => setElements(elements.filter(x => x.id !== el.id))}><Trash2 size={14}/></button>}
          </motion.div>
        ))}
      </div>
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-4 bg-stone-900 p-4 rounded-full shadow-2xl z-[200]">
        <button onClick={() => setElements([...elements, { id: Date.now().toString(), type: 'note', content: '', x: 50, y: 50, width: 180 }])} className="bg-yellow-400 p-3 rounded-full"><Plus /></button>
        <button onClick={() => fileInputRef.current?.click()} className="bg-stone-700 text-white p-3 rounded-full"><ImageIcon /></button>
        <button onClick={onSave} className="bg-emerald-500 text-white p-3 rounded-full">{saving ? <Loader2 className="animate-spin" /> : <Save />}</button>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
    </div>
  );
}
