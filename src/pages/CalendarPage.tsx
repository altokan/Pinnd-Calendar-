import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Camera, 
  X, Save, Loader2, MapPin, Clock, Trash2, Edit3, ExternalLink,
  Briefcase, HeartPulse, Plane, PartyPopper, Dumbbell, Star, Calendar as CalendarIcon, FileText
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
  const [notes, setNotes] = useState(''); // حقل الملاحظات
  const [category, setCategory] = useState('other');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // جلب البيانات مع التحديث اللحظي
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
      if (file.size > 6 * 1024 * 1024) return toast.error("Max size 6MB");
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const openEditModal = (pin: any) => {
    setEditingId(pin.id);
    setTitle(pin.title);
    setTime(pin.time);
    setLocation(pin.location || '');
    setNotes(pin.notes || ''); // تحميل الملاحظات عند التعديل
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
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, 'pins', id));
      toast.success('Deleted');
    } catch (e) { toast.error('Error deleting'); }
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
        toast.success('Updated!', { id: toastId });
      } else {
        await addDoc(collection(db, 'pins'), { ...pinData, userId: user.uid, createdAt: serverTimestamp() });
        toast.success('Saved!', { id: toastId });
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
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32 animate-in fade-in duration-700">
      {/* Header */}
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

      {/* Calendar Grid */}
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
                  "min-h-[140px] p-4 border-r border-b border-stone-50 cursor-pointer hover:bg-white/50 transition-all group",
                  !isCurrentMonth && "opacity-20 pointer-events-none",
                  isSameDay(day, selectedDate) && "bg-white/80"
                )}>
                <span className={cn(
                  "inline-flex w-9 h-9 items-center justify-center rounded-xl text-sm font-bold mb-4",
                  isToday(day) ? "bg-stone-900 text-white shadow-lg" : "text-stone-800 border border-stone-100"
                )}>{format(day, 'd')}</span>
                <div className="flex flex-col gap-1.5">
                  {dayPins.slice(0, 2).map((pin, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-stone-50 shadow-sm">
                       <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", CATEGORIES.find(c => c.id === pin.category)?.color)} />
                       <span className="text-[8px] font-bold truncate uppercase text-stone-500">{pin.title}</span>
                    </div>
                  ))}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTimelineOpen(false)} className="fixed inset-0 bg-stone-900/10 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[4rem] shadow-2xl z-50 max-h-[80vh] overflow-y-auto border-t-4 border-white">
              <div className="w-16 h-1 bg-stone-100 rounded-full mx-auto mt-6 mb-2" />
              <div className="max-w-3xl mx-auto px-8 pb-20">
                <div className="flex items-center justify-between mb-10 sticky top-0 bg-white/10 py-6 z-10">
                  <h3 className="text-4xl font-serif italic">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => setIsModalOpen(true)} className="p-5 bg-stone-900 text-white rounded-[2rem] shadow-xl hover:scale-105 transition-transform"><Plus size={28} /></button>
                </div>
                
                <div className="space-y-4">
                  {selectedDayPins.length > 0 ? selectedDayPins.map((pin) => (
                    <div key={pin.id} className="flex items-center gap-6 p-6 bg-white rounded-[2.5rem] border-2 border-stone-50 shadow-sm group">
                      <div className="text-center min-w-[70px] border-r-2 border-stone-50 pr-6 font-black text-stone-900 uppercase text-sm">{pin.time}</div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-stone-900">{pin.title}</h4>
                        {pin.notes && <p className="text-xs text-stone-400 mt-1 italic line-clamp-1">{pin.notes}</p>}
                        {pin.location && (
                          <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.location)}`, '_blank')} className="text-[11px] font-bold text-blue-500 flex items-center gap-1 mt-1 hover:underline">
                            <MapPin size={12} /> {pin.location}
                          </button>
                        )}
                      </div>
                      {pin.imageUrl && <img src={pin.imageUrl} className="w-16 h-16 object-cover rounded-[1.2rem] border-2 border-stone-50 shadow-sm" />}
                      <div className="flex gap-1">
                        <button onClick={() => openEditModal(pin)} className="p-3 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => handleDelete(pin.id)} className="p-3 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center text-stone-200 font-serif italic text-2xl">A peaceful day...</div>
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-3xl relative border-4 border-white">
              <button onClick={resetForm} className="absolute top-8 right-8 text-stone-300 hover:text-stone-900"><X size={24}/></button>
              <h3 className="text-2xl font-serif italic mb-8">{editingId ? 'Edit Event' : 'New Schedule'}</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What's happening?" className="w-full text-2xl font-serif italic border-none focus:ring-0 p-0 text-stone-900 outline-none placeholder:text-stone-200" />
                
                <div className="flex gap-3">
                  <div className="bg-stone-50 p-4 rounded-2xl flex-1 flex items-center gap-3">
                    <Clock size={18} className="text-stone-300" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl flex-[2] flex items-center gap-3">
                    <MapPin size={18} className="text-stone-300" />
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Add location..." className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                </div>

                {/* صندوق الملاحظات الجديد */}
                <div className="bg-stone-50 p-4 rounded-2xl flex items-start gap-3">
                  <FileText size={18} className="text-stone-300 mt-1" />
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Add some notes or details..." 
                    className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none h-20 resize-none"
                  />
                </div>

                {/* خريطة المعاينة */}
                {location && (
                  <div className="h-32 w-full rounded-2xl overflow-hidden border-2 border-stone-50 grayscale hover:grayscale-0 transition-all">
                    <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`} />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      category === cat.id ? "bg-stone-900 border-stone-900 text-white" : "bg-white border-stone-50 text-stone-300"
                    )}>
                      <cat.icon size={18} />
                      <span className="text-[8px] font-black uppercase tracking-tighter">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 items-center">
                   <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-stone-50 rounded-2xl cursor-pointer border-2 border-dashed border-stone-200 hover:bg-stone-100 transition-all">
                      <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                      {previewUrl ? <img src={previewUrl} className="w-8 h-8 object-cover rounded-lg" /> : <Camera size={20} className="text-stone-300" />}
                      <span className="text-[10px] font-black text-stone-500 uppercase">Visual</span>
                   </label>
                   <button disabled={loading} type="submit" className="flex-[2] py-5 bg-stone-900 text-white rounded-[1.8rem] font-black shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95">
                      {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> {editingId ? 'Update' : 'Confirm'}</>}
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
