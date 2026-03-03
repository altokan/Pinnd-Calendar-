import React, { useRef, useState } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { 
  Undo, Redo, Trash2, Download, Eraser, PenTool, 
  ChevronLeft, Type, Image as ImageIcon, Move, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function SketchPage() {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const navigate = useNavigate();
  
  // States
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [eraseMode, setEraseMode] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'type' | 'image' | 'move'>('pen');

  const handleExport = async () => {
    const dataUrl = await canvasRef.current?.exportImage('png');
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `sketch-${Date.now()}.png`;
      link.click();
    }
  };

  const handleToolChange = (tool: 'pen' | 'eraser' | 'type' | 'image' | 'move') => {
    setActiveTool(tool);
    if (tool === 'eraser') {
      setEraseMode(true);
      canvasRef.current?.eraseMode(true);
    } else {
      setEraseMode(false);
      canvasRef.current?.eraseMode(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-100 flex flex-col overflow-hidden touch-none">
      
      {/* 1. Header Area - مساحة علوية شفافة لأيقونات النظام والرجوع */}
      <div className="h-20 flex items-center px-6 shrink-0 z-50">
        <button 
          onClick={() => navigate(-1)} 
          className="p-3 bg-white rounded-2xl shadow-sm border border-stone-200 active:scale-95 transition-all"
        >
          <ChevronLeft size={24} className="text-stone-900" />
        </button>
      </div>

      {/* 2. Main Toolbar (Black Banner) - نزلناه لتحت شوي ليتفادى أيقونات البروفايل */}
      <div className="px-4 mb-4 z-40">
        <div className="bg-stone-900 shadow-2xl rounded-[2.5rem] p-2 flex items-center justify-between max-w-2xl mx-auto w-full border border-white/10">
          
          {/* أدوات الرسم والتحريك */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleToolChange('pen')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'pen' ? "bg-white text-stone-900 shadow-lg" : "text-stone-400")}
            >
              <PenTool size={20} />
            </button>
            <button 
              onClick={() => handleToolChange('move')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'move' ? "bg-white text-stone-900 shadow-lg" : "text-stone-400")}
            >
              <Move size={20} />
            </button>
            <button 
              onClick={() => handleToolChange('eraser')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'eraser' ? "bg-white text-stone-900 shadow-lg" : "text-stone-400")}
            >
              <Eraser size={20} />
            </button>
          </div>

          {/* أدوات الإضافة (نص وصورة) */}
          <div className="flex items-center gap-1 border-l border-r border-stone-700 px-2 mx-2">
            <button 
              onClick={() => handleToolChange('type')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'type' ? "bg-white text-stone-900 shadow-lg" : "text-stone-400")}
            >
              <Type size={20} />
            </button>
            <button 
              onClick={() => handleToolChange('image')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'image' ? "bg-white text-stone-900 shadow-lg" : "text-stone-400")}
            >
              <ImageIcon size={20} />
            </button>
          </div>

          {/* الألوان (نسخة مصغرة للجوال) */}
          <div className="hidden sm:flex items-center gap-2 mr-2">
            {['#000000', '#EF4444', '#3B82F6'].map((color) => (
              <button
                key={color}
                onClick={() => { setStrokeColor(color); handleToolChange('pen'); }}
                className={cn("w-6 h-6 rounded-full border-2", strokeColor === color ? "border-white" : "border-transparent")}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* إجراءات الحفظ والمسح */}
          <div className="flex items-center gap-1">
            <button onClick={handleExport} className="p-3 bg-emerald-500 text-white rounded-full shadow-lg active:scale-90">
              <Save size={20} />
            </button>
            <button onClick={() => canvasRef.current?.clearCanvas()} className="p-3 text-rose-400 hover:bg-rose-500/10 rounded-full transition-all">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Canvas Surface - مساحة الرسم الاحترافية */}
      <div className="flex-1 bg-white m-4 mt-0 rounded-[3rem] shadow-inner overflow-hidden border border-stone-200 relative">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          eraserWidth={20}
          canvasColor="white"
          style={{ border: 'none' }}
          allowOnlyPointerType={activeTool === 'move' ? 'all' : 'mouse'} // محاكاة وضع التحريك
        />

        {/* تلميح الأداة النشطة */}
        <div className="absolute bottom-6 left-6 px-4 py-2 bg-stone-900/5 backdrop-blur-md rounded-full border border-stone-200">
           <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest flex items-center gap-2">
             Active Tool: <span className="text-stone-900">{activeTool}</span>
           </p>
        </div>
      </div>

      {/* 4. Stroke Control - تحكم انسيابي في حجم الخط بالأسفل */}
      <div className="h-16 flex items-center justify-center px-10 pb-4">
        <input 
          type="range" min="1" max="25" value={strokeWidth} 
          onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
          className="w-full max-w-xs accent-stone-900 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}
