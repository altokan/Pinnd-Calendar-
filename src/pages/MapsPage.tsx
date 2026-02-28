import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Loader2, MapPin, Info } from 'lucide-react';

const MapsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // جلب الأحداث من التقويم
    const q = query(collection(db, "events"));
    const unsub = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // دالة بسيطة لمحاكاة الانتقال لصفحة الحدث
  const goToEvent = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4 font-sans">
      <div className="px-2">
        <h1 className="text-2xl font-black text-stone-900">Events Map</h1>
        <p className="text-stone-400 text-sm font-medium">Automatic zoom to active cities</p>
      </div>

      {/* منطقة الخريطة الذكية */}
      <div className="flex-1 bg-stone-200 rounded-[2.5rem] overflow-hidden relative border-4 border-white shadow-xl">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
            <Loader2 className="animate-spin text-stone-300" size={40} />
          </div>
        ) : (
          <div className="h-full w-full relative">
            {/* واجهة الخريطة التفاعلية */}
            <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/basic-v2/static/0/0/0.png')] bg-cover opacity-30 grayscale" />
            
            {/* توزيع النقاط (Pins) برمجياً */}
            {events.map((event, index) => (
              <button
                key={event.id}
                onClick={() => goToEvent(event.id)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 p-2 bg-stone-900 text-white rounded-full shadow-2xl hover:scale-125 transition-transform"
                style={{ 
                  // هذه الحسابات ستكون حقيقية عند ربط Leaflet بالكامل
                  top: `${30 + (index * 15)}%`, 
                  left: `${40 + (index * 10)}%` 
                }}
              >
                <MapPin size={20} />
              </button>
            ))}

            {/* بطاقة معلومات سريعة */}
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-stone-900 p-2 rounded-xl text-white">
                  <Info size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-stone-400">Total Events</p>
                  <p className="text-lg font-black text-stone-900">{events.length} Locations</p>
                </div>
              </div>
              <button className="bg-stone-100 text-stone-900 px-4 py-2 rounded-xl font-bold text-xs">
                Filter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapsPage;
