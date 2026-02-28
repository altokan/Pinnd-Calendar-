import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  X, Save, Loader2, MapPin, Clock, Bell, 
  Briefcase, HeartPulse, Plane, PartyPopper, Dumbbell, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('other');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reminder, setReminder] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'pins'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate || !title) return toast.error('Please enter a title');

    try {
      setLoading(true);
      let imageUrl = '';

      if (imageFile) {
        const imageRef = ref(storage, `pins/${user.uid}/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      await addDoc(collection(db, 'pins'), {
        userId: user.uid,
        title,
        notes,
        time,
        location,
        category,
        reminder,
        imageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        createdAt: serverTimestamp(),
      });

      toast.success('Event Pinned Successfully');
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to save pin');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setTime('12:00');
    setLocation('');
    setCategory('other');
    setImageFile(null);
    setPreviewUrl(null);
    setIsAddModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <motion.h2 
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="text-5xl font-serif italic text-stone-900 tracking-tighter"
          >
            {format(currentDate, 'MMMM')}
          </motion.h2>
          <p className="text-stone-500 font-bold tracking-[0.3em] uppercase text-[10px]">
            Timeline / {format(currentDate, 'yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-3 glass p-2 rounded-2xl shadow-sm border-stone-300 border">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-stone-200 rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 text-[11px] font-black uppercase tracking-widest text-stone-700">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-stone-200 rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Grid */}
      <div className="glass rounded-[3rem] overflow-hidden border-stone-200 border-2 shadow-2xl">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-white/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-5 text-center text-[10px] font-black uppercase tracking-widest text-stone-500">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
            const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);

            return (
              <motion.div 
                whileHover={{ backgroundColor: "rgba(255,255,255,0.7)" }}
                key={idx}
                onClick={() => { setSelectedDate(day); setIsAddModalOpen(true); }}
                className={cn(
                  "min-h-[150px] p-4 border-r border-b border-stone-200 transition-all cursor-pointer relative group",
                  !isCurrentMonth && "opacity-20",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <span className={cn(
                  "inline-flex w-9 h-9 items-center justify-center rounded-2xl text-sm font-bold mb-3 transition-all",
                  isToday(day) ? "bg-stone-900 text-white shadow-lg rotate-3" : "text-stone-800 group-hover:bg-white border border-stone-100"
                )}>
                  {format(day, 'd')}
                </span>

                <div className="space-y-2">
                  {dayPins.slice(0, 3).map((pin, i) => {
                    const CatIcon = CATEGORIES.find(c => c.id === pin.category)?.icon || Star;
                    return (
                      <div key={i} className="flex items-center gap-2 bg-white/80 p-1.5 rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                         <CatIcon size={12} className="shrink-0 text-stone-600" />
                         <p className="text-[10px] font-bold truncate leading-none text-stone-800">{pin.title}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modern Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-3xl relative border-stone-200 border-2">
              <button onClick={resetForm} className="absolute top-8 right-8 p-3 hover:bg-stone-100 rounded-full transition-all text-stone-500 hover:text-black border border-stone-100"><X size={20}/></button>
              
              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 mb-2">Create New Event</p>
                <h3 className="text-3xl font-serif italic text-stone-900">{selectedDate && format(selectedDate, 'EEEE, MMM do')}</h3>
              </div>
              
              <form onSubmit={handleAddPin} className="space-y-6">
                <div className="space-y-4">
                  {/* تحسين وضوح العنوان */}
                  <input 
                    required 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="Event Title..." 
                    className="w-full text-2xl font-serif italic placeholder:text-stone-300 border-none focus:ring-0 p-0 bg-transparent outline-none text-stone-900" 
                  />
                  
                  <div className="flex flex-wrap items-center gap-4 text-stone-600 border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-2 bg-stone-100 px-4 py-2 rounded-full border border-stone-200">
                      <Clock size={16} className="text-stone-500" />
                      <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 outline-none text-stone-800" />
                    </div>
                    <div className="flex items-center gap-2 bg-stone-100 px-4 py-2 rounded-full border border-stone-200 flex-1">
                      <MapPin size={16} className="text-stone-500" />
                      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location..." className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 outline-none w-full text-stone-800 placeholder:text-stone-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 transition-all",
                          category === cat.id ? "bg-stone-900 text-white border-stone-900 shadow-lg scale-105" : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"
                        )}>
                          <Icon size={14} />
                          <span className="text-xs font-bold">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-4 border-y border-stone-200">
                  <label className="flex items-center gap-3 px-6 py-3 bg-stone-900 text-white rounded-2xl cursor-pointer hover:bg-black transition-all border border-stone-800 shadow-md">
                    <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                    {previewUrl ? <img src={previewUrl} className="h-6 w-6 object-cover rounded-md border border-white/20" /> : <ImageIcon size={20} />}
                    <span className="text-xs font-bold">Add Photo</span>
                  </label>
                  
                  <button type="button" onClick={() => setReminder(!reminder)} className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition-all border-2",
                    reminder ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm" : "bg-stone-100 text-stone-500 border-stone-200"
                  )}>
                    <Bell size={18} className={reminder ? "text-amber-500" : "text-stone-400"} /> 
                    {reminder ? 'Reminder On' : 'No Reminder'}
                  </button>
                </div>

                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Additional notes..." 
                  className="w-full text-sm text-stone-700 placeholder:text-stone-300 border-none focus:ring-0 p-0 bg-transparent outline-none resize-none h-24" 
                />

                <button disabled={loading} type="submit" className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 border-2 border-stone-800">
                  {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> <span>Save Event</span></>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
