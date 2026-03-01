import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pencil, Eraser, Trash2, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Grab, Plus, Minus, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { motion, useMotionValue } from 'framer-motion';
import { db } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface TextElement { id: string; text: string; x: number; y: number; fontSize: number; color: string; }
interface ImageElement { id: string; url: string; x: number; y: number; width: number; height: number; }

export default function SketchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // التحكم باللوحة
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [tool, setTool] = useState<'pencil' | 'eraser' | 'select' | 'hand'>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeColor, setActiveColor] = useState('#1c1917');
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId] = useState(() => `project_${Date.now()}`);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 4000;
    canvas.height = 4000;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // الحفظ التلقائي
  const autoSave = useCallback(async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'projects', projectId), {
        userId: user.uid,
        texts,
        images,
        lastEdited: serverTimestamp(),
      }, { merge: true });
      setSaveStatus('saved');
    } catch (e) { console.error(e); }
  }, [user, texts, images, projectId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (texts.length > 0 || images.length > 0) autoSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [texts, images, autoSave]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: any) => {
    if (tool !== 'pencil' && tool !== 'eraser') return;
    setIsDrawing(true);
    const coords = getCoordinates(e.nativeEvent || e);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(coords.x, coords.y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e.nativeEvent || e);
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : activeColor;
      contextRef.current.lineWidth = tool === 'eraser' ? 60 : 5;
      contextRef.current.lineTo(coords.x, coords.y);
      contextRef.current.stroke();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f0f0f0] flex flex-col overflow-hidden touch-none select-none">
      
      {/* البار العلوي - تم رفع الـ Z-index لضمان الاستجابة */}
      <div className="absolute top-0 left-0 right-0 z-[9999] h-24 flex items-center justify-center px-8 pointer-events-none">
        
        {/* زر الرجوع على اليسار */}
        <div className="absolute left-8 pointer-events-auto">
          <button onClick={() => navigate(-1)} className="p-4 bg-white/90 backdrop-blur-md rounded-full shadow-xl border border-stone-200 active:scale-90 transition-all">
            <ChevronLeft size={28} className="text-stone-800" />
          </button>
        </div>

        {/* الأدوات الرئيسية في منتصف الصفحة تماماً */}
        <div className="flex items-center gap-1 bg-stone-900/95 backdrop-blur-2xl rounded-[2.5rem] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 pointer-events-auto scale-110">
           
           {/* أزرار الزوم الجديدة داخل البار */}
           <button onClick={() => scale.set(Math.max(0.3, scale.get() - 0.2))} className="p-3.5 text-white/40 hover:text-white transition-all active:scale-75"><ZoomOut size={22}/></button>
           <div className="w-[1px] h-6 bg-white/10 mx-1" />

           <button onClick={() => setTool('hand')} className={cn("p-3.5 rounded-full transition-all", tool === 'hand' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white")}><Grab size={22}/></button>
           <button onClick={() => setTool('pencil')} className={cn("p-3.5 rounded-full transition-all", tool === 'pencil' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white")}><Pencil size={22}/></button>
           <button onClick={() => setTool('select')} className={cn("p-3.5 rounded-full transition-all", tool === 'select' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white")}><Move size={22}/></button>
           
           <div className="w-[1px] h-6 bg-white/10 mx-1" />
           
           <button onClick={() => {
             const newId = Date.now().toString();
             setTexts([...texts, { id: newId, text: '', x: 400 - x.get(), y: 400 - y.get(), fontSize: 20, color: '#fff9c4' }]);
             setTool('select'); setSelectedId(newId);
           }} className="p-3.5 text-white/40 hover:text-white"><Type size={22}/></button>
           
           <button onClick={() => fileInputRef.current?.click()} className="p-3.5 text-white/40 hover:text-white"><ImageIcon size={22}/></button>
           <button onClick={() => setTool('eraser')} className={cn("p-3.5 rounded-full transition-all", tool === 'eraser' ? "bg-red-500 text-white shadow-lg" : "text-white/40 hover:text-white")}><Eraser size={22}/></button>

           <div className="w-[1px] h-6 bg-white/10 mx-1" />
           <button onClick={() => scale.set(Math.min(3, scale.get() + 0.2))} className="p-3.5 text-white/40 hover:text-white transition-all active:scale-75"><ZoomIn size={22}/></button>
        </div>

        {/* حالة الحفظ على اليمين */}
        <div className="absolute right-8 pointer-events-auto">
            <div className="bg-white/90 backdrop-blur-md px-5 py-3 rounded-full shadow-lg border border-stone-100 flex items-center gap-2">
              {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin text-blue-500"/> : <CheckCircle2 size={14} className="text-green-500"/>}
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">{saveStatus === 'saving' ? 'Syncing' : 'Saved'}</span>
            </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[#e5e5e5]">
        <motion.div 
          className="relative origin-top-left" 
          style={{ x, y, scale }}
          drag={tool === 'hand'}
          dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
          dragMomentum={false}
        >
          <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={() => setIsDrawing(false)} className="bg-white shadow-2xl" />

          {/* طبقة الصور والملاحظات */}
          <div className="absolute inset-0 pointer-events-none">
            {images.map((img) => (
              <Rnd
                key={img.id}
                size={{ width: img.width, height: img.height }}
                position={{ x: img.x, y: img.y }}
                onDragStop={(_, d) => setImages(images.map(i => i.id === img.id ? {...i, x: d.x, y: d.y} : i))}
                onResizeStop={(_, dir, ref, delta, pos) => setImages(images.map(i => i.id === img.id ? { ...i, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos } : i))}
                enableResizing={tool === 'select'}
                disableDragging={tool !== 'select'}
                style={{ pointerEvents: 'auto', zIndex: selectedId === img.id ? 1000 : 10 }}
              >
                <div onPointerDown={() => setSelectedId(img.id)} className={cn("relative w-full h-full p-2", selectedId === img.id && "ring-4 ring-blue-500/50 rounded-xl")}>
                  <img src={img.url} className="w-full h-full object-contain pointer-events-none" />
                  {selectedId === img.id && (
                    <button 
                      onPointerDown={(e) => { e.stopPropagation(); setImages(images.filter(i => i.id !== img.id)); setSelectedId(null); }}
                      className="absolute -top-6 -right-6 bg-red-600 text-white rounded-full p-4 shadow-2xl active:scale-150 transition-transform pointer-events-auto border-4 border-white"
                      style={{ zIndex: 99999 }}
                    >
                      <X size={26} strokeWidth={4} />
                    </button>
                  )}
                </div>
              </Rnd>
            ))}

            {texts.map((t) => (
              <Rnd
                key={t.id}
                position={{ x: t.x, y: t.y }}
                onDragStop={(_, d) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, x: d.x, y: d.y} : txt))}
                disableDragging={tool !== 'select'}
                style={{ pointerEvents: 'auto', zIndex: selectedId === t.id ? 1000 : 20 }}
              >
                <div onPointerDown={() => setSelectedId(t.id)} className={cn("relative p-10 pt-16 min-w-[240px] shadow-2xl transition-all bg-[#fff9c4]", selectedId === t.id ? "scale-105 ring-4 ring-blue-500/30" : "rotate-1")}>
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-7 h-7 bg-red-600 rounded-full shadow-lg border-b-4 border-red-900" />
                    <div className="w-1.5 h-7 bg-stone-400/50 -mt-1" />
                  </div>
                  <textarea
                    defaultValue={t.text}
                    className="bg-transparent border-none font-medium text-stone-800 outline-none resize-none text-center w-full text-2xl"
                    placeholder="Write..."
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                  {selectedId === t.id && (
                    <button 
                      onPointerDown={(e) => { e.stopPropagation(); setTexts(texts.filter(txt => txt.id !== t.id)); setSelectedId(null); }}
                      className="absolute -top-6 -right-6 bg-red-600 text-white rounded-full p-4 shadow-2xl active:scale-150 transition-transform pointer-events-auto border-4 border-white"
                      style={{ zIndex: 99999 }}
                    >
                      <X size={26} strokeWidth={4}/>
                    </button>
                  )}
                </div>
              </Rnd>
            ))}
          </div>
        </motion.div>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const newId = Date.now().toString();
              setImages([...images, { id: newId, url: ev.target?.result as string, x: 200-x.get(), y: 200-y.get(), width: 400, height: 400 }]);
              setTool('select'); setSelectedId(newId);
            };
            reader.readAsDataURL(file);
          }
        }} />
      </div>
    </div>
  );
}

// أيقونات الزوم اليدوية
const ZoomIn = ({size}: {size: number}) => <Plus size={size} strokeWidth={3} />;
const ZoomOut = ({size}: {size: number}) => <Minus size={size} strokeWidth={3} />;
