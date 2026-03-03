import React, { useRef, useState } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Undo, Redo, Trash2, Eraser, PenTool, 
  ChevronLeft, Type, Image as ImageIcon, Move, Save, 
  StickyNote, X, Maximize2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface BoardElement {
  id: string;
  type: 'image' | 'note';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function StudioPage() {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'move'>('pen');
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);

  // إضافة عنصر (صورة أو نوت)
  const addElement = (type: 'image' | 'note', content: string = '') => {
    const newEl: BoardElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: content || 'Write something...',
      x: window.innerWidth / 4,
      y: window.innerHeight / 4,
      width: type === 'note' ? 200 : 250,
      height: type === 'note' ? 200 : 250,
    };
    setElements([...elements, newEl]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => addElement('image', ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateElementSize = (id: string, delta: number) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, width: Math.max(100, el.width + delta), height: Math.max(100, el.height + delta) } : el
    ));
  };

  return (
    <div className="fixed inset-0 bg-[#F0F0F0] overflow-hidden touch-none font-sans">
      
      {/* 1. Header - زر الرجوع */}
      <div className="absolute top-6 left-6 z-[100]">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-xl border border-stone-200 active:scale-90 transition-all">
          <ChevronLeft size={24} className="text-stone-900" />
        </button>
      </div>

      {/* 2. Infinite Board Wrapper */}
      <div className="w-full h-full overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
        <div className="relative min-w-[3000px] min-h-[3000px]">
          
          {/* Layer: Canvas (Drawing) */}
          <div className={cn(
            "absolute inset-0 z-10 transition-opacity",
            activeTool === 'move' ? "opacity-40 pointer-events-none" : "opacity-100"
          )}>
            <ReactSketchCanvas
              ref={canvasRef}
              strokeWidth={strokeWidth}
              strokeColor={strokeColor}
              canvasColor="transparent"
              style={{ border: 'none', width: '100%', height: '100%' }}
            />
          </div>

          {/* Layer: Dynamic Elements */}
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag
              dragMomentum={false}
              className="absolute z-20 group touch-none"
              style={{ left: el.x, top: el.y, width: el.width }}
            >
              {el.type === 'note' ? (
                <div className="bg-yellow-200 p-4 shadow-2xl rounded-lg border-b-4 border-yellow-400 min-h-[100px] relative">
                  <textarea 
                    className="bg-transparent border-none outline-none w-full h-full resize-none text-stone-800 font-bold placeholder-yellow-600/50"
                    placeholder="Note..."
                    defaultValue={el.content}
                    style={{ height: 'auto', minHeight: '80px' }}
                  />
                </div>
              ) : (
                <img src={el.content} className="w-full h-auto rounded-xl shadow-2xl border-4 border-white pointer-events-none" />
              )}

              {/* Controls (Delete & Resize) */}
              <div className="absolute -top-3 -right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => updateElementSize(el.id, 30)} className="p-1.5 bg-blue-500 text-white rounded-full"><Maximize2 size={14}/></button>
                <button onClick={() => setElements(elements.filter(x => x.id !== el.id))} className="p-1.5 bg-red-500 text-white rounded-full"><X size={14}/></button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 3. Mobile Optimized Black Dock */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[95%] max-w-md">
        <div className="bg-stone-900/95 backdrop-blur-2xl shadow-2xl rounded-[2rem] p-1.5 flex items-center justify-between border border-white/10">
          
          {/* Tools */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setActiveTool('pen')} className={cn("p-3.5 rounded-full transition-all", activeTool === 'pen' ? "bg-white text-stone-900 shadow-md" : "text-stone-500")}>
              <PenTool size={18} />
            </button>
            <button onClick={() => setActiveTool('move')} className={cn("p-3.5 rounded-full transition-all", activeTool === 'move' ? "bg-white text-stone-900 shadow-md" : "text-stone-500")}>
              <Move size={18} />
            </button>
            <button onClick={() => { setActiveTool('eraser'); canvasRef.current?.eraseMode(true); }} className={cn("p-3.5 rounded-full transition-all", activeTool === 'eraser' ? "bg-white text-stone-900 shadow-md" : "text-stone-500")}>
              <Eraser size={18} />
            </button>
          </div>

          {/* Add Content */}
          <div className="flex items-center gap-1 border-l border-r border-stone-800 px-2 mx-1">
            <button onClick={() => addElement('note')} className="p-3 text-stone-400 hover:text-white"><StickyNote size={18}/></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-stone-400 hover:text-white"><ImageIcon size={18}/></button>
          </div>

          {/* Settings & Save */}
          <div className="flex items-center gap-2 pr-2">
            <button 
              onClick={() => canvasRef.current?.exportImage('png').then(img => { const a = document.createElement('a'); a.href = img; a.download='studio.png'; a.click(); })}
              className="p-3.5 bg-white text-stone-900 rounded-full shadow-lg active:scale-90"
            >
              <Save size={18} />
            </button>
            <button onClick={() => {if(confirm('Reset?')) {setElements([]); canvasRef.current?.clearCanvas()}}} className="p-2 text-rose-500/50 hover:text-rose-500">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
