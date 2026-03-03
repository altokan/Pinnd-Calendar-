import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Trash2, Loader2, MapPin, AlignLeft, List, Grid, X 
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

  // حسابات التقويم التقليدي
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
      toast.success('Deleted');
    } catch (error) { toast.error('Error'); }
  };

  if (loading) return <div className="fixed inset-0 bg-stone-50 flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" /></div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-6 sticky top-0 z-[100]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-3 bg-stone-100 rounded-2xl active:scale-90 transition-all">
            <ChevronLeft size={24} />
          </button>

          <div className="flex bg-stone-100 p-1 rounded-2xl shadow-inner">
            <button 
              onClick={() => setViewMode('traditional')} 
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all", 
                viewMode === 'traditional' ? "bg-white shadow-md text-blue-600" : "text-stone-400"
              )}
            >
              <Grid size={18} /><span>Calendar</span>
            </button>
            <button 
              onClick={() => setViewMode('timeline')} 
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all", 
                viewMode === 'timeline' ? "bg-white shadow-md text-blue-600" : "text-stone-400"
              )}
            >
              <List size={18} /><span>Timeline</span>
            </button>
          </div>

          <button onClick={() => navigate('/map')} className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 shadow-sm">
            <MapPin size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10">
        <AnimatePresence mode="wait">
          {viewMode === 'traditional' ? (
            <motion.div key="trad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* اختيار الشهر */}
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-4xl font-black text-stone-800 tracking-tighter">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-3">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 active:scale-95"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 active:scale-95"><ChevronRight size={20}/></button>
                </div>
              </div>

              {/* شبكة التقويم العادية */}
              <div className="grid grid-cols-7 gap-3 mb-10">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-black text-stone-300 uppercase tracking-widest pb-4">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                  
                  return (
                    <div 
                      key={i} 
                      onClick={() => day && setSelectedDay(day.toString())}
                      className={cn(
                        "aspect-square rounded-[2rem] p-4 relative transition-all border-2 flex flex-col items-start justify-start",
                        day ? "bg-white border-stone-100 hover:border-blue-200 cursor-pointer shadow-sm" : "bg-transparent border-transparent pointer-events-none",
                        isToday && "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100"
                      )}
                    >
                      {day && (
                        <>
                          <span className="font-black text-xl">{day}</span>
                          <div className="mt-auto flex flex-wrap gap-1">
                            {dayEvents.map((_, idx) => (
                              <div key={idx} className={cn("w-2 h-2 rounded-full", isToday ? "bg-white/50" : "bg-blue-400")} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* مودال الأحداث لليوم المختار */}
              <AnimatePresence>
                {selectedDay && (
                  <motion.div 
                    initial={{ opacity: 0, y: 100 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 100 }}
                    className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:p-6"
                  >
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setSelectedDay(null)} />
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl relative z-10 overflow-hidden">
                      <div className="flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-2xl font-black text-stone-800">
                            {selectedDay} {currentDate.toLocaleString('default', { month: 'long' })}
                          </h3>
                          <p className="text-stone-400 font-bold text-sm uppercase tracking-widest">Scheduled Events</p>
                        </div>
                        <button onClick={() => setSelectedDay(null)} className="p-3 bg-stone-100 rounded-full text-stone-400 hover:bg-stone-200 transition-colors">
                          <X size={20} />
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {getEventsForDay(parseInt(selectedDay)).length > 0 ? (
                          getEventsForDay(parseInt(selectedDay)).map(ev => (
                            <div key={ev.id} className="group flex items-center justify-between p-5 bg-stone-50 rounded-[2rem] border border-stone-100 transition-all hover:bg-white hover:shadow-lg">
                              <div className="flex items-center gap-5">
                                {ev.image ? (
                                  <img src={ev.image} className="w-16 h-16 rounded-[1.5rem] object-cover shadow-sm" alt="" />
                                ) : (
                                  <div className="w-16 h-16 rounded-[1.5rem] bg-stone-200 flex items-center justify-center text-stone-400"><CalendarIcon size={24}/></div>
                                )}
                                <div>
                                  <p className="font-black text-stone-800 text-lg">{ev.title}</p>
                                  <div className="flex flex-col gap-1 mt-1">
                                    {ev.location && <div className="flex items-center gap-1 text-xs text-stone-400 font-bold"><MapPin size={12} className="text-red-400"/> {ev.location}</div>}
                                    {ev.extraNote && <div className="flex items-center gap-1 text-xs text-stone-400 italic"><AlignLeft size={12}/> {ev.extraNote}</div>}
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => deleteEvent(ev)} className="p-3 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                <Trash2 size={20}/>
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10">
                            <CalendarIcon size={40} className="mx-auto text-stone-200 mb-3" />
                            <p className="text-stone-400 font-bold italic">No plans for this day yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* عرض التايم لاين */
            <motion.div key="time" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10 relative max-w-2xl mx-auto pb-20">
               <div className="absolute left-10 top-2 bottom-2 w-0.5 bg-stone-200 -z-10" />
               {events.map((event) => (
                 <div key={event.id} className="flex gap-8 group">
                   <div className="w-20 h-20 bg-white border-[6px] border-stone-50 rounded-[2rem] shadow-xl flex flex-col items-center justify-center z-10 shrink-0 group-hover:scale-110 transition-transform">
                     <span className="text-[10px] font-black text-blue-500 uppercase leading-none mb-1">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                     <span className="text-2xl font-black text-stone-800 leading-none">{new Date(event.date).getDate()}</span>
                   </div>
                   <div className="flex-1 bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 relative hover:shadow-xl transition-all">
                     {event.image && <img src={event.image} className="w-full h-48 object-cover rounded-[1.8rem] mb-5 shadow-inner" alt="" />}
                     <h3 className="font-black text-xl text-stone-800 pr-10">{event.title}</h3>
                     <div className="space-y-2 mt-3">
                        {event.location && <div className="flex items-center gap-2 text-stone-500 text-sm font-bold bg-stone-50 p-2 rounded-xl w-fit"><MapPin size={14} className="text-red-400"/>{event.location}</div>}
                        {event.extraNote && <p className="text-stone-400 text-sm italic flex items-start gap-2 pt-1"><AlignLeft size={16} className="mt-0.5 shrink-0"/>{event.extraNote}</p>}
                     </div>
                     <button onClick={() => deleteEvent(event)} className="absolute top-6 right-6 p-2 text-stone-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                   </div>
                 </div>
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
