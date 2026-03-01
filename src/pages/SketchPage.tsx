import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pencil, Eraser, Trash2, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Grab, Plus, Minus, CloudCheck, CloudOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { motion, useMotionValue } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId] = useState(() => `project_${Date.now()}`); // معرف فريد للمشروع الحالي

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

  // دالة الحفظ التلقائي (Auto-save)
  const autoSave = useCallback(async () => {
    if (!user || !canvasRef.current) return;
    setSaveStatus('saving');
    try {
      // حفظ البيانات النصية والصور في Firestore
      await setDoc(doc(db, 'projects', projectId), {
        userId: user.uid,
        texts,
        images,
        lastEdited: serverTimestamp(),
      }, { merge: true });
      
      setSaveStatus('saved');
    } catch (error) {
      console.error("Auto-save error:", error);
      setSaveStatus('unsaved');
    }
  }, [user, texts, images, projectId]);

  // تنفيذ الحفظ التلقائي عند كل تغيير بعد تأخير بسيط (Debounce)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (texts.length > 0 || images.length > 0) {
        autoSave();
      }
    }, 2000); // يحفظ بعد ثانيتين من آخر تغيير
    return () => clearTimeout(delayDebounceFn);
  }, [texts, images, autoSave]);

  const handleZoom = (type: 'in' | 'out') => {
    const currentScale = scale.get();
    if (type === 'in' && currentScale < 3) scale.set(currentScale + 0.2);
    if (type === 'out' && currentScale > 0.3) scale.set(currentScale - 0.2);
  };

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
    setSaveStatus('unsaved');
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
    <div className="fixed inset-0 bg-[#e7e5e4] flex flex-col overflow-hidden touch-none select-none">
      {/* Header المطور */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white/70 backdrop-blur-xl border-b border-stone-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-stone-100 transition-colors">
            <ChevronLeft size={24} className="text-stone-600" />
          </button>
          <div>
            <h1 className="text-sm font-black italic tracking-tighter uppercase text-stone-900 leading-none">Studio Pro</h1>
            <div className="flex items-center gap-1 mt-1">
              {saveStatus === 'saving' && <Loader2 size={10} className="animate-spin text-blue-500" />}
              {saveStatus === 'saved' && <CloudCheck size={10} className="text-green-500" />}
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'All changes saved' : 'Unsaved changes'}
              </span>
            </div>
          </div>
        </div>

        {/* نقلنا أزرار الزوم للهيدر لتجنب التداخل */}
        <div className="flex items-center bg-stone-100 rounded-full p-1 border border-stone-200">
          <button onClick={() => handleZoom('out')} className="p-2 hover:bg-white rounded-full transition-all active:scale-90"><Minus size={18} className="text-stone-600"/></button>
          <div className="w-[1px] h-4 bg-stone-200 mx-1" />
          <button onClick={() => handleZoom('in')} className="p-2 hover:bg-white rounded-full transition-all active:scale-90"><Plus size={18} className="text-stone-600"/></button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[#f5f5f4]">
        <motion.div 
          className="relative origin-top-left" 
          style={{ x, y, scale }}
          drag={tool === 'hand'}
          dragConstraints={{ left: -3000, right: 3000, top: -3000, bottom: 3000 }}
          dragMomentum={false}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={() => setIsDrawing(false)}
            className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.05)]"
          />

          {/* طبقة الملاحظات والصور */}
          <div className="absolute inset-0 pointer-events-none">
            {images.map((img) => (
              <Rnd
                key={img.id}
                size={{ width: img.width, height: img.height }}
                position={{ x: img.x, y: img.y }}
                onDragStop={(_, d) => setImages(images.map(i => i.id === img.id ? {...i, x: d.x, y: d.y} : i))}
                onResizeStop={(_, dir, ref, delta, pos) => {
                  setImages(images.map(i => i.id === img.id ? { ...i, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos } : i));
                }}
                enableResizing={tool === 'select'}
                disableDragging={tool !== 'select'}
                cancel=".no-drag"
                style={{ pointerEvents: 'auto', zIndex: selectedId === img.id ? 50 : 10 }}
              >
                <div onPointerDown={() => setSelectedId(img.id)} className={cn("relative w-full h-full p-2 group transition-all", selectedId === img.id && "ring-2 ring-blue-500 rounded-lg bg-blue-50/10")}>
                  <img src={img.url} className="w-full h-full object-contain pointer-events-none" />
                  {selectedId === img.id && (
                    <button onPointerDown={(e) => { e.stopPropagation(); setImages(images.filter(i => i.id !== img.id)); }} className="no-drag absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg active:scale-125"><X size={14}/></button>
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
                cancel=".no-drag"
                style={{ pointerEvents: 'auto', zIndex: selectedId === t.id ? 50 : 20 }}
              >
                <div 
                  onPointerDown={() => setSelectedId(t.id)}
                  className={cn(
                    "relative p-6 pt-12 min-w-[200px] shadow-[10px_10px_25px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out",
                    selectedId === t.id ? "scale-105 z-50 ring-2 ring-blue-400" : "rotate-[-0.5deg]"
                  )}
                  style={{ backgroundColor: t.color || '#fff9c4' }}
                >
                  {/* Pin Design الواقعي */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 drop-shadow-md z-30 pointer-events-none">
                    <div className="w-5 h-5 bg-red-600 rounded-full border-b-4 border-red-900 shadow-inner" />
                    <div className="w-[2px] h-5 bg-stone-400/60 mx-auto -mt-1.5" />
                  </div>

                  <textarea
                    defaultValue={t.text}
                    className="no-drag bg-transparent border-none font-medium text-stone-800 outline-none resize-none text-center w-full placeholder:text-stone-400/50"
                    placeholder="Start typing..."
                    style={{ fontSize: `${t.fontSize}px`, minHeight: '80px' }}
                    onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                  
                  {selectedId === t.id && tool === 'select' && (
                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-1 bg-stone-900 p-1 rounded-2xl shadow-2xl no-drag border border-white/20">
                      <button onClick={() => setTexts(texts.filter(txt => txt.id !== t.id))} className="p-2 text-red-400 hover:bg-white/10 rounded-xl transition-colors"><Trash2 size={16}/></button>
                      <div className="w-px h-4 bg-white/10 self-center" />
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: txt.fontSize + 2} : txt))} className="p-2 text-white hover:bg-white/10 rounded-xl"><Plus size={16}/></button>
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: Math.max(10, t.fontSize - 2)} : txt))} className="p-2 text-white hover:bg-white/10 rounded-xl"><Minus size={16}/></button>
                    </div>
                  )}
                </div>
              </Rnd>
            ))}
          </div>
        </motion.div>

        {/* Sidebar الأدوات */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-4 p-4 bg-white/80 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white/50">
          <button onClick={() => setTool('hand')} className={cn("p-4 rounded-full transition-all active:scale-90", tool === 'hand' ? "bg-blue-600 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Grab size={26}/>
          </button>
          <button onClick={() => setTool('pencil')} className={cn("p-4 rounded-full transition-all active:scale-90", tool === 'pencil' ? "bg-stone-900 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Pencil size={26}/>
          </button>
          <button onClick={() => setTool('select')} className={cn("p-4 rounded-full transition-all active:scale-90", tool === 'select' ? "bg-stone-900 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Move size={26}/>
          </button>
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => { 
            const newId = Date.now().toString();
            const colors = ['#fff9c4', '#dcfce7', '#dbeafe', '#fce7f3'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            setTexts([...texts, { id: newId, text: '', x: 300 - x.get(), y: 300 - y.get(), fontSize: 18, color: randomColor }]); 
            setTool('select');
            setSelectedId(newId);
          }} className="p-4 text-stone-400 hover:text-stone-900 transition-colors"><Type size={26}/></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-stone-400 hover:text-stone-900 transition-colors"><ImageIcon size={26}/></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) {
               const reader = new FileReader();
               reader.onload = (ev) => {
                 const newId = Date.now().toString();
                 setImages([...images, { id: newId, url: ev.target?.result as string, x: 200 - x.get(), y: 200 - y.get(), width: 350, height: 350 }]);
                 setTool('select');
                 setSelectedId(newId);
               };
               reader.readAsDataURL(file);
             }
          }} />
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => setTool('eraser')} className={cn("p-4 rounded-full transition-all active:scale-90", tool === 'eraser' ? "bg-red-500 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Eraser size={26}/>
          </button>
        </div>
      </div>
    </div>
  );
}
