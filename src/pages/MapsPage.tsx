import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { MapPin, Navigation, Loader2, Info, Plus } from 'lucide-react';

const MapsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // جلب الأحداث من Firestore
    const q = query(collection(db, "events"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // تصفية الأحداث التي تحتوي على إحداثيات فقط
      setEvents(data.filter(e => e.mapX !== undefined && e.mapY !== undefined));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // حساب "مركز المدينة" أو المنطقة الأكثر كثافة (محاكاة الزوم التلقائي)
  const mapStyle = useMemo(() => {
    if (events.length === 0) return { scale: 1, x: 0, y: 0 };
    
    // حساب متوسط الإحداثيات لعمل التركيز (Focus)
    const avgX = events.reduce((sum, e) => sum + e.mapX, 0) / events.length;
    const avgY = events.reduce((sum, e) => sum + e.mapY, 0) / events.length;
    
    return {
      transform: `scale(1.2) translate(${(50 - avgX) * 0.5}%, ${(50 - avgY) * 0.5}%)`,
      transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  }, [events]);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4" dir="ltr">
      {/* رأس الصفحة مع عداد الأحداث */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tighter italic">EXPLORE</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Live Event Tracking</p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/add-event')}
          className="bg-stone-900 text-white p-4 rounded-3xl shadow-xl active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* منطقة الخريطة الزجاجية */}
      <div className="flex-1 bg-stone-200 rounded-[3.5rem] overflow-hidden relative border-[6px] border-white shadow-2xl">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80 backdrop-blur-md z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-stone-900" size={40} />
              <span className="text-[10px] font-black tracking-[0.2em] text-stone-400 uppercase">Synchronizing...</span>
            </div>
          </div>
        ) : (
          <div className="h-full w-full relative bg-[#E5E7EB] overflow-hidden">
            {/* طبقة الخريطة الأساسية مع تأثير الزوم التلقائي */}
            <div 
              className="absolute inset-0 w-[200%] h-[200%] -left-1/2 -top-1/2"
              style={mapStyle}
            >
              <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '30px 30px'}} />
              
              {/* رسم الأحداث كـ Pins */}
              {events.map((event) => (
                <div
                  key={event.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ top: `${event.mapY}%`, left: `${event.mapX}%` }}
                >
                  {/* الدبوس التفاعلي */}
                  <button
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="relative flex flex-col items-center group active:scale-75 transition-transform"
                  >
                    <div className="bg-stone-900 text-white p-3 rounded-2xl shadow-2xl group-hover:bg-rose-600 group-hover:-translate-y-2 transition-all duration-300">
                      <MapPin size={22} fill={event.category === 'urgent' ? '#f43f5e' : 'none'} />
                    </div>
                    
                    {/* ملصق اسم الحدث (يظهر عند الحوم أو الزووم) */}
                    <div className="mt-2 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-white opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] font-black text-stone-900 whitespace-nowrap uppercase tracking-tighter">
                        {event.title}
                      </p>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            {/* زر "إعادة الضبط" الموضعي */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-2">
              <button 
                onClick={() => window.location.reload()}
                className="p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg text-stone-900 border border-white active:scale-95"
              >
                <Navigation size={20} />
              </button>
            </div>

            {/* بطاقة إحصائيات سفلية */}
            <div className="absolute bottom-8 left-8 bg-stone-900/90 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                <Info size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em]">Active Markers</p>
                <p className="text-xl font-black text-white">{events.length} Events Found</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapsPage;
