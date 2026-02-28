import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Save, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd'; // مكتبة التحريك وتغيير الحجم
import { db, storage } from '../services/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

// تعريف أنواع العناصر
interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
}

interface ImageElement {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function SketchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حالات أدوات الرسم
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1c1917');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<'pencil' | 'eraser' | 'select'>('pencil');
  
  // حالات العناصر التفاعلية
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [saving, setSaving] = useState(false);

  // تهيئة الكانفاس (اللوحة)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext('2d');
    if (context) {
      context.scale(2, 2);
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      contextRef.current = context;
    }
  }, []);

  // دالة الحصول على الإحداثيات (تدعم اللمس والماوس)
  const getCoordinates = (event: any) => {
    let clientX, clientY;
    if (event.touches) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      offsetX: clientX - (rect?.left || 0),
      offsetY: clientY - (rect?.top || 0)
    };
  };

  const startDrawing = (e: any) => {
    if (tool === 'select') return;
    const { offsetX, offsetY } = getCoordinates(e.nativeEvent || e);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing || tool === 'select') return;
    const { offsetX, offsetY } = getCoordinates(e.nativeEvent || e);
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = tool === 'eraser' ? lineWidth * 5 : lineWidth;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    }
  };

  const stopDrawing = () => {
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  // إضافة نص جديد
  const addText = () => {
    const newText: TextElement = {
      id: Date.now().toString(),
      text: 'Double click to edit',
      x: window.innerWidth / 2 - 50,
      y: window.innerHeight / 2
    };
    setTexts([...texts, newText]);
    setTool('select');
  };

  // رفع وإضافة صورة
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImg: ImageElement = {
          id: Date.now().toString(),
          url: event.target?.result as string,
          x: 100,
          y: 100,
          width: 250,
          height: 250
        };
        setImages([...images, newImg]);
        setTool('select');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBoard = () => {
    if (!window.confirm("Clear everything?")) return;
    const canvas = canvasRef.current;
    contextRef.current?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
    setTexts([]);
    setImages([]);
    toast.success('Board reset');
  };

  return (
    <div className="fixed inset-0 bg-stone-100 flex flex-col overflow-hidden select-none touch-none">
      {/* Top Header */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white/90 backdrop-blur-xl border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full transition-all active:scale-90">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase text-stone-900">STUDIO</h1>
            <p className="text-[8px] font-bold text-stone-400 tracking-[0.2em] uppercase">Creative Board</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={clearBoard} className="p-3 text-stone-300 hover:text-red-500 transition-colors">
            <RotateCcw size={20} />
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            <Save size={14} /> Save Project
          </button>
        </div>
      </div>

      {/* Workspace Area */}
      <div className="relative flex-1 bg-[#f8f8f8] overflow-hidden">
        {/* Layer 1: Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={cn(
            "absolute inset-0 z-10",
            tool === 'select' ? "pointer-events-none" : "cursor-crosshair"
          )}
        />

        {/* Layer 2: Interactive Elements (Images & Text) */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {images.map((img) => (
            <Rnd
              key={img.id}
              default={{ x: img.x, y: img.y, width: img.width, height: img.height }}
              bounds="parent"
              enableResizing={tool === 'select'}
              disableDragging={tool !== 'select'}
              style={{ pointerEvents: 'auto' }}
              className={cn(
                "group border-2",
                tool === 'select' ? "border-dashed border-stone-300 hover:border-stone-900" : "border-transparent"
              )}
            >
              <div className="relative w-full h-full">
                <img src={img.url} className="w-full h-full object-contain pointer-events-none" alt="" />
                {tool === 'select' && (
                  <button 
                    onClick={() => setImages(images.filter(i => i.id !== img.id))}
                    className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </Rnd>
          ))}

          {texts.map((t) => (
            <Rnd
              key={t.id}
              default={{ x: t.x, y: t.y, width: 200, height: 60 }}
              bounds="parent"
              disableDragging={tool !== 'select'}
              style={{ pointerEvents: 'auto' }}
              className={cn(
                "group",
                tool === 'select' ? "border border-dashed border-stone-300" : ""
              )}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <input
                  defaultValue={t.text}
                  className="bg-transparent border-none text-center font-black italic text-2xl text-stone-900 outline-none w-full placeholder-stone-300"
                  style={{ fontFamily: 'serif' }}
                  onFocus={() => setTool('select')}
                />
                {tool === 'select' && (
                  <button 
                    onClick={() => setTexts(texts.filter(txt => txt.id !== t.id))}
                    className="absolute -top-3 -right-3 w-5 h-5 bg-stone-200 text-stone-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </Rnd>
          ))}
        </div>

        {/* Floating Vertical Toolbar (Sidebar) */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-4 p-4 bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white">
          <button 
            onClick={() => setTool('pencil')}
            className={cn("p-4 rounded-2xl transition-all active:scale-90", tool === 'pencil' ? "bg-stone-900 text-white shadow-xl" : "text-stone-400 hover:bg-stone-100")}
          >
            <Pencil size={22} />
          </button>
          
          <button 
            onClick={() => setTool('eraser')}
            className={cn("p-4 rounded-2xl transition-all active:scale-90", tool === 'eraser' ? "bg-stone-900 text-white shadow-xl" : "text-stone-400 hover:bg-stone-100")}
          >
            <Eraser size={22} />
          </button>

          <button 
            onClick={() => setTool('select')}
            className={cn("p-4 rounded-2xl transition-all active:scale-90", tool === 'select' ? "bg-blue-600 text-white shadow-xl" : "text-stone-400 hover:bg-stone-100")}
          >
            <Move size={22} />
          </button>

          <div className="h-px bg-stone-100 mx-2" />

          {/* أداة الكيبورد */}
          <button 
            onClick={addText}
            className="p-4 text-stone-400 hover:bg-stone-100 rounded-2xl transition-all active:scale-90"
          >
            <Type size={22} />
          </button>

          {/* أداة الصورة */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-4 text-stone-400 hover:bg-stone-100 rounded-2xl transition-all active:scale-90"
          >
            <ImageIcon size={22} />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

          <div className="h-px bg-stone-100 mx-2" />

          {/* Palette */}
          {['#1c1917', '#ef4444', '#3b82f6'].map((c) => (
            <button 
              key={c} 
              onClick={() => { setColor(c); setTool('pencil'); }}
              className={cn(
                "w-8 h-8 rounded-full mx-auto border-2 border-white transition-transform active:scale-125",
                color === c && tool === 'pencil' ? "ring-2 ring-stone-900 scale-110" : ""
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
