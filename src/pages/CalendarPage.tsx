import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Trash2, Edit3, X, Check, ImageIcon, Plus, Loader2 
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // حالات التعديل
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');

  const userId = auth.currentUser?.uid || "guest";
  const eventsDocRef = doc(db, "events", userId);

  useEffect(() => {
    const unsub = onSnapshot(eventsDocRef, (d) => {
      if (d.exists()) setEvents(d.data().events || []);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const deleteEvent = async (eventId: string) => {
    const updatedEvents = events.filter(e => e.id !== eventId);
    await updateDoc(eventsDocRef, { events: updatedEvents });
    toast.success('Event deleted');
    setSelectedEvent(null);
  };

  const startEdit = (event: any) => {
    setEditTitle(event.title);
    setEditNote(event.extraNote || '');
    setEditDate(event.date);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    const updatedEvents = events.map(e => 
      e.id === selectedEvent.id 
      ? { ...e, title: editTitle, extraNote: editNote, date: editDate } 
      : e
    );
    await updateDoc(eventsDocRef, { events: updatedEvents });
    toast.success('Event updated');
    setIsEditing(false);
    setSelectedEvent(null);
  };

  if (loading) return <div className="fixed inset-0 bg-stone-50 flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" /></div>;

  return (
    <div className="min-h-screen bg-[#f8f5f2] p-6 pb-24 font-sans text-stone-800">
      
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-stone-900 capitalize">
            {currentDate.toLocaleString('default', { month: 'long' })}
            <span className="text-blue-600 ml-2">{currentDate.getFullYear()}</span>
          </h1>
          <p className="text-stone-400 font-bold text-sm uppercase tracking-widest mt-1">Main Schedule</p>
        </div>
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-stone-100">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-7 gap-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-stone-300 uppercase mb-2 tracking-widest">{d}</div>
        ))}
        
        {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
        
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

          return (
            <motion.div 
              key={day}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "aspect-square bg-white rounded-[1.5rem] p-2 border transition-all relative cursor-pointer group",
                isToday ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" : "border-stone-100 shadow-sm hover:shadow-md"
              )}
            >
              <span className={cn("text-sm font-black", isToday ? "text-blue-600" : "text-stone-400")}>{day}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {dayEvents.map(e => (
                  <div 
                    key={e.id} 
                    onClick={() => setSelectedEvent(e)}
                    className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal: View / Edit Event */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-stone-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden"
            >
              {/* Event Image if exists */}
              {selectedEvent.image && (
                <div className="w-full h-48 bg-stone-200 relative">
                  <img src={selectedEvent.image} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                </div>
              )}

              <div className="p-8">
                {!isEditing ? (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-3xl font-black text-stone-900 leading-none">{selectedEvent.title}</h2>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(selectedEvent)} className="p-3 bg-stone-100 rounded-2xl hover:bg-stone-200 transition-colors"><Edit3 size={18}/></button>
                        <button onClick={() => deleteEvent(selectedEvent.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"><Trash2 size={18}/></button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-stone-500 font-bold bg-stone-50 p-3 rounded-2xl">
                        <CalendarIcon size={18} className="text-blue-500" />
                        {selectedEvent.date}
                      </div>

                      {selectedEvent.location && (
                        <div className="flex items-center gap-3 text-stone-500 font-bold bg-stone-50 p-3 rounded-2xl">
                          <MapPin size={18} className="text-red-500" />
                          {selectedEvent.location}
                        </div>
                      )}

                      {selectedEvent.sourceContent && (
                        <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                          <p className="text-stone-700 italic">"{selectedEvent.sourceContent}"</p>
                        </div>
                      )}

                      {selectedEvent.extraNote && (
                        <p className="text-stone-400 text-sm leading-relaxed">{selectedEvent.extraNote}</p>
                      )}

                      {selectedEvent.lat && (
                        <div className="h-32 rounded-2xl overflow-hidden shadow-inner grayscale-[0.5]">
                          <MapContainer center={[selectedEvent.lat, selectedEvent.lng]} zoom={13} style={{height:'100%'}} zoomControl={false}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                            <Marker position={[selectedEvent.lat, selectedEvent.lng]} />
                          </MapContainer>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setSelectedEvent(null)} className="w-full mt-6 py-4 bg-stone-900 text-white rounded-2xl font-black">Close</button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-xl font-black mb-4">Edit Event</h2>
                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Title</label>
                      <input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Date</label>
                      <input type="date" value={editDate} onChange={(e)=>setEditDate(e.target.value)} className="w-full p-4 bg-stone-100 rounded-2xl outline-none font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Notes</label>
                      <textarea value={editNote} onChange={(e)=>setEditNote(e.target.value)} className="w-full p-4 bg-stone-100 rounded-2xl h-24 outline-none resize-none font-medium" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-stone-100 rounded-2xl font-bold">Cancel</button>
                      <button onClick={saveEdit} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"><Check size={18}/> Update</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Board */}
      <motion.button 
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[500]"
        onClick={() => toast('Redirecting to Board...')}
      >
        <Plus size={32} />
      </motion.button>

    </div>
  );
}
