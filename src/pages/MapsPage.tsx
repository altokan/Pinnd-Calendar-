import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

const MapsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // محاكاة تحميل الخريطة
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] space-y-4">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl font-black text-stone-900">Explore Maps</h1>
          <p className="text-sm text-stone-400 font-medium">Find your pins and locations</p>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100">
          <Navigation size={20} className="text-stone-900" />
        </div>
      </div>

      {/* منطقة الخريطة */}
      <div className="flex-1 bg-stone-100 rounded-[2.5rem] overflow-hidden relative border-4 border-white shadow-inner flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-stone-300" size={32} />
            <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Loading Map...</span>
          </div>
        ) : (
          /* هنا يتم دمج مكتبة الخرائط لاحقاً، حالياً وضعنا واجهة مؤقتة احترافية */
          <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/basic-v2/static/0/0/0.png')] bg-cover opacity-20 grayscale" />
        )}
        
        {!loading && (
          <div className="z-10 flex flex-col items-center">
            <div className="bg-stone-900 text-white p-4 rounded-full shadow-2xl animate-bounce">
              <MapPin size={24} />
            </div>
            <div className="mt-4 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full border border-white shadow-lg text-xs font-bold text-stone-900">
              Map View Coming Soon
            </div>
          </div>
        )}
      </div>

      {/* أزرار تحكم سريعة */}
      <div className="grid grid-cols-2 gap-3 px-2">
        <button className="bg-white py-4 rounded-2xl border border-stone-100 shadow-sm font-bold text-stone-900 text-sm">
          Saved Places
        </button>
        <button className="bg-stone-900 py-4 rounded-2xl text-white shadow-lg font-bold text-sm">
          Current Location
        </button>
      </div>
    </div>
  );
};

export default MapsPage;
