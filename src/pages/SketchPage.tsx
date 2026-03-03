import React, { useRef, useState } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import Draggable from 'react-draggable';
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
      id: Date.now().toString(),
      type,
      content: content || (type === 'text' ? 'TAP TO EDIT' : 'New Note...')
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
    <div className="fixed inset-0 bg-stone-50 flex flex-col overflow-hidden touch-none font-sans">
      
      {/* Header - Back Button */}
      <div className="h-16 flex items-center px-6 z-[100] relative">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-md border border-stone-200">
          <ChevronLeft size={24} className="text-stone-900" />
        </button>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 relative mx-4 mb-36 bg-white rounded-[3rem] shadow-2xl border border-stone-200 overflow-hidden z-10">
        
        {/* Layer 1: Canvas (Draw) */}
        <div className={cn("absolute inset-0 transition-opacity", activeTool === 'move' ? "z-0 opacity-50 pointer-events-none" : "z-20 opacity-100")}>
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
            canvasColor="transparent"
            style={{ border: 'none' }}
          />
        </div>

        {/* Layer 2: Draggable Elements (Images, Notes, Text) */}
        <div className={cn("absolute inset-0 z-30", activeTool === 'move' ? "pointer-events-auto" : "pointer-events-none")}>
          {elements.map((el) => (
            <Draggable key={el.id} bounds="parent">
              <div className="absolute p-2 group cursor-move pointer-events-auto">
                {el.type === 'text' && (
                  <div contentEditable className="text-3xl font-black uppercase italic outline-none min-w-[100px]">{el.content}</div>
                )}
                {el.type === 'image' && (
                  <img src={el.content} className="w-44 rounded-xl shadow-lg border-4 border-white" />
                )}
                {el.type === 'note' && (
                  <textarea defaultValue={el.content} className="bg-yellow-200 p-4 rounded-xl shadow-lg border-none resize-none w-48 h-32 font-medium" />
                )}
                <button onClick={() => setElements(elements.filter(x => x.id !== el.id))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <X size={14} />
                </button>
              </div>
            </Draggable>
          ))}
        </div>
      </div>

      {/* 3. Black Floating Dock - Adjusted for Mobile & iPad */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[95%] max-w-2xl px-2">
        <div className="bg-stone-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-2 flex items-center justify-between border border-white/20">
          
          {/* Main Drawing Tools */}
          <div className="flex items-center gap-1">
            <button onClick={() => handleToolChange('pen')} className={cn("p-4 rounded-full transition-all", activeTool === 'pen' ? "bg-white text-stone-900 shadow-xl" : "text-stone-500")}>
              <PenTool size={20} />
            </button>
            <button onClick={() => handleToolChange('move')} className={cn("p-4 rounded-full transition-all", activeTool === 'move' ? "bg-white text-stone-900 shadow-xl" : "text-stone-500")}>
              <Move size={20} />
            </button>
            <button onClick={() => handleToolChange('eraser')} className={cn("p-4 rounded-full transition-all", activeTool === 'eraser' ? "bg-white text-stone-900 shadow-xl" : "text-stone-500")}>
              <Eraser size={20} />
            </button>
          </div>

          {/* Add Content Tools */}
          <div className="flex items-center gap-1 border-l border-r border-stone-800 px-3">
            <button onClick={() => addElement('text')} className="p-3 text-stone-400 hover:text-white transition-colors"><Type size={20}/></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-stone-400 hover:text-white transition-colors"><ImageIcon size={20}/></button>
            <button onClick={() => addElement('note')} className="p-3 text-stone-400 hover:text-white transition-colors"><StickyNote size={20}/></button>
          </div>

          {/* Color & Size Minimal */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex flex-col gap-1">
               <button onClick={() => setStrokeColor('#000000')} className={cn("w-3 h-3 rounded-full bg-black border border-white/40", strokeColor === '#000000' && "ring-2 ring-white")} />
               <button onClick={() => setStrokeColor('#EF4444')} className={cn("w-3 h-3 rounded-full bg-red-500", strokeColor === '#EF4444' && "ring-2 ring-white")} />
            </div>
            <input type="range" min="1" max="25" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="w-16 accent-white opacity-50" />
          </div>

          {/* Save Action */}
          <div className="flex items-center gap-1">
            <button onClick={() => canvasRef.current?.exportImage('png').then(img => { const a = document.createElement('a'); a.href = img; a.download='studio.png'; a.click(); })} className="p-4 bg-white text-stone-900 rounded-full shadow-lg active:scale-90 transition-transform">
              <Save size={20} />
            </button>
            <button onClick={() => {if(confirm('Clear?')) {setElements([]); canvasRef.current?.clearCanvas()}}} className="p-2 text-rose-500/50"><Trash2 size={16}/></button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
