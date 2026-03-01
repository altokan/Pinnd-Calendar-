import React, { useRef, useState } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { 
  Undo, Redo, Trash2, Download, Eraser, PenTool, 
  ChevronLeft, Palette, Save, Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function SketchPage() {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const navigate = useNavigate();
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [eraseMode, setEraseMode] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(5);

  const handleExport = async () => {
    try {
      const dataUrl = await canvasRef.current?.exportImage('png');
      if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `drawing-${Date.now()}.png`;
        link.click();
      }
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F8F8F7] flex flex-col overflow-hidden touch-none">
      {/* Top Navigation - iPad Friendly */}
      <div className="h-14 md:h-20 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-4 md:px-8 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-stone-100 rounded-full transition-all active:scale-90"
          >
            <ChevronLeft size={28} className="text-stone-800" />
          </button>
          <span className="font-serif italic text-xl md:text-2xl font-bold text-stone-900">Studio</span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => canvasRef.current?.undo()} className="p-2 text-stone-400 hover:text-stone-900"><Undo size={22}/></button>
          <button onClick={() => canvasRef.current?.redo()} className="p-2 text-stone-400 hover:text-stone-900"><Redo size={22}/></button>
          <button 
            onClick={handleExport}
            className="ml-2 flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-full text-sm font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Canvas Area - Feels like a real paper */}
      <div className="flex-1 relative m-3 md:m-8 lg:m-12 bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-stone-100">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          eraserWidth={30}
          canvasColor="white"
          style={{ border: 'none' }}
        />
      </div>

      {/* Floating Tool Dock - Mobile & iPad Optimized */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full px-4 flex justify-center">
        <div className="bg-white/90 backdrop-blur-2xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-3 flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar max-w-full">
          
          {/* Main Tools */}
          <div className="flex items-center gap-2 border-r border-stone-100 pr-4">
            <button 
              onClick={() => { setEraseMode(false); canvasRef.current?.eraseMode(false); }}
              className={cn("p-4 rounded-[1.5rem] transition-all", !eraseMode ? "bg-stone-900 text-white shadow-xl" : "text-stone-400 hover:bg-stone-50")}
            >
              <PenTool size={22} />
            </button>
            <button 
              onClick={() => { setEraseMode(true); canvasRef.current?.eraseMode(true); }}
              className={cn("p-4 rounded-[1.5rem] transition-all", eraseMode ? "bg-stone-900 text-white shadow-xl" : "text-stone-400 hover:bg-stone-50")}
            >
              <Eraser size={22} />
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-3">
            {['#000000', '#FF3B30', '#007AFF', '#34C759', '#FFCC00'].map((color) => (
              <button
                key={color}
                onClick={() => {
                  setStrokeColor(color);
                  setEraseMode(false);
                  canvasRef.current?.eraseMode(false);
                }}
                className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all active:scale-75 shadow-sm",
                  strokeColor === color && !eraseMode ? "border-stone-900 scale-125" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Size Slider (Visible on iPad and Desktop) */}
          <div className="hidden md:flex items-center gap-3 border-l border-stone-100 pl-6">
             <div className="w-2 h-2 rounded-full bg-stone-300" />
             <input 
               type="range" min="1" max="25" value={strokeWidth} 
               onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
               className="w-32 accent-stone-900"
             />
             <div className="w-5 h-5 rounded-full bg-stone-300" />
          </div>

          {/* Clear Button */}
          <button 
            onClick={() => { if(confirm("Clear paper?")) canvasRef.current?.clearCanvas() }}
            className="p-4 text-stone-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
