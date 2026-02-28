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

  // التحكم باللوحة (Zoom & Pan)
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

  // تهيئة الكانفاس
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
      contextRef.current.lineWidth = tool === 'eraser' ? 60 : 5;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    }
  };

  const saveEverything = async () => {
    if (!user || !canvasRef.current) return;
    setSaving(true);
    const toastId = toast.loading("Saving your work...");
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
      toast.success("Saved to Cloud!", { id: toastId });
    } catch (error) {
      toast.error("Save failed", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-200 flex flex-col overflow-hidden touch-none font-sans">
      {/* Header */}
      <div className="z-[100] p-4 flex items-center justify-between bg-white border-b shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full active:bg-stone-100 transition-all">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black italic tracking-tighter text-stone-900 uppercase">Studio Pro</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-stone-50 p-1.5 rounded-full border">
             <button onClick={() => scale.set(Math.max(0.2, scale.get() - 0.1))} className="p-1 hover:bg-white rounded-full"><ZoomOut size={16}/></button>
             <span className="text-[10px] font-bold w-10 text-center">{Math.round(scale.get() * 100)}%</span>
             <button onClick={() => scale.set(Math.min(2, scale.get() + 0.1))} className="p-1 hover:bg-white rounded-full"><ZoomIn size={16}/></button>
          </div>
          <button 
            onClick={saveEverything} 
            disabled={saving}
            className="px-8 py-3 bg-stone-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>}
            {saving ? "Saving..." : "Save Project"}
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative overflow-hidden bg-stone-100">
        <motion.div 
          className="relative origin-center" 
          style={{ x, y, scale }}
          drag={tool === 'hand'}
          dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
          onPinch={(_, info) => scale.set(info.scale)}
        >
          {/* Canvas Layer */}
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={() => setIsDrawing(false)}
            className={cn(
              "shadow-2xl bg-white transition-shadow", 
              tool === 'pencil' ? "cursor-crosshair" : tool === 'hand' ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
          />

          {/* Elements Layer */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Render Images */}
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
                <div 
                  onPointerDown={() => setSelectedId(img.id)}
                  className={cn("relative w-full h-full p-2 group transition-all", selectedId === img.id ? "ring-2 ring-blue-500 bg-blue-50/10 rounded-lg" : "")}
                >
                  <img src={img.url} className="w-full h-full object-contain pointer-events-none" alt="" />
                  {selectedId === img.id && tool === 'select' && (
                    <button 
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setImages(images.filter(i => i.id !== img.id));
                        setSelectedId(null);
                      }}
                      className="no-drag absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-2 shadow-xl active:scale-125 transition-transform z-[100]"
                    >
                      <X size={20}/>
                    </button>
                  )}
                </div>
              </Rnd>
            ))}

            {/* Render Texts */}
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
                  className={cn("relative p-4 min-w-[150px] transition-all", selectedId === t.id ? "bg-white/90 ring-2 ring-blue-500 rounded-xl shadow-2xl scale-105" : "bg-transparent")}
                >
                  <textarea
                    defaultValue={t.text}
                    className="no-drag bg-transparent border-none font-black italic text-stone-900 outline-none resize-none text-center w-full"
                    style={{ fontSize: `${t.fontSize}px`, minHeight: '50px' }}
                    onChange={(e) => setTexts(texts.map(txt => txt.id === t.id ? {...txt, text: e.target.value} : txt))}
                  />
                  {selectedId === t.id && tool === 'select' && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 bg-stone-900 p-1.5 rounded-xl shadow-2xl no-drag z-[100]">
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: txt.fontSize + 4} : txt))} className="p-2 text-white hover:bg-white/10 rounded-lg"><Plus size={16}/></button>
                      <button onClick={() => setTexts(texts.map(txt => txt.id === t.id ? {...txt, fontSize: Math.max(12, txt.fontSize - 4)} : txt))} className="p-2 text-white hover:bg-white/10 rounded-lg border-r border-white/20"><Minus size={16}/></button>
                      <button onClick={() => { setTexts(texts.filter(txt => txt.id !== t.id)); setSelectedId(null); }} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                  )}
                </div>
              </Rnd>
            ))}
          </div>
        </motion.div>

        {/* Sidebar Tools */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[200] flex flex-col gap-4 p-4 bg-white/90 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl border border-white">
          <button onClick={() => {setTool('hand'); setSelectedId(null);}} className={cn("p-4 rounded-full transition-all", tool === 'hand' ? "bg-blue-600 text-white shadow-lg scale-110" : "text-stone-400 hover:bg-stone-50")}>
            <Grab size={26}/>
          </button>
          <button onClick={() => {setTool('pencil'); setSelectedId(null);}} className={cn("p-4 rounded-full transition-all", tool === 'pencil' ? "bg-stone-900 text-white shadow-lg scale-110" : "text-stone-400 hover:bg-stone-50")}>
            <Pencil size={26}/>
          </button>
          <button onClick={() => setTool('select')} className={cn("p-4 rounded-full transition-all", tool === 'select' ? "bg-stone-900 text-white shadow-lg scale-110" : "text-stone-400 hover:bg-stone-50")}>
            <Move size={26}/>
          </button>
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => { 
            const newId = Date.now().toString();
            setTexts([...texts, { id: newId, text: '', x: 500, y: 500, fontSize: 32 }]); 
            setTool('select');
            setSelectedId(newId);
          }} className="p-4 text-stone-400 hover:bg-stone-50 rounded-full transition-all"><Type size={26}/></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-4 text-stone-400 hover:bg-stone-50 rounded-full transition-all"><ImageIcon size={26}/></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const newId = Date.now().toString();
                setImages([...images, { id: newId, url: ev.target?.result as string, x: 600, y: 600, width: 450, height: 450 }]);
                setTool('select');
                setSelectedId(newId);
              };
              reader.readAsDataURL(file);
            }
          }} />
          <div className="h-px bg-stone-100 mx-2" />
          <button onClick={() => {setTool('eraser'); setSelectedId(null);}} className={cn("p-4 rounded-full transition-all", tool === 'eraser' ? "bg-red-500 text-white shadow-lg scale-110" : "text-stone-400 hover:bg-stone-50")}>
            <Eraser size={26}/>
          </button>
        </div>
      </div>
    </div>
  );
}
