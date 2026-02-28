import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, 
  Eraser, 
  Trash2, 
  Download, 
  ZoomIn, 
  ZoomOut,
  Undo,
  Palette
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SketchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1c1917');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [zoom, setZoom] = useState(1);

  // تهيئة الكانفاس
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // جعل الكانفاس بحجم الشاشة
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = tool === 'eraser' ? '#F9F8F6' : color;
    ctx.lineWidth = tool === 'eraser' ? 30 : lineWidth;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Toolbar */}
      <div className="bg-white/70 backdrop-blur-xl p-4 rounded-[2rem] border border-stone-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTool('pencil')}
            className={`p-3 rounded-2xl transition-all ${tool === 'pencil' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:bg-stone-50'}`}
          >
            <Pencil size={20} />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`p-3 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:bg-stone-50'}`}
          >
            <Eraser size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          {['#1c1917', '#ef4444', '#3b82f6', '#10b981'].map((c) => (
            <button 
              key={c}
              onClick={() => { setColor(c); setTool('pencil'); }}
              className="w-8 h-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: color === c ? '#000' : '#fff' }}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-stone-50 rounded-xl px-2">
            <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))} className="p-2 text-stone-400"><ZoomOut size={16}/></button>
            <span className="text-[10px] font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} className="p-2 text-stone-400"><ZoomIn size={16}/></button>
          </div>
          <button onClick={clearCanvas} className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 bg-[#F9F8F6] rounded-[3rem] border border-stone-100 shadow-inner overflow-hidden">
        <div 
          style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
          className="w-full h-full transition-transform duration-75"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair"
          />
        </div>
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full border border-white/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Infinite Canvas v1.0</p>
        </div>
      </div>
    </div>
  );
}
