import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Loader2, Info, Plus, Clock, MapPin, X, Calendar, FileText, Camera, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد مكتبة الخرائط
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إعداد الأيقونة الافتراضية
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [28, 45],
  iconAnchor: [14, 45],
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapAutoZoom = ({ events }: { events: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (events.length > 0) {
      const bounds = L.latLngBounds(events.map(e => [e.lat, e.lng]));
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 1.5 });
    }
  }, [events, map]);
  return null;
};

const MapsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<any[] | null>(null); // قائمة الأحداث في الموقع المختار
  const [selectedEvent, setSelectedEvent] = useState<any>(null); // تفاصيل الحدث الواحد
  const navigate = useNavigate();

  useEffect(() => {
    const qEvents = query(collection(db, "events"));
    const qPins = query(collection(db, "pins"));

    const processData = (snapshot: any, source: string) => 
      snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source }));

    let allData: any[] = [];
    const updateState = (newData: any[], type: string) => {
      allData = type === 'events' 
        ? [...newData, ...allData.filter(d => d.source === 'pin')]
        : [...newData, ...allData.filter(d => d.source === 'event')];
      
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
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4 relative overflow-hidden font-sans bg-stone-50" dir="ltr">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-4">
        <div>
          <h1 className="text-4xl font-black text-stone-900 italic tracking-tighter">MAPS</h1>
          <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.3em]">Lifestyle Location Tracker</p>
        </div>
        <button onClick={() => navigate('/add-event')} className="bg-stone-900 text-white p-5 rounded-[2rem] shadow-2xl hover:scale-105 transition-transform">
          <Plus size={24} />
        </button>
      </div>

      {/* Map Surface */}
      <div className="flex-1 m-4 rounded-[3.5rem] overflow-hidden relative border-[8px] border-white shadow-2xl bg-white z-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-white/80 backdrop-blur-md">
            <Loader2 className="animate-spin text-stone-900" size={40} />
          </div>
        ) : (
          <MapContainer center={[24.7136, 46.6753]} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <MapAutoZoom events={events} />
            {groupedEvents.map((group: any, idx) => (
              <Marker key={idx} position={[group[0].lat, group[0].lng]} eventHandlers={{ click: () => setActiveGroup(group) }} />
            ))}
          </MapContainer>
        )}
      </div>

      {/* 1. قائمة الأحداث - تظهر في منتصف الصفحة (Image 1 Style) */}
      <AnimatePresence>
        {activeGroup && !selectedEvent && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[3rem] shadow-3xl border-4 border-white overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <span className="text-[11px] font-black text-stone-900 uppercase tracking-widest">Select Event ({activeGroup.length})</span>
                <button onClick={() => setActiveGroup(null)} className="p-2 hover:bg-stone-200 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {activeGroup.map((e) => (
                  <button key={e.id} onClick={() => setSelectedEvent(e)}
                    className="w-full flex items-center justify-between p-5 bg-stone-50 hover:bg-stone-900 hover:text-white rounded-[2rem] transition-all group"
                  >
                    <div className="text-left">
                      <h4 className="font-black text-sm uppercase italic">{e.title}</h4>
                      <p className="text-[10px] font-bold opacity-60 tracking-tight">{e.time} • {e.date}</p>
                    </div>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. تفاصيل الحدث الكاملة - ديناميكية وكبيرة (Image 2 Style) */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xl">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[4rem] shadow-4xl border-[6px] border-white overflow-hidden relative"
            >
              {/* Image Section */}
              <div className="h-64 md:h-80 relative bg-stone-100">
                {selectedEvent.imageUrl ? (
                  <img src={selectedEvent.imageUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-200 bg-stone-50"><Camera size={60} strokeWidth={1}/></div>
                )}
                <button onClick={() => setSelectedEvent(null)} className="absolute top-8 right-8 p-3 bg-white/20 backdrop-blur-xl text-white rounded-full hover:bg-white hover:text-stone-900 transition-all border border-white/30"><X size={24} /></button>
              </div>

              {/* Content Section */}
              <div className="p-8 md:p-12 -mt-10 bg-white rounded-t-[4rem] relative z-10 space-y-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-stone-400 font-black text-[10px] uppercase tracking-[0.3em]">
                    <Calendar size={14}/> {selectedEvent.date} <span className="mx-2 opacity-30">|</span> <Clock size={14}/> {selectedEvent.time}
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-stone-900 italic tracking-tighter leading-none uppercase">{selectedEvent.title}</h2>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-start gap-4 p-6 bg-stone-50 rounded-[2.5rem] border border-stone-100">
                    <MapPin className="text-blue-500 shrink-0 mt-1" size={24} />
                    <div>
                      <span className="text-[9px] font-black text-stone-300 uppercase block mb-1">Location</span>
                      <p className="text-sm font-bold text-stone-700 leading-relaxed">{selectedEvent.location || "Location not specified"}</p>
                    </div>
                  </div>

                  {selectedEvent.notes && (
                    <div className="flex items-start gap-4 p-6 bg-stone-50 rounded-[2.5rem] border border-stone-100">
                      <FileText className="text-amber-500 shrink-0 mt-1" size={24} />
                      <div>
                        <span className="text-[9px] font-black text-stone-300 uppercase block mb-1">Details & Notes</span>
                        <p className="text-sm text-stone-600 italic leading-relaxed font-medium">{selectedEvent.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <button 
                    onClick={() => navigate(`/?date=${selectedEvent.date}&openEvent=${selectedEvent.id}`)}
                    className="flex-1 py-6 bg-stone-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    GO TO EVENT <ArrowRight size={18}/>
                  </button>
                  <button onClick={() => setSelectedEvent(null)}
                    className="flex-1 py-6 bg-stone-100 text-stone-900 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-stone-200 transition-all"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Info */}
      <div className="absolute bottom-10 left-10 z-[500] bg-stone-900/90 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-white/20 shadow-4xl flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white"><Info size={22} /></div>
        <div>
          <p className="text-[9px] font-black text-stone-500 uppercase tracking-widest leading-none mb-1">EXPLORING</p>
          <p className="text-xl font-black text-white leading-none">{events.length} ACTIVE PINS</p>
        </div>
      </div>
    </div>
  );
};

export default MapsPage;
