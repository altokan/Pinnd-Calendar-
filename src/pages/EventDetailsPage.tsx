import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ChevronLeft, Calendar, MapPin, Clock, AlignLeft, Loader2 } from 'lucide-react';

const EventDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      const docRef = doc(db, "events", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEvent(docSnap.data());
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-stone-300" size={40} />
    </div>
  );

  if (!event) return (
    <div className="p-10 text-center">
      <p className="text-stone-400">Event not found</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-stone-900 font-bold underline">Go Back</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-stone-100">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-stone-900">Event Details</h1>
      </div>

      {/* Hero Image / Placeholder */}
      <div className="w-full h-48 bg-stone-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-lg">
        <img 
          src={event.image || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"} 
          className="w-full h-full object-cover" 
          alt="Event" 
        />
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-50 space-y-6">
        <h2 className="text-3xl font-black text-stone-900">{event.title}</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-4 text-stone-500">
            <div className="p-3 bg-stone-50 rounded-2xl text-stone-900"><Calendar size={20}/></div>
            <span className="font-bold">{event.date}</span>
          </div>
          <div className="flex items-center gap-4 text-stone-500">
            <div className="p-3 bg-stone-50 rounded-2xl text-stone-900"><MapPin size={20}/></div>
            <span className="font-bold">{event.locationName || "Location marked on map"}</span>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-100">
          <div className="flex items-center gap-2 mb-3 text-stone-400">
            <AlignLeft size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Description</span>
          </div>
          <p className="text-stone-600 leading-relaxed font-medium">
            {event.description || "No additional details provided for this event."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;
