import React, { useRef, useState, useEffect } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { 
  Undo, Redo, Trash2, Download, Eraser, PenTool, 
  ChevronLeft, Palette, Type, GripHorizontal 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function SketchPage() {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const navigate = useNavigate();
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [eraseMode, setEraseMode] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);

  const handleExport = async () => {
    const dataUrl = await canvasRef.current?.exportImage('png');
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `sketch-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-50 flex flex-col overflow-hidden touch-none">
      {/* Header - Mobile Optimized */}
      <div className="h-16 bg-white border-b border-stone-100 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-stone-50 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-stone-600" />
          </button>
          <h1 className="text-xl font-serif italic font-bold text-stone-900">Sketchpad</h1>
        </div>
        
        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={() => canvasRef.current?.undo()} className="p-2.5 text-stone-400 hover:text-stone-900"><Undo size={20}/></button>
          <button onClick={() => canvasRef.current?.redo()} className="p-2.5 text-stone-400 hover:text-stone-900"><Redo size={20}/></button>
          <button onClick={handleExport} className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Download size={20}/></button>
        </div>
      </div>

      {/* Canvas Area - Responsive */}
      <div className="flex-1 relative bg-white m-2 md:m-4 rounded-[2rem] overflow-hidden shadow-inner border border-stone-100">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          eraserWidth={20}
          canvasColor="transparent"
          style={{ border: 'none' }}
        />
      </div>

      {/* Toolbar - Floating Mobile Style */}
      <div className="p-4 pb-8 md:pb-6 flex flex-col items-center gap-4 z-30">
        <div className="bg-white/80 backdrop-blur-2xl border-2 border-white shadow-2xl rounded-[2.5rem] p-3 flex items-center gap-2 md:gap-6 max-w-full overflow-x-auto no-scrollbar">
          
          {/* Tools */}
          <div className="flex items-center gap-1 border-r border-stone-100 pr-2">
            <button 
              onClick={() => { setEraseMode(false); canvasRef.current?.eraseMode(false); }}
              className={cn("p-3 rounded-2xl transition-all", !eraseMode ? "bg-stone-900 text-white shadow-lg" : "text-stone-400")}
            >
              <PenTool size={20} />
            </button>
            <button 
              onClick={() => { setEraseMode(true); canvasRef.current?.eraseMode(true); }}
              className={cn("p-3 rounded-2xl transition-all", eraseMode ? "bg-stone-900 text-white shadow-lg" : "text-stone-400")}
            >
              <Eraser size={20} />
            </button>
          </div>

          {/* Colors - Minimal for Mobile */}
          <div className="flex items-center gap-2 px-2">
            {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'].map((color) => (
              <button
                key={color}
                onClick={() => {
                  setStrokeColor(color);
                  setEraseMode(false);
                  canvasRef.current?.eraseMode(false);
                }}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-transform active:scale-90",
                  strokeColor === color && !eraseMode ? "border-stone-900 scale-110 shadow-md" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Stroke Width Slider - Small */}
          <div className="flex items-center gap-3 border-l border-stone-100 pl-4 pr-2">
             <input 
               type="range" 
               min="1" 
               max="20" 
               value={strokeWidth} 
               onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
               className="w-16 md:w-24 accent-stone-900"
             />
          </div>

          {/* Clear Button */}
          <button 
            onClick={() => canvasRef.current?.clearCanvas()}
            className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
