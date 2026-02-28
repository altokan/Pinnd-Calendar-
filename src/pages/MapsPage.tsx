import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Loader2, Info, Plus } from 'lucide-react';

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

// مكون التحكم في الزوم الذكي (Smart Zoom)
const MapAutoZoom = ({ events }: { events: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (events.length > 0) {
      const avgLat = events.reduce((sum, e) => sum + e.lat, 0) / events.length;
      const avgLng = events.reduce((sum, e) => sum + e.lng, 0) / events.length;
      const bounds = L.latLngBounds(events.map(e => [e.lat, e.lng]));

      map.flyTo([avgLat, avgLng], 10, { animate: true, duration: 2 });
      const timer = setTimeout(() => {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }, 2100);

      return () => clearTimeout(timer);
    }
  }, [events, map]);
  return null;
};

const MapsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const qEvents = query(collection(db, "events"));
    const qPins = query(collection(db, "pins"));

    const processData = (snapshot: any, source: string) => {
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        source 
      }));
    };

    let allData: any[] = [];
    const updateState = (newData: any[], type: string) => {
      if (type === 'events') {
        allData = [...newData, ...allData.filter(d => d.source === 'pin')];
      } else {
        allData = [...newData, ...allData.filter(d => d.source === 'event')];
      }
      const validEvents = allData.filter(e => 
        typeof e.lat === 'number' && typeof e.lng === 'number'
      );
      setEvents(validEvents);
      setLoading(false);
    };

    const unsubEvents = onSnapshot(qEvents, (snap) => updateState(processData(snap, 'event'), 'events'));
    const unsubPins = onSnapshot(qPins, (snap) => updateState(processData(snap, 'pin'), 'pins'));

    return () => { unsubEvents(); unsubPins(); };
  }, []);

  // تجميع الأحداث التي لها نفس الإحداثيات بالضبط
  const groupedEvents = Object.values(
    events.reduce((acc: any, event) => {
      const key = `${event.lat}-${event.lng}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {})
  );

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4 font-sans" dir="ltr">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-stone-900 italic tracking-tighter uppercase">Maps</h1>
          <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em]">Smart Event Tracker</p>
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
          </div>
        ) : (
          <MapContainer 
            center={[24.7136, 46.6753]} 
            zoom={6} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            
            <MapAutoZoom events={events} />

            {groupedEvents.map((group: any, idx) => {
              const firstEvent = group[0];
              const isMultiple = group.length > 1;

              return (
                <Marker key={idx} position={[firstEvent.lat, firstEvent.lng]}>
                  <Popup className="custom-popup">
                    <div className="p-1 text-center min-w-[160px]">
                      {isMultiple && (
                        <div className="mb-2 border-b border-stone-100 pb-1">
                          <span className="text-[8px] font-black text-amber-600 uppercase">
                            {group.length} Events here
                          </span>
                        </div>
                      )}

                      <div className="space-y-4 max-h-[200px] overflow-y-auto no-scrollbar">
                        {group.map((e: any) => (
                          <div key={e.id} className="flex flex-col items-center">
                            <h3 className="font-black text-stone-900 m-0 text-sm leading-tight">{e.title}</h3>
                            <p className="text-[9px] text-stone-400 font-bold uppercase mt-0.5">{e.date}</p>
                            <button 
                              onClick={() => navigate(`/?date=${e.date}&openEvent=${e.id}`)}
                              className="mt-2 px-4 py-1.5 bg-stone-900 text-white text-[10px] font-black rounded-lg uppercase w-full"
                            >
                              Open in Calendar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* كارت المعلومات العائم */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-stone-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white">
            <Info size={18} />
          </div>
          <div>
            <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Database</p>
            <p className="text-lg font-black text-white leading-none">{events.length} Active Pins</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapsPage;
