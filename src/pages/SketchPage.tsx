import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, ChevronLeft, ImageIcon, Move, Save, 
  StickyNote, X, Maximize2, GripHorizontal, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface BoardElement {
  id: string;
  type: 'image' | 'note';
  content: string;
  x: number;
  y: number;
  width: number;
  rotation: number; // إضافة تدوير بسيط ليعطي شكل واقعي
}

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const addElement = (type: 'image' | 'note', content: string = '') => {
    const newEl: BoardElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: content || (type === 'note' ? 'اكتب ملاحظتك هنا...' : ''),
      x: 100 + (elements.length * 10),
      y: 150 + (elements.length * 10),
      width: 220,
      rotation: Math.floor(Math.random() * 6) - 3, // تدوير عشوائي بين -3 و 3 درجات
    };
    setElements([...elements, newEl]);
    setActiveId(newEl.id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => addElement('image', ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    setActiveId(null);
  };

  const updateSize = (id: string, delta: number) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, width: Math.max(150, el.width + delta) } : el
    ));
  };

  return (
    <div className="fixed inset-0 overflow-hidden touch-none font-sans select-none">
      
      {/* 1. Background Layer - Corkboard Texture */}
      <div 
        className="absolute inset-0 z-0"
        style={{ 
          backgroundColor: '#bc8a5f',
          backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')`,
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.2)'
        }}
      />

      {/* 2. Header */}
      <div className="absolute top-6 left-6 z-[100] flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-stone-200 active:scale-95">
          <ChevronLeft size={24} className="text-stone-900" />
        </button>
        <h1 className="text-white font-black tracking-[0.2em] text-sm uppercase drop-shadow-md">Board</h1>
      </div>

      {/* 3. Elements Canvas */}
      <div className="w-full h-full relative overflow-hidden">
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag
              dragMomentum={false}
              onDragStart={() => setActiveId(el.id)}
              onClick={() => setActiveId(el.id)}
              initial={{ scale: 0.5, opacity: 0, rotate: el.rotation }}
              animate={{ scale: 1, opacity: 1, rotate: el.rotation }}
              className={cn(
                "absolute z-20 touch-none p-4",
                activeId === el.id ? "z-50 cursor-grabbing" : "z-20 cursor-grab"
              )}
              style={{ x: el.x, y: el.y, width: el.width }}
            >
              {/* Element Toolbar */}
              {activeId === el.id && (
                <motion.div 
                  initial={{ y: 5, opacity: 0 }} 
                  animate={{ y: -50, opacity: 1 }}
                  className="absolute left-1/2 -translate-x-1/2 bg-stone-900 text-white rounded-xl px-4 py-2 flex items-center gap-4 shadow-2xl border border-white/10"
                >
                  <button onClick={() => updateSize(el.id, 40)}><Maximize2 size={16}/></button>
                  <button onClick={() => deleteElement(el.id)} className="text-rose-400"><Trash2 size={16}/></button>
                </motion.div>
              )}

              {/* Pin Header - شكل الدبوس الصغير */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 shadow-md border-b-2 border-red-800 z-30" />

              {/* Content Card */}
              <div className={cn(
                "relative rounded-sm transition-all duration-300",
                el.type === 'note' ? "bg-[#fff9c4] shadow-[5px_5px_15px_rgba(0,0,0,0.3)]" : "bg-white p-2 shadow-[2px_10px_20px_rgba(0,0,0,0.4)]",
                activeId === el.id && "ring-4 ring-blue-400/30"
              )}>
                {el.type === 'note' ? (
                  <div className="p-5 min-h-[140px] flex flex-col">
                    <textarea 
                      className="bg-transparent border-none outline-none w-full flex-1 resize-none text-stone-800 font-medium text-lg placeholder-stone-400/50"
                      placeholder="..."
                      defaultValue={el.content}
                    />
                  </div>
                ) : (
                  <img src={el.content} className="w-full h-auto rounded-sm pointer-events-none" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 4. Main Dock - مرتفع للأعلى ومناسب للجوال */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-xl shadow-2xl rounded-[2.5rem] p-2 flex items-center justify-between border border-white/10">
          
          <div className="flex items-center gap-3 pl-3">
             <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">{elements.length} Elements</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => addElement('note')} 
              className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-xs shadow-lg active:scale-90"
            >
              <Plus size={16} />
              <span>NOTE</span>
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-4 bg-stone-800 text-white rounded-full active:scale-90 shadow-md"
            >
              <ImageIcon size={20} />
            </button>
          </div>

          <div className="pr-1">
             <button 
                onClick={() => alert('Saved to Board!')} 
                className="p-4 bg-emerald-500 text-white rounded-full shadow-lg"
              >
                <Save size={18} />
             </button>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
