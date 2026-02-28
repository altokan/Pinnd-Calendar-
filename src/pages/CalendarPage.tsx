import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  X, Save, Loader2, MapPin, Clock, Trash2, Edit3, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { collection, addDoc, updateDoc, query, where, onSnapshot, serverTimestamp, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pins, setPins] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
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
    setPreviewUrl(pin.imageUrl);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(''); setTime('12:00'); setLocation('');
    setImageFile(null); setPreviewUrl(null);
    setIsModalOpen(false); setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Title is required');

    setLoading(true);
    const toastId = toast.loading(editingId ? "Updating..." : "Saving...");

    try {
      let finalImageUrl = previewUrl || '';

      if (imageFile) {
        const fileRef = ref(storage, `pins/${user.uid}/${Date.now()}`);
        const uploadTask = await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(uploadTask.ref);
      }

      const pinData = {
        title, time, location,
        imageUrl: finalImageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'pins', editingId), pinData);
        toast.success('Updated!', { id: toastId });
      } else {
        await addDoc(collection(db, 'pins'), { 
          ...pinData, 
          userId: user.uid, 
          createdAt: serverTimestamp() 
        });
        toast.success('Pinned!', { id: toastId });
      }
      resetForm();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, 'pins', id));
      toast.success('Deleted');
    } catch (e) { toast.error('Failed to delete'); }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const selectedDayPins = pins.filter(p => p.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-6xl font-serif italic text-stone-900">{format(currentDate, 'MMMM')}</h2>
          <p className="text-stone-400 font-bold tracking-widest uppercase text-[10px] mt-2">Year {format(currentDate, 'yyyy')}</p>
        </div>
        <div className="flex bg-white shadow-sm p-2 rounded-2xl border border-stone-100">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-stone-50 rounded-xl"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-stone-50 rounded-xl"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden">
        <div className="grid grid-cols-7 bg-stone-50/50 border-b border-stone-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-4 text-center text-[10px] font-black text-stone-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const hasPins = pins.some(p => p.date === format(day, 'yyyy-MM-dd'));
            const isSelected = isSameDay(day, selectedDate);
            return (
              <div key={i} onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }}
                className={cn(
                  "h-32 p-4 border-r border-b border-stone-50 cursor-pointer transition-all hover:bg-stone-50/50",
                  !isSameDay(startOfMonth(day), startOfMonth(currentDate)) && "opacity-20",
                  isSelected && "bg-stone-50 shadow-inner"
                )}>
                <span className={cn("text-sm font-bold", isToday(day) && "text-blue-600 underline underline-offset-4")}>{format(day, 'd')}</span>
                {hasPins && <div className="w-1.5 h-1.5 bg-stone-900 rounded-full mt-2 mx-auto" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Panel */}
      <AnimatePresence>
        {isTimelineOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTimelineOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[4rem] z-50 max-h-[75vh] overflow-y-auto p-10 shadow-2xl">
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-serif italic">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => setIsModalOpen(true)} className="p-4 bg-stone-900 text-white rounded-2xl shadow-lg active:scale-95"><Plus size={24}/></button>
                </div>

                <div className="space-y-4">
                  {selectedDayPins.map(pin => (
                    <div key={pin.id} className="flex items-center gap-6 p-6 bg-stone-50 rounded-[2.5rem] border border-stone-100 group">
                      <div className="text-sm font-black w-16 border-r border-stone-200">{pin.time}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{pin.title}</h4>
                        {pin.location && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.location)}`} target="_blank" className="text-[11px] text-blue-500 font-bold flex items-center gap-1 mt-1">
                            <MapPin size={12}/> {pin.location} <ExternalLink size={10}/>
                          </a>
                        )}
                      </div>
                      {pin.imageUrl && <img src={pin.imageUrl} className="w-14 h-14 object-cover rounded-2xl border-2 border-white shadow-sm" />}
                      <div className="flex gap-2">
                        <button onClick={() => openEditModal(pin)} className="p-2 text-stone-400 hover:text-stone-900"><Edit3 size={18}/></button>
                        <button onClick={() => handleDelete(pin.id)} className="p-2 text-stone-300 hover:text-red-500"><Trash2 size={18}/></button>
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[3rem] w-full max-w-lg p-10 relative">
              <button onClick={resetForm} className="absolute top-8 right-8 text-stone-400 hover:text-stone-900"><X size={24}/></button>
              <h3 className="text-2xl font-serif italic mb-8">{editingId ? 'Edit Event' : 'New Event'}</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" className="w-full text-2xl font-serif border-none outline-none focus:ring-0 p-0" />
                <div className="flex gap-4">
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-stone-50 p-4 rounded-2xl flex-1 text-sm font-bold border-none" />
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="bg-stone-50 p-4 rounded-2xl flex-[2] text-sm font-bold border-none" />
                </div>
                <label className="flex items-center justify-center gap-4 p-5 bg-stone-50 rounded-2xl cursor-pointer border-2 border-dashed border-stone-200">
                  <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                  {previewUrl ? <img src={previewUrl} className="w-10 h-10 object-cover rounded-lg" /> : <ImageIcon className="text-stone-300"/>}
                  <span className="text-xs font-bold text-stone-500 uppercase">Photo</span>
                </label>
                <button disabled={loading} type="submit" className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95">
                  {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Confirm</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
