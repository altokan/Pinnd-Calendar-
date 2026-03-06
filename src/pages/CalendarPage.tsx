import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, Bell, Repeat, Trash2, X, Check, Loader2, Calendar Days 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { 
  collection, query, where, onSnapshot, addDoc, 
  deleteDoc, doc, updateDoc, Timestamp 
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const COLORS = [
  { id: 'blue', bg: 'bg-blue-500', border: 'border-blue-600' },
  { id: 'rose', bg: 'bg-rose-500', border: 'border-rose-600' },
  { id: 'emerald', bg: 'bg-emerald-500', border: 'border-emerald-600' },
  { id: 'amber', bg: 'bg-amber-500', border: 'border-amber-600' },
  { id: 'purple', bg: 'bg-purple-500', border: 'border-purple-600' },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // حالة الحدث الجديد
  const [newEvent, setNewEvent] = useState({
    title: location.state?.initialTitle || '',
    time: '12:00',
    color: 'blue',
    reminder: true,
    repeat: 'none'
  });

  const userId = auth.currentUser?.uid || "guest";

  // جلب الأحداث من Firebase
  useEffect(() => {
    const q = query(collection(db, "events"), where("userId", "==", userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const evs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(evs);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error("يرجى كتابة عنوان للحدث");
      return;
    }

    try {
      await addDoc(collection(db, "events"), {
        ...newEvent,
        userId,
        date: selectedDate.toISOString().split('T')[0],
        createdAt: Timestamp.now()
      });
      setIsAddModalOpen(false);
      setNewEvent({ title: '', time: '12:00', color: 'blue', reminder: true, repeat: 'none' });
      toast.success("تمت إضافة الحدث بنجاح");
    } catch (e) {
      toast.error("خطأ في الإضافة");
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
      toast.success("تم حذف الحدث");
    } catch (e) {
      toast.error("خطأ في الحذف");
    }
  };

  const filteredEvents = events.filter(ev => ev.date === selectedDate.toISOString().split('T')[0]);

  if (loading) return <div className="fixed inset-0 bg-stone-50 flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-[3rem] shadow-sm border-b border-stone-100">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/board')} className="p-3 bg-stone-100 rounded-full active:scale-95 transition-transform">
            <ChevronLeft size={24} className="text-stone-600" />
          </button>
          <h1 className="text-xl font-black text-stone-800 uppercase tracking-tighter">My Calendar</h1>
          <button onClick={() => setIsAddModalOpen(true)} className="p-3 bg-stone-900 text-white rounded-full active:scale-95 shadow-lg">
            <Plus size={24} />
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center justify-between bg-stone-50 p-2 rounded-2xl">
          <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-2"><ChevronLeft size={20}/></button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest leading-none">
              {selectedDate.toLocaleDateString('en-US', { year: 'numeric' })}
            </p>
            <p className="text-lg font-black text-stone-800">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-2"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Events List */}
      <div className="px-6 mt-8 space-y-4">
        <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest">Today's Schedule</p>
        
        <AnimatePresence mode='popLayout'>
          {filteredEvents.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-stone-200">
              <CalendarIcon className="mx-auto text-stone-200 mb-2" size={40} />
              <p className="text-stone-400 font-bold text-sm italic">لا يوجد أحداث مجدولة لهذا اليوم</p>
            </motion.div>
          ) : (
            filteredEvents.map((event) => (
              <motion.div 
                key={event.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="bg-white p-5 rounded-[2rem] shadow-sm border border-stone-100 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-3 h-12 rounded-full", COLORS.find(c => c.id === event.color)?.bg || 'bg-blue-500')} />
                  <div>
                    <h3 className="font-black text-stone-800 leading-tight">{event.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-stone-400"><Clock size={12}/> {event.time}</span>
                      {event.reminder && <Bell size={10} className="text-amber-500" />}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteEvent(event.id)} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-md bg-white rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-stone-800 tracking-tighter italic">NEW EVENT</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-stone-100 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 px-1">What's the plan?</label>
                  <input 
                    type="text" 
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Meeting, Gym, Birthday..."
                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-stone-800 font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-stone-900 transition-all"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 px-1 text-right">Time</label>
                    <input type="time" value={newEvent.time} onChange={(e) => setNewEvent({...newEvent, time: e.target.value})} className="w-full bg-stone-50 rounded-2xl p-4 font-bold text-stone-800 border-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 px-1 text-right">Repeat</label>
                    <select value={newEvent.repeat} onChange={(e) => setNewEvent({...newEvent, repeat: e.target.value})} className="w-full bg-stone-50 rounded-2xl p-4 font-bold text-stone-800 border-none appearance-none">
                      <option value="none">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-3 px-1">Tag Color</label>
                  <div className="flex gap-3">
                    {COLORS.map((c) => (
                      <button 
                        key={c.id} 
                        onClick={() => setNewEvent({...newEvent, color: c.id})}
                        className={cn("w-8 h-8 rounded-full border-4 transition-all", c.bg, newEvent.color === c.id ? "border-stone-900 scale-125" : "border-transparent opacity-50")}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Bell className={newEvent.reminder ? "text-amber-500" : "text-stone-300"} size={20} />
                    <span className="font-bold text-stone-700 text-sm">Smart Notification</span>
                  </div>
                  <button 
                    onClick={() => setNewEvent({...newEvent, reminder: !newEvent.reminder})}
                    className={cn("w-12 h-6 rounded-full transition-all relative", newEvent.reminder ? "bg-stone-900" : "bg-stone-200")}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", newEvent.reminder ? "right-1" : "left-1")} />
                  </button>
                </div>

                <button onClick={handleAddEvent} className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black tracking-widest uppercase shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Check size={20} strokeWidth={3} />
                  Save Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
