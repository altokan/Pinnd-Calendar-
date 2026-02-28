// تم إضافة cancel=".no-drag" للصورة وتنسيق أزرار الحذف لتكون مستجيبة للمس الفوري
{images.map((img) => (
  <Rnd
    key={img.id}
    size={{ width: img.width, height: img.height }}
    position={{ x: img.x, y: img.y }}
    onDragStop={(_, d) => setImages(images.map(i => i.id === img.id ? {...i, x: d.x, y: d.y} : i))}
    onResizeStop={(_, dir, ref, delta, pos) => {
      setImages(images.map(i => i.id === img.id ? { ...i, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos } : i));
    }}
    enableResizing={tool === 'select'}
    disableDragging={tool !== 'select'}
    cancel=".no-drag" // هذا هو السر لعمل الحذف على الآيباد
    style={{ pointerEvents: 'auto', zIndex: selectedId === img.id ? 50 : 10 }}
  >
    <div 
      onClick={() => setSelectedId(img.id)}
      className={cn("relative w-full h-full p-2 group transition-all", selectedId === img.id ? "ring-2 ring-blue-500 bg-blue-50/10 rounded-lg" : "")}
    >
      <img src={img.url} className="w-full h-full object-contain pointer-events-none" />
      
      {selectedId === img.id && tool === 'select' && (
        <button 
          onPointerDown={(e) => { 
            e.stopPropagation(); 
            setImages(images.filter(i => i.id !== img.id)); 
            setSelectedId(null); 
          }}
          className="no-drag absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-2 shadow-xl active:scale-125 z-[100]"
        >
          <X size={20}/>
        </button>
      )}
    </div>
  </Rnd>
))}
