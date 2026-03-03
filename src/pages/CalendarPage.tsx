import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Trash2, Loader2, MapPin, AlignLeft, List, Grid, X, 
  Clock, Bell, Image as ImageIcon, Utensils, Stethoscope, PartyPopper, Briefcase, Plus, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// أنواع المواعيد
const EVENT_TYPES = [
  { id: 'restaurant', icon: <Utensils size={18} />, label: 'Restaurant', color: 'bg-orange-100 text-orange-600' },
  { id: 'doctor', icon: <Stethoscope size={18} />, label: 'Doctor', color: 'bg-red-100 text-red-600' },
  { id: 'party', icon: <PartyPopper size={18} />, label: 'Party', color: 'bg-purple-100 text-purple-600' },
  { id: 'work', icon: <Briefcase size={18} />, label: 'Work', color: 'bg-blue-100 text-blue-600' },
  { id: 'other', icon: <CalendarIcon size={18} />, label: 'Other', color: 'bg-stone-100 text-stone-600' },
];

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 14);
  return null;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'traditional' | 'timeline'>('traditional');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // حالات إضافة حدث جديد
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newType, setNewType] = useState('other');
  const [newLocation, setNewLocation] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newCoords, setNewCoords] = useState<[number, number]>([24.7136, 46.6753]);

  const userId = auth.currentUser?.uid || "guest";
  const eventDocRef = doc(db, "events", userId);

  useEffect(() => {
    const unsub = onSnapshot(eventDocRef, (d) => {
      if (d.exists()) {
        const sorted = (d.data().events || []).sort((a: any, b: any) => 
          new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime()
        );
        setEvents(sorted);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleAddEvent = async () => {
    if (!newTitle || !selectedDay) return toast.error('Please enter a title');
    
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const newEvent = {
      id: `ev_${Date.now()}`,
      title: newTitle,
      date: dateStr,
      time: newTime,
      type: newType,
      location: newLocation,
      lat: newCoords[0],
      lng: newCoords[1],
      extraNote: newNote,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(eventDocRef, { events: arrayUnion(newEvent) }, { merge: true });
      toast.success('Event Saved');
      setShowAddModal(false);
      resetForm();
    } catch (e) { toast.error('Error saving'); }
  };

  const resetForm = () => {
    setNewTitle(''); setNewTime('12:00'); setNewType('other'); setNewLocation(''); setNewNote('');
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth(currentDate.getFullYear(), currentDate.getMonth()); i++) calendarDays.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-stone-400" /></div>;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-6 sticky top-0 z-[100]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-3 bg-stone-100 rounded-2xl"><ChevronLeft size={24} /></button>
          
          <div className="flex bg-stone-100 p-1 rounded-2xl">
            <button onClick={() => setViewMode('traditional')} className={cn("px-6 py-2 rounded-xl text-sm font-black transition-all", viewMode === 'traditional' ? "bg-white shadow-md text-blue-600" : "text-stone-400")}>Calendar</button>
            <button onClick={() => setViewMode('timeline')} className={cn("px-6 py-2 rounded-xl text-sm font-black transition-all", viewMode === 'timeline' ? "bg-white shadow-md text-blue-600" : "text-stone-400")}>Timeline</button>
          </div>

          <button onClick={() => navigate('/map')} className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><MapPin size={24} /></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10">
        {viewMode === 'traditional' && (
          <>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-4xl font-black text-stone-800 tracking-tighter">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 bg-white rounded-xl shadow-sm"><ChevronLeft/></button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 bg-white rounded-xl shadow-sm"><ChevronRight/></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-black text-stone-300 uppercase pb-4">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                return (
                  <div 
                    key={i} 
                    onClick={() => day && setSelectedDay(day)}
                    className={cn(
                      "aspect-square rounded-[2rem] p-4 relative border-2 flex flex-col items-start justify-between transition-all",
                      day ? "bg-white border-stone-100 hover:border-blue-200 cursor-pointer shadow-sm" : "bg-transparent border-transparent",
                      selectedDay === day && "border-blue-500 ring-4 ring-blue-50"
                    )}
                  >
                    {day && (
                      <>
                        <span className="font-black text-xl">{day}</span>
                        <div className="flex gap-1 flex-wrap">
                          {dayEvents.map((ev, idx) => (
                            <div key={idx} className="w-2 h-2 rounded-full bg-blue-400" />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Timeline View (إبقاء الكود كما هو من المرة السابقة) */}
        {viewMode === 'timeline' && (
            <div className="space-y-6">
                {events.map(ev => (
                    <div key={ev.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex flex-col items-center justify-center font-black">
                            <span className="text-[10px] text-blue-400">{new Date(ev.date).toLocaleString('default', {month:'short'})}</span>
                            <span>{new Date(ev.date).getDate()}</span>
                        </div>
                        <div>
                            <h3 className="font-black text-xl">{ev.title}</h3>
                            <p className="text-stone-400 text-sm">{ev.time} • {ev.location}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* نافذة إضافة حدث جديد (تظهر عند اختيار يوم) */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          >
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setSelectedDay(null)} />
            <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-stone-800">
                    {selectedDay} {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-blue-500 font-bold uppercase text-xs tracking-widest">Add New Event</p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-3 bg-stone-100 rounded-full"><X/></button>
              </div>

              <div className="space-y-6">
                {/* اسم الحدث */}
                <input 
                  type="text" placeholder="What's the plan?" 
                  className="w-full p-6 bg-stone-100 rounded-[2rem] text-xl font-bold border-none outline-none"
                  value={newTitle} onChange={e => setNewTitle(e.target.value)}
                />

                {/* الوقت والتنبيه */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-50 rounded-3xl flex items-center gap-3">
                    <Clock className="text-stone-400" />
                    <input type="time" className="bg-transparent font-bold outline-none" value={newTime} onChange={e => setNewTime(e.target.value)} />
                  </div>
                  <button className="p-4 bg-stone-50 rounded-3xl flex items-center gap-3 text-stone-400 font-bold">
                    <Bell size={20}/> <span>Remind me</span>
                  </button>
                </div>

                {/* أنواع المواعيد (الأيقونات) */}
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {EVENT_TYPES.map(type => (
                    <button 
                      key={type.id} 
                      onClick={() => setNewType(type.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 min-w-[80px] rounded-3xl transition-all border-2",
                        newType === type.id ? "border-blue-500 bg-blue-50 scale-105" : "border-stone-100 bg-white"
                      )}
                    >
                      <div className={cn("p-3 rounded-2xl", type.color)}>{type.icon}</div>
                      <span className="text-[10px] font-black uppercase">{type.label}</span>
                    </button>
                  ))}
                </div>

                {/* العنوان والخريطة */}
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                    <input 
                      type="text" placeholder="Add Location..." 
                      className="w-full p-4 pl-12 bg-stone-100 rounded-2xl outline-none"
                      value={newLocation} onChange={e => setNewLocation(e.target.value)}
                    />
                  </div>
                  <div className="h-40 rounded-[2rem] overflow-hidden border-2 border-stone-50">
                    <MapContainer center={newCoords} zoom={13} style={{height:'100%', width:'100%'}} zoomControl={false}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      <Marker position={newCoords} />
                      <ChangeView center={newCoords} />
                    </MapContainer>
                  </div>
                </div>

                {/* ملاحظات */}
                <textarea 
                  placeholder="Additional notes..." 
                  className="w-full p-6 bg-stone-50 rounded-[2rem] outline-none h-32 resize-none"
                  value={newNote} onChange={e => setNewNote(e.target.value)}
                />

                <button 
                  onClick={handleAddEvent}
                  className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <Check size={24}/> Save Event
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
