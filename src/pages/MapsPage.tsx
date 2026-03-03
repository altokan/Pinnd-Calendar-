import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { ChevronLeft, Navigation, Loader2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export default function MapPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([24.7136, 46.6753]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid || "guest";

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", userId), (d) => {
      if (d.exists()) {
        const all = d.data().events || [];
        const geoEvents = all.filter((e: any) => e.lat && e.lng);
        setEvents(geoEvents);

        // منطق تحديد "أكثر مكان فيه مواعيد"
        if (geoEvents.length > 0) {
          const avgLat = geoEvents.reduce((acc: any, curr: any) => acc + curr.lat, 0) / geoEvents.length;
          const avgLng = geoEvents.reduce((acc: any, curr: any) => acc + curr.lng, 0) / geoEvents.length;
          setMapCenter([avgLat, avgLng]);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="fixed inset-0 flex flex-col">
      <div className="bg-white p-6 z-[1000] border-b flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="p-3 bg-stone-100 rounded-xl"><ChevronLeft/></button>
        <h1 className="font-black text-xl">Hotspots Map</h1>
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Navigation size={20}/></div>
      </div>

      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={12} style={{height:'100%', width:'100%'}}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {events.map(event => (
            <Marker key={event.id} position={[event.lat, event.lng]}>
              <Popup>
                <div className="p-1">
                  {event.image && <img src={event.image} className="w-full h-20 object-cover rounded-lg mb-2" />}
                  <h4 className="font-bold">{event.title}</h4>
                  <p className="text-xs text-stone-500">{event.location}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          <MapController center={mapCenter} />
        </MapContainer>
      </div>
    </div>
  );
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 12, { duration: 2 }); }, [center]);
  return null;
}
