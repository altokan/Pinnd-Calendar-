import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Calendar as CalendarIcon, Clock, Trash2, 
  Loader2, Plus, MapPin, AlignLeft, List, Grid 
} from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline'); // حالة اختيار العرض
  const userId = auth.currentUser?.uid || "guest";
  const eventDocRef = doc(db, "events", userId);

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
    if (!window.confirm("Delete this event?")) return;
    try {
      await updateDoc(eventDocRef, { events: arrayRemove(event) });
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
      <div className="bg-white/80 backdrop-blur-lg border-b border-stone-200 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-3 bg-stone-100 rounded-2xl active:scale-90 transition-all">
            <ChevronLeft size={24} />
          </button>

          {/* تبديل طريقة العرض */}
          <div className="flex bg-stone-100 p-1 rounded-2xl">
            <button 
              onClick={() => setViewMode('timeline')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                viewMode === 'timeline' ? "bg-white shadow-sm text-blue-600" : "text-stone-400"
              )}
            >
              <List size={18} />
              <span>Timeline</span>
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-stone-400"
              )}
            >
              <Grid size={18} />
              <span>Calendar</span>
            </button>
          </div>

          <button onClick={() => navigate('/map')} className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90">
            <MapPin size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-10">
        {events.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p>No events found</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'timeline' ? (
              /* عرض التايم لاين */
              <motion.div 
                key="timeline"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="space-y-8 relative max-w-2xl mx-auto"
              >
                <div className="absolute left-8 top-2 bottom-2 w-0.5 bg-stone-200 -z-10" />
                {events.map((event, index) => (
                  <div key={event.id} className="flex gap-6 group">
                    <div className="w-16 h-16 bg-white border-4 border-stone-50 rounded-full shadow-lg flex flex-col items-center justify-center z-10">
                      <span className="text-[10px] font-black text-blue-500 uppercase">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="text-xl font-black text-stone-800">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="flex-1 bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 relative hover:shadow-md transition-all">
                      {event.image && <img src={event.image} className="w-full h-40 object-cover rounded-3xl mb-4" />}
                      <h3 className="font-bold text-lg text-stone-800">{event.title}</h3>
                      {event.location && <div className="flex items-center gap-2 text-stone-500 text-sm mt-2 bg-stone-50 p-2 rounded-lg w-fit"><MapPin size={14}/>{event.location}</div>}
                      {event.extraNote && <p className="text-stone-400 text-sm italic mt-2 flex items-start gap-2"><AlignLeft size={14} className="mt-1"/>{event.extraNote}</p>}
                      <button onClick={() => deleteEvent(event)} className="absolute top-4 right-4 text-stone-200 hover:text-red-500"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              /* عرض التقويم العادي (Grid View) */
              <motion.div 
                key="grid"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {events.map((event) => (
                  <div key={event.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-stone-100 flex flex-col">
                    <div className="h-32 bg-stone-100 relative">
                      {event.image ? (
                        <img src={event.image} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300"><CalendarIcon size={32}/></div>
                      )}
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur p-2 rounded-xl text-center min-w-[45px] shadow-sm">
                        <div className="text-[10px] font-bold text-blue-500 uppercase leading-none">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                        <div className="text-lg font-black text-stone-800 leading-none mt-1">{new Date(event.date).getDate()}</div>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-stone-800 mb-2 line-clamp-2">{event.title}</h3>
                      {event.location && <div className="flex items-center gap-1.5 text-stone-400 text-xs mb-3 truncate"><MapPin size={12}/>{event.location}</div>}
                      <div className="mt-auto pt-4 border-t border-stone-50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> Scheduled</span>
                        <button onClick={() => deleteEvent(event)} className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* زر إضافة سريع */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]">
        <button onClick={() => navigate('/board')} className="flex items-center gap-3 px-8 py-5 bg-stone-900 text-white rounded-full font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all">
          <Plus size={20} />
          <span>New Idea</span>
        </button>
      </div>
    </div>
  );
}
