import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Calendar, AlignLeft, Loader2, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إصلاح مشكلة أيقونات Leaflet الافتراضية في React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid || "guest";

  // جلب الأحداث التي تحتوي على مواقع فقط
  useEffect(() => {
    const eventDocRef = doc(db, "events", userId);
    const unsub = onSnapshot(eventDocRef, (d) => {
      if (d.exists()) {
        const allEvents = d.data().events || [];
        // نفترض هنا أننا نحتاج لإحداثيات. في حال كان العنوان نصي فقط، 
        // سنحتاج لعملية Geocoding، لكن حالياً سنعرض المواقع التي تحتوي إحداثيات افتراضية أو مسجلة
        setEvents(allEvents.filter((e: any) => e.location)); 
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  if (loading) return (
    <div className="fixed inset-0 bg-stone-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-stone-400" size={40} />
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-stone-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 px-6 py-5 z-[1000] sticky top-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 bg-stone-100 rounded-2xl active:scale-90 transition-all"
          >
            <ChevronLeft size={24} className="text-stone-600" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black text-stone-800 tracking-tight">Idea Map</h1>
            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">Geo-tagged Notes</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Navigation size={20} />
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative z-10">
        <MapContainer 
          center={[24.7136, 46.6753]} // إحداثيات افتراضية (الرياض مثلاً)
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {events.map((event) => (
            // ملاحظة: هنا نفترض وجود lat و lng، إذا لم توجد سنقوم بوضعها بشكل عشوائي للتجربة حالياً
            <Marker 
                key={event.id} 
                position={[
                    event.lat || 24.7136 + (Math.random() - 0.5) * 0.1, 
                    event.lng || 46.6753 + (Math.random() - 0.5) * 0.1
                ]}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[200px]">
                  {event.image && (
                    <img src={event.image} alt="" className="w-full h-24 object-cover rounded-xl mb-3" />
                  )}
                  <h3 className="font-bold text-stone-800 text-lg mb-1">{event.title}</h3>
                  
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-stone-500 text-sm">
                      <Calendar size={14} className="text-blue-500" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2 text-stone-500 text-sm">
                      <MapPin size={14} className="text-red-500" />
                      {event.location}
                    </div>
                    {event.extraNote && (
                      <div className="flex items-start gap-2 text-stone-500 text-sm bg-stone-50 p-2 rounded-lg">
                        <AlignLeft size={14} className="mt-1" />
                        <span className="italic">"{event.extraNote}"</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Floating Card for List View toggle (Optional) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xs">
        <div className="bg-stone-900/90 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl border border-white/10 flex items-center justify-between px-6 text-white">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Tracked Locations</span>
            <span className="text-lg font-black">{events.length} Points</span>
          </div>
          <button 
            onClick={() => navigate('/calendar')}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
          >
            <Calendar size={20} />
          </button>
        </div>
      </div>

      <style>{`
        .leaflet-container {
            background: #f5f5f4 !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 1.5rem !important;
            padding: 8px !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
        }
        .custom-popup .leaflet-popup-tip {
            background: white !important;
        }
      `}</style>
    </div>
  );
}
