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
  const [activeView, setActiveView] = useState('calendar');
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
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('other');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // تحديث فوري للبيانات (Real-time) لإظهار التعديلات والحذف فورا
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
    if (file && file.size <= 6 * 1024 * 1024) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else if (file) {
      toast.error("Image too large (Max 6MB)");
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      await deleteDoc(doc(db, 'pins', id));
      toast.success('Deleted successfully');
    } catch (e) { toast.error('Delete failed'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Title is required');
    setLoading(true);
    const toastId = toast.loading("Saving...");

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
      } else {
        await addDoc(collection(db, 'pins'), { ...pinData, userId: user.uid, createdAt: serverTimestamp() });
      }
      toast.success('Saved!', { id: toastId });
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
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-40">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div className="space-y-1">
          <h2 className="text-6xl font-serif italic text-stone-900">{format(currentDate, 'MMMM')}</h2>
          <p className="text-stone-400 font-black tracking-widest uppercase text-[10px]">Lifestyle Portfolio</p>
        </div>
        <div className="flex bg-white/50 backdrop-blur-xl p-2 rounded-2xl border border-white shadow-xl">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/70 backdrop-blur-md rounded-[3.5rem] overflow-hidden border-white border-4 shadow-2xl">
        <div className="grid grid-cols-7 border-b border-stone-100 bg-white/30 text-center py-6 text-[10px] font-black uppercase tracking-widest text-stone-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
            const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentDate));
            return (
              <div key={idx} onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }}
                className={cn(
                  "min-h-[140px] p-4 border-r border-b border-stone-50 cursor-pointer hover:bg-white transition-all",
                  !isCurrentMonth && "opacity-20",
                  isSameDay(day, selectedDate) && "bg-white shadow-inner"
                )}>
                <span className={cn("inline-flex w-9 h-9 items-center justify-center rounded-xl text-sm font-bold", isToday(day) ? "bg-stone-900 text-white shadow-lg" : "text-stone-800")}>{format(day, 'd')}</span>
                <div className="mt-3 flex flex-col gap-1">
                  {dayPins.slice(0, 2).map((pin, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-stone-50 p-1.5 rounded-lg border border-stone-100 shadow-sm overflow-hidden">
                       <div className={cn("w-1.5 h-1.5 rounded-full", CATEGORIES.find(c => c.id === pin.category)?.color)} />
                       <span className="text-[8px] font-bold truncate uppercase text-stone-500">{pin.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Slide Up */}
      <AnimatePresence>
        {isTimelineOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTimelineOpen(false)} className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl rounded-t-[4rem] shadow-2xl z-50 max-h-[75vh] overflow-y-auto border-t-4 border-white">
              <div className="max-w-3xl mx-auto px-8 pb-32">
                <div className="flex items-center justify-between py-10 sticky top-0 bg-white/20 backdrop-blur-sm z-10">
                  <h3 className="text-4xl font-serif italic">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => setIsModalOpen(true)} className="p-5 bg-stone-900 text-white rounded-[2rem] shadow-xl hover:scale-105 transition-transform"><Plus size={28} /></button>
                </div>
                <div className="space-y-4">
                  {selectedDayPins.map((pin) => (
                    <div key={pin.id} className="flex items-center gap-6 p-7 bg-white rounded-[3rem] border-2 border-stone-50 shadow-xl group">
                      <div className="text-center min-w-[70px] border-r-2 border-stone-50 pr-6 font-black text-stone-900 uppercase text-xs">{pin.time}</div>
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-stone-900">{pin.title}</h4>
                        {pin.notes && <p className="text-xs text-stone-400 mt-1 italic">{pin.notes}</p>}
                        {pin.location && (
                          <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.location)}`, '_blank')} className="text-[11px] font-bold text-blue-500 flex items-center gap-1 mt-2">
                            <MapPin size={12} /> {pin.location}
                          </button>
                        )}
                      </div>
                      {pin.imageUrl && <img src={pin.imageUrl} className="w-16 h-16 object-cover rounded-[1.2rem] border-2 border-white shadow-md" />}
                      <div className="flex gap-1">
                        <button onClick={() => openEditModal(pin)} className="p-3 text-stone-300 hover:text-stone-900"><Edit3 size={18} /></button>
                        <button onClick={() => handleDelete(pin.id)} className="p-3 text-stone-100 hover:text-rose-500"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Luxury Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[4rem] w-full max-w-xl p-12 shadow-3xl relative border-4 border-white">
              <button onClick={resetForm} className="absolute top-10 right-10 p-3 hover:bg-stone-50 rounded-full transition-all"><X size={24}/></button>
              <h3 className="text-3xl font-serif italic text-stone-900 mb-10">{editingId ? 'Edit Pin' : 'New Schedule'}</h3>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title of event..." className="w-full text-3xl font-serif italic border-none focus:ring-0 p-0 text-stone-900 outline-none" />
                
                <div className="flex gap-4">
                  <div className="bg-stone-50 p-5 rounded-[2rem] flex-1 flex items-center gap-4 border-2 border-stone-50">
                    <Clock size={20} className="text-stone-300" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-sm font-black w-full outline-none" />
                  </div>
                  <div className="bg-stone-50 p-5 rounded-[2rem] flex-[2] flex items-center gap-4 border-2 border-stone-50">
                    <MapPin size={20} className="text-stone-300" />
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                </div>

                {/* خريطة تفاعلية صغيرة تظهر عند كتابة الموقع */}
                {location && (
                  <div className="h-40 w-full rounded-[2rem] overflow-hidden border-4 border-stone-50 grayscale hover:grayscale-0 transition-all duration-700">
                    <iframe width="100%" height="100%" src={`http://googleusercontent.com/maps.google.com/5{encodeURIComponent(location)}&output=embed`} />
                  </div>
                )}

                {/* حقل الملاحظات الجديد */}
                <div className="bg-stone-50 p-5 rounded-[2rem] flex items-start gap-4 border-2 border-stone-50">
                  <FileText size={20} className="text-stone-300 mt-1" />
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add some notes or details..." className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none h-20 resize-none" />
                </div>

                <div className="grid grid-cols-6 gap-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn(
                      "flex flex-col items-center justify-center p-5 rounded-[2rem] border-2 transition-all active:scale-95",
                      category === cat.id ? "bg-stone-900 border-stone-900 text-white shadow-2xl" : "bg-white border-stone-50 text-stone-300 hover:border-stone-200"
                    )}>
                      <cat.icon size={20} />
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 items-center pt-4 border-t border-stone-50">
                   <label className="flex-1 flex items-center justify-center gap-4 p-6 bg-stone-50 rounded-[2.5rem] cursor-pointer border-2 border-dashed border-stone-200 hover:bg-stone-100 transition-all group">
                      <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                      {previewUrl ? <img src={previewUrl} className="w-10 h-10 object-cover rounded-xl" /> : <Camera size={26} className="text-stone-300 group-hover:text-stone-900" />}
                      <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Photo</span>
                   </label>
                   <button disabled={loading} type="submit" className="flex-[2] py-7 bg-stone-900 text-white rounded-[3rem] font-black shadow-2xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-95">
                      {loading ? <Loader2 className="animate-spin" /> : <><Save size={22} /> <span>Confirm Pin</span></>}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Bar (Bottom) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-900/90 backdrop-blur-2xl px-10 py-5 rounded-[3rem] shadow-3xl z-[100] border border-white/10 flex items-center gap-12">
         {[
           { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
           { id: 'map', icon: MapIcon, label: 'Map' },
           { id: 'sketch', icon: PenTool, label: 'Sketch' },
           { id: 'shortcuts', icon: LayoutGrid, label: 'Quick' },
         ].map(item => (
           <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("flex flex-col items-center gap-1.5 transition-all", activeView === item.id ? "text-white scale-125" : "text-stone-500 hover:text-stone-300")}>
              <item.icon size={22} />
              <span className="text-[7px] font-black uppercase tracking-[0.2em]">{item.label}</span>
           </button>
         ))}
      </div>
    </div>
  );
}
