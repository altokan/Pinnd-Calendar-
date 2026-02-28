import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { MapPin, Navigation, Loader2, Info, Plus } from 'lucide-react';
// استيراد مكونات الخريطة الحقيقية
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إصلاح مشكلة اختفاء أيقونات الخريطة الافتراضية
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// مكون إضافي لجعل الخريطة تتحرك تلقائياً للأحداث
const MapAutoZoom = ({ events }: { events: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (events.length > 0) {
      const bounds = L.latLngBounds(events.map(e => [e.lat, e.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [events, map]);
  return null;
};

const MapsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "events"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // نفلتر الأحداث التي لديها إحداثيات حقيقية (lat, lng)
      setEvents(data.filter(e => e.lat && e.lng));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4" dir="ltr">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-stone-900 italic tracking-tighter">EXPLORE</h1>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Real-time Map View</p>
        </div>
        <button 
          onClick={() => navigate('/add-event')}
          className="bg-stone-900 text-white p-4 rounded-3xl shadow-xl active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* منطقة الخريطة الحقيقية */}
      <div className="flex-1 rounded-[3.5rem] overflow-hidden relative border-[6px] border-white shadow-2xl bg-stone-100">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/50 backdrop-blur-md">
            <Loader2 className="animate-spin text-stone-900" size={40} />
          </div>
        ) : (
          <MapContainer 
            center={[24.7136, 46.6753]} // مركز افتراضي (الرياض كمثال)
            zoom={5} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            {/* مزود الخريطة (شكل الخريطة) */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap'
            />
            
            <MapAutoZoom events={events} />

            {events.map((event) => (
              <Marker 
                key={event.id} 
                position={[event.lat, event.lng]}
                eventHandlers={{
                  click: () => navigate(`/event/${event.id}`),
                }}
              >
                <Popup>
                  <div className="font-sans p-1">
                    <p className="font-black text-stone-900">{event.title}</p>
                    <p className="text-xs text-stone-500">{event.date}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* بطاقة الإحصائيات العائمة */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-stone-900/90 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white">
            <Info size={18} />
          </div>
          <div>
            <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Active Pins</p>
            <p className="text-lg font-black text-white">{events.length} Events</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapsPage;
