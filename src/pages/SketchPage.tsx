import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Save, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Grab, Plus, Minus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { motion, useMotionValue, useTransform } from 'framer-motion';
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

  // التحكم باللوحة
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // حجم معقول يضمن الأداء العالي على الآيباد
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = color;
      context.lineWidth = 5;
      contextRef.current = context;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // حساب دقيق للإحداثيات مع مراعاة الزوم والتحريك
    const s = scale.get();
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
    if (!isDrawing || (tool !== 'pencil' && tool !== 'eraser')) return;
    const coords = getCoordinates(e.nativeEvent || e);
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = tool === 'eraser' ? 50 : 5;
      contextRef.current.lineTo(coords.x, coords.y);
      contextRef.current.stroke();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newId = Date.now().toString();
        setImages([...images, { 
          id: newId, 
          url: ev.target?.result as string, 
          x: 100 - x.get(), 
          y: 100 - y.get(), 
          width: 300, 
          height: 300 
        }]);
        setTool('select');
        setSelectedId(newId);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-200 flex flex-col overflow-hidden touch-none">
      {/* Header */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-stone-100"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-black italic text-stone-900 uppercase tracking-tighter">Studio Pro</h1>
        </div>
        <button onClick={() => toast.success("Project Saved!")} className="px-6 py-2 bg-stone-900 text-white rounded-full font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
          Save Project
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-stone-300">
        <motion.div 
          className="relative origin-top-left" 
          style={{ x, y, scale }}
          drag={tool === 'hand'}
          dragConstraints={{ left: -5000, right: 5000, top: -5000, bottom: 5000 }}
          dragMomentum={false}
        >
          {/* Canvas الرسم */}
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={() => setIsDrawing(false)}
            onPointerLeave={() => setIsDrawing(false)}
            className={cn(
              "bg-white shadow-2xl", 
              tool === 'pencil' || tool === 'eraser' ? "touch-none cursor-crosshair" : "cursor-default"
            )}
          />

          {/* طبقة العناصر التفاعلية */}
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
                <div onPointerDown={() => setSelectedId(img.id)} className={cn("relative w-full h-full p-2 group", selectedId === img.id && "ring-2 ring-blue-500 rounded-lg")}>
                  <img src={img.url} className="w-full h-full object-contain pointer-events-none" />
                  {selectedId === img.id && tool === 'select' && (
                    <button 
                      onPointerDown={(e) => { e.stopPropagation(); setImages(images.filter(i => i.id !== img.id)); setSelectedId(null); }}
                      className="no-drag absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-2 shadow-xl z-[100]"
                    >
                      <X size={20}/>
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
                enableResizing={false}
                cancel=".no-drag"
                style={{ pointerEvents: 'auto', zIndex: selectedId === t.id ? 50 : 20 }}
              >
                <div 
                  onPointerDown={() => setSelectedId(t.id)}
                  className={cn(
                    "relative p-6 pt-10 min-w-[180px] bg-[#fff9c4] shadow-lg rounded-sm transition-transform",
                    selectedId === t.id ? "ring-2 ring-blue-500 scale-105" : "rotate-1"
                  )}
                >
                  {/* الدبوس الأحمر */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-4 h-4 bg-red-600 rounded-full shadow-inner border-b-2 border-red-800" />
                    <div className="w-0.5 h-3 bg-stone-400 -mt-0.5" />
                  </div>

                  <textarea
                    defaultValue={t.text}
                    placeholder="Type here..."
                    className="no-drag bg-transparent border-none font-medium text-stone-800 outline-none resize-none text-center w-full leading-tight"
                    style={{ fontSize: `${t.fontSize}px`, minHeight: '40px' }}
                    onInput={(e: any) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                  
                  {selectedId === t.id && tool === 'select' && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 bg-stone-900 p-1 rounded-xl shadow-2xl no-drag">
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
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-4 p-4 bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white">
          <button onClick={() => setTool('hand')} className={cn("p-4 rounded-full transition-all", tool === 'hand' ? "bg-blue-600 text-white shadow-lg" : "text-stone-400")}>
            <Grab size={26}/>
          </button>
          <button onClick={() => setTool('pencil')} className={cn("p-4 rounded-full transition-all", tool === 'pencil' ? "bg-stone-900 text-white shadow-lg" : "text-stone-400")}>
            <Pencil size={26}/>
          </button>
          <button onClick={() => setTool('select')} className={cn("p-4 rounded-full transition-all", tool === 'select' ? "bg-stone-900 text-white shadow-lg" : "text-stone-400")}>
            <Move size={26}/>
          </button>
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => { 
            const newId = Date.now().toString();
            setTexts([...texts, { id: newId, text: '', x: 200 - x.get(), y: 200 - y.get(), fontSize: 18 }]); 
            setTool('select');
            setSelectedId(newId);
          }} className="p-4 text-stone-400"><Type size={26}/></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-stone-400"><ImageIcon size={26}/></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => setTool('eraser')} className={cn("p-4 rounded-full transition-all", tool === 'eraser' ? "bg-red-500 text-white shadow-lg" : "text-stone-400")}>
            <Eraser size={26}/>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-[200]">
           <button onClick={() => scale.set(Math.min(scale.get() + 0.2, 3))} className="p-3 bg-white shadow-md rounded-full text-stone-600 active:bg-stone-100"><Plus size={20}/></button>
           <button onClick={() => scale.set(Math.max(scale.get() - 0.2, 0.5))} className="p-3 bg-white shadow-md rounded-full text-stone-600 active:bg-stone-100"><Minus size={20}/></button>
        </div>
      </div>
    </div>
  );
}
