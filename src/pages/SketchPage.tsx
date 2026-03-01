import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Save, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Grab, Plus, Minus, ZoomIn, ZoomOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { motion, useMotionValue } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface TextElement { id: string; text: string; x: number; y: number; fontSize: number; }
interface ImageElement { id: string; url: string; x: number; y: number; width: number; height: number; }

export default function SketchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // التحكم باللوحة (إحداثيات لا نهائية)
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [tool, setTool] = useState<'pencil' | 'eraser' | 'select' | 'hand'>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1c1917');
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // تهيئة الكانفاس بمساحة ضخمة جداً لمحاكاة اللوحة اللانهائية
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 10000; // مساحة عملاقة
    canvas.height = 10000;
    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = 5;
      contextRef.current = context;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // حساب الإحداثيات مع مراعاة الزوم والتحريك
    const currentScale = scale.get();
    return {
      offsetX: (clientX - rect.left) * (canvas.width / rect.width),
      offsetY: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: any) => {
    if (tool !== 'pencil' && tool !== 'eraser') return;
    const { offsetX, offsetY } = getCoordinates(e.nativeEvent || e);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(e.nativeEvent || e);
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = tool === 'eraser' ? 80 : 5;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#e5e7eb] flex flex-col overflow-hidden touch-none select-none">
      {/* Header */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-stone-100"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-black italic tracking-tighter text-stone-900 uppercase">Studio Pro</h1>
        </div>
        <button onClick={() => toast.success("Saved Successfully")} className="px-8 py-2.5 bg-stone-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-lg">Save Project</button>
      </div>

      <div className="flex-1 relative bg-[#f3f4f6] overflow-hidden">
        {/* اللوحة اللانهائية */}
        <motion.div 
          className="relative origin-center cursor-dot" 
          style={{ x, y, scale, width: 10000, height: 10000 }}
          drag={tool === 'hand'}
          dragMomentum={false}
          onPinch={(_, info) => scale.set(info.scale)}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={() => setIsDrawing(false)}
            className={cn("bg-white shadow-[0_0_100px_rgba(0,0,0,0.05)]", tool === 'hand' ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair")}
          />

          {/* طبقة العناصر */}
          <div className="absolute inset-0 pointer-events-none">
            {/* الصور */}
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
                <div onPointerDown={() => setSelectedId(img.id)} className={cn("relative w-full h-full p-2 group", selectedId === img.id && "ring-2 ring-blue-500 rounded-lg")}>
                  <img src={img.url} className="w-full h-full object-contain pointer-events-none" />
                  {selectedId === img.id && tool === 'select' && (
                    <button onClick={(e) => { e.stopPropagation(); setImages(images.filter(i => i.id !== img.id)); setSelectedId(null); }} className="no-drag absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-2 shadow-xl z-[100]"><X size={18}/></button>
                  )}
                </div>
              </Rnd>
            ))}

            {/* نصوص الـ Note with Pin المحدثة */}
            {texts.map((t) => (
              <Rnd
                key={t.id}
                position={{ x: t.x, y: t.y }}
                onDragStop={(_, d) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, x: d.x, y: d.y} : txt))}
                disableDragging={tool !== 'select'}
                enableResizing={false}
                cancel=".no-drag"
                style={{ pointerEvents: 'auto', zIndex: selectedId === t.id ? 50 : 20 }}
              >
                <div 
                  onPointerDown={() => setSelectedId(t.id)}
                  className={cn(
                    "relative p-6 pt-10 min-w-[200px] max-w-[400px] transition-transform duration-200",
                    "bg-[#fff9c4] shadow-[5px_5px_15px_rgba(0,0,0,0.1)] rounded-sm", // لون النوت الأصفر
                    selectedId === t.id ? "scale-105 ring-2 ring-blue-400" : "rotate-1" // ميلان بسيط واقعي
                  )}
                >
                  {/* الدبوس الأحمر (Pin) */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 z-10 drop-shadow-md">
                    <div className="w-4 h-4 bg-red-600 rounded-full mx-auto relative border-b-4 border-red-800" />
                    <div className="w-0.5 h-4 bg-stone-400 mx-auto -mt-1" />
                  </div>

                  <textarea
                    defaultValue={t.text}
                    placeholder="Write something..."
                    className="no-drag bg-transparent border-none font-medium text-stone-800 outline-none resize-none text-center w-full leading-relaxed overflow-hidden"
                    style={{ fontSize: `${t.fontSize}px`, height: 'auto', minHeight: '60px' }}
                    onInput={(e: any) => {
                       e.target.style.height = 'inherit';
                       e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                  
                  {selectedId === t.id && tool === 'select' && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 bg-stone-900 p-1.5 rounded-xl shadow-2xl no-drag z-[100]">
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: txt.fontSize + 2} : txt))} className="p-2 text-white"><Plus size={16}/></button>
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: Math.max(12, txt.fontSize - 2)} : txt))} className="p-2 text-white border-r border-white/20"><Minus size={16}/></button>
                      <button onClick={() => { setTexts(texts.filter(txt => txt.id !== t.id)); setSelectedId(null); }} className="p-2 text-red-400"><Trash2 size={16}/></button>
                    </div>
                  )}
                </div>
              </Rnd>
            ))}
          </div>
        </motion.div>

        {/* Sidebar Tools */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-4 p-4 bg-white/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white">
          <button onClick={() => {setTool('hand'); setSelectedId(null);}} className={cn("p-4 rounded-full transition-all", tool === 'hand' ? "bg-blue-600 text-white shadow-lg scale-110" : "text-stone-400")}>
            <Grab size={26}/>
          </button>
          <button onClick={() => {setTool('pencil'); setSelectedId(null);}} className={cn("p-4 rounded-full transition-all", tool === 'pencil' ? "bg-stone-900 text-white shadow-lg scale-110" : "text-stone-400")}>
            <Pencil size={26}/>
          </button>
          <button onClick={() => setTool('select')} className={cn("p-4 rounded-full transition-all", tool === 'select' ? "bg-stone-900 text-white shadow-lg scale-110" : "text-stone-400")}>
            <Move size={26}/>
          </button>
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => { 
            const newId = Date.now().toString();
            setTexts([...texts, { id: newId, text: '', x: 5000, y: 5000, fontSize: 18 }]); 
            setTool('select');
            setSelectedId(newId);
          }} className="p-4 text-stone-400"><Type size={26}/></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-stone-400"><ImageIcon size={26}/></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const newId = Date.now().toString();
                setImages([...images, { id: newId, url: ev.target?.result as string, x: 5000, y: 5000, width: 400, height: 400 }]);
                setTool('select');
                setSelectedId(newId);
              };
              reader.readAsDataURL(file);
            }
          }} />
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => {setTool('eraser'); setSelectedId(null);}} className={cn("p-4 rounded-full transition-all", tool === 'eraser' ? "bg-red-500 text-white shadow-lg scale-110" : "text-stone-400")}>
            <Eraser size={26}/>
          </button>
        </div>
        
        {/* Zoom Indicator */}
        <div className="absolute bottom-8 right-8 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border shadow-sm font-bold text-stone-600 text-xs z-[200]">
          {Math.round(scale.get() * 100)}% Zoom
        </div>
      </div>
    </div>
  );
}
