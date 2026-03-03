import React, { useRef, useState } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { 
  Undo, Redo, Trash2, Download, Eraser, PenTool, 
  ChevronLeft
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
      {/* Header مع زر الرجوع */}
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-stone-100 transition-colors"
        >
          <ChevronLeft size={24} className="text-stone-600" />
        </button>
      </div>

      {/* بنر الإضافات الأسود في منتصف أعلى الصفحة */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md">
        <div className="bg-stone-900 shadow-2xl rounded-[2rem] p-2 flex items-center justify-between px-4">
          {/* الأدوات */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => { setEraseMode(false); canvasRef.current?.eraseMode(false); }}
              className={cn("p-2 rounded-full transition-all", !eraseMode ? "bg-white text-stone-900" : "text-stone-400")}
            >
              <PenTool size={18} />
            </button>
            <button 
              onClick={() => { setEraseMode(true); canvasRef.current?.eraseMode(true); }}
              className={cn("p-2 rounded-full transition-all", eraseMode ? "bg-white text-stone-900" : "text-stone-400")}
            >
              <Eraser size={18} />
            </button>
          </div>

          {/* الألوان */}
          <div className="flex items-center gap-1.5">
            {['#000000', '#EF4444', '#3B82F6', '#10B981'].map((color) => (
              <button
                key={color}
                onClick={() => { setStrokeColor(color); setEraseMode(false); canvasRef.current?.eraseMode(false); }}
                className={cn(
                  "w-5 h-5 rounded-full border transition-transform",
                  strokeColor === color && !eraseMode ? "border-white scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* إجراءات الحفظ والمسح */}
          <div className="flex items-center gap-1 border-l border-stone-700 pl-2">
            <button onClick={() => canvasRef.current?.undo()} className="p-1.5 text-stone-400"><Undo size={16}/></button>
            <button onClick={handleExport} className="p-1.5 text-white"><Download size={16}/></button>
            <button onClick={() => canvasRef.current?.clearCanvas()} className="p-1.5 text-rose-400"><Trash2 size={16}/></button>
          </div>
        </div>
      </div>

      {/* مساحة الرسم - ممتدة بالكامل للجوال */}
      <div className="flex-1 bg-white">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          eraserWidth={20}
          canvasColor="transparent"
          style={{ border: 'none' }}
        />
      </div>

      {/* حجم الخط أسفل الصفحة بشكل خفيف */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-50">
        <input 
          type="range" min="1" max="20" value={strokeWidth} 
          onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
          className="w-32 accent-stone-900"
        />
      </div>
    </div>
  );
}
