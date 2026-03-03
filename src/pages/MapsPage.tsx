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
    <div className="fixed inset-0 bg-stone-50 flex flex-col overflow-hidden touch-none">
      
      {/* 1. Header - زر الرجوع فقط لتجنب التداخل مع أيقونات النظام */}
      <div className="safe-top h-16 flex items-center px-4 shrink-0 z-[60]">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-stone-200"
        >
          <ChevronLeft size={24} className="text-stone-900" />
        </button>
      </div>

      {/* 2. Canvas - مساحة الرسم تأخذ كل الشاشة الآن لضمان عدم وجود فراغات */}
      <div className="flex-1 relative bg-white mx-2 mb-2 rounded-[2.5rem] overflow-hidden shadow-inner border border-stone-100 z-10">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          eraserWidth={20}
          canvasColor="white"
          style={{ border: 'none' }}
        />
      </div>

      {/* 3. Bottom Controls - البنر الأسود في الأسفل لسهولة الوصول بالجوال */}
      <div className="px-4 pb-8 pt-2 z-[70]">
        <div className="bg-stone-900 shadow-2xl rounded-[2rem] p-2 flex items-center justify-between max-w-lg mx-auto w-full">
          
          {/* الأدوات الأساسية */}
          <div className="flex items-center gap-0.5">
            <button 
              onClick={() => handleToolChange('pen')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'pen' ? "bg-white text-stone-900" : "text-stone-500")}
            >
              <PenTool size={18} />
            </button>
            <button 
              onClick={() => handleToolChange('move')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'move' ? "bg-white text-stone-900" : "text-stone-500")}
            >
              <Move size={18} />
            </button>
            <button 
              onClick={() => handleToolChange('eraser')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'eraser' ? "bg-white text-stone-900" : "text-stone-500")}
            >
              <Eraser size={18} />
            </button>
          </div>

          {/* إضافة نص وصورة */}
          <div className="flex items-center gap-0.5 border-l border-r border-stone-800 px-1">
            <button 
              onClick={() => handleToolChange('type')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'type' ? "bg-white text-stone-900" : "text-stone-500")}
            >
              <Type size={18} />
            </button>
            <button 
              onClick={() => handleToolChange('image')}
              className={cn("p-3 rounded-full transition-all", activeTool === 'image' ? "bg-white text-stone-900" : "text-stone-500")}
            >
              <ImageIcon size={18} />
            </button>
          </div>

          {/* ألوان سريعة */}
          <div className="flex items-center gap-2 px-1">
            <button onClick={() => setStrokeColor('#000000')} className={cn("w-4 h-4 rounded-full bg-black border border-white/20", strokeColor === '#000000' && "scale-125")} />
            <button onClick={() => setStrokeColor('#EF4444')} className={cn("w-4 h-4 rounded-full bg-red-500", strokeColor === '#EF4444' && "scale-125")} />
          </div>

          {/* الحفظ والمسح */}
          <div className="flex items-center gap-1 pl-1">
            <button onClick={handleExport} className="p-3 bg-white text-stone-900 rounded-full shadow-lg">
              <Save size={18} />
            </button>
            <button onClick={() => canvasRef.current?.clearCanvas()} className="p-3 text-rose-500">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* شريط التحكم بحجم الخط - نحيف جداً تحت البنر */}
        <div className="mt-4 px-10">
          <input 
            type="range" min="1" max="20" value={strokeWidth} 
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            className="w-full h-1 bg-stone-300 rounded-lg appearance-none accent-stone-900"
          />
        </div>
      </div>
    </div>
  );
}
