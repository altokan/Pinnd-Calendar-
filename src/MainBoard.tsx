import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Save, 
  Plus, Maximize2, Loader2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

// الاستيراد من ملف الفايربيس
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
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

export default function MainBoard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userId = auth.currentUser?.uid || "guest_user";
  const boardDocRef = doc(db, "boards", userId);

  useEffect(() => {
    const unsubscribe = onSnapshot(boardDocRef, (docSnap) => {
      if (docSnap.exists()) setElements(docSnap.data().elements || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [userId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const id = `img_${Date.now()}`;
      toast.loading('جاري رفع الصورة...', { id: 'up' });
      try {
        const sRef = ref(storage, `board/${userId}/${id}`);
        await uploadString(sRef, base64, 'data_url');
        const url = await getDownloadURL(sRef);
        setElements(prev => [...prev, { id, type: 'image', content: url, x: 100, y: 100, width: 250, rotation: 0 }]);
        toast.success('تم الرفع', { id: 'up' });
      } catch { toast.error('خطأ في الرفع', { id: 'up' }); }
    };
    reader.readAsDataURL(file);
  };

  const saveBoard = async () => {
    setSaving(true);
    try {
      await setDoc(boardDocRef, { elements, lastUpdated: new Date().toISOString() });
      toast.success('تم الحفظ سحابياً');
    } catch { toast.error('فشل الحفظ'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center z-[500]">
      <Loader2 className="animate-spin text-white" size={40} />
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden touch-none select-none">
      <div className="absolute inset-0 z-0" style={{ backgroundColor: '#bc8a5f', backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }} />
      
      <div className="absolute top-6 left-6 z-[100]">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/90 rounded-2xl shadow-xl active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="w-full h-full relative" onClick={() => setActiveId(null)}>
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div
              key={el.id} drag dragMomentum={false}
              onDragStart={() => setActiveId(el.id)}
              onClick={(e) => { e.stopPropagation(); setActiveId(el.id); }}
              className={cn("absolute z-20 p-4", activeId === el.id ? "z-50" : "z-20")}
              style={{ x: el.x, y: el.y, width: el.width, rotate: el.rotation }}
            >
              {activeId === el.id && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-stone-900 text-white rounded-lg px-3 py-1 flex gap-4 shadow-2xl">
                  <button onClick={() => setElements(elements.filter(x => x.id !== el.id))}><Trash2 size={16}/></button>
                  <button onClick={() => setElements(elements.map(i => i.id === el.id ? {...i, width: i.width + 30} : i))}><Maximize2 size={16}/></button>
                </div>
              )}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 shadow-md z-30" />
              <div className={cn("relative rounded-sm p-4 shadow-xl", el.type === 'note' ? "bg-[#fff9c4]" : "bg-white")}>
                {el.type === 'note' ? (
                  <textarea 
                    className="bg-transparent border-none outline-none w-full h-32 resize-none text-stone-800"
                    defaultValue={el.content}
                    onChange={(e) => setElements(elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i))}
                  />
                ) : ( <img src={el.content} className="w-full h-auto pointer-events-none" /> )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-xl rounded-[2.5rem] p-2 flex items-center justify-between border border-white/10 shadow-2xl">
          <button onClick={() => setElements([...elements, { id: `n_${Date.now()}`, type: 'note', content: '', x: 50, y: 150, width: 220, rotation: 2 }])} className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-xs">
            <Plus size={16} /> NOTE
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-stone-800 text-white rounded-full">
            <ImageIcon size={20} />
          </button>
          <button onClick={saveBoard} disabled={saving} className="p-4 bg-emerald-500 text-white rounded-full">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          </button>
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
