import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  List, 
  LayoutGrid, 
  PenTool,
  ZoomIn,
  ZoomOut,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ViewMode, CalendarPin } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { AlertTriangle } from 'lucide-react';
import EventModal from '../components/EventModal';
import SketchCanvas from '../components/SketchCanvas';

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [pins, setPins] = useState<CalendarPin[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db || db.type !== 'firestore') return;

    const q = query(
      collection(db, 'pins'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pinsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarPin[];
      setPins(pinsData);
    });

    return unsubscribe;
  }, [user]);

  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-serif font-bold text-stone-800">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center glass rounded-full p-1 shadow-sm">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 text-xs font-medium hover:bg-white/50 rounded-full transition-colors"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <div className="relative mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
            <input 
              type="text" 
              placeholder="Search pins..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 glass rounded-full text-sm outline-none focus:ring-2 focus:ring-stone-200 shadow-sm w-40 md:w-60"
            />
          </div>

          <div className="flex items-center glass rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
                viewMode === 'calendar' ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-white/50"
              )}
            >
              <CalendarIcon size={16} />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={cn(
                "p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
                viewMode === 'timeline' ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-white/50"
              )}
            >
              <List size={16} />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={cn(
                "p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
                viewMode === 'board' ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-white/50"
              )}
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button 
              onClick={() => setViewMode('sketch')}
              className={cn(
                "p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
                viewMode === 'sketch' ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-white/50"
              )}
            >
              <PenTool size={16} />
              <span className="hidden sm:inline">Sketch</span>
            </button>
          </div>

          <div className="flex items-center glass rounded-lg p-1 shadow-sm">
            <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))} className="p-2 hover:bg-white/50 rounded-md text-stone-500">
              <ZoomOut size={16} />
            </button>
            <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} className="p-2 hover:bg-white/50 rounded-md text-stone-500">
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filteredPins = pins.filter(pin => 
    pin.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    pin.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dayPins = filteredPins.filter(pin => isSameDay(new Date(pin.date), cloneDay));

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] p-2 border-r border-b border-stone-100 bg-white transition-all hover:bg-stone-50/50 cursor-pointer relative group",
              !isSameMonth(day, monthStart) ? "bg-stone-50/30 text-stone-300" : "text-stone-800",
              isSameDay(day, selectedDate) ? "bg-stone-50 ring-1 ring-inset ring-stone-200" : ""
            )}
            onClick={() => {
              setSelectedDate(cloneDay);
              setIsModalOpen(true);
            }}
          >
            <span className={cn(
              "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1",
              isSameDay(day, new Date()) ? "bg-stone-900 text-white" : ""
            )}>
              {formattedDate}
            </span>
            
            <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
              {dayPins.map(pin => (
                <div 
                  key={pin.id} 
                  className="text-[10px] leading-tight p-1 bg-stone-100 rounded border border-stone-200 truncate flex items-center gap-1"
                >
                  {pin.imageUrl && <div className="w-3 h-3 rounded-sm bg-stone-300 flex-shrink-0" />}
                  {pin.title}
                </div>
              ))}
            </div>

            <button className="absolute bottom-2 right-2 p-1 bg-stone-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
              <Plus size={12} />
            </button>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="border-t border-l border-stone-100 rounded-xl overflow-hidden shadow-sm" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-100">
          {daysOfWeek.map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold text-stone-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderTimeline = () => {
    const sortedPins = [...filteredPins].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return (
      <div className="space-y-8 py-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {sortedPins.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-200">
            <p className="text-stone-400 font-serif italic">No pins yet. Start by adding one!</p>
          </div>
        ) : (
          sortedPins.map((pin, idx) => (
            <motion.div 
              key={pin.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex gap-6 relative"
            >
              {idx !== sortedPins.length - 1 && (
                <div className="absolute left-[27px] top-10 bottom-[-32px] w-px bg-stone-200" />
              )}
              <div className="flex-shrink-0 w-14 h-14 bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center shadow-sm z-10">
                <span className="text-xs font-bold text-stone-400 uppercase">{format(new Date(pin.date), 'MMM')}</span>
                <span className="text-lg font-serif font-bold text-stone-800">{format(new Date(pin.date), 'dd')}</span>
              </div>
              <div className="flex-1 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-stone-800">{pin.title}</h3>
                  {pin.time && <span className="text-xs text-stone-400 font-medium">{pin.time}</span>}
                </div>
                {pin.imageUrl && (
                  <img src={pin.imageUrl} alt={pin.title} className="w-full h-48 object-cover rounded-xl mb-3" />
                )}
                {pin.notes && <p className="text-sm text-stone-600 line-clamp-2">{pin.notes}</p>}
              </div>
            </motion.div>
          ))
        )}
      </div>
    );
  };

  const renderBoard = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {filteredPins.map((pin, idx) => (
          <motion.div
            key={pin.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
              {pin.imageUrl ? (
                <img src={pin.imageUrl} alt={pin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-300">
                  <CalendarIcon size={48} />
                </div>
              )}
              <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold uppercase tracking-wider text-stone-800 shadow-sm">
                {format(new Date(pin.date), 'MMM dd')}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-stone-800 mb-1 truncate">{pin.title}</h3>
              {pin.notes && <p className="text-xs text-stone-500 line-clamp-2">{pin.notes}</p>}
            </div>
          </motion.div>
        ))}
        <button 
          onClick={() => {
            setSelectedDate(new Date());
            setIsModalOpen(true);
          }}
          className="aspect-[4/5] border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-all bg-stone-50/50"
        >
          <Plus size={32} className="mb-2" />
          <span className="font-medium">Add Pin</span>
        </button>
      </div>
    );
  };

  return (
    <div className="pb-20">
      {!isFirebaseConfigured && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Firebase Not Configured</h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              To save and sync your pins, please add your Firebase API keys to the <b>Secrets</b> panel in AI Studio.
            </p>
          </div>
        </div>
      )}
      {renderHeader()}
      
      <div className="overflow-x-auto no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode === 'calendar' && renderCalendar()}
            {viewMode === 'timeline' && renderTimeline()}
            {viewMode === 'board' && renderBoard()}
            {viewMode === 'sketch' && (
              <div className="h-[70vh]">
                <SketchCanvas />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialDate={selectedDate} 
      />
    </div>
  );
};

export default CalendarPage;
