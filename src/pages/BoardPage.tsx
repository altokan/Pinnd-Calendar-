{/* بنر التاريخ العلوي - تم رفع الـ z-index لضمان الاستجابة */}
<div className="absolute top-6 left-0 right-0 z-[999] flex justify-center px-4 pointer-events-auto">
  <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-[2rem] shadow-2xl flex items-center gap-2 border border-white/20">
    <button 
      onClick={(e) => { e.stopPropagation(); navigate(-1); }} 
      className="p-2 hover:bg-stone-100 rounded-full active:scale-90 transition-transform"
    >
      <ChevronLeft size={20}/>
    </button>
    
    <div className="h-6 w-[1px] bg-stone-200 mx-1" />
    
    <button 
      onClick={(e) => { e.stopPropagation(); changeDay(-1); }} 
      className="p-2 hover:bg-stone-50 rounded-full text-stone-400 active:scale-90 transition-transform"
    >
      <ArrowLeft size={18}/></button>
    
    <div className="relative flex items-center px-2 min-w-[100px] justify-center">
      <input 
        type="date" 
        value={selectedDate} 
        onChange={(e) => setSelectedDate(e.target.value)} 
        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
      />
      <span className="font-black text-xs uppercase tracking-tighter text-stone-800 pointer-events-none">
        {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
    </div>

    <button 
      onClick={(e) => { e.stopPropagation(); changeDay(1); }} 
      className="p-2 hover:bg-stone-50 rounded-full text-stone-400 active:scale-90 transition-transform"
    >
      <ArrowRight size={18}/>
    </button>
  </div>
</div>
