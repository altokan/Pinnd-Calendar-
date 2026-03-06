import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  MapPin, Trash2, Edit3, X, Check, ImageIcon, Plus, 
  Loader2, Clock, Grid, List, Bell, BellOff
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[] | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  const userId = auth.currentUser?.uid || "guest";
  const eventsDocRef = doc(db, "events", userId);

  useEffect(() => {
    const unsub = onSnapshot(eventsDocRef, (d) => {
      if (d.exists()) setEvents(d.data().events || []);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  return (
    <div className="min-h-screen bg-[#fcfcfc] px-4 py-6 pb-40 font-sans text-stone-800 overflow-x-hidden">
      
      {/* Header */}
      <div className="max-w-4xl mx-auto flex flex-col items-start justify-between mb-8 gap-4">
        <div className="w-full flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-stone-900">
              {currentDate.toLocaleString('en-US', { month: 'long' })}
              <span className="text-blue-600 ml-2">{currentDate.getFullYear()}</span>
            </h1>
            <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-1">Schedules Overview</p>
          </div>
          <div className="flex bg-stone-100 p-1 rounded-xl">
             <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-lg", viewMode === 'grid' ? "bg-white shadow text-blue-600" : "text-stone-400")}><Grid size={16}/></button>
             <button onClick={() => setViewMode('timeline')} className={cn("p-1.5 rounded-lg", viewMode === 'timeline' ? "bg-white shadow text-blue-600" : "text-stone-400")}><List size={16}/></button>
          </div>
        </div>

        <div className="flex w-full justify-between gap-2 bg-white p-1.5 rounded-3xl shadow-sm border border-stone-100">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 bg-stone-50 rounded-2xl"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 font-black text-xs uppercase">Today</button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 bg-stone-50 rounded-2xl"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* New Calendar Grid Design */}
      <div className="max-w-4xl mx-auto bg-white rounded-[3rem] p-6 shadow-xl border border-stone-50">
        <div className="grid grid-cols-7 mb-6">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[9px] font-black text-stone-300 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-y-4">
          {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            return (
              <motion.div 
                key={day}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center justify-center relative py-1"
              >
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full text-sm font-black transition-all",
                  isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-stone-700 hover:bg-stone-50"
                )}>
                  {day}
                </div>
                {/* Dots for events */}
                <div className="flex gap-0.5 mt-1 h-1">
                  <div className="w-1 h-1 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <button className="fixed bottom-28 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[500] active:scale-90">
        <Plus size={32} />
      </button>
    </div>
  );
}
