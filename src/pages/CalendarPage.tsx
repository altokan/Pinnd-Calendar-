import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Trash2, Clock, 
  Calendar as CalIcon, Edit3, X, Check, 
  Utensils, Music, Stethoscope, Briefcase, Star, Bell, MapPin,
  Loader2, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const userId = auth.currentUser?.uid || "guest";

  // جلب كافة أحداث المستخدم
  useEffect(() => {
    const q = query(collection(db, "events"), where("userId", "==", userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const evs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(evs);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
      toast.success("Event Deleted");
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const filteredEvents = events
    .filter(ev => ev.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-sans">
      {/* Header */}
      <div className="bg-white p-6 pt-12 rounded-b-[2.5rem] shadow-sm border-b border-stone-100">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/board')} className="p-3 bg-stone-100 rounded-full active:scale-90 transition-all">
            <ChevronLeft size={24} className="text-stone-600" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black italic tracking-tighter text-stone-800 uppercase">
              {currentMonth.toLocaleString('default', { month: 'long' })}
            </h1>
            <p className="text-[10px] font-bold text-stone-400">{currentMonth.getFullYear()}</p>
          </div>
          <div className="w-12" />
        </div>

        {/* Calendar Grid (التصميم القديم) */}
        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-[10px] font-black text-stone-300">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array(firstDayOfMonth(currentMonth)).fill(null).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const hasEvents = events.some(e => e.date === dateStr);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "h-10 w-10 mx-auto rounded-xl flex flex-col items-center justify-center relative transition-all",
                  isSelected ? "bg-stone-900 text-white shadow-lg" : "hover:bg-stone-50 text-stone-600"
                )}
              >
                <span className="text-sm font-black">{day}</span>
                {hasEvents && !isSelected && (
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events for Selected Day */}
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center px-2">
          <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest">
            {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-300" /></div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-stone-100">
            <CalIcon className="mx-auto mb-3 text-stone-200" size={40} />
            <p className="text-stone-400 font-bold italic text-sm">No events scheduled</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredEvents.map(ev => {
              const typeInfo = EVENT_TYPES.find(t => t.id === ev.type) || EVENT_TYPES[4];
              return (
                <motion.div 
                  key={ev.id} layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 rounded-[2rem] shadow-sm flex items-center justify-between border border-stone-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl", typeInfo.bg)}>
                      <typeInfo.icon className={typeInfo.color} size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-stone-800 leading-tight">{ev.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-stone-300" />
                        <span className="text-[10px] font-bold text-stone-400">{ev.time}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(ev.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={18}/>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Navigation for Months */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl z-50">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
          <ChevronLeft size={20} />
        </button>
        <span className="font-black text-xs uppercase tracking-widest min-w-[80px] text-center">
          {currentMonth.toLocaleString('default', { month: 'short' })}
        </span>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
