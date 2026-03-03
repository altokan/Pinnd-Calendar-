import React, { useRef, useState } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { motion } from 'framer-motion';
import { 
  Undo, Redo, Trash2, Download, Eraser, PenTool, 
  ChevronLeft, Type, Image as ImageIcon, Move, Save, 
  StickyNote, X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'note';
  content: string;
}

export default function SketchPage() {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [strokeColor, setStrokeColor] = useState('#000000');
  const [eraseMode, setEraseMode] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'move'>('pen');
  const [elements, setElements] = useState<CanvasElement[]>([]);

  const handleToolChange = (tool: 'pen' | 'eraser' | 'move') => {
    setActiveTool(tool);
    const isEraser = tool === 'eraser';
    setEraseMode(isEraser);
    canvasRef.current?.eraseMode(isEraser);
  };

  const addElement = (type: 'text' | 'image' | 'note', content: string = '') => {
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: content || (type === 'text' ? 'NEW TEXT' : 'Quick Note...')
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

  return (
    <div className="fixed inset-0 bg-[#F6F6F4] flex flex-col overflow-hidden touch-none font-sans">
      {/* Header */}
      <div className="h-16 flex items-center px-6 z-[100] relative">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm border border-stone-200 active:scale-90 transition-transform">
          <ChevronLeft size={24} className="text-stone-900" />
        </button>
      </div>

      {/* Main Surface */}
      <div className="flex-1 relative mx-4 mb-36 bg-white rounded-[3rem] shadow-xl border border-stone-200 overflow-hidden z-10">
        <div className={cn("absolute inset-0 z-10 transition-opacity", activeTool === 'move' ? "opacity-40 pointer-events-none" : "opacity-100")}>
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
            canvasColor="transparent"
            style={{ border: 'none' }}
          />
        </div>

        {/* Draggable Layer (Framer Motion) */}
        <div className={cn("absolute inset-0 z-20", activeTool === 'move' ? "pointer-events-auto" : "pointer-events-none")}>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag
              dragMomentum={false}
              className="absolute p-4 cursor-move pointer-events-auto group touch-none"
              style={{ left: '20%', top: '20%' }}
            >
              {el.type === 'text' && (
                <div contentEditable className="text-4xl font-black uppercase italic outline-none min-w-[100px] text-stone-900">{el.content}</div>
              )}
              {el.type === 'image' && (
                <img src={el.content} className="w-48 rounded-2xl shadow-2xl border-4 border-white pointer-events-none" />
              )}
              {el.type === 'note' && (
                <div className="bg-yellow-100 p-6 rounded-2xl shadow-xl border border-yellow-200 w-52 min-h-[150px]">
                   <textarea defaultValue={el.content} className="bg-transparent border-none outline-none w-full h-full resize-none text-stone-700 font-medium" />
                </div>
              )}
              <button 
                onClick={() => setElements(elements.filter(x => x.id !== el.id))}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Black Floating Dock */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-xl">
        <div className="bg-stone-900 shadow-2xl rounded-[2.5rem] p-2 flex items-center justify-between border border-white/10">
          <div className="flex items-center gap-1">
            <button onClick={() => handleToolChange('pen')} className={cn("p-4 rounded-full transition-all", activeTool === 'pen' ? "bg-white text-stone-900 shadow-xl" : "text-stone-500")}><PenTool size={20} /></button>
            <button onClick={() => handleToolChange('move')} className={cn("p-4 rounded-full transition-all", activeTool === 'move' ? "bg-white text-stone-900 shadow-xl" : "text-stone-500")}><Move size={20} /></button>
            <button onClick={() => handleToolChange('eraser')} className={cn("p-4 rounded-full transition-all", activeTool === 'eraser' ? "bg-white text-stone-900 shadow-xl" : "text-stone-500")}><Eraser size={20} /></button>
          </div>

          <div className="flex items-center gap-1 border-l border-r border-stone-800 px-3 mx-1">
            <button onClick={() => addElement('text')} className="p-3 text-stone-400 hover:text-white"><Type size={20}/></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-stone-400 hover:text-white"><ImageIcon size={20}/></button>
            <button onClick={() => addElement('note')} className="p-3 text-stone-400 hover:text-white"><StickyNote size={20}/></button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setStrokeColor('#000000')} className={cn("w-4 h-4 rounded-full bg-black border border-white/20", strokeColor === '#000000' && "ring-2 ring-white")} />
            <button onClick={() => setStrokeColor('#EF4444')} className={cn("w-4 h-4 rounded-full bg-red-500", strokeColor === '#EF4444' && "ring-2 ring-white")} />
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => canvasRef.current?.exportImage('png').then(img => { const a = document.createElement('a'); a.href = img; a.download='studio.png'; a.click(); })} className="p-4 bg-white text-stone-900 rounded-full shadow-lg"><Save size={20} /></button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
