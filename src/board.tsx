import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronLeft, ImageIcon, Save, Plus, Maximize2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
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

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

  useEffect(() => {
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const id = `img_${Date.now()}`;
      toast.loading('جاري الرفع...', { id: 'u' });
      try {
        const sRef = ref(storage, `b/${userId}/${id}`);
        await uploadString(sRef, base64, 'data_url');
        const url = await getDownloadURL(sRef);
        setElements(prev => [...prev, { id, type: 'image', content: url, x: 50, y: 50, width: 200, rotation: 0 }]);
        toast.success('تمت الإضافة', { id: 'u' });
      } catch { toast.error('فشل الرفع', { id: 'u' }); }
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await setDoc(boardDocRef, { elements, updated: new Date().toISOString() });
      toast.success('حُفظ سحابياً');
    } catch { toast.error('فشل الحفظ'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={40} /></div>;

  return (
    <div className="fixed inset-0 overflow-hidden touch-none bg-[#bc8a5f]">
      <div className="absolute top-6 left-6 z-[100] p-3 bg-white/90 rounded-xl" onClick={() => navigate(-1)}><ChevronLeft size={24} /></div>
      <div className="w-full h-full relative" onClick={() => setActiveId(null)}>
        {elements.map((el) => (
          <motion.div key={el.id} drag dragMomentum={false} onDragStart={() => setActiveId(el.id)} className="absolute p-4" style={{ x: el.x, y: el.y, width: el.width, zIndex: activeId === el.id ? 50 : 20 }}>
            <div className="relative bg-white p-2 shadow-xl rounded-sm">
              {el.type === 'image' ? <img src={el.content} className="w-full h-auto" /> : <textarea className="w-full h-32 p-2" defaultValue={el.content} onChange={(e) => setElements(elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i))} />}
              {activeId === el.id && <button className="absolute -top-10 left-0 bg-red-500 text-white p-2 rounded" onClick={() => setElements(elements.filter(x => x.id !== el.id))}><Trash2 size={16}/></button>}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex gap-4 bg-stone-900 p-4 rounded-full shadow-2xl">
        <button onClick={() => setElements([...elements, { id: Date.now().toString(), type: 'note', content: '', x: 50, y: 50, width: 200 }])} className="bg-yellow-400 p-3 rounded-full"><Plus size={20}/></button>
        <button onClick={() => fileInputRef.current?.click()} className="bg-stone-700 text-white p-3 rounded-full"><ImageIcon size={20}/></button>
        <button onClick={onSave} className="bg-emerald-500 text-white p-3 rounded-full">{saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}</button>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
    </div>
  );
}
