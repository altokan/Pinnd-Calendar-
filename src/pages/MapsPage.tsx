import React, { useRef, useState, useEffect } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { 
  Undo, Redo, Trash2, Download, Eraser, PenTool, 
  ChevronLeft, Type, Image as ImageIcon, Move, Save, 
  StickyNote, X, GripHorizontal, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'note';
  content: string;
  x: number;
  y: number;
}

export default function SketchPage() {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [eraseMode, setEraseMode] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'move'>('pen');
  const [elements, setElements] = useState<CanvasElement[]>([]);

  // Actions
  const handleToolChange = (tool: 'pen' | 'eraser' | 'move') => {
    setActiveTool(tool);
    setEraseMode(tool === 'eraser');
    canvasRef.current?.eraseMode(tool === 'eraser');
  };

  const addElement = (type: 'text' | 'image' | 'note', content: string = '') => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type,
      content: content || (type === 'text' ? 'New Text' : 'Quick Note...'),
      x: 50,
      y: 100,
    };
    setElements([...elements, newElement]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => addElement('image', event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeElement = (id: string) => setElements(elements.filter(el => el.id !== id));

  const handleExport = async () => {
    const dataUrl = await canvasRef.current?.exportImage('png');
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `art-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F6F6F3] flex flex-col overflow-hidden touch-none font-sans">
      
      {/* Header - Transparent & Safe */}
      <div className="h-16 flex items-center justify-between px-6 z-50">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-2xl shadow-sm border border-stone-200 active:scale-90 transition-all">
          <ChevronLeft size={22} className="text-stone-900" />
        </button>
        <div className="flex gap-2">
           <button onClick={() => canvasRef.current?.undo()} className="p-2 text-stone-400 hover:text-stone-900"><Undo size={20}/></button>
           <button onClick={() => canvasRef.current?.redo()} className="p-2 text-stone-400 hover:text-stone-900"><Redo size={20}/></button>
        </div>
      </div>

      {/* Main Canvas Space */}
      <div className="flex-1 relative mx-3 mb-32 bg-white rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-stone-100 overflow-hidden z-10">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          eraserWidth={25}
          canvasColor="transparent"
          style={{ border: 'none', position: 'absolute', inset: 0, zIndex: 10 }}
          allowOnlyPointerType={activeTool === 'move' ? 'none' : 'all'}
        />

        {/* Dynamic Elements (Text, Images, Notes) */}
        {elements.map((el) => (
          <motion.div
            key={el.id}
            drag
            dragMomentum={false}
            className={cn(
              "absolute z-20 cursor-move group touch-none",
              el.type === 'note' && "bg-yellow-100 p-4 shadow-xl rounded-xl min-w-[150px] border border-yellow-200",
              el.type === 'text' && "p-2 font-black italic text-2xl uppercase tracking-tighter"
            )}
            style={{ left: el.x, top: el.y }}
          >
            {el.type === 'image' && (
              <img src={el.content} className="w-40 rounded-lg shadow-lg border-2 border-white" alt="" />
            )}
            {el.type === 'text' && (
              <input 
                defaultValue={el.content} 
                className="bg-transparent outline-none border-none w-full" 
                autoFocus 
              />
            )}
            {el.type === 'note' && (
              <textarea 
                defaultValue={el.content} 
                className="bg-transparent outline-none border-none w-full h-full resize-none text-sm text-stone-700"
              />
            )}
            <button 
              onClick={() => removeElement(el.id)}
              className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Floating Black Banner - Positioned above Main Navbar */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-xl">
        <div className="bg-stone-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-2 flex items-center justify-between border border-white/10">
          
          {/* Tools Group */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleToolChange('pen')}
              className={cn("p-3.5 rounded-full transition-all", activeTool === 'pen' ? "bg-white text-stone-900" : "text-stone-500")}
            >
              <PenTool size={18} />
            </button>
            <button 
              onClick={() => handleToolChange('move')}
              className={cn("p-3.5 rounded-full transition-all", activeTool === 'move' ? "bg-white text-stone-900" : "text-stone-500")}
            >
              <Move size={18} />
            </button>
            <button 
              onClick={() => handleToolChange('eraser')}
              className={cn("p-3.5 rounded-full transition-all", activeTool === 'eraser' ? "bg-white text-stone-900" : "text-stone-500")}
            >
              <Eraser size={18} />
            </button>
          </div>

          {/* Add Elements Group */}
          <div className="flex items-center gap-1 border-l border-r border-stone-800 px-2 mx-1">
            <button onClick={() => addElement('text')} className="p-3.5 text-stone-500 hover:text-white"><Type size={18} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3.5 text-stone-500 hover:text-white"><ImageIcon size={18} /></button>
            <button onClick={() => addElement('note')} className="p-3.5 text-stone-500 hover:text-white"><StickyNote size={18} /></button>
          </div>

          {/* Color & Size */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex flex-col gap-1.5">
              <button onClick={() => setStrokeColor('#000000')} className={cn("w-3.5 h-3.5 rounded-full bg-black border border-white/20", strokeColor === '#000000' && "ring-2 ring-white")} />
              <button onClick={() => setStrokeColor('#EF4444')} className={cn("w-3.5 h-3.5 rounded-full bg-red-500", strokeColor === '#EF4444' && "ring-2 ring-white")} />
            </div>
            <input 
              type="range" min="1" max="20" value={strokeWidth} 
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-12 h-1 accent-white appearance-none bg-stone-700 rounded-full"
            />
          </div>

          {/* Save Action */}
          <div className="flex items-center gap-1 pl-1">
            <button onClick={handleExport} className="p-4 bg-white text-stone-900 rounded-full shadow-lg active:scale-95 transition-transform">
              <Save size={18} />
            </button>
            <button onClick={() => {if(confirm('Clear all?')) { setElements([]); canvasRef.current?.clearCanvas(); }}} className="p-2 text-rose-500/50 hover:text-rose-500">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
