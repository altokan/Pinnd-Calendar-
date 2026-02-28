import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Save, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, Maximize
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd'; // مكتبة التحريك وتغيير الحجم
import { db, storage } from '../services/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

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

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1c1917');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<'pencil' | 'eraser' | 'select'>('pencil');
  
  // Elements State
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [saving, setSaving] = useState(false);

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

  // --- Logic الرسم ---
  const startDrawing = ({ nativeEvent }: any) => {
    if (tool === 'select') return;
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }: any) => {
    if (!isDrawing || tool === 'select') return;
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    }
  };

  const stopDrawing = () => {
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  const getCoordinates = (event: any) => {
    if (event.touches) {
      const rect = canvasRef.current?.getBoundingClientRect();
      return {
        offsetX: event.touches[0].clientX - (rect?.left || 0),
        offsetY: event.touches[0].clientY - (rect?.top || 0)
      };
    }
    return { offsetX: event.offsetX, offsetY: event.offsetY };
  };

  // --- Logic إضافة النصوص والصور ---
  const addText = () => {
    const newText: TextElement = {
      id: Date.now().toString(),
      text: 'Click to Edit',
      x: 100,
      y: 100
    };
    setTexts([...texts, newText]);
    setTool('select');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImg: ImageElement = {
          id: Date.now().toString(),
          url: event.target?.result as string,
          x: 150,
          y: 150,
          width: 200,
          height: 200
        };
        setImages([...images, newImg]);
        setTool('select');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBoard = () => {
    if (!contextRef.current || !canvasRef.current) return;
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setTexts([]);
    setImages([]);
    toast.success('Board Cleared');
  };

  return (
    <div className="fixed inset-0 bg-stone-100 flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black italic tracking-tighter uppercase text-stone-900">Creative Studio</h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={clearBoard} className="p-3 text-stone-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
            <Save size={14} /> Save Studio
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="relative flex-1 bg-[#f0f0f0] overflow-hidden touch-none">
        {/* Layer 1: Canvas (الرسم) */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={cn("absolute inset-0 z-10", tool === 'select' ? "pointer-events-none" : "cursor-crosshair")}
        />

        {/* Layer 2: Interactive Elements (الصور والنصوص) */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Images */}
          {images.map((img) => (
            <Rnd
              key={img.id}
              default={{ x: img.x, y: img.y, width: img.width, height: img.height }}
              bounds="parent"
              enableResizing={tool === 'select'}
              disableDragging={tool !== 'select'}
              style={{ pointerEvents: 'auto' }}
              className="border-2 border-transparent hover:border-blue-400 rounded-lg overflow-hidden group"
            >
              <img src={img.url} className="w-full h-full object-cover pointer-events-none" />
              {tool === 'select' && <div className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100" onClick={() => setImages(images.filter(i => i.id !== img.id))}><X size={12}/></div>}
            </Rnd>
          ))}

          {/* Texts */}
          {texts.map((t) => (
            <Rnd
              key={t.id}
              default={{ x: t.x, y: t.y, width: 200, height: 50 }}
              bounds="parent"
              disableDragging={tool !== 'select'}
              style={{ pointerEvents: 'auto' }}
            >
              <input
                defaultValue={t.text}
                className="bg-transparent border-none font-black italic text-2xl text-stone-900 outline-none w-full text-center cursor-text focus:border-b-2 border-stone-300"
                style={{ fontFamily: 'serif' }}
              />
            </Rnd>
          ))}
        </div>

        {/* Toolbar - القائمة الجانبية */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 p-3 bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white">
          <button onClick={() => setTool('pencil')} className={cn("p-4 rounded-2xl transition-all", tool === 'pencil' ? "bg-stone-900 text-white shadow-xl" : "text-stone-400 hover:bg-stone-50")}>
            <Pencil size={20} />
          </button>
          
          <button onClick={() => setTool('eraser')} className={cn("p-4 rounded-2xl transition-all", tool === 'eraser' ? "bg-stone-900 text-white shadow-xl" : "text-stone-400 hover:bg-stone-50")}>
            <Eraser size={20} />
          </button>

          <button onClick={() => setTool('select')} className={cn("p-4 rounded-2xl transition-all", tool === 'select' ? "bg-stone-900 text-white shadow-xl" : "text-stone-400 hover:bg-stone-50")}>
            <Move size={20} />
          </button>

          <div className="h-px bg-stone-100 mx-2" />

          {/* كيبورد الكتابة */}
          <button onClick={addText} className="p-4 text-stone-400 hover:bg-stone-900 hover:text-white rounded-2xl transition-all">
            <Type size={20} />
          </button>

          {/* إضافة صورة */}
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-stone-400 hover:bg-stone-900 hover:text-white rounded-2xl transition-all">
            <ImageIcon size={20} />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

          <div className="h-px bg-stone-100 mx-2" />

          {/* ألوان */}
          {['#1c1917', '#ef4444', '#3b82f6'].map((c) => (
            <button key={c} onClick={() => { setColor(c); setTool('pencil'); }} className="w-8 h-8 rounded-full mx-auto border-2 border-white shadow-sm" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const X = ({size}: {size: number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
