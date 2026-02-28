import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Plus, Camera, 
  X, Save, Loader2, MapPin, Clock, Trash2, Edit3, 
  Briefcase, HeartPulse, Plane, PartyPopper, Dumbbell, Star, FileText, Bell, BellRing, Calendar as CalendarIcon
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

const REMINDER_OPTIONS = [
  { id: '1d', label: 'Before 1 Day' },
  { id: '5h', label: 'Before 5 Hours' },
  { id: '1h', label: 'Before 1 Hour' },
  { id: 'none', label: 'No Reminder' },
];

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pins, setPins] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null); // إضافة خط العرض
  const [lng, setLng] = useState<number | null>(null); // إضافة خط الطول
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('other');
  const [reminder, setReminder] = useState('none');
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // جلب البيانات مع التزامن اللحظي
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pins'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPins(fetchedPins);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLocationChange = async (val: string) => {
    setLocation(val);
    if (val.length > 2) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
    }
  };

  const openEditModal = (pin: any) => {
    setEditingId(pin.id);
    setTitle(pin.title);
    setTime(pin.time);
    setLocation(pin.location || '');
    setLat(pin.lat || null);
    setLng(pin.lng || null);
    setNotes(pin.notes || '');
    setCategory(pin.category || 'other');
    setReminder(pin.reminder || 'none');
    setPreviewUrl(pin.imageUrl || null);
    setIsPreviewOpen(false);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setTime('12:00'); setLocation('');
    setLat(null); setLng(null);
    setNotes(''); setCategory('other'); setReminder('none'); setImageFile(null); 
    setPreviewUrl(null); setIsModalOpen(false); setLoading(false); setShowReminderMenu(false);
  };

  // دالة الحذف الفورية
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this event?")) return;
    const previousPins = [...pins];
    setPins(pins.filter(p => p.id !== id));
    setIsPreviewOpen(false);

    try {
      await deleteDoc(doc(db, 'pins', id));
      toast.success('Deleted');
    } catch (e) {
      setPins(previousPins);
      toast.error('Delete failed');
    }
  };

  // دالة الإضافة الفورية (Optimistic Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return toast.error('Title is required');
    setLoading(true);
    const toastId = toast.loading("Saving...");

    try {
      let finalImageUrl = previewUrl || '';
      if (imageFile) {
        const imageRef = ref(storage, `pins/${user.uid}/${Date.now()}`);
        await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(imageRef);
      }

      const pinData = {
        title, time, location, lat, lng, notes, category, reminder,
        imageUrl: finalImageUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        updatedAt: new Date(),
      };

      // الحل الفوري للإضافة أو التعديل في الواجهة قبل السيرفر
      const tempId = editingId || Date.now().toString();
      const newPin = { id: tempId, ...pinData, userId: user.uid };
      
      if (!editingId) {
        setPins(prev => [newPin, ...prev]);
      } else {
        setPins(prev => prev.map(p => p.id === editingId ? { ...p, ...pinData } : p));
      }

      // المزامنة مع Firebase في الخلفية
      if (editingId) {
        await updateDoc(doc(db, 'pins', editingId), { ...pinData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'pins'), { ...pinData, userId: user.uid, createdAt: serverTimestamp() });
      }

      toast.success('Success!', { id: toastId });
      resetForm();
    } catch (error: any) {
      toast.error("Error saving", { id: toastId });
    } finally { setLoading(false); }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const selectedDayPins = pins.filter(p => p.date === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
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

      {/* Grid */}
      <div className="bg-white/70 backdrop-blur-md rounded-[3.5rem] overflow-hidden border-white border-4 shadow-2xl relative z-10">
        <div className="grid grid-cols-7 border-b border-stone-100 bg-white/30 text-center py-6 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
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
                  isSameDay(day, selectedDate) && "bg-white/80"
                )}>
                <span className={cn("inline-flex w-9 h-9 items-center justify-center rounded-xl text-sm font-bold mb-4", isToday(day) ? "bg-stone-900 text-white shadow-lg" : "text-stone-800 border border-stone-100")}>{format(day, 'd')}</span>
                <div className="flex flex-col gap-1.5">
                  {dayPins.slice(0, 2).map((pin) => (
                    <div key={pin.id} className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-stone-50 shadow-sm overflow-hidden animate-in fade-in zoom-in-95">
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
                <div className="flex items-center justify-between mb-10 sticky top-0 bg-white/10 py-6 z-10 backdrop-blur-sm">
                  <h3 className="text-4xl font-serif italic text-stone-900">{format(selectedDate, 'EEEE, MMM do')}</h3>
                  <button onClick={() => setIsModalOpen(true)} className="p-5 bg-stone-900 text-white rounded-[2rem] shadow-xl hover:scale-105 transition-transform"><Plus size={28} /></button>
                </div>
                <div className="space-y-4">
                  {selectedDayPins.length > 0 ? selectedDayPins.map((pin) => (
                    <div key={pin.id} onClick={() => { setSelectedPin(pin); setIsPreviewOpen(true); }} className="flex items-center gap-6 p-6 bg-white rounded-[2.5rem] border-2 border-stone-50 shadow-sm group cursor-pointer hover:border-stone-200 transition-all">
                      <div className="text-center min-w-[70px] border-r-2 border-stone-50 pr-6 font-black text-stone-900 uppercase text-sm">{pin.time}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <h4 className="text-lg font-bold text-stone-900">{pin.title}</h4>
                           {pin.reminder !== 'none' && <Bell size={12} className="text-amber-500" />}
                        </div>
                        {pin.notes && <p className="text-xs text-stone-400 mt-1 italic line-clamp-1">{pin.notes}</p>}
                        {pin.location && <p className="text-[11px] font-bold text-blue-500 flex items-center gap-1 mt-1 truncate"><MapPin size={12} /> {pin.location}</p>}
                      </div>
                      {pin.imageUrl && <img src={pin.imageUrl} className="w-14 h-14 object-cover rounded-2xl" />}
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-300 gap-4">
                        <CalendarIcon size={64} strokeWidth={1} />
                        <p className="font-serif italic text-xl">No events scheduled for today</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && selectedPin && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-lg">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-3xl border-4 border-white">
              <div className="h-64 relative bg-stone-100">
                {selectedPin.imageUrl ? (
                  <img src={selectedPin.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-200"><Camera size={48} /></div>
                )}
                <button onClick={() => setIsPreviewOpen(false)} className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white hover:text-stone-900 transition-all"><X size={20}/></button>
                <div className={cn("absolute bottom-6 left-6 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest", CATEGORIES.find(c => c.id === selectedPin.category)?.color)}>
                  {selectedPin.category}
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-4xl font-serif italic text-stone-900">{selectedPin.title}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(selectedPin)} className="p-4 bg-stone-50 text-stone-900 rounded-2xl hover:bg-stone-100 transition-all"><Edit3 size={20} /></button>
                    <button onClick={() => handleDelete(selectedPin.id)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all"><Trash2 size={20} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
                    <Clock className="text-stone-400" size={20} />
                    <div>
                      <p className="text-[9px] font-black text-stone-400 uppercase">Time</p>
                      <p className="text-sm font-bold text-stone-900">{selectedPin.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
                    <BellRing className="text-amber-500" size={20} />
                    <div>
                      <p className="text-[9px] font-black text-stone-400 uppercase">Reminder</p>
                      <p className="text-sm font-bold text-stone-900">{REMINDER_OPTIONS.find(o => o.id === selectedPin.reminder)?.label}</p>
                    </div>
                  </div>
                </div>

                {selectedPin.notes && (
                  <div className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100">
                    <div className="flex items-center gap-2 mb-2 text-stone-400">
                      <FileText size={16} />
                      <span className="text-[10px] font-black uppercase">Notes</span>
                    </div>
                    <p className="text-stone-600 text-sm leading-relaxed">{selectedPin.notes}</p>
                  </div>
                )}

                {selectedPin.location && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-400">
                      <MapPin size={16} />
                      <span className="text-[10px] font-black uppercase truncate">{selectedPin.location}</span>
                    </div>
                    <div className="h-40 w-full rounded-[2rem] overflow-hidden grayscale border-2 border-stone-50">
                      <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedPin.location)}&output=embed`} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-3xl relative border-4 border-white">
              <button onClick={resetForm} className="absolute top-8 right-8 text-stone-300 hover:text-stone-900"><X size={24}/></button>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center">
                  <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What's happening?" className="text-2xl font-serif italic border-none focus:ring-0 p-0 text-stone-900 outline-none w-full bg-transparent" />
                  <div className="relative">
                    <button type="button" onClick={() => setShowReminderMenu(!showReminderMenu)} className={cn("p-3 rounded-xl transition-all", reminder !== 'none' ? "bg-amber-50 text-amber-500" : "bg-stone-50 text-stone-300")}>
                      {reminder !== 'none' ? <BellRing size={20} /> : <Bell size={20} />}
                    </button>
                    <AnimatePresence>
                      {showReminderMenu && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden">
                          {REMINDER_OPTIONS.map(opt => (
                            <button key={opt.id} type="button" onClick={() => { setReminder(opt.id); setShowReminderMenu(false); }} className={cn("w-full text-left px-4 py-3 text-[11px] font-bold border-b border-stone-50 last:border-0 hover:bg-stone-50", reminder === opt.id ? "text-amber-500 bg-amber-50/30" : "text-stone-500")}>
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-stone-50 p-4 rounded-2xl flex-1 flex items-center gap-3 border border-stone-100">
                    <Clock size={18} className="text-stone-300" />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                  </div>
                  <div className="relative flex-[2]">
                    <div className="bg-stone-50 p-4 rounded-2xl flex items-center gap-3 border border-stone-100">
                      <MapPin size={18} className="text-stone-300" />
                      <input value={location} onChange={e => handleLocationChange(e.target.value)} placeholder="Location..." className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none" />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-100 max-h-40 overflow-auto">
                        {suggestions.map((s, i) => (
                          <button key={i} type="button" onClick={() => { 
                            setLocation(s.display_name); 
                            setLat(parseFloat(s.lat)); // حفظ خط العرض عند اختيار المقترح
                            setLng(parseFloat(s.lon)); // حفظ خط الطول عند اختيار المقترح
                            setSuggestions([]); 
                            setShowSuggestions(false); 
                          }} className="w-full text-left p-3 text-[10px] font-bold text-stone-500 hover:bg-stone-50 border-b border-stone-50">{s.display_name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl flex items-start gap-3 border border-stone-100">
                  <FileText size={18} className="text-stone-300 mt-1" />
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." className="bg-transparent border-none p-0 text-sm font-bold w-full outline-none h-16 resize-none" />
                </div>

                {location && (
                  <div className="h-32 w-full rounded-2xl overflow-hidden border-2 border-stone-100 grayscale hover:grayscale-0 transition-all">
                    <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed`} />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", category === cat.id ? "bg-stone-900 border-stone-900 text-white shadow-md" : "bg-white border-stone-50 text-stone-300")}>
                      <cat.icon size={18} />
                      <span className="text-[8px] font-black uppercase tracking-tighter">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 items-center">
                   <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-stone-50 rounded-2xl cursor-pointer border-2 border-dashed border-stone-200 hover:bg-stone-100 transition-all">
                      <input type="file" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); }
                      }} className="hidden" accept="image/*" />
                      {previewUrl ? <img src={previewUrl} className="w-8 h-8 object-cover rounded-lg" /> : <Camera size={20} className="text-stone-300" />}
                      <span className="text-[10px] font-black text-stone-500 uppercase">Visual</span>
                   </label>
                   <button disabled={loading} type="submit" className="flex-[2] py-5 bg-stone-900 text-white rounded-[1.8rem] font-black shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all">
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
