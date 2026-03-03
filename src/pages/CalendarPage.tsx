import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Calendar as CalendarIcon, Clock, Trash2, Loader2, Plus, MapPin, AlignLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayRemove } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

/* دالة مساعدة للتنسيق */
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid || "guest";
  const eventDocRef = doc(db, "events", userId);

  // جلب الأحداث وترتيبها زمنياً
  useEffect(() => {
    const unsub = onSnapshot(eventDocRef, (d) => {
      if (d.exists()) {
        const sortedEvents = (d.data().events || []).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setEvents(sortedEvents);
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  const deleteEvent = async (event: any) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await updateDoc(eventDocRef, {
        events: arrayRemove(event)
      });
      toast.success('Event deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-stone-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-stone-400" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-stone-200 px-6 py-8 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 bg-stone-100 rounded-2xl active:scale-90 transition-all"
          >
            <ChevronLeft size={24} className="text-stone-600" />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black text-stone-800 tracking-tight">Timeline</h1>
            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-[0.2em]">Scheduled Ideas</p>
          </div>
          <button 
            onClick={() => navigate('/map')}
            className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 active:scale-90 transition-all"
          >
            <MapPin size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-10">
        {events.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CalendarIcon size={32} className="text-stone-400" />
            </div>
            <h2 className="text-xl font-bold text-stone-600">Your schedule is empty</h2>
            <p className="text-stone-400 text-sm mt-2 max-w-[200px] mx-auto leading-relaxed">
              Pin notes or images to the board and schedule them to see them here.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8 relative">
            {/* خط زمني جانبي (Timeline line) */}
            <div className="absolute left-8 top-2 bottom-2 w-0.5 bg-stone-200 -z-10" />

            <AnimatePresence>
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-6 group"
                >
                  {/* Date Circle */}
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-white border-4 border-stone-50 rounded-full shadow-lg flex flex-col items-center justify-center z-10 group-hover:border-blue-100 transition-colors">
                      <span className="text-[10px] font-black text-blue-500 uppercase">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-xl font-black text-stone-800 leading-none">
                        {new Date(event.date).getDate()}
                      </span>
                    </div>
                  </div>

                  {/* Event Card */}
                  <div className="flex-1 bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 relative overflow-hidden transition-all hover:shadow-xl hover:shadow-stone-200/50">
                    
                    {/* إذا كان الحدث صورة، نعرضها في الأعلى */}
                    {event.image && (
                      <div className="mb-4 -mx-6 -mt-6 h-40 overflow-hidden">
                        <img src={event.image} className="w-full h-full object-cover" alt="" />
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-stone-800 text-lg leading-snug pr-8">
                        {event.title}
                      </h3>
                      <button 
                        onClick={() => deleteEvent(event)}
                        className="absolute top-6 right-6 p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Location Display */}
                      {event.location && (
                        <div className="flex items-center gap-2 text-stone-500 text-sm bg-stone-50 py-2 px-3 rounded-xl w-fit">
                          <MapPin size={14} className="text-red-400" />
                          <span className="font-medium">{event.location}</span>
                        </div>
                      )}

                      {/* Description Display */}
                      {event.extraNote && (
                        <div className="flex items-start gap-2 text-stone-400 text-sm italic py-2">
                          <AlignLeft size={14} className="mt-1 flex-shrink-0" />
                          <p>{event.extraNote}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-stone-300 text-[10px] font-bold uppercase tracking-widest pt-2">
                        <Clock size={12} />
                        Scheduled at {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-6">
        <button 
          onClick={() => navigate('/board')}
          className="w-full flex items-center justify-center gap-3 py-5 bg-stone-900 text-white rounded-[2rem] font-bold shadow-2xl shadow-black/30 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Add New Idea</span>
        </button>
      </div>
    </div>
  );
}
