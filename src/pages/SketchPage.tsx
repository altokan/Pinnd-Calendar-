import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Save, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Maximize, Minus, Plus, Grab
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface TextElement { id: string; text: string; x: number; y: number; }
interface ImageElement { id: string; url: string; x: number; y: number; width: number; height: number; }

export default function SketchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حالات التحكم باللوحة (Zoom & Pan)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'pencil' | 'eraser' | 'select' | 'hand'>('pencil');

  // حالات العناصر
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1c1917');
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [images, setImages] = useState<ImageElement[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // لوحة كبيرة جداً للسماح بالتحرك
    canvas.width = 4000;
    canvas.height = 4000;
    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = 5;
      contextRef.current = context;
      // ملء الخلفية بالأبيض
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // حساب الإحداثيات مع مراعاة الزووم والتحريك
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
      contextRef.current.lineWidth = tool === 'eraser' ? 40 : 5;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    }
  };

  const addText = () => {
    const newText = { id: Date.now().toString(), text: 'أكتب هنا...', x: 500, y: 500 };
    setTexts([...texts, newText]);
    setTool('select');
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newImg = { id: Date.now().toString(), url: ev.target?.result as string, x: 600, y: 600, width: 300, height: 300 };
        setImages([...images, newImg]);
        setTool('select');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-200 flex flex-col overflow-hidden touch-none">
      {/* Top Bar */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft /></button>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">Infinite Board</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-stone-100 p-2 rounded-2xl">
          <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-1 hover:bg-white rounded-lg"><Minus size={16}/></button>
          <span className="text-[10px] font-black w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1 hover:bg-white rounded-lg"><Plus size={16}/></button>
        </div>

        <button className="px-6 py-2 bg-stone-900 text-white rounded-full font-black text-[10px] uppercase">Save</button>
      </div>

      {/* المحرك الرئيسي للوحة (الزووم والتحريك) */}
      <motion.div 
        className="flex-1 relative cursor-grab active:cursor-grabbing"
        drag={tool === 'hand'}
        dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
      >
        <motion.div 
          style={{ scale, x: offset.x, y: offset.y }}
          className="origin-center relative"
        >
          {/* Canvas للرسم */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={() => setIsDrawing(false)}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={() => setIsDrawing(false)}
            className={cn(
              "shadow-2xl bg-white",
              tool === 'pencil' ? "cursor-crosshair" : tool === 'hand' ? "cursor-grab" : "cursor-default"
            )}
          />

          {/* طبقة العناصر التفاعلية */}
          <div className="absolute inset-0 pointer-events-none">
            {images.map((img) => (
              <Rnd
                key={img.id}
                default={{ x: img.x, y: img.y, width: img.width, height: img.height }}
                bounds="parent"
                enableResizing={tool === 'select'}
                disableDragging={tool !== 'select'}
                style={{ pointerEvents: 'auto', zIndex: 50 }}
                className={cn("group", tool === 'select' && "border-2 border-blue-500")}
              >
                <div className="relative w-full h-full">
                  <img src={img.url} className="w-full h-full object-contain" />
                  {tool === 'select' && (
                    <button onClick={() => setImages(images.filter(i => i.id !== img.id))} className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-1"><X size={12}/></button>
                  )}
                </div>
              </Rnd>
            ))}

            {texts.map((t) => (
              <Rnd
                key={t.id}
                default={{ x: t.x, y: t.y, width: 300, height: 100 }}
                bounds="parent"
                disableDragging={tool !== 'select'}
                style={{ pointerEvents: 'auto', zIndex: 60 }}
              >
                <textarea 
                  defaultValue={t.text}
                  className="w-full h-full bg-transparent border-none text-2xl font-serif font-black text-stone-900 outline-none resize-none overflow-hidden"
                  placeholder="إبدأ الكتابة..."
                />
              </Rnd>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Sidebar - شريط الأدوات */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-3 p-3 bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white">
        <button onClick={() => setTool('hand')} className={cn("p-4 rounded-2xl transition-all", tool === 'hand' ? "bg-blue-500 text-white" : "text-stone-400")}>
          <Grab size={22} />
        </button>
        <button onClick={() => setTool('pencil')} className={cn("p-4 rounded-2xl transition-all", tool === 'pencil' ? "bg-stone-900 text-white" : "text-stone-400")}>
          <Pencil size={22} />
        </button>
        <button onClick={() => setTool('select')} className={cn("p-4 rounded-2xl transition-all", tool === 'select' ? "bg-stone-900 text-white" : "text-stone-400")}>
          <Move size={22} />
        </button>
        <div className="h-px bg-stone-100 mx-2" />
        <button onClick={addText} className="p-4 text-stone-400 hover:bg-stone-100 rounded-2xl"><Type size={22} /></button>
        <button onClick={() => fileInputRef.current?.click()} className="p-4 text-stone-400 hover:bg-stone-100 rounded-2xl"><ImageIcon size={22} /></button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        <div className="h-px bg-stone-100 mx-2" />
        <button onClick={() => setTool('eraser')} className={cn("p-4 rounded-2xl", tool === 'eraser' ? "bg-red-500 text-white" : "text-stone-400")}>
          <Eraser size={22} />
        </button>
      </div>
    </div>
  );
}
