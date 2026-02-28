import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  X, Save, Loader2, MapPin, Clock, Trash2, Edit3, ExternalLink, Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../services/firebase';
import { collection, addDoc, updateDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

// فئات بألوان زاهية ومميزة
const CATEGORIES = [
  { id: 'work', icon: Briefcase, label: 'Work', color: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-500' },
  { id: 'doctor', icon: HeartPulse, label: 'Doctor', color: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', dot: 'bg-rose-500' },
  { id: 'travel', icon: Plane, label: 'Travel', color: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-500' },
  { id: 'party', icon: PartyPopper, label: 'Party', color: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', dot: 'bg-purple-500' },
  { id: 'gym', icon: Dumbbell, label: 'Gym', color: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' },
  { id: 'other', icon: Star, label: 'Other', color: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-100', dot: 'bg-stone-500' },
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

  // 1. جلب البيانات بدون "orderBy" لتجنب مشاكل الـ Index في البداية
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pins'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // فرز يدوي بسيط بدلاً من Firestore OrderBy لتجنب الأخطاء
      setPins(data.sort((a: any, b: any) => b.createdAt - a.createdAt));
    }, (err) => {
      console.error("Firestore Error:", err);
      toast.error("Failed to load events");
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 6 * 1024 * 1024) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      toast.error("Image too large (Max 6MB)");
    }
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setTime('12:00'); setLocation('');
    setCategory('other'); setImageFile(null); setPreviewUrl(null);
    setIsModalOpen(false); setLoading(false);
  };

  // 2. إصلاح الحذف بشكل نهائي
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // منع فتح المودال عند الضغط على حذف
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, 'pins', id));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return;

    setLoading(true);
    const tId = toast.loading("Processing...");

    try {
      let finalImageUrl = previewUrl || '';
      if (imageFile) {
        const fileRef = ref(storage, `pins/${user.uid}/${Date.now()}`);
        const snap = await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(snap.ref);
      }

      const payload = {
        title, time, location, category,
        imageUrl: finalImageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'pins', editingId), payload);
        toast.success('Updated!', { id: tId });
      } else {
        await addDoc(collection(db, 'pins'), { 
          ...payload, 
          userId: user.uid, 
          createdAt: Date.now() // استخدام Timestamp رقمي للفرز السهل
        });
        toast.success('Pinned!', { id: tId });
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.message, { id: tId });
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const selectedDayPins = pins.filter(p => p.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 pb-32">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-6xl font-serif italic text-stone-900">{format(currentDate, 'MMMM')}</h2>
          <p className="text-stone-400 font-bold tracking-[0.2em] uppercase text-[10px] mt-2">Personal Schedule</p>
        </div>
        <div className="flex bg-white shadow-xl p-2 rounded-2xl border border-stone-100">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 hover:bg-stone-50 rounded-xl"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 hover:bg-stone-50 rounded-xl"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden">
        <div className="grid grid-cols-7 bg-stone-50/50 border-b border-stone-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-5 text-center text-[10px] font-black text-stone-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayPins = pins.filter(p => p.date === format(day, 'yyyy-MM-dd'));
            const isSelected = isSameDay(day, selectedDate);
            return (
              <div key={i} onClick={() => { setSelectedDate(day); setIsTimelineOpen(true); }}
                className={cn(
                  "h-36 p-4 border-r border-b border-stone-50 cursor-pointer transition-all hover:bg-white",
                  !isSameDay(startOfMonth(day), startOfMonth(currentDate)) && "opacity-10",
                  isSelected && "bg-stone-50/50 shadow-inner"
                )}>
                <span className={cn("text-sm font-bold", isToday(day) && "text-blue-600 underline underline-offset-4")}>{format(day, 'd')}</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {dayPins.map((p, idx) => (
                    <div key={idx} className={cn("w-2 h-2 rounded-full", CATEGORIES.find(c => c.id === p.category)?.dot || 'bg-stone-900')} />
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
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[4rem] z-50 max-h-[80vh] overflow-y-auto p-10 shadow-2xl border-t-4 border-white">
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-4xl font-serif italic">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => setIsModalOpen(true)} className="p-5 bg-stone-900 text-white rounded-[2rem] shadow-xl hover:scale-105 transition-transform"><Plus size={28}/></button>
                </div>

                <div className="space-y-4">
                  {selectedDayPins.length > 0 ? selectedDayPins.map(pin => {
                    const catStyle = CATEGORIES.find(c => c.id === pin.category) || CATEGORIES[5];
                    return (
                      <div key={pin.id} className={cn("flex items-center gap-6 p-6 rounded-[2.5rem] border transition-all", catStyle.color, catStyle.border)}>
                        <div className={cn("text-lg font-black w-20 border-r pr-4", catStyle.text)}>{pin.time}</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-xl text-stone-900">{pin.title}</h4>
                          {pin.location && (
                            // حل مشكلة الخرائط: رابط بحث جوجل المباشر (لا يحتاج API Key)
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.location)}`} target="_blank" rel="noreferrer" className="text-xs font-bold flex items-center gap-1 mt-1 text-stone-500 hover:underline">
                              <MapPin size={12}/> {pin.location}
                            </a>
                          )}
                        </div>
                        {pin.imageUrl && <img src={pin.imageUrl} className="w-16 h-16 object-cover rounded-2xl border-2 border-white shadow-md" />}
                        <div className="flex gap-2">
                          <button onClick={() => openEditModal(pin)} className="p-3 text-stone-400 hover:text-stone-900"><Edit3 size={20}/></button>
                          <button onClick={(e) => handleDelete(pin.id, e)} className="p-3 text-stone-300 hover:text-rose-600"><Trash2 size={20}/></button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-20 text-center text-stone-300 font-serif italic text-2xl">No plans today...</div>
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
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[3.5rem] w-full max-w-lg p-12 relative shadow-3xl">
              <button onClick={resetForm} className="absolute top-10 right-10 text-stone-400"><X size={24}/></button>
              <h3 className="text-3xl font-serif italic mb-10">{editingId ? 'Edit Event' : 'New Event'}</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What's happening?" className="w-full text-2xl font-serif border-none outline-none p-0 text-stone-900 placeholder:text-stone-200" />
                
                <div className="flex gap-4">
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-stone-50 p-5 rounded-2xl flex-1 text-sm font-bold border-none outline-none" />
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location..." className="bg-stone-50 p-5 rounded-2xl flex-[2] text-sm font-bold border-none outline-none" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn(
                      "py-3 rounded-xl border text-[10px] font-bold uppercase transition-all",
                      category === cat.id ? "bg-stone-900 text-white border-stone-900 shadow-lg" : "bg-white text-stone-400 border-stone-100 hover:bg-stone-50"
                    )}>
                      {cat.label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center justify-center gap-4 p-6 bg-stone-50 rounded-2xl cursor-pointer border-2 border-dashed border-stone-100">
                  <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                  {previewUrl ? <img src={previewUrl} className="w-12 h-12 object-cover rounded-xl" /> : <ImageIcon className="text-stone-200" size={30}/>}
                  <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Add Photo (Max 6MB)</span>
                </label>

                <button disabled={loading} type="submit" className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform">
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

// Icons support
function Briefcase(props: any) { return <path {...props} d="M16 7V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2" />; }
function HeartPulse(props: any) { return <path {...props} d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />; }
function Plane(props: any) { return <path {...props} d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />; }
function PartyPopper(props: any) { return <path {...props} d="M5.8 11.3 2 22l10.7-3.8z" />; }
function Dumbbell(props: any) { return <path {...props} d="M6.5 6.5 17.5 17.5" />; }
function Star(props: any) { return <path {...props} d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />; }
