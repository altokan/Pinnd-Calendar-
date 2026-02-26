import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pencil, Trash2, Download, Save, Image as ImageIcon, Type, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface SketchCanvasProps {
  onSave?: (dataUrl: string) => void;
}

const SketchCanvas: React.FC<SketchCanvasProps> = ({ onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1c1917'); // stone-900
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pencil' | 'eraser' | 'text'>('pencil');
  const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, value: '' });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const tempImage = canvas.toDataURL();
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        
        const img = new Image();
        img.src = tempImage;
        img.onload = () => ctx.drawImage(img, 0, 0);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
      ctx.fillStyle = color;
      ctx.font = `${lineWidth * 5}px serif`;
    }
  }, [color, lineWidth, tool]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      let x, y;
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      
      setTextInput({ show: true, x, y, value: '' });
      return;
    }

    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool === 'text') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleAddText = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && textInput.value) {
      ctx.fillStyle = color;
      ctx.font = `${lineWidth * 5}px serif`;
      ctx.fillText(textInput.value, textInput.x, textInput.y);
      setTextInput({ show: false, x: 0, y: 0, value: '' });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          // Calculate scaling to fit canvas while maintaining aspect ratio
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (canvas.width - w) / 2;
          const y = (canvas.height - h) / 2;
          ctx.drawImage(img, x, y, w, h);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `sketch-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTool('pencil')}
            className={cn(
              "p-2 rounded-xl transition-all",
              tool === 'pencil' ? "bg-stone-900 text-white shadow-md" : "text-stone-400 hover:bg-stone-100"
            )}
            title="Pencil"
          >
            <Pencil size={20} />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={cn(
              "p-2 rounded-xl transition-all",
              tool === 'eraser' ? "bg-stone-900 text-white shadow-md" : "text-stone-400 hover:bg-stone-100"
            )}
            title="Eraser"
          >
            <Eraser size={20} />
          </button>
          <button 
            onClick={() => setTool('text')}
            className={cn(
              "p-2 rounded-xl transition-all",
              tool === 'text' ? "bg-stone-900 text-white shadow-md" : "text-stone-400 hover:bg-stone-100"
            )}
            title="Add Text"
          >
            <Type size={20} />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 transition-all"
            title="Upload Image"
          >
            <ImageIcon size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          
          <div className="w-px h-6 bg-stone-200 mx-2" />
          
          <input 
            type="color" 
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded-full border-none cursor-pointer bg-transparent"
          />
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-24 accent-stone-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={clearCanvas}
            className="p-2 text-stone-400 hover:text-red-500 transition-colors"
            title="Clear Canvas"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={downloadImage}
            className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
            title="Download"
          >
            <Download size={20} />
          </button>
          {onSave && (
            <button 
              onClick={() => onSave(canvasRef.current?.toDataURL() || '')}
              className="btn-primary px-4 py-2 text-sm"
            >
              <Save size={16} />
              Save to Pin
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair touch-none bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full"
        />
        
        {textInput.show && (
          <div 
            className="absolute z-10 flex items-center gap-2 bg-white p-2 rounded-xl shadow-xl border border-stone-200"
            style={{ left: textInput.x, top: textInput.y - 40 }}
          >
            <input
              autoFocus
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              placeholder="Type something..."
              className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-stone-200"
            />
            <button onClick={handleAddText} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-md">
              <Check size={18} />
            </button>
            <button onClick={() => setTextInput({ show: false, x: 0, y: 0, value: '' })} className="p-1 text-stone-400 hover:bg-stone-100 rounded-md">
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SketchCanvas;
