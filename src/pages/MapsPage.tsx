import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { MapPin, Navigation, Loader2, Info, Plus } from 'lucide-react';

// استيراد مكتبة الخرائط
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إصلاح مشكلة الأيقونات الافتراضية في Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// مكون التحكم في الزوم التلقائي (AutoZoom)
const MapAutoZoom = ({ events }: { events: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (events.length > 0) {
      const bounds = L.latLngBounds(events.map(e => [e.lat, e.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [events, map]);
  return null;
};

const MapsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // جلب البيانات حية من Firestore
    const q = query(collection(db, "events"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as any[];
      
      // التأكد من وجود إحداثيات صالحة قبل العرض
      const validEvents = data.filter(e => 
        typeof e.lat === 'number' && typeof e.lng === 'number'
      );
      
      setEvents(validEvents);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4 font-sans" dir="ltr">
      {/* Header القسم العلوي */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-stone-900 italic tracking-tighter uppercase">Maps</h1>
          <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em]">Live Pins Explorer</p>
        </div>
        <button 
          onClick={() => navigate('/add-event')}
          className="bg-stone-900 text-white p-4 rounded-[1.5rem] shadow-xl active:scale-95 transition-all hover:bg-stone-800"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* حاوية الخريطة */}
      <div className="flex-1 rounded-[3rem] overflow-hidden relative border-[6px] border-white shadow-2xl bg-stone-100 z-0">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/60 backdrop-blur-md">
            <Loader2 className="animate-spin text-stone-900 mb-2" size={32} />
            <span className="text-[10px] font-black text-stone-400 tracking-widest uppercase">Fetching Locations...</span>
          </div>
        ) : (
          <MapContainer 
            center={[24.7136, 46.6753]} 
            zoom={6} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            {/* شكل الخريطة (خفيف وأنيق ليتناسب مع التصميم) */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap'
            />
            
            {/* تفعيل الزوم التلقائي */}
            <MapAutoZoom events={events} />

            {events.map((event) => (
              <Marker 
                key={event.id} 
                position={[event.lat, event.lng]}
                eventHandlers={{
                  click: () => {
                    // يمكنك تفعيل الانتقال عند النقر على الدبوس
                    // navigate(`/event/${event.id}`);
                  },
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1">
                    <h3 className="font-black text-stone-900 m-0">{event.title}</h3>
                    <p className="text-[10px] text-stone-400 font-bold m-0 uppercase tracking-tighter">{event.date}</p>
                    <button 
                      onClick={() => navigate(`/event/${event.id}`)}
                      className="mt-2 text-[10px] font-black text-rose-500 uppercase underline"
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* كارت المعلومات العائم */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-stone-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4 pointer-events-none">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white">
            <Info size={18} />
          </div>
          <div>
            <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Database</p>
            <p className="text-lg font-black text-white leading-none">{events.length} Pins Found</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapsPage;
