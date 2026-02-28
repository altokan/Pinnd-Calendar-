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
import { db, storage } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
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
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  // Form State
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

  const selectedDayPins = pins
    .filter(p => p.date === format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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

  const handleAddPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Please enter a title');

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

      toast.success('Event Saved');
      resetForm();
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePin = async (id: string) => {
    if(!window.confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, 'pins', id));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Error deleting');
    }
  };

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
            const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);

            return (
              <div 
                key={idx}
                onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }}
                className={cn(
                  "min-h-[140px] p-4 border-r border-b border-stone-100 transition-all cursor-pointer relative group hover:bg-stone-50/50",
                  !isCurrentMonth && "opacity-20",
                  isSameDay(day, selectedDate) && "bg-stone-100/50",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <span className={cn(
                  "inline-flex w-9 h-9 items-center justify-center rounded-2xl text-sm font-bold mb-3",
                  isToday(day) ? "bg-stone-900 text-white shadow-lg" : "text-stone-800 border border-stone-100"
                )}>
                  {format(day, 'd')}
                </span>

                <div className="flex flex-wrap gap-1">
                  {dayPins.slice(0, 4).map((pin, i) => {
                    const Cat = CATEGORIES.find(c => c.id === pin.category);
                    return <div key={i} className={cn("w-2 h-2 rounded-full", Cat?.color || "bg-stone-400")} title={pin.title} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Slide-up */}
      <AnimatePresence>
        {isTimelineOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTimelineOpen(false)}
              className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3.5rem] shadow-2xl z-50 max-h-[85vh] overflow-y-auto border-t-2 border-stone-100"
            >
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mt-6 mb-8" />
              
              <div className="max-w-3xl mx-auto px-8 pb-20">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="text-4xl font-serif italic text-stone-900">{format(selectedDate, 'EEEE, MMM do')}</h3>
                    <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Daily Schedule</p>
                  </div>
                  <button 
                    onClick={() => { setIsAddModalOpen(true); }}
                    className="p-5 bg-stone-900 text-white rounded-3xl hover:bg-black transition-all shadow-xl active:scale-95"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {selectedDayPins.length > 0 ? (
                    selectedDayPins.map((pin) => {
                      const Cat = CATEGORIES.find(c => c.id === pin.category);
                      const Icon = Cat?.icon || Star;
                      return (
                        <motion.div 
                          layout key={pin.id}
                          className="flex items-center gap-6 p-6 bg-stone-50 rounded-[2.5rem] border-2 border-stone-100 group relative"
                        >
                          <div className="text-center min-w-[70px] border-r border-stone-200 pr-4 text-stone-900 font-black">
                            {pin.time}
                          </div>

                          <div className="p-4 bg-white rounded-2xl border border-stone-200">
                            <Icon size={22} className="text-stone-700" />
                          </div>

                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-stone-900">{pin.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-stone-400 text-[11px] font-bold">
                              {pin.location && <span className="flex items-center gap-1"><MapPin size={12}/> {pin.location}</span>}
                              <span className="uppercase tracking-widest">• {Cat?.label}</span>
                            </div>
                          </div>

                          {pin.imageUrl && (
                            <img src={pin.imageUrl} className="w-16 h-16 object-cover rounded-[1.5rem] border-4 border-white shadow-md" />
                          )}

                          <button onClick={() => handleDeletePin(pin.id)} className="p-3 text-stone-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 size={20} />
                          </button>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="py-24 text-center space-y-6 bg-stone-50/50 rounded-[3.5rem] border-2 border-dashed border-stone-200">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto border border-stone-100">
                        <CalendarIcon size={32} className="text-stone-200" />
                      </div>
                      <p className="text-stone-400 font-serif italic text-xl">Quiet day... No events yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Pin Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-3xl relative border-stone-200 border-2 overflow-hidden">
               <button onClick={resetForm} className="absolute top-8 right-8 p-3 hover:bg-stone-100 rounded-full transition-all text-stone-500 border border-stone-100"><X size={20}/></button>
              
               <div className="mb-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 mb-2">New Entry</p>
                 <h3 className="text-3xl font-serif italic text-stone-900">{format(selectedDate, 'MMMM do, yyyy')}</h3>
               </div>

               <form onSubmit={handleAddPin} className="space-y-8">
                  <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title of your event..." className="w-full text-3xl font-serif italic placeholder:text-stone-200 border-none focus:ring-0 p-0 bg-transparent outline-none text-stone-900" />
                 
                 <div className="flex flex-wrap items-center gap-4 text-stone-700">
                    <div className="flex items-center gap-3 bg-stone-50 px-5 py-3 rounded-2xl border-2 border-stone-100 flex-1">
                      <Clock size={18} className="text-stone-400" />
                      <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-sm font-black focus:ring-0 outline-none w-full text-stone-900" />
                    </div>
                    <div className="flex items-center gap-3 bg-stone-50 px-5 py-3 rounded-2xl border-2 border-stone-100 flex-[2]">
                      <MapPin size={18} className="text-stone-400" />
                      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Where is it?" className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none w-full text-stone-900" />
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all",
                        category === cat.id ? "bg-stone-900 border-stone-900 text-white shadow-xl" : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                      )}>
                        <cat.icon size={20} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">{cat.label}</span>
                      </button>
                    ))}
                 </div>

                 <div className="flex items-center gap-4 border-t border-stone-50 pt-6">
                   <label className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white text-stone-700 rounded-3xl cursor-pointer hover:bg-stone-50 transition-all border-2 border-stone-100">
                     <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                     {previewUrl ? <img src={previewUrl} className="h-7 w-7 object-cover rounded-xl" /> : <ImageIcon size={22} className="text-stone-400" />}
                     <span className="text-sm font-bold">Attachment</span>
                   </label>
                   
                   <button type="button" onClick={() => setReminder(!reminder)} className={cn(
                    "p-4 rounded-3xl font-bold border-2 transition-all",
                    reminder ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-stone-50 text-stone-300 border-stone-100"
                  )}>
                    <Bell size={24} />
                  </button>
                 </div>

                 <button disabled={loading} type="submit" className="w-full py-6 bg-stone-900 text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4">
                   {loading ? <Loader2 className="animate-spin" size={24}/> : <><Save size={24}/> <span>Confirm & Pin</span></>}
                 </button>
               </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
