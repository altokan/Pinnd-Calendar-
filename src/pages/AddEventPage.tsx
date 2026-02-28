import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ChevronLeft, MapPin, Calendar, Type, Save, Loader2, Info } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';

// إعداد أيقونة الدبوس للخريطة
const pinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const AddEventPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // حالة النموذج (إحداثيات افتراضية للرياض كمثال)
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    description: '',
    lat: 24.7136,
    lng: 46.6753
  });

  // مكون داخلي لالتقاط النقرة على الخريطة
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setFormData({ ...formData, lat: e.latlng.lat, lng: e.latlng.lng });
        toast.success("Location Selected!", { icon: '📍', duration: 1000 });
      },
    });
    return <Marker position={[formData.lat, formData.lng]} icon={pinIcon} />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      toast.error("Please fill in the title and date");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "events"), {
        ...formData,
        createdAt: new Date()
      });
      toast.success("Event Published Successfully!");
      navigate('/maps');
    } catch (error) {
      console.error(error);
      toast.error("Error saving to database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-32 space-y-6 px-4" dir="ltr">
      {/* الرأس */}
      <div className="flex items-center gap-4 py-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">Create Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 font-sans">
        {/* قسم المعلومات الأساسية */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-50 space-y-4">
          <div className="flex items-center gap-2 text-stone-400 mb-2">
            <Type size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">General Info</span>
          </div>
          <input 
            type="text" 
            placeholder="What is the event name?"
            className="w-full text-xl font-bold border-none focus:ring-0 p-0 placeholder:text-stone-200"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
          <input 
            type="date" 
            className="w-full bg-stone-50 border-none rounded-2xl p-4 font-bold text-stone-600 focus:ring-2 focus:ring-stone-900 transition-all cursor-pointer"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
          />
        </div>

        {/* قسم الخريطة التفاعلية */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-50 space-y-4">
          <div className="flex items-center gap-2 text-stone-400 mb-2">
            <MapPin size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Pin Location (Click on Map)</span>
          </div>
          
          <div className="w-full h-64 rounded-3xl overflow-hidden border-4 border-stone-50 relative z-0">
            <MapContainer 
              center={[formData.lat, formData.lng]} 
              zoom={5} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              <LocationMarker />
            </MapContainer>
          </div>
          
          <div className="flex gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-100">
             <div className="flex-1">
               <p className="text-[9px] font-black text-stone-400 uppercase">Latitude</p>
               <p className="text-xs font-bold text-stone-900 tracking-tight">{formData.lat.toFixed(4)}</p>
             </div>
             <div className="flex-1">
               <p className="text-[9px] font-black text-stone-400 uppercase">Longitude</p>
               <p className="text-xs font-bold text-stone-900 tracking-tight">{formData.lng.toFixed(4)}</p>
             </div>
          </div>
        </div>

        {/* زر الحفظ */}
        <button 
          disabled={loading}
          className="w-full bg-stone-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          {loading ? 'Processing...' : 'Post to Map'}
        </button>
      </form>
    </div>
  );
};

export default AddEventPage;
