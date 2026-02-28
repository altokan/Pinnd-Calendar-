import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  X, Save, Loader2, MapPin, Clock, Bell, Trash2,
  Briefcase, HeartPulse, Plane, PartyPopper, Dumbbell, Star,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../services/firebase'; // لم نعد بحاجة لـ storage هنا
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

const CATEGORIES = [
  { id: 'work', icon: Briefcase, label: 'Work', color: 'bg-blue-500' },
  { id: 'doctor', icon: HeartPulse, label: 'Doctor', color: 'bg-red-500' },
  { id: 'travel', icon: Plane, label: 'Travel', color: 'bg-amber-500' },
  { id: 'party', icon: PartyPopper, label: 'Party', color: 'bg-purple-500' },
  { id: 'gym', icon: Dumbbell, label: 'Gym', color: 'bg-emerald-500' },
  { id: 'other', icon: Star, label: 'Other', color: 'bg-stone-500' },
];

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pins, setPins] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('other');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [reminder, setReminder] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pins'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // دالة تحويل الصورة لنص (الحل البديل)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000000) { // تنبيه إذا كانت الصورة أكبر من 1MB
        toast.error("Image too large. Please use a smaller one.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setTitle(''); setTime('12:00'); setLocation('');
    setCategory('other'); setBase64Image(null);
    setIsAddModalOpen(false); setLoading(false);
  };

  const handleAddPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Please enter a title');

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      await addDoc(collection(db, 'pins'), {
        userId: user.uid,
        title,
        time,
        location,
        category,
        reminder,
        imageUrl: base64Image, // يتم حفظ النص الطويل هنا مباشرة
        date: dateStr,
        createdAt: serverTimestamp(),
      });

      toast.success('Pinned Successfully!');
      resetForm();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const selectedDayPins = pins
    .filter(p => p.date === format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h2 className="text-5xl font-serif italic text-stone-900 tracking-tighter">{format(currentDate, 'MMMM')}</h2>
          <p className="text-stone-500 font-black tracking-[0.2em] uppercase text-[10px]">Year of {format(currentDate, 'yyyy')}</p>
        </div>
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-2xl border-stone-200 border shadow-sm">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-stone-100 rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 text-[11px] font-black uppercase tracking-widest text-stone-700">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-stone-100 rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-[3rem] overflow-hidden border-stone-200 border-2 shadow-2xl relative z-10">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-5 text-center text-[10px] font-black uppercase tracking-widest text-stone-400">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
            const isCurrentMonth = isSameDay(startOfMonth(day), currentDate);
            return (
              <div key={idx} onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }}
                className={cn("min-h-[140px] p-4 border-r border-b border-stone-100 cursor-pointer hover:bg-stone-50/50", !isCurrentMonth && "opacity-20", isSameDay(day, selectedDate) && "bg-stone-100/50")}>
                <span className={cn("inline-flex w-9 h-9 items-center justify-center rounded-2xl text-sm font-bold mb-3", isToday(day) ? "bg-stone-900 text-white shadow-lg" : "text-stone-800")}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-wrap gap-1">
                  {dayPins.slice(0, 4).map((pin, i) => {
                    const Cat = CATEGORIES.find(c => c.id === pin.category);
                    return <div key={i} className={cn("w-2 h-2 rounded-full", Cat?.color || "bg-stone-400")} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Panel */}
      <AnimatePresence>
        {isTimelineOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTimelineOpen(false)} className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3.5rem] shadow-2xl z-50 max-h-[85vh] overflow-y-auto border-t-2 border-stone-100 pb-10">
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mt-6 mb-8" />
              <div className="max-w-3xl mx-auto px-8">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-4xl font-serif italic text-stone-900">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => setIsAddModalOpen(true)} className="p-5 bg-stone-900 text-white rounded-3xl shadow-xl active:scale-95"><Plus size={24} /></button>
                </div>
                <div className="space-y-6">
                  {selectedDayPins.length > 0 ? selectedDayPins.map((pin) => {
                    const Cat = CATEGORIES.find(c => c.id === pin.category);
                    return (
                      <div key={pin.id} className="flex items-center gap-6 p-6 bg-stone-50 rounded-[2.5rem] border-2 border-stone-100 group relative">
                        <div className="text-center min-w-[70px] border-r border-stone-200 pr-4 font-black text-stone-900">{pin.time}</div>
                        <div className="p-4 bg-white rounded-2xl shadow-sm"><Cat.icon size={22} className="text-stone-700" /></div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-stone-900">{pin.title}</h4>
                          <p className="text-[11px] text-stone-500 font-bold">{pin.location}</p>
                        </div>
                        {pin.imageUrl && <img src={pin.imageUrl} className="w-16 h-16 object-cover rounded-[1.5rem] border-4 border-white shadow-md" />}
                        <button onClick={async () => await deleteDoc(doc(db, 'pins', pin.id))} className="p-3 text-stone-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                      </div>
                    );
                  }) : <div className="py-20 text-center text-stone-300 font-serif italic text-xl">Empty day...</div>}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-3xl relative">
              <button onClick={resetForm} className="absolute top-8 right-8 text-stone-400"><X size={24}/></button>
              <h3 className="text-2xl font-serif italic mb-8">Pin New Event</h3>
              <form onSubmit={handleAddPin} className="space-y-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What's the plan?" className="w-full text-2xl font-serif border-none focus:ring-0 p-0 text-stone-900" />
                <div className="flex gap-4">
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-stone-50 p-3 rounded-xl border-none text-sm font-bold w-full" />
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Where?" className="bg-stone-50 p-3 rounded-xl border-none text-sm font-bold w-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn("p-3 rounded-2xl border-2 transition-all", category === cat.id ? "bg-stone-900 text-white" : "border-stone-100 text-stone-400")}>
                      <span className="text-[10px] font-black uppercase tracking-tighter">{cat.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-stone-50 rounded-2xl cursor-pointer border-2 border-dashed border-stone-200">
                    <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                    {base64Image ? <img src={base64Image} className="h-8 w-8 object-cover rounded-lg" /> : <ImageIcon size={20} className="text-stone-400" />}
                    <span className="text-xs font-bold text-stone-500">Pick Photo</span>
                  </label>
                </div>
                <button disabled={loading} type="submit" className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3">
                  {loading ? <Loader2 className="animate-spin" size={24}/> : "Confirm Pin"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
