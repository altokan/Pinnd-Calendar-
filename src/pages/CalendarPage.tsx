import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  X, Save, Loader2, Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pins, setPins] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // جلب البيانات من فايربيس
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pins'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // حساب أيام التقويم
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
    if (!user || !selectedDate || !title) return toast.error('Please add a title');

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
        imageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        createdAt: serverTimestamp(),
      });

      toast.success('Event pinned successfully!');
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setImageFile(null);
    setPreviewUrl(null);
    setIsAddModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter italic">
            {format(currentDate, 'MMMM')} <span className="text-stone-400 font-light">{format(currentDate, 'yyyy')}</span>
          </h2>
        </div>
        <div className="flex gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 text-xs font-bold uppercase tracking-widest">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Grid Calendar */}
      <div className="grid grid-cols-7 gap-px bg-stone-200 border border-stone-200 rounded-[2rem] overflow-hidden shadow-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-stone-50 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-200">
            {day}
          </div>
        ))}
        
        {calendarDays.map((day, idx) => {
          const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
          const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);

          return (
            <div 
              key={idx}
              onClick={() => { setSelectedDate(day); setIsAddModalOpen(true); }}
              className={cn(
                "min-h-[120px] p-2 bg-white transition-all cursor-pointer hover:bg-stone-50 relative group",
                !isCurrentMonth && "bg-stone-50/50 text-stone-300"
              )}
            >
              <span className={cn(
                "inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-bold transition-all",
                isToday(day) ? "bg-[var(--primary-color)] text-white shadow-lg" : "text-stone-700 group-hover:bg-stone-100"
              )}>
                {format(day, 'd')}
              </span>

              <div className="mt-2 space-y-1">
                {dayPins.map((pin, i) => (
                  <div key={i} className="text-[10px] bg-stone-100 p-1.5 rounded-lg border border-stone-200 truncate font-bold flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color)]" />
                    {pin.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Pin Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl relative">
              <button onClick={resetForm} className="absolute top-8 right-8 p-2 hover:bg-stone-100 rounded-full transition-all text-stone-400 hover:text-black"><X size={20}/></button>
              
              <div className="mb-8 text-center sm:text-left">
                <h3 className="text-2xl font-black tracking-tight">Add Pin</h3>
                <p className="text-stone-400 font-medium">For {selectedDate && format(selectedDate, 'EEEE, MMMM do')}</p>
              </div>
              
              <form onSubmit={handleAddPin} className="space-y-5">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full px-6 py-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none font-bold" />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (Optional)" className="w-full px-6 py-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none resize-none h-28" />
                
                <label className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer hover:bg-stone-50 transition-all">
                  <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                  {previewUrl ? <img src={previewUrl} className="h-16 w-16 object-cover rounded-xl" /> : <ImageIcon className="text-stone-300" />}
                  <span className="text-xs font-bold text-stone-400 mt-2">Upload Photo</span>
                </label>

                <button disabled={loading} type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-black transition-all flex items-center justify-center gap-3">
                  {loading ? <Loader2 className="animate-spin" /> : <span>Save Pin</span>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
