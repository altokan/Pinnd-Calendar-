import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Plus, Calendar, 
  Loader2, Save, X, Check, MapPin 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [targetNote, setTargetNote] = useState<any>(null);

  const userId = auth.currentUser?.uid || "guest";
  const boardDocRef = doc(db, "boards", userId);

  useEffect(() => {
    const unsub = onSnapshot(boardDocRef, (d) => {
      if (d.exists()) setElements(d.data().elements || []);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  // دالة الحفظ التلقائي للموقع
  const handleDragEnd = async (id: string, info: any) => {
    const updated = elements.map(el => 
      el.id === id ? { ...el, x: el.x + info.offset.x / scale, y: el.y + info.offset.y / scale } : el
    );
    await setDoc(boardDocRef, { elements: updated }, { merge: true });
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

      {/* منطقة البورد اللانهائية - قابلة للسحب والزوم */}
      <motion.div 
        ref={containerRef}
        drag
        dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
        style={{ x: offset.x, y: offset.y, scale }}
        className="w-[4000px] h-[4000px] relative cursor-move"
      >
        {elements.map((el) => (
          <motion.div
            key={el.id}
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => handleDragEnd(el.id, info)}
            initial={{ scale: 0 }}
            animate={{ scale: 1, x: el.x + 2000, y: el.y + 2000, rotate: el.rotate }}
            className="absolute cursor-grab active:cursor-grabbing p-4 z-10"
          >
            {/* الدبوس */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
              <div className="w-5 h-5 bg-red-600 rounded-full shadow-lg border-b-4 border-red-800" />
            </div>

            <div className={cn(
              "relative shadow-2xl transition-all",
              el.type === 'note' ? "bg-[#fff9c4] p-6 pt-12 min-w-[200px] max-w-[280px]" : "bg-white p-2 pb-12 border border-stone-200"
            )}>
              {el.type === 'note' && (
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#f0e68c] rotate-45 shadow-inner border-l border-t border-black/5 pointer-events-none" />
              )}
              {el.type === 'note' ? (
                <textarea
                  className="w-full bg-transparent border-none outline-none resize-none text-stone-800 text-xl font-bold font-serif"
                  defaultValue={el.content}
                  onBlur={(e) => {
                    const updated = elements.map(i => i.id === el.id ? {...i, content: e.target.value} : i);
                    setDoc(boardDocRef, { elements: updated }, { merge: true });
                  }}
                />
              ) : (
                <img src={el.content} className="w-48 h-auto block" alt="" />
              )}
              
              <div className="absolute top-2 right-2 flex flex-col gap-2 z-[90]">
                <button onClick={() => updateDoc(boardDocRef, { elements: arrayRemove(el) })} className="bg-red-600 text-white p-2 rounded-lg shadow-md"><Trash2 size={14} /></button>
                <button onClick={() => { setTargetNote(el); setShowCalendarModal(true); }} className="bg-blue-600 text-white p-2 rounded-lg shadow-md"><Calendar size={14} /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* البنر السفلي مع توحيد مقاسات الأزرار */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] p-3 flex items-center justify-between shadow-2xl border border-white/10">
          <button 
            onClick={() => updateDoc(boardDocRef, { elements: arrayUnion({ id: `n_${Date.now()}`, type: 'note', content: '', x: 0, y: 0, rotate: 0 }) })} 
            className="h-14 flex-1 mr-2 bg-yellow-400 text-stone-900 rounded-full font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
          >
            <Plus size={18} strokeWidth={3} />
            <span>ADD IDEA</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="h-14 w-14 bg-stone-800 text-white rounded-full flex items-center justify-center active:scale-95 transition-all border border-white/10 shadow-md"
          >
            <ImageIcon size={20} />
          </button>

          <button 
            onClick={() => toast.success('Board Saved')} 
            className="h-14 w-14 ml-2 bg-emerald-500 text-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md"
          >
            <Save size={20} />
          </button>
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={() => {}} />
    </div>
  );
}
