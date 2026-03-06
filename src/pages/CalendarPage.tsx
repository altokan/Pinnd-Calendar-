import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Trash2, Clock, 
  Calendar as CalIcon, Edit3, X, Check, 
  Utensils, Music, Stethoscope, Briefcase, Star, Bell, MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const EVENT_TYPES = [
  { id: 'food', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'music', icon: Music, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'med', icon: Stethoscope, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'work', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'star', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const userId = auth.currentUser?.uid || "guest";

  // جلب الأحداث الخاصة باليوم المختار فقط
  useEffect(() => {
    const q = query(
      collection(db, "events"), 
      where("userId", "==", userId), 
      where("date", "==", selectedDate)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const evs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // ترتيب الأحداث حسب الوقت
      setEvents(evs.sort((a, b) => a.time.localeCompare(b.time)));
      setLoading(false);
    });
    return () => unsub();
  }, [selectedDate, userId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
      toast.success("Event Deleted");
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleUpdate = async () => {
    if (!editingEvent) return;
    try {
      const eventRef = doc(db, "events", editingEvent.id);
      await updateDoc(eventRef, {
        title: editingEvent.title,
        time: editingEvent.time,
        type: editingEvent.type,
        alert: editingEvent.alert
      });
      setEditingEvent(null);
      toast.success("Event Updated");
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const changeDay = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans">
      {/* Header & Date Selector */}
      <div className="bg-white p-6 pt-12 rounded-b-[2.5rem] shadow-sm border-b border-stone-100">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/board')} className="p-3 bg-stone-100 rounded-full active:scale-90 transition-all">
            <ChevronLeft size={24} className="text-stone-600" />
          </button>
          <h1 className="text-xl font-black italic tracking-tighter text-stone-800">SCHEDULE</h1>
          <div className="w-12" />
        </div>
        
        <div className="flex items-center justify-between bg-stone-50 p-2 rounded-2xl border border-stone-100">
          <button onClick={() => changeDay(-1)} className="p-2 text-stone-400 hover:text-stone-800"><ChevronLeft /></button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest leading-none mb-1">
              {new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric' })}
            </p>
            <span className="font-black text-stone-800 uppercase">
              {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </span>
          </div>
          <button onClick={() => changeDay(1)} className="p-2 text-stone-400 hover:text-stone-800"><ChevronRight /></button>
        </div>
      </div>

      {/* Events List */}
      <div className="p-6 space-y-4">
        <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] px-2">Planned Events</p>
        
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-stone-300" /></div>
        ) : events.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-stone-100">
            <CalIcon className="mx-auto mb-3 text-stone-200" size={48} />
            <p className="text-stone-400 font-bold italic">No events pinned for today</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {events.map(ev => {
              const typeInfo = EVENT_TYPES.find(t => t.id === ev.type) || EVENT_TYPES[4];
              return (
                <motion.div 
                  key={ev.id} 
                  initial={{ x: -20, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  className="bg-white p-5 rounded-[2rem] shadow-sm flex items-center justify-between border border-stone-50 group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl", typeInfo.bg)}>
                      <typeInfo.icon className={typeInfo.color} size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-stone-800 leading-tight">{ev.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-stone-400 italic">
                          <Clock size={12} /> {ev.time}
                        </span>
                        {ev.alert && <Bell size={10} className="text-blue-500 animate-pulse" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingEvent(ev)} className="p-2 text-stone-400 hover:text-blue-500"><Edit3 size={18}/></button>
                    <button onClick={() => handleDelete(ev.id)} className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={18}/></button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Edit Event Modal (إمكانية التعديل) */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingEvent(null)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-stone-800 italic uppercase">Edit Event</h2>
                <button onClick={() => setEditingEvent(null)} className="p-2 bg-stone-100 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={editingEvent.title} 
                  onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})} 
                  className="w-full bg-stone-50 rounded-2xl p-4 text-stone-800 font-bold border-none outline-none" 
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="w-full bg-stone-50 rounded-2xl p-4 text-stone-400 font-bold text-center text-xs">{editingEvent.date}</div>
                  <input 
                    type="time" 
                    value={editingEvent.time} 
                    onChange={(e) => setEditingEvent({...editingEvent, time: e.target.value})} 
                    className="w-full bg-stone-50 rounded-2xl p-4 text-stone-800 font-bold border-none outline-none" 
                  />
                </div>
                <div className="flex justify-between p-2 bg-stone-50 rounded-2xl">
                  {EVENT_TYPES.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setEditingEvent({...editingEvent, type: t.id})} 
                      className={cn("p-3 rounded-xl transition-all", editingEvent.type === t.id ? "bg-white shadow-sm text-blue-600" : "text-stone-400")}
                    >
                      <t.icon size={20} />
                    </button>
                  ))}
                </div>
                <button onClick={handleUpdate} className="w-full py-5 bg-stone-900 text-white rounded-[1.5rem] font-black shadow-lg uppercase tracking-tighter">Update Changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
