import React, { useRef, useState } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { motion, Reorder } from 'framer-motion';
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

  // States
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'move'>('pen');
  const [elements, setElements] = useState<CanvasElement[]>([]);

  // تغيير الأداة
  const handleToolChange = (tool: 'pen' | 'eraser' | 'move') => {
    setActiveTool(tool);
    canvasRef.current?.eraseMode(tool === 'eraser');
  };

  // إضافة عنصر جديد (نص، صورة، ملاحظة)
  const addElement = (type: 'text' | 'image' | 'note', content: string = '') => {
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substring(7),
      type,
      content: content || (type === 'text' ? 'TAP TO EDIT' : 'New Note...')
    };
    setElements([...elements, newEl]);
  };

  // رفع الصورة
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => addElement('image', ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F8F8F6] flex flex-col overflow-hidden touch-none font-sans">
      
      {/* Header Area */}
      <div className="h-16 flex items-center px-6 z-[100] relative">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2.5 bg-white rounded-2xl shadow-sm border border-stone-200 active:scale-95 transition-all"
        >
          <ChevronLeft size={22} className="text-stone-900" />
        </button>
        <div className="flex-1 flex justify-center gap-4">
           <button onClick={() => canvasRef.current?.undo()} className="text-stone-400 hover:text-stone-900"><Undo size={20}/></button>
           <button onClick={() => canvasRef.current?.redo()} className="text-stone-400 hover:text-stone-900"><Redo size={20}/></button>
        </div>
      </div>

      {/* Drawing & Element Surface */}
      <div className="flex-1 relative mx-4 mb-36 bg-white rounded-[3rem] shadow-2xl border border-stone-100 overflow-hidden z-10">
        
        {/* Drawing Layer */}
        <div className={cn(
          "absolute inset-0 z-10 transition-opacity duration-300",
          activeTool === 'move' ? "opacity-30 pointer-events-none" : "opacity-100"
        )}>
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
            canvasColor="transparent"
            style={{ border: 'none' }}
          />
        </div>

        {/* Elements Layer (Draggable) */}
        <div className={cn(
          "absolute inset-0 z-20",
          activeTool === 'move' ? "pointer-events-auto" : "pointer-events-none"
        )}>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag
              dragMomentum={false}
              whileDrag={{ scale: 1.05, zIndex: 50 }}
              className="absolute p-4 cursor-move pointer-events-auto group touch-none"
              style={{ left: '25%', top: '25%' }}
            >
              {el.type === 'text' && (
                <div 
                  contentEditable 
                  suppressContentEditableWarning
                  className="text-4xl font-black uppercase italic outline-none min-w-[150px] text-stone-900 leading-none"
                >
                  {el.content}
                </div>
              )}
              
              {el.type === 'image' && (
                <img src={el.content} className="w-56 rounded-2xl shadow-2xl border-4 border-white pointer-events-none" alt="" />
              )}
              
              {el.type === 'note' && (
                <div className="bg-yellow-100 p-5 rounded-2xl shadow-xl border border-yellow-200 w-56 min-h-[160px] rotate-1">
                   <textarea 
                    defaultValue={el.content} 
                    className="bg-transparent border-none outline-none w-full h-full resize-none text-stone-700 font-medium leading-tight" 
                   />
                </div>
              )}

              {/* Delete Button */}
              <button 
                onClick={() => setElements(elements.filter(x => x.id !== el.id))}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-[60]"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* The Black Banner - Floating above your main Navbar */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[94%] max-w-2xl px-2">
        <div className="bg-stone-900/95 backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] rounded-[2.5rem] p-2 flex items-center justify-between border border-white/10">
          
          {/* Group 1: Tools */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleToolChange('pen')} 
              className={cn("p-4 rounded-full transition-all", activeTool === 'pen' ? "bg-white text-stone-900 shadow-md" : "text-stone-500")}
            >
              <PenTool size={18} />
            </button>
            <button 
              onClick={() => handleToolChange('move')} 
              className={cn("p-4 rounded-full transition-all", activeTool === 'move' ? "bg-white text-stone-900 shadow-md" : "text-stone-500")}
            >
              <Move size={18} />
            </button>
            <button 
              onClick={() => handleToolChange('eraser')} 
              className={cn("p-4 rounded-full transition-all", activeTool === 'eraser' ? "bg-white text-stone-900 shadow-md" : "text-stone-500")}
            >
              <Eraser size={18} />
            </button>
          </div>

          {/* Group 2: Adders (Web Style) */}
          <div className="flex items-center gap-1 border-l border-r border-stone-800 px-3 mx-1">
            <button onClick={() => addElement('text')} className="p-3.5 text-stone-500 hover:text-white transition-colors"><Type size={18}/></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3.5 text-stone-500 hover:text-white transition-colors"><ImageIcon size={18}/></button>
            <button onClick={() => addElement('note')} className="p-3.5 text-stone-500 hover:text-white transition-colors"><StickyNote size={18}/></button>
          </div>

          {/* Group 3: Settings */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex flex-col gap-1.5">
               <button onClick={() => setStrokeColor('#000000')} className={cn("w-3.5 h-3.5 rounded-full bg-black border border-white/20", strokeColor === '#000000' && "ring-2 ring-white")} />
               <button onClick={() => setStrokeColor('#EF4444')} className={cn("w-3.5 h-3.5 rounded-full bg-red-500", strokeColor === '#EF4444' && "ring-2 ring-white")} />
            </div>
            <input 
              type="range" min="1" max="25" value={strokeWidth} 
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))} 
              className="w-12 h-1 accent-white appearance-none bg-stone-700 rounded-full" 
            />
          </div>

          {/* Group 4: Save & Trash */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => canvasRef.current?.exportImage('png').then(img => {
                const a = document.createElement('a'); a.href = img; a.download='art.png'; a.click();
              })} 
              className="p-4 bg-white text-stone-900 rounded-full shadow-lg active:scale-90"
            >
              <Save size={18} />
            </button>
            <button 
              onClick={() => { if(confirm('Clear all?')) { setElements([]); canvasRef.current?.clearCanvas(); }}} 
              className="p-2 text-rose-500/40 hover:text-rose-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
