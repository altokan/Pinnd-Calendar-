import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  X, Save, Loader2, MapPin, Clock, Bell, Trash2,
  Briefcase, HeartPulse, Plane, PartyPopper, Dumbbell, Star,
  Calendar as CalendarIcon, ExternalLink, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { collection, addDoc, updateDoc, query, where, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('other');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pins'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const openEditModal = (pin: any) => {
    setEditingId(pin.id);
    setTitle(pin.title);
    setTime(pin.time);
    setLocation(pin.location);
    setCategory(pin.category);
    setPreviewUrl(pin.imageUrl);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(''); setTime('12:00'); setLocation('');
    setCategory('other'); setImageFile(null); setPreviewUrl(null);
    setIsModalOpen(false); setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Please enter a title');

    setLoading(true);
    try {
      let finalImageUrl = previewUrl || '';

      if (imageFile) {
        const imageRef = ref(storage, `pins/${user.uid}/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const pinData = {
        title, time, location, category,
        imageUrl: finalImageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'pins', editingId), pinData);
        toast.success('Updated successfully');
      } else {
        await addDoc(collection(db, 'pins'), { 
          ...pinData, 
          userId: user.uid, 
          createdAt: serverTimestamp() 
        });
        toast.success('Pinned successfully');
      }
      resetForm();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = (loc: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`, '_blank');
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const selectedDayPins = pins.filter(p => p.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32 animate-in fade-in duration-700">
      {/* Header - Glassmorphism Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h2 className="text-6xl font-serif italic text-stone-900 tracking-tighter">{format(currentDate, 'MMMM')}</h2>
          <p className="text-stone-400 font-black tracking-[0.3em] uppercase text-[10px]">Lifestyle Calendar</p>
        </div>
        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-xl p-2 rounded-2xl border-white border-2 shadow-xl">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 text-[11px] font-black uppercase tracking-widest text-stone-700">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Grid - The Big Calendar */}
      <div className="bg-white/70 backdrop-blur-md rounded-[3.5rem] overflow-hidden border-white border-4 shadow-2xl relative z-10">
        <div className="grid grid-cols-7 border-b border-stone-100 bg-white/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
            const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentDate));
            return (
              <div key={idx} onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }}
                className={cn(
                  "min-h-[150px] p-4 border-r border-b border-stone-50 cursor-pointer hover:bg-white/50 transition-all group",
                  !isCurrentMonth && "opacity-20 pointer-events-none",
                  isSameDay(day, selectedDate) && "bg-white/80"
                )}>
                <span className={cn(
                  "inline-flex w-10 h-10 items-center justify-center rounded-2xl text-sm font-bold mb-4 transition-transform group-hover:scale-110",
                  isToday(day) ? "bg-stone-900 text-white shadow-xl rotate-3" : "text-stone-800 border border-stone-100"
                )}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-col gap-1.5">
                  {dayPins.slice(0, 3).map((pin, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-stone-50 shadow-sm overflow-hidden">
                       <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", CATEGORIES.find(c => c.id === pin.category)?.color)} />
                       <span className="text-[9px] font-bold truncate text-stone-600 uppercase tracking-tighter">{pin.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Panel - Bottom Slide Up */}
      <AnimatePresence>
        {isTimelineOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTimelineOpen(false)} className="fixed inset-0 bg-stone-900/10 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30 }} className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[4rem] shadow-2xl z-50 max-h-[80vh] overflow-y-auto border-t-4 border-white">
              <div className="w-16 h-1.5 bg-stone-100 rounded-full mx-auto mt-8 mb-4" />
              <div className="max-w-3xl mx-auto px-8 pb-20">
                <div className="flex items-center justify-between mb-12 sticky top-0 bg-white/10 backdrop-blur-sm py-4 z-10">
                  <h3 className="text-4xl font-serif italic text-stone-900">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => setIsModalOpen(true)} className="p-5 bg-stone-900 text-white rounded-[2rem] shadow-2xl hover:bg-black transition-all active:scale-90"><Plus size={28} /></button>
                </div>
                
                <div className="space-y-6">
                  {selectedDayPins.length > 0 ? selectedDayPins.map((pin) => {
                    const Cat = CATEGORIES.find(c => c.id === pin.category);
                    return (
                      <motion.div layout key={pin.id} className="flex items-center gap-6 p-7 bg-white rounded-[3rem] border-2 border-stone-50 shadow-xl shadow-stone-100/50 group relative overflow-hidden">
                        <div className="text-center min-w-[80px] border-r-2 border-stone-50 pr-6">
                          <p className="text-lg font-black text-stone-900 tracking-tighter">{pin.time}</p>
                          <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest mt-1">Scheduled</p>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-stone-900 mb-2">{pin.title}</h4>
                          <div className="flex flex-wrap gap-4 items-center">
                            {pin.location && (
                              <button onClick={() => openInMaps(pin.location)} className="flex items-center gap-2 text-[11px] font-bold text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-all">
                                <MapPin size={12} /> {pin.location} <ExternalLink size={10} />
                              </button>
                            )}
                            <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">• {Cat?.label}</span>
                          </div>
                        </div>
                        {pin.imageUrl && (
                          <div className="relative w-20 h-20 shrink-0">
                            <img src={pin.imageUrl} className="w-full h-full object-cover rounded-[1.5rem] border-4 border-stone-50 shadow-md" alt="" />
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <button onClick={() => openEditModal(pin)} className="p-3 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-2xl transition-all"><Edit3 size={18} /></button>
                          <button onClick={async () => await deleteDoc(doc(db, 'pins', pin.id))} className="p-3 text-stone-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={18} /></button>
                        </div>
                      </motion.div>
                    );
                  }) : (
                    <div className="py-24 text-center bg-stone-50/50 rounded-[3.5rem] border-4 border-dashed border-white">
                      <CalendarIcon size={48} className="mx-auto text-stone-100 mb-4" />
                      <p className="text-stone-300 font-serif italic text-2xl">A peaceful day ahead...</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[4rem] w-full max-w-xl p-12 shadow-3xl relative overflow-hidden border-4 border-white">
              <button onClick={resetForm} className="absolute top-10 right-10 p-3 hover:bg-stone-50 rounded-full transition-all"><X size={24}/></button>
              <h3 className="text-3xl font-serif italic text-stone-900 mb-10">{editingId ? 'Edit Event' : 'New Schedule'}</h3>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Name your event..." className="w-full text-3xl font-serif italic placeholder:text-stone-100 border-none focus:ring-0 p-0 text-stone-900 outline-none" />
                
                <div className="flex gap-4">
                  <div className="bg-stone-50 p-5 rounded-[2rem] flex-1 flex items-center gap-4 border-2 border-stone-50 focus-within:border-stone-200 transition-all">
                    <Clock size={20} className="text-stone-300" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-sm font-black w-full outline-none" />
                  </div>
                  <div className="bg-stone-50 p-5 rounded-[2rem] flex-[2] flex items-center gap-4 border-2 border-stone-50 focus-within:border-stone-200 transition-all">
                    <MapPin size={20} className="text-stone-300" />
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Google Maps Location" className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-[2rem] border-2 transition-all active:scale-95",
                      category === cat.id ? "bg-stone-900 border-stone-900 text-white shadow-2xl" : "bg-white border-stone-50 text-stone-300 hover:border-stone-200"
                    )}>
                      <cat.icon size={20} />
                      <span className="text-[9px] font-black uppercase tracking-tighter">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 items-center pt-4 border-t border-stone-50">
                   <label className="flex-1 flex items-center justify-center gap-4 p-5 bg-stone-50 rounded-[2rem] cursor-pointer border-2 border-dashed border-stone-200 hover:bg-stone-100 transition-all">
                      <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                      {previewUrl ? <img src={previewUrl} className="w-10 h-10 object-cover rounded-xl" /> : <ImageIcon size={24} className="text-stone-300" />}
                      <span className="text-xs font-black text-stone-500 uppercase tracking-widest">Photo</span>
                   </label>
                   <button disabled={loading} type="submit" className="flex-[2] py-6 bg-stone-900 text-white rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-95">
                      {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> <span>{editingId ? 'Update Pin' : 'Confirm Pin'}</span></>}
                   </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
