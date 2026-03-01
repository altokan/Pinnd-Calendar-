import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pencil, Eraser, Trash2, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Grab, Plus, Minus, CheckCircle2, ZoomIn, ZoomOut,
  User, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { motion, useMotionValue } from 'framer-motion';
import { db } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface TextElement { id: string; text: string; x: number; y: number; fontSize: number; color: string; }
interface ImageElement { id: string; url: string; x: number; y: number; width: number; height: number; }

export default function SketchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // تهيئة الكانفاس
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

  const handleQuickSelect = (id: string) => {
    setTool('select');
    setSelectedId(id);
  };

  return (
    <div className="relative w-full h-screen bg-[#f0f0f0] overflow-hidden touch-none">
      
      {/* البنر العلوي الفائق */}
      <nav 
        className="fixed top-0 left-0 right-0 h-24 flex items-center justify-between px-8 bg-white/90 backdrop-blur-xl border-b border-stone-200 shadow-lg"
        style={{ zIndex: 1000000, pointerEvents: 'auto' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* اليسار: زر الرجوع */}
        <div className="w-1/4 flex justify-start">
          <button 
            onClick={() => navigate(-1)}
            className="p-4 bg-stone-100 hover:bg-stone-200 rounded-full transition-all active:scale-90 shadow-sm pointer-events-auto"
          >
            <ChevronLeft size={28} className="text-stone-800" />
          </button>
        </div>

        {/* المنتصف: الكونسول الأسود (الأدوات + الزوم + الحفظ) */}
        <div className="flex items-center gap-1 bg-stone-900 rounded-[2.5rem] p-2 shadow-2xl border border-white/10 pointer-events-auto">
           {/* حالة الحفظ المدمجة */}
           <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full mr-1">
              {saveStatus === 'saving' ? (
                <Loader2 size={16} className="animate-spin text-blue-400"/>
              ) : (
                <CheckCircle2 size={16} className="text-green-400"/>
              )}
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">
                {saveStatus === 'saving' ? 'Saving' : 'Saved'}
              </span>
           </div>

           <div className="w-[1px] h-6 bg-white/10 mx-1" />

           <button onClick={() => scale.set(Math.max(0.3, scale.get() - 0.2))} className="p-4 text-white/40 hover:text-white active:scale-75"><ZoomOut size={22}/></button>
           
           <div className="w-[1px] h-8 bg-white/10 mx-1" />

           <button onClick={() => setTool('hand')} className={cn("p-4 rounded-full transition-all", tool === 'hand' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white")}><Grab size={22}/></button>
           <button onClick={() => setTool('pencil')} className={cn("p-4 rounded-full transition-all", tool === 'pencil' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white")}><Pencil size={22}/></button>
           <button onClick={() => setTool('select')} className={cn("p-4 rounded-full transition-all", tool === 'select' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white")}><Move size={22}/></button>
           
           <div className="w-[1px] h-8 bg-white/10 mx-1" />
           
           <button onClick={() => {
             const newId = Date.now().toString();
             setTexts([...texts, { id: newId, text: '', x: 400 - x.get(), y: 400 - y.get(), fontSize: 24, color: '#fff9c4' }]);
             handleQuickSelect(newId);
           }} className="p-4 text-white/40 hover:text-white"><Type size={22}/></button>
           
           <button onClick={() => fileInputRef.current?.click()} className="p-4 text-white/40 hover:text-white"><ImageIcon size={22}/></button>
           <button onClick={() => setTool('eraser')} className={cn("p-4 rounded-full transition-all", tool === 'eraser' ? "bg-red-500 text-white shadow-md" : "text-white/40 hover:text-white")}><Eraser size={22}/></button>

           <div className="w-[1px] h-8 bg-white/10 mx-1" />

           <button onClick={() => scale.set(Math.min(3, scale.get() + 0.2))} className="p-4 text-white/40 hover:text-white active:scale-75"><ZoomIn size={22}/></button>
        </div>

        {/* اليمين: أيقونات الأدمن والبروفايل (مفعلة الآن) */}
        <div className="w-1/4 flex justify-end gap-3 pointer-events-auto">
          <button 
            onClick={() => navigate('/admin')} 
            className="p-4 bg-stone-100 hover:bg-stone-200 rounded-full transition-all active:scale-90 border border-stone-200 shadow-sm"
          >
            <ShieldCheck size={24} className="text-blue-600" />
          </button>
          <button 
            onClick={() => navigate('/profile')} 
            className="p-4 bg-stone-100 hover:bg-stone-200 rounded-full transition-all active:scale-90 border border-stone-200 shadow-sm"
          >
            <User size={24} className="text-stone-700" />
          </button>
        </div>
      </nav>

      {/* لوحة الرسم */}
      <div className="w-full h-full pt-24 relative z-0">
        <motion.div 
          className="relative origin-top-left" 
          style={{ x, y, scale }}
          drag={tool === 'hand'}
          dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
          dragMomentum={false}
        >
          <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={() => setIsDrawing(false)} className="bg-white shadow-2xl" />

          {/* طبقة العناصر */}
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
                <div onPointerDown={() => setSelectedId(img.id)} onDoubleClick={() => handleQuickSelect(img.id)} className={cn("relative w-full h-full p-2 group", selectedId === img.id && "ring-4 ring-blue-500 rounded-xl bg-blue-50/20")}>
                  <img src={img.url} className="w-full h-full object-contain pointer-events-none" />
                  {selectedId === img.id && (
                    <button 
                      onPointerDown={(e) => { e.stopPropagation(); setImages(images.filter(i => i.id !== img.id)); setSelectedId(null); }}
                      className="absolute -top-8 -right-8 bg-red-600 text-white rounded-full p-4 shadow-2xl active:scale-125 transition-transform pointer-events-auto border-4 border-white"
                      style={{ zIndex: 2000000 }}
                    >
                      <X size={28} strokeWidth={4} />
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
                <div onPointerDown={() => setSelectedId(t.id)} onDoubleClick={() => handleQuickSelect(t.id)} className={cn("relative p-10 pt-20 min-w-[260px] shadow-2xl transition-all bg-[#fff9c4]", selectedId === t.id ? "scale-105 ring-4 ring-blue-500/30" : "rotate-1")}>
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center drop-shadow-lg z-50 pointer-events-none">
                    <div className="w-8 h-8 bg-red-600 rounded-full shadow-lg border-b-4 border-red-900" />
                    <div className="w-1.5 h-8 bg-stone-400/60 -mt-1.5" />
                  </div>
                  <textarea
                    defaultValue={t.text}
                    className="bg-transparent border-none font-semibold text-stone-800 outline-none resize-none text-center w-full text-2xl"
                    placeholder="Note..."
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                  {selectedId === t.id && (
                    <button 
                      onPointerDown={(e) => { e.stopPropagation(); setTexts(texts.filter(txt => txt.id !== t.id)); setSelectedId(null); }}
                      className="absolute -top-8 -right-8 bg-red-600 text-white rounded-full p-4 shadow-2xl active:scale-125 transition-transform pointer-events-auto border-4 border-white"
                      style={{ zIndex: 2000000 }}
                    >
                      <X size={28} strokeWidth={4}/>
                    </button>
                  )}
                </div>
              </Rnd>
            ))}
          </div>
        </motion.div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const newId = Date.now().toString();
            setImages([...images, { id: newId, url: ev.target?.result as string, x: 200-x.get(), y: 200-y.get(), width: 400, height: 400 }]);
            handleQuickSelect(newId);
          };
          reader.readAsDataURL(file);
        }
      }} />
    </div>
  );
}
