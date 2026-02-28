import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Save, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Grab, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { motion, useTransform, useMotionValue } from 'framer-motion';
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

  // التحكم باللوحة (إيماءات الأصابع)
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [tool, setTool] = useState<'pencil' | 'eraser' | 'select' | 'hand'>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1c1917');
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [images, setImages] = useState<ImageElement[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 3000;
    canvas.height = 3000;
    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = 5;
      contextRef.current = context;
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
    
    // حساب الإحداثيات بدقة مع مراعاة الزوم الحالي للوحة
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
      contextRef.current.lineWidth = tool === 'eraser' ? 50 : 5;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    }
  };

  const saveEverything = async () => {
    if (!user || !canvasRef.current) return;
    setSaving(true);
    const toastId = toast.loading("Saving to Cloud...");
    try {
      const canvasData = canvasRef.current.toDataURL('image/png');
      const storageRef = ref(storage, `studios/${user.uid}/${Date.now()}.png`);
      await uploadString(storageRef, canvasData, 'data_url');
      const drawingUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'studios'), {
        userId: user.uid,
        drawingUrl,
        texts,
        images,
        createdAt: serverTimestamp(),
      });
      toast.success("Project Saved!", { id: toastId });
    } catch (error) {
      toast.error("Error saving", { id: toastId });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-stone-200 flex flex-col overflow-hidden touch-none">
      {/* Header */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-full transition-all active:scale-90">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black italic tracking-tighter text-stone-900">STUDIO PRO</h1>
        </div>

        <button 
          onClick={saveEverything}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-stone-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>}
          {saving ? "Saving..." : "Sync Project"}
        </button>
      </div>

      {/* Infinite Canvas Viewport */}
      <div className="flex-1 relative overflow-hidden">
        <motion.div 
          className="relative origin-center"
          style={{ x, y, scale }}
          drag={tool === 'hand'}
          dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
          // تفعيل الزووم بالأصابع (Pinch to Zoom)
          onPinch={(_, info) => scale.set(info.scale)}
        >
          {/* Canvas Layer */}
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
              tool === 'pencil' ? "cursor-crosshair" : tool === 'hand' ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
          />

          {/* Interactive Elements Layer */}
          <div className="absolute inset-0 pointer-events-none">
            {images.map((img) => (
              <Rnd
                key={img.id}
                size={{ width: img.width, height: img.height }}
                position={{ x: img.x, y: img.y }}
                onDragStop={(_, d) => setImages(images.map(i => i.id === img.id ? {...i, x: d.x, y: d.y} : i))}
                onResizeStop={(_, dir, ref, delta, pos) => {
                  setImages(images.map(i => i.id === img.id ? {
                    ...i, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos 
                  } : i));
                }}
                bounds="parent"
                enableResizing={tool === 'select'}
                disableDragging={tool !== 'select'}
                style={{ pointerEvents: 'auto', zIndex: 10 }}
              >
                <div className={cn("relative w-full h-full group", tool === 'select' && "border-2 border-blue-400")}>
                  <img src={img.url} className="w-full h-full object-contain" alt="" />
                  {tool === 'select' && (
                    <button onClick={() => setImages(images.filter(i => i.id !== img.id))} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100"><X size={12}/></button>
                  )}
                </div>
              </Rnd>
            ))}

            {texts.map((t) => (
              <Rnd
                key={t.id}
                position={{ x: t.x, y: t.y }}
                size={{ width: 'auto', height: 'auto' }}
                onDragStop={(_, d) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, x: d.x, y: d.y} : txt))}
                enableResizing={tool === 'select'}
                disableDragging={tool !== 'select'}
                style={{ pointerEvents: 'auto', zIndex: 20 }}
              >
                <div className={cn("group relative p-2 min-w-[100px]", tool === 'select' && "border border-dashed border-stone-400")}>
                  <textarea
                    defaultValue={t.text}
                    autoFocus
                    className="bg-transparent border-none font-black italic text-stone-900 outline-none resize text-center overflow-hidden"
                    style={{ fontSize: `${t.fontSize}px`, minHeight: '40px' }}
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                  {tool === 'select' && (
                    <div className="absolute -bottom-6 left-0 flex gap-2 opacity-0 group-hover:opacity-100">
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: txt.fontSize + 5} : txt))} className="bg-stone-900 text-white p-1 rounded">+</button>
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: Math.max(10, txt.fontSize - 5)} : txt))} className="bg-stone-900 text-white p-1 rounded">-</button>
                    </div>
                  )}
                </div>
              </Rnd>
            ))}
          </div>
        </motion.div>

        {/* Floating Sidebar */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-4 p-4 bg-white/80 backdrop-blur-3xl rounded-[3rem] shadow-4xl border border-white">
          <button onClick={() => setTool('hand')} className={cn("p-4 rounded-[1.5rem] transition-all", tool === 'hand' ? "bg-blue-500 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Grab size={24}/>
          </button>
          <button onClick={() => setTool('pencil')} className={cn("p-4 rounded-[1.5rem] transition-all", tool === 'pencil' ? "bg-stone-900 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Pencil size={24}/>
          </button>
          <button onClick={() => setTool('select')} className={cn("p-4 rounded-[1.5rem] transition-all", tool === 'select' ? "bg-stone-900 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Move size={24}/>
          </button>
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => { setTexts([...texts, { id: Date.now().toString(), text: 'New Text', x: 500, y: 500, fontSize: 30 }]); setTool('select'); }} className="p-4 text-stone-400 hover:bg-stone-50 rounded-[1.5rem] transition-all"><Type size={24}/></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-stone-400 hover:bg-stone-50 rounded-[1.5rem] transition-all"><ImageIcon size={24}/></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                setImages([...images, { id: Date.now().toString(), url: ev.target?.result as string, x: 600, y: 600, width: 400, height: 400 }]);
                setTool('select');
              };
              reader.readAsDataURL(file);
            }
          }} />
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => setTool('eraser')} className={cn("p-4 rounded-[1.5rem] transition-all", tool === 'eraser' ? "bg-red-500 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Eraser size={24}/>
          </button>
        </div>
      </div>
    </div>
  );
}
