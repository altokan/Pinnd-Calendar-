import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Eraser, Trash2, Save, ChevronLeft, 
  Type, Image as ImageIcon, Loader2, Move, X,
  Minus, Plus, Grab, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { motion } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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

  const [scale, setScale] = useState(1);
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

  // --- وظيفة الحفظ النهائية ---
  const saveEverything = async () => {
    if (!user || !canvasRef.current) return;
    setSaving(true);
    const toastId = toast.loading("Saving your masterpiece...");

    try {
      // 1. حفظ الكانفاس (الرسم) كصورة
      const canvasData = canvasRef.current.toDataURL('image/png');
      const storageRef = ref(storage, `studios/${user.uid}/${Date.now()}.png`);
      await uploadString(storageRef, canvasData, 'data_url');
      const drawingUrl = await getDownloadURL(storageRef);

      // 2. حفظ كل البيانات في Firestore
      await addDoc(collection(db, 'studios'), {
        userId: user.uid,
        drawingUrl,
        texts,      // مصفوفة النصوص
        images,     // مصفوفة الصور ومواقعها
        createdAt: serverTimestamp(),
      });

      toast.success("Studio saved successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-100 flex flex-col overflow-hidden touch-none">
      {/* Top Bar */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white/90 backdrop-blur-xl border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-50 rounded-full transition-all active:scale-90">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase text-stone-900 leading-none">STUDIO</h1>
            <p className="text-[8px] font-bold text-stone-400 tracking-[0.2em] uppercase mt-1">Cloud Sync Enabled</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 bg-stone-50 p-1.5 rounded-2xl border border-stone-100">
            <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-white rounded-xl transition-all"><Minus size={16}/></button>
            <span className="text-[10px] font-black w-10 text-center text-stone-600">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-white rounded-xl transition-all"><Plus size={16}/></button>
          </div>
          
          <button 
            onClick={saveEverything}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>}
            {saving ? "Saving..." : "Save Project"}
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative overflow-hidden bg-stone-200">
        <motion.div 
          className="relative origin-center"
          drag={tool === 'hand'}
          style={{ scale }}
          dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}
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
              "shadow-4xl bg-white transition-shadow duration-500",
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
                onDragStop={(d, data) => setImages(images.map(i => i.id === img.id ? {...i, x: data.x, y: data.y} : i))}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setImages(images.map(i => i.id === img.id ? {
                    ...i, 
                    width: parseInt(ref.style.width), 
                    height: parseInt(ref.style.height),
                    ...position 
                  } : i));
                }}
                bounds="parent"
                enableResizing={tool === 'select'}
                disableDragging={tool !== 'select'}
                style={{ pointerEvents: 'auto', zIndex: 10 }}
              >
                <div className={cn("relative w-full h-full group p-1", tool === 'select' && "border-2 border-dashed border-blue-400 rounded-lg")}>
                  <img src={img.url} className="w-full h-full object-contain" alt="" />
                  {tool === 'select' && (
                    <button 
                      onClick={() => setImages(images.filter(i => i.id !== img.id))}
                      className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={12}/>
                    </button>
                  )}
                </div>
              </Rnd>
            ))}

            {texts.map((t) => (
              <Rnd
                key={t.id}
                position={{ x: t.x, y: t.y }}
                onDragStop={(d, data) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, x: data.x, y: data.y} : txt))}
                bounds="parent"
                disableDragging={tool !== 'select'}
                style={{ pointerEvents: 'auto', zIndex: 20 }}
              >
                <div className={cn("group relative p-2", tool === 'select' && "border border-dashed border-stone-300 rounded")}>
                  <textarea
                    defaultValue={t.text}
                    className="bg-transparent border-none text-2xl font-black italic text-stone-900 outline-none resize-none text-center"
                    placeholder="Type here..."
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                </div>
              </Rnd>
            ))}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-4 p-4 bg-white/80 backdrop-blur-3xl rounded-[3.5rem] shadow-4xl border border-white/50">
          <button onClick={() => setTool('hand')} className={cn("p-4 rounded-[1.5rem] transition-all active:scale-90", tool === 'hand' ? "bg-blue-500 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Grab size={24}/>
          </button>
          <button onClick={() => setTool('pencil')} className={cn("p-4 rounded-[1.5rem] transition-all active:scale-90", tool === 'pencil' ? "bg-stone-900 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Pencil size={24}/>
          </button>
          <button onClick={() => setTool('select')} className={cn("p-4 rounded-[1.5rem] transition-all active:scale-90", tool === 'select' ? "bg-stone-900 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Move size={24}/>
          </button>
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => { setTexts([...texts, { id: Date.now().toString(), text: '', x: 500, y: 500 }]); setTool('select'); }} className="p-4 text-stone-400 hover:bg-stone-50 rounded-[1.5rem] transition-all active:scale-90">
            <Type size={24}/>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-stone-400 hover:bg-stone-50 rounded-[1.5rem] transition-all active:scale-90">
            <ImageIcon size={24}/>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                setImages([...images, { id: Date.now().toString(), url: ev.target?.result as string, x: 600, y: 600, width: 300, height: 300 }]);
                setTool('select');
              };
              reader.readAsDataURL(file);
            }
          }} />
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => setTool('eraser')} className={cn("p-4 rounded-[1.5rem] transition-all active:scale-90", tool === 'eraser' ? "bg-red-500 text-white shadow-lg" : "text-stone-400 hover:bg-stone-50")}>
            <Eraser size={24}/>
          </button>
        </div>
      </div>
    </div>
  );
}
