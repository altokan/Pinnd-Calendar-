import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Save, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Grab, Plus, Minus
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

interface TextElement { id: string; text: string; x: number; y: number; fontSize: number; color: string; }
interface ImageElement { id: string; url: string; x: number; y: number; width: number; height: number; }

export default function SketchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // التحكم باللوحة مع إصلاح الزوم
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [tool, setTool] = useState<'pencil' | 'eraser' | 'select' | 'hand'>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeColor, setActiveColor] = useState('#1c1917');
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 4000; 
    canvas.height = 4000;
    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // دالة الزوم المصلحة
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
    <div className="fixed inset-0 bg-[#d6d3d1] flex flex-col overflow-hidden touch-none select-none">
      {/* Header */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-stone-100"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">Studio Pro</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={() => handleZoom('out')} className="p-2 bg-stone-100 rounded-full"><Minus size={20}/></button>
            <button onClick={() => handleZoom('in')} className="p-2 bg-stone-100 rounded-full"><Plus size={20}/></button>
            <button onClick={() => toast.success("Saved")} className="ml-4 px-6 py-2 bg-stone-900 text-white rounded-full font-bold text-[10px] uppercase">Save</button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
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
            className="bg-white shadow-inner"
          />

          {/* طبقة العناصر */}
          <div className="absolute inset-0 pointer-events-none">
            {images.map((img) => (
              <Rnd
                key={img.id}
                size={{ width: img.width, height: img.height }}
                position={{ x: img.x, y: img.y }}
                onDragStop={(_, d) => setImages(images.map(i => i.id === img.id ? {...i, x: d.x, y: d.y} : i))}
                enableResizing={tool === 'select'}
                disableDragging={tool !== 'select'}
                cancel=".no-drag"
                style={{ pointerEvents: 'auto', zIndex: selectedId === img.id ? 50 : 10 }}
              >
                <div onPointerDown={() => setSelectedId(img.id)} className={cn("relative w-full h-full p-2", selectedId === img.id && "ring-2 ring-blue-500 rounded-lg")}>
                  <img src={img.url} className="w-full h-full object-contain pointer-events-none" />
                  {selectedId === img.id && (
                    <button onPointerDown={() => setImages(images.filter(i => i.id !== img.id))} className="no-drag absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-2"><X size={16}/></button>
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
                    "relative p-6 pt-12 min-w-[200px] shadow-[8px_8px_20px_rgba(0,0,0,0.15)] transition-transform duration-300",
                    selectedId === t.id ? "scale-105 rotate-0 z-50" : "rotate-[-1deg]"
                  )}
                  style={{ backgroundColor: t.color || '#fff9c4' }}
                >
                  {/* Pin Design */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center drop-shadow-md">
                    <div className="w-5 h-5 bg-red-600 rounded-full border-b-4 border-red-900 relative z-20" />
                    <div className="w-1 h-5 bg-stone-400/80 -mt-1 rounded-full rotate-[-5deg]" />
                  </div>

                  <textarea
                    defaultValue={t.text}
                    className="no-drag bg-transparent border-none font-medium text-stone-800 outline-none resize-none text-center w-full"
                    style={{ fontSize: `${t.fontSize}px`, minHeight: '80px' }}
                    onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                  
                  {selectedId === t.id && (
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1 bg-white p-1 rounded-full shadow-xl no-drag border">
                      <button onClick={() => setTexts(texts.filter(txt => txt.id !== t.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: txt.fontSize + 2} : txt))} className="p-2 text-stone-600 hover:bg-stone-50 rounded-full"><Plus size={18}/></button>
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: Math.max(10, t.fontSize - 2)} : txt))} className="p-2 text-stone-600 hover:bg-stone-50 rounded-full"><Minus size={18}/></button>
                    </div>
                  )}
                </div>
              </Rnd>
            ))}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-4 p-4 bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white">
          <button onClick={() => setTool('hand')} className={cn("p-4 rounded-full transition-all", tool === 'hand' ? "bg-blue-600 text-white shadow-lg scale-110" : "text-stone-400")}>
            <Grab size={26}/>
          </button>
          <button onClick={() => setTool('pencil')} className={cn("p-4 rounded-full transition-all", tool === 'pencil' ? "bg-stone-900 text-white shadow-lg scale-110" : "text-stone-400")}>
            <Pencil size={26}/>
          </button>
          <button onClick={() => setTool('select')} className={cn("p-4 rounded-full transition-all", tool === 'select' ? "bg-stone-900 text-white shadow-lg scale-110" : "text-stone-400")}>
            <Move size={26}/>
          </button>
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => { 
            const newId = Date.now().toString();
            const colors = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            setTexts([...texts, { id: newId, text: '', x: 200 - x.get(), y: 200 - y.get(), fontSize: 18, color: randomColor }]); 
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
                 setImages([...images, { id: newId, url: ev.target?.result as string, x: 100 - x.get(), y: 100 - y.get(), width: 350, height: 350 }]);
                 setTool('select');
                 setSelectedId(newId);
               };
               reader.readAsDataURL(file);
             }
          }} />
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => setTool('eraser')} className={cn("p-4 rounded-full transition-all", tool === 'eraser' ? "bg-red-500 text-white shadow-lg scale-110" : "text-stone-400")}>
            <Eraser size={26}/>
          </button>
        </div>
      </div>
    </div>
  );
}
