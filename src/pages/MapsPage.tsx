import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

const MapsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // جلب الأحداث التي تحتوي على إحداثيات (lat, lng)
    const q = query(collection(db, "events"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data.filter(e => e.lat && e.lng)); // فلترة الأحداث التي لها موقع فقط
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4 font-sans" dir="ltr">
      <div className="flex justify-between items-end px-2">
        <div>
          <h1 className="text-3xl font-black text-stone-900 italic tracking-tighter">MAPS</h1>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Auto-syncing events</p>
        </div>
        <div className="bg-stone-900 text-white px-4 py-2 rounded-2xl text-xs font-black">
          {events.length} PINS
        </div>
      </div>

      <div className="flex-1 bg-stone-100 rounded-[3rem] overflow-hidden relative border-4 border-white shadow-2xl">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50/50 backdrop-blur-sm">
            <Loader2 className="animate-spin text-stone-300" size={40} />
          </div>
        ) : (
          <div className="h-full w-full relative bg-[#e5e7eb]">
            {/* واجهة الخريطة التقنية */}
            <div className="absolute inset-0 opacity-40 grayscale" style={{backgroundImage: 'radial-gradient(#9ca3af 0.5px, transparent 0.5px)', backgroundSize: '20px 20px'}} />
            
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate(`/event/${event.id}`)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all active:scale-75 group"
                style={{ top: `${event.mapY || 50}%`, left: `${event.mapX || 50}%` }}
              >
                <div className="bg-stone-900 text-white p-3 rounded-2xl shadow-2xl group-hover:bg-rose-500 transition-colors">
                  <MapPin size={20} />
                </div>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg border border-stone-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                   <p className="text-[10px] font-black text-stone-900">{event.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button className="w-full py-5 bg-white border border-stone-100 rounded-[2rem] font-black text-stone-900 shadow-sm flex items-center justify-center gap-2">
        <Navigation size={18} />
        REFOCUS TO CLUSTER
      </button>
    </div>
  );
};

export default MapsPage;
