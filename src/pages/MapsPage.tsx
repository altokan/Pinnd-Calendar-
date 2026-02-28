import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Loader2, Info, Plus, Clock, MapPin, X, Calendar, FileText, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد مكتبة الخرائط
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إصلاح الأيقونات
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// مكون الزوم الذكي
const MapAutoZoom = ({ events }: { events: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (events.length > 0) {
      const bounds = L.latLngBounds(events.map(e => [e.lat, e.lng]));
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true, duration: 1.5 });
    }
  }, [events, map]);
  return null;
};

const MapsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null); // الحدث المختار لعرض تفاصيله
  const navigate = useNavigate();

  useEffect(() => {
    const qEvents = query(collection(db, "events"));
    const qPins = query(collection(db, "pins"));

    const processData = (snapshot: any, source: string) => {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source }));
    };

    let allData: any[] = [];
    const updateState = (newData: any[], type: string) => {
      if (type === 'events') {
        allData = [...newData, ...allData.filter(d => d.source === 'pin')];
      } else {
        allData = [...newData, ...allData.filter(d => d.source === 'event')];
      }
      setEvents(allData.filter(e => typeof e.lat === 'number' && typeof e.lng === 'number'));
      setLoading(false);
    };

    const unsubEvents = onSnapshot(qEvents, (snap) => updateState(processData(snap, 'event'), 'events'));
    const unsubPins = onSnapshot(qPins, (snap) => updateState(processData(snap, 'pin'), 'pins'));

    return () => { unsubEvents(); unsubPins(); };
  }, []);

  const groupedEvents = Object.values(
    events.reduce((acc: any, event) => {
      const key = `${event.lat}-${event.lng}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {})
  );

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4 font-sans relative" dir="ltr">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-stone-900 italic tracking-tighter uppercase">Maps</h1>
          <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em]">Smart Event Tracker</p>
        </div>
        <button 
          onClick={() => navigate('/add-event')}
          className="bg-stone-900 text-white p-4 rounded-[1.5rem] shadow-xl hover:scale-105 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Map Container */}
      <div className="flex-1 rounded-[3rem] overflow-hidden relative border-[6px] border-white shadow-2xl bg-stone-100 z-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/60 backdrop-blur-md">
            <Loader2 className="animate-spin text-stone-900" size={32} />
          </div>
        ) : (
          <MapContainer center={[24.7136, 46.6753]} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <MapAutoZoom events={events} />
            
            {groupedEvents.map((group: any, idx) => {
              const first = group[0];
              return (
                <Marker key={idx} position={[first.lat, first.lng]}>
                  <Popup className="custom-popup">
                    <div className="p-1 text-center min-w-[180px]">
                      <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-2 block">Events at this location</span>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar py-1">
                        {group.map((e: any) => (
                          <button 
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            className="w-full text-left p-2 rounded-xl border border-stone-50 hover:bg-stone-50 transition-all group flex items-center justify-between"
                          >
                            <div className="overflow-hidden">
                              <h4 className="font-black text-stone-900 text-xs truncate m-0">{e.title}</h4>
                              <p className="text-[8px] text-stone-400 font-bold m-0 uppercase">{e.time}</p>
                            </div>
                            <div className="w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              →
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* عرض تفاصيل الحدث بالكامل (Full Detail Modal) */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[2000] flex items-end justify-center p-4 bg-stone-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-3xl border-4 border-white"
            >
              {/* صورة الحدث */}
              <div className="h-48 relative bg-stone-100">
                {selectedEvent.imageUrl ? (
                  <img src={selectedEvent.imageUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-200">
                    <Camera size={40} />
                  </div>
                )}
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* محتوى التفاصيل */}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-stone-900 italic leading-tight">{selectedEvent.title}</h2>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-stone-400">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase">{selectedEvent.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-400">
                      <Clock size={14} />
                      <span className="text-[10px] font-bold uppercase">{selectedEvent.time}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <MapPin className="text-stone-400 shrink-0" size={18} />
                    <p className="text-xs font-bold text-stone-700 leading-snug">
                      {selectedEvent.location || "No location address provided"}
                    </p>
                  </div>

                  {selectedEvent.notes && (
                    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                      <FileText className="text-stone-400 shrink-0" size={18} />
                      <p className="text-xs text-stone-600 italic leading-relaxed">
                        {selectedEvent.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                   <button 
                    onClick={() => navigate(`/?date=${selectedEvent.date}&openEvent=${selectedEvent.id}`)}
                    className="flex-1 py-4 bg-stone-900 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Calendar View
                  </button>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 py-4 bg-stone-100 text-stone-900 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-stone-200 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* كارت إحصائي */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-stone-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4">
        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white"><Info size={18} /></div>
        <div>
          <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Database</p>
          <p className="text-lg font-black text-white leading-none">{events.length} Active Pins</p>
        </div>
      </div>
    </div>
  );
};

export default MapsPage;
