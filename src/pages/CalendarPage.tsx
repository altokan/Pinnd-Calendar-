import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Camera, 
  X, Save, Loader2, MapPin, Clock, Trash2, Edit3, ExternalLink,
  Briefcase, HeartPulse, Plane, PartyPopper, Dumbbell, Star, 
  Calendar as CalendarIcon, Map as MapIcon, PenTool, LayoutGrid, FileText
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
  const [activeView, setActiveView] = useState('calendar'); // calendar, map, sketch, shortcuts
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
  const [notes, setNotes] = useState(''); // حقل الملاحظات الجديد
  const [category, setCategory] = useState('other');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // جلب البيانات مع التحديث الفوري (Real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pins'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPins(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 6 * 1024 * 1024) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      toast.error("File size must be under 6MB");
    }
  };

  const openEditModal = (pin: any) => {
    setEditingId(pin.id);
    setTitle(pin.title);
    setTime(pin.time);
    setLocation(pin.location || '');
    setNotes(pin.notes || '');
    setCategory(pin.category || 'other');
    setPreviewUrl(pin.imageUrl || null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setTime('12:00'); setLocation('');
    setNotes(''); setCategory('other'); setImageFile(null); setPreviewUrl(null);
    setIsModalOpen(false); setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Title is required');
    setLoading(true);
    const toastId = toast.loading("Saving changes...");

    try {
      let finalImageUrl = previewUrl || '';
      if (imageFile) {
        const imageRef = ref(storage, `pins/${user.uid}/${Date.now()}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const pinData = {
        title, time, location, notes, category,
        imageUrl: finalImageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'pins', editingId), pinData);
        toast.success('Updated!', { id: toastId });
      } else {
        await addDoc(collection(db, 'pins'), { ...pinData, userId: user.uid, createdAt: serverTimestamp() });
        toast.success('Pinned!', { id: toastId });
      }
      resetForm();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally { setLoading(false); }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const selectedDayPins = pins.filter(p => p.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-40 animate-in fade-in duration-700">
      
      {/* Top Header */}
      <div className="flex justify-between items-end mb-12">
        <div className="space-y-1">
          <h2 className="text-6xl font-serif italic text-stone-900 tracking-tighter">{format(currentDate, 'MMMM')}</h2>
          <p className="text-stone-400 font-black tracking-[0.3em] uppercase text-[10px]">Lifestyle Portfolio</p>
        </div>
        <div className="flex bg-white/50 backdrop-blur-xl p-2 rounded-2xl border border-white shadow-xl">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Main View Logic */}
      {activeView === 'calendar' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/70 backdrop-blur-md rounded-[3.5rem] overflow-hidden border-white border-4 shadow-2xl relative z-10">
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
                    "min-h-[140px] p-4 border-r border-b border-stone-50 cursor-pointer hover:bg-white transition-all group",
                    !isCurrentMonth && "opacity-20 pointer-events-none",
                    isSameDay(day, selectedDate) && "bg-white shadow-inner"
                  )}>
                  <span className={cn("inline-flex w-9 h-9 items-center justify-center rounded-xl text-sm font-bold mb-4", isToday(day) ? "bg-stone-900 text-white shadow-lg rotate-3" : "text-stone-800 border border-stone-100")}>{format(day, 'd')}</span>
                  <div className="flex flex-col gap-1.5">
                    {dayPins.slice(0, 2).map((pin, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-stone-50 shadow-sm">
                         <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", CATEGORIES.find(c => c.id === pin.category)?.color)} />
                         <span className="text-[8px] font-bold truncate uppercase text-stone-500 tracking-tighter">{pin.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {activeView === 'map' && (
        <div className="h-[60vh] bg-stone-100 rounded-[3.5rem] flex items-center justify-center border-4 border-white shadow-2xl overflow-hidden">
           <iframe width="100%" height="100%" src="http://googleusercontent.com/maps.google.com/4&output=embed" className="grayscale" />
        </div>
      )}

      {activeView === 'sketch' && (
        <div className="h-[60vh] bg-stone-50 rounded-[3.5rem] border-4 border-white shadow-2xl flex flex-col items-center justify-center space-y-4">
           <PenTool size={48} className="text-stone-200" />
           <p className="text-stone-400 font-serif italic text-xl">Sketch your thoughts here...</p>
        </div>
      )}

      {/* Navigation Bar (Bottom) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-900/90 backdrop-blur-2xl px-8 py-4 rounded-[2.5rem] shadow-3xl z-[100] border border-white/10 flex items-center gap-10">
         {[
           { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
           { id: 'map', icon: MapIcon, label: 'Map' },
           { id: 'sketch', icon: PenTool, label: 'Sketch' },
           { id: 'shortcuts', icon: LayoutGrid, label: 'Shortcuts' },
         ].map(item => (
           <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("flex flex-col items-center gap-1 transition-all", activeView === item.id ? "text-white scale-110" : "text-stone-500 hover:text-stone-300")}>
              <item.icon size={22} />
              <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
           </button>
         ))}
      </div>

      {/* Timeline Panel */}
      <AnimatePresence>
        {isTimelineOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTimelineOpen(false)} className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl rounded-t-[4rem] shadow-2xl z-50 max-h-[75vh] overflow-y-auto border-t-4 border-white">
              <div className="w-16 h-1 bg-stone-100 rounded-full mx-auto mt-6" />
              <div className="max-w-3xl mx-auto px-8 pb-32">
                <div className="flex items-center justify-between py-10">
                  <h3 className="text-4xl font-serif italic">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => setIsModalOpen(true)} className="p-5 bg-stone-900 text-white rounded-[2rem] shadow-xl hover:scale-105 transition-transform"><Plus size={28} /></button>
                </div>
                
                <div className="space-y-4">
                  {selectedDayPins.map((pin) => (
                    <div key={pin.id} className="flex items-center gap-6 p-6 bg-white rounded-[2.5rem] border-2 border-stone-50 shadow-sm relative overflow-hidden group">
                      <div className="text-center min-w-[70px] border-r-2 border-stone-50 pr-6 font-black text-stone-900 uppercase text-xs">{pin.time}</div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-stone-900">{pin.title}</h4>
                        {pin.notes && <p className="text-xs text-stone-400 mt-1 italic">{pin.notes}</p>}
                        {pin.location && <p className="text-[10px] font-bold text-blue-500 mt-2 flex items-center gap-1"><MapPin size={10} /> {pin.location}</p>}
                      </div>
                      {pin.imageUrl && <img src={pin.imageUrl} className="w-16 h-16 object-cover rounded-[1.2rem] shadow-md border-2 border-white" />}
                      <div className="flex gap-1">
                        <button onClick={() => openEditModal(pin)} className="p-3 text-stone-300 hover:text-stone-900 transition-colors"><Edit3 size={18} /></button>
                        <button onClick={() => deleteDoc(doc(db, 'pins', pin.id))} className="p-3 text-stone-100 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-3xl relative border-4 border-white overflow-hidden">
              <button onClick={resetForm} className="absolute top-8 right-8 p-2 hover:bg-stone-50 rounded-full"><X size={24}/></button>
              <h3 className="text-2xl font-serif italic mb-8">Schedule Visual</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title of event" className="w-full text-2xl font-serif italic border-none focus:ring-0 p-0 text-stone-900 outline-none placeholder:text-stone-100" />
                
                <div className="flex gap-3">
                  <div className="bg-stone-50 p-4 rounded-2xl flex-1 flex items-center gap-3">
                    <Clock size={18} className="text-stone-300" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl flex-[2] flex items-center gap-3">
                    <MapPin size={18} className="text-stone-300" />
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Add Location..." className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                </div>

                {/* حقل الملاحظات */}
                <div className="bg-stone-50 p-4 rounded-2xl flex items-start gap-3">
                   <FileText size={18} className="text-stone-300 mt-1" />
                   <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Write some details/notes here..." className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none h-20 resize-none" />
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn("p-4 rounded-2xl border-2 transition-all flex justify-center", category === cat.id ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-50 text-stone-300")}>
                      <cat.icon size={18} />
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 items-center pt-4">
                   <label className="flex-1 flex items-center justify-center gap-3 p-5 bg-stone-50 rounded-[1.5rem] cursor-pointer border-2 border-dashed border-stone-200 hover:bg-stone-100 transition-all group">
                      <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                      {previewUrl ? <img src={previewUrl} className="w-10 h-10 object-cover rounded-xl" /> : <Camera size={24} className="text-stone-300 group-hover:text-stone-900 transition-colors" />}
                      <span className="text-[10px] font-black text-stone-400 uppercase">Visual</span>
                   </label>
                   <button disabled={loading} type="submit" className="flex-[2] py-6 bg-stone-900 text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all">
                      {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> <span>Confirm</span></>}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
