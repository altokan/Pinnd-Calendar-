import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, parseISO 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  X, MapPin, Clock, stickyNote, Save, Loader2 
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

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pins'), where('userId', '==', user.uid));
    return onSnapshot(q, (snapshot) => {
      setPins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

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

      // 1. رفع الصورة أولاً إذا وجدت
      if (imageFile) {
        const imageRef = ref(storage, `pins/${user.uid}/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      // 2. حفظ البيانات في Firestore
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

  // ... (تكملة كود التقويم مع استخدام var(--primary-color) في الأزرار)
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Calendar UI Here */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold italic">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-stone-100 rounded-full transition-all"><ChevronLeft /></button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-stone-100 rounded-full transition-all"><ChevronRight /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-stone-400 py-2 uppercase tracking-widest">{day}</div>
        ))}
        {/* Days logic... */}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden relative">
              <button onClick={resetForm} className="absolute top-6 right-6 text-stone-400 hover:text-black"><X /></button>
              <h3 className="text-xl font-bold mb-6">Pin to {selectedDate && format(selectedDate, 'MMM dd')}</h3>
              
              <form onSubmit={handleAddPin} className="space-y-4">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's happening?" className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 ring-black/5 outline-none font-medium" />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add some notes..." className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 ring-black/5 outline-none resize-none h-32" />
                
                <div className="relative group">
                  <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl cursor-pointer group-hover:border-black/20 transition-all">
                    {previewUrl ? <img src={previewUrl} className="h-20 w-20 object-cover rounded-xl" /> : <><ImageIcon size={20}/> <span>Add Photo</span></>}
                  </label>
                </div>

                <button disabled={loading} type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> <span>Save Pin</span></>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
