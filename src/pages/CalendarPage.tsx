import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  X, Save, Loader2, Calendar as CalendarIcon, MapPin, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
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

  // Fetching Pins
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

  // Calendar Logic
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
        imageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        createdAt: serverTimestamp(),
      });

      toast.success('Pinned successfully');
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
    setImageFile(null);
    setPreviewUrl(null);
    setIsAddModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h2 className="text-4xl font-serif italic text-stone-900 leading-none">
            {format(currentDate, 'MMMM')}
          </h2>
          <p className="text-stone-400 font-medium tracking-widest uppercase text-xs">
            Year of {format(currentDate, 'yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-stone-200/50 shadow-sm">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-stone-100 rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-[10px] font-bold uppercase tracking-tighter hover:text-stone-500 transition-colors">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-stone-100 rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-xl shadow-stone-200/50 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-stone-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
            const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);

            return (
              <div 
                key={idx}
                onClick={() => { setSelectedDate(day); setIsAddModalOpen(true); }}
                className={cn(
                  "min-h-[140px] p-3 border-r border-b border-stone-100/50 transition-all cursor-pointer hover:bg-white/80 relative group",
                  !isCurrentMonth && "opacity-30",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <span className={cn(
                  "inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-medium mb-2",
                  isToday(day) ? "bg-stone-900 text-white shadow-md shadow-stone-300" : "text-stone-800"
                )}>
                  {format(day, 'd')}
                </span>

                <div className="space-y-1.5 overflow-hidden">
                  {dayPins.map((pin, i) => (
                    <div key={i} className="flex flex-col gap-1 p-1">
                      {pin.imageUrl && (
                        <img src={pin.imageUrl} className="h-10 w-full object-cover rounded-lg border border-white shadow-sm" alt="pin" />
                      )}
                      <p className="text-[10px] font-bold truncate text-stone-700 leading-tight">{pin.title}</p>
                    </div>
                  ))}
                </div>
                
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-6 h-6 rounded-full bg-stone-50 flex items-center justify-center border border-stone-200">
                    <Plus size={12} className="text-stone-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Pin Overlay */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/20 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl relative border border-stone-100">
              <button onClick={resetForm} className="absolute top-8 right-8 p-2 hover:bg-stone-50 rounded-full transition-all text-stone-300 hover:text-stone-900"><X size={20}/></button>
              
              <div className="mb-10">
                <h3 className="text-2xl font-serif italic mb-1">New Pin</h3>
                <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">{selectedDate && format(selectedDate, 'MMMM do, yyyy')}</p>
              </div>
              
              <form onSubmit={handleAddPin} className="space-y-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Pin Title" className="w-full text-xl font-medium placeholder:text-stone-200 border-none focus:ring-0 p-0 outline-none" />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add some notes or details..." className="w-full text-sm text-stone-500 placeholder:text-stone-200 border-none focus:ring-0 p-0 outline-none resize-none h-24" />
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer hover:bg-stone-100 transition-colors">
                    <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                    {previewUrl ? <img src={previewUrl} className="h-6 w-6 object-cover rounded-md" /> : <ImageIcon size={16} className="text-stone-400" />}
                    <span className="text-xs font-bold text-stone-600">Photo</span>
                  </label>
                </div>

                <div className="pt-6 border-t border-stone-50">
                  <button disabled={loading} type="submit" className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold shadow-xl shadow-stone-200 hover:bg-black transition-all flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <span>Create Pin</span>}
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
