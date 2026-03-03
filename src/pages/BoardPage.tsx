import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, 
  Trash2, Loader2, Plus, MapPin, AlignLeft, List, Grid 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayRemove } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'traditional' | 'timeline'>('traditional');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const userId = auth.currentUser?.uid || "guest";
  const eventDocRef = doc(db, "events", userId);

  useEffect(() => {
    const unsub = onSnapshot(eventDocRef, (d) => {
      if (d.exists()) {
        const sorted = (d.data().events || []).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setEvents(sorted);
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  // منطق التقويم التقليدي
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth(currentDate.getFullYear(), currentDate.getMonth()); i++) calendarDays.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const deleteEvent = async (event: any) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await updateDoc(eventDocRef, { events: arrayRemove(event) });
      toast.success('Event deleted');
    } catch (error) { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="fixed inset-0 bg-stone-50 flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" size={40} /></div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-6 sticky top-0 z-[100]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-3 bg-stone-100 rounded-2xl active:scale-90 transition-all">
            <ChevronLeft size={24} />
          </button>

          <div className="flex bg-stone-100 p-1 rounded-2xl">
            <button onClick={() => setViewMode('traditional')} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all", viewMode === 'traditional' ? "bg-white shadow-sm text-blue-600" : "text-stone-400")}>
              <Grid size={18} /><span>Calendar</span>
            </button>
            <button onClick={() => setViewMode('timeline')} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all", viewMode === 'timeline' ? "bg-white shadow-sm text-blue-600" : "text-stone-400")}>
              <List size={18} /><span>Timeline</span>
            </button>
          </div>

          <button onClick={() => navigate('/map')} className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90"><MapPin size={24} /></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10">
        <AnimatePresence mode="wait">
          {viewMode === 'traditional' ? (
            <motion.div key="trad" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* التحكم بالشهر */}
              <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-3xl font-black text-stone-800">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 bg-white rounded-xl shadow-sm border border-stone-100"><ChevronLeft/></button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 bg-white rounded-xl shadow-sm border border-stone-100"><ChevronRight/></button>
                </div>
              </div>

              {/* شبكة التقويم */}
              <div className="grid grid-cols-7 gap-2 mb-10">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-stone-400 uppercase tracking-widest pb-4">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
                  return (
                    <div 
                      key={i} 
                      onClick={() => day && setSelectedDay(day.toString())}
                      className={cn(
                        "aspect-square rounded-3xl p-2 relative transition-all cursor-pointer border-2",
                        day ? "bg-white border-transparent hover:border-blue-200" : "bg-transparent border-transparent",
                        isToday && "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      )}
                    >
                      {day && (
                        <>
                          <span className="font-bold text-lg">{day}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dayEvents.slice(0, 3).map((_, idx) => (
                              <div key={idx} className={cn("w-1.5 h-1.5 rounded-full", isToday ? "bg-white" : "bg-blue-400")} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* عرض أحداث اليوم المختار */}
              {selectedDay && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-stone-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-stone-800">Events for {selectedDay} {currentDate.toLocaleString('default', { month: 'long' })}</h3>
                    <button onClick={() => setSelectedDay(null)} className="text-stone-400"><Plus className="rotate-45"/></button>
                  </div>
                  <div className="space-y-4">
                    {getEventsForDay(parseInt(selectedDay)).length > 0 ? (
                      getEventsForDay(parseInt(selectedDay)).map(ev => (
                        <div key={ev.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                          <div className="flex items-center gap-4">
                            {ev.image && <img src={ev.image} className="w-12 h-12 rounded-xl object-cover" />}
                            <div>
                              <p className="font-bold text-stone-800">{ev.title}</p>
                              <div className="flex items-center gap-2 text-xs text-stone-400"><MapPin size={10}/> {ev.location || 'No location'}</div>
                            </div>
                          </div>
                          <button onClick={() => deleteEvent(ev)} className="p-2 text-stone-300 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-stone-400 py-4 italic">No events scheduled for this day.</p>
                    )}
                    <button onClick={() => navigate('/board')} className="w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-2">
                      <Plus size={18}/> Add Event from Board
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* عرض التايم لاين (كما اتفقنا سابقاً) */
            <motion.div key="time" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 relative max-w-2xl mx-auto">
               <div className="absolute left-8 top-2 bottom-2 w-0.5 bg-stone-200 -z-10" />
               {events.map((event) => (
                 <div key={event.id} className="flex gap-6">
                   <div className="w-16 h-16 bg-white border-4 border-stone-50 rounded-full shadow-lg flex flex-col items-center justify-center z-10">
                     <span className="text-[10px] font-black text-blue-500 uppercase">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                     <span className="text-xl font-black text-stone-800">{new Date(event.date).getDate()}</span>
                   </div>
                   <div className="flex-1 bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100">
                     {event.image && <img src={event.image} className="w-full h-40 object-cover rounded-3xl mb-4" />}
                     <h3 className="font-bold text-lg text-stone-800">{event.title}</h3>
                     {event.location && <div className="flex items-center gap-2 text-stone-500 text-sm mt-2"><MapPin size={14}/>{event.location}</div>}
                     <button onClick={() => deleteEvent(event)} className="absolute top-4 right-4 text-stone-200 hover:text-red-500"><Trash2 size={18}/></button>
                   </div>
                 </div>
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]">
        <button onClick={() => navigate('/board')} className="flex items-center gap-3 px-8 py-5 bg-stone-900 text-white rounded-full font-bold shadow-2xl active:scale-95 transition-all">
          <Plus size={20} /><span>New Idea</span>
        </button>
      </div>
    </div>
  );
}
