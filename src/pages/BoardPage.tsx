import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronLeft, ImageIcon, Save, Plus, Maximize2, Loader2, StickyNote } from 'lucide-react';
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

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

  // جلب البيانات من Firebase
  useEffect(() => {
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  // إضافة صورة مع الرفع لـ Storage
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const id = `img_${Date.now()}`;
      toast.loading('جاري رفع الصورة...', { id: 'u' });
      try {
        const sRef = ref(storage, `board/${userId}/${id}`);
        await uploadString(sRef, base64, 'data_url');
        const url = await getDownloadURL(sRef);
        const newEl = { id, type: 'image', content: url, x: Math.random() * 100, y: Math.random() * 100, width: 250 };
        setElements(prev => [...prev, newEl]);
        toast.success('تمت إضافة الصورة', { id: 'u' });
      } catch { toast.error('فشل الرفع', { id: 'u' }); }
    };
    reader.readAsDataURL(file);
  };

  // حفظ التعديلات في Firestore
  const onSave = async () => {
    setSaving(true);
    try {
      await setDoc(boardDocRef, { elements, updated: new Date().toISOString() });
      toast.success('تم الحفظ في Firebase');
    } catch { toast.error('فشل الحفظ'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center">
      <Loader2 className="animate-spin text-white" size={40} />
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden touch-none bg-[#bc8a5f]" 
         style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }}>
      
      {/* زر العودة */}
      <div className="absolute top-6 left-6 z-[100]">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/90 rounded-2xl shadow-xl hover:bg-white transition-colors">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="w-full h-full relative" onClick={() => setActiveId(null)}>
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              drag
              dragMomentum={false}
              onDragStart={() => setActiveId(el.id)}
              className="absolute p-4 cursor-grab active:cursor-grabbing"
              style={{ x: el.x, y: el.y, width: el.width || 200, zIndex: activeId === el.id ? 50 : 20 }}
            >
              <div className={cn(
                "relative p-3 shadow-2xl rounded-sm ring-1 ring-black/5 transition-all",
                el.type === 'note' ? "bg-yellow-200 rotate-1 hover:rotate-0" : "bg-white"
              )}>
                {/* دبوس النوت (Effect) */}
                {el.type === 'note' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-red-700 drop-shadow-md">
                    <Plus size={20} className="fill-current" />
                  </div>
                )}

                {el.type === 'image' ? (
                  <img src={el.content} className="w-full h-auto rounded-sm pointer-events-none" alt="" />
                ) : (
                  <textarea 
                    className="w-full h-32 p-2 border-none outline-none resize-none bg-transparent font-handwriting text-stone-800"
                    placeholder="اكتب ملاحظتك هنا..."
                    defaultValue={el.content}
                    onChange={(e) => setElements(elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i))}
                  />
                )}

                {/* أدوات التحكم للعنصر النشط */}
                {activeId === el.id && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                              className="absolute -top-12 left-0 flex gap-2">
                    <button className="bg-red-600 text-white p-2 rounded-lg shadow-lg hover:bg-red-700" 
                            onClick={() => setElements(elements.filter(x => x.id !== el.id))}>
                      <Trash2 size={16}/>
                    </button>
                    <button className="bg-stone-800 text-white p-2 rounded-lg shadow-lg" 
                            onClick={() => setElements(elements.map(i => i.id === el.id ? {...i, width: (i.width || 200) + 40} : i))}>
                      <Maximize2 size={16}/>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* شريط الأدوات الرئيسي */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 bg-stone-900/95 backdrop-blur-xl p-4 rounded-full shadow-2xl z-[200] border border-white/10">
        <button title="إضافة ملاحظة"
                onClick={() => setElements([...elements, { id: Date.now().toString(), type: 'note', content: '', x: 100, y: 100, width: 220 }])} 
                className="bg-yellow-400 p-4 rounded-full hover:scale-110 active:scale-90 transition-all text-stone-900 shadow-lg">
          <StickyNote size={24}/>
        </button>
        
        <button title="إضافة صورة"
                onClick={() => fileInputRef.current?.click()} 
                className="bg-stone-700 text-white p-4 rounded-full hover:scale-110 active:scale-90 transition-all shadow-lg">
          <ImageIcon size={24}/>
        </button>
        
        <button title="حفظ التغييرات"
                onClick={onSave} 
                className="bg-emerald-500 text-white p-4 rounded-full hover:scale-110 active:scale-90 transition-all shadow-lg">
          {saving ? <Loader2 className="animate-spin" size={24}/> : <Save size={24}/>}
        </button>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
    </div>
  );
}

// دالة مساعدة للتنسيق
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
