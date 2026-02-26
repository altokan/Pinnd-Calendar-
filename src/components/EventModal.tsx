import React, { useState } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { X, Calendar, Clock, Image as ImageIcon, MapPin, FileText, Download, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { db, storage, isFirebaseConfigured } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, initialDate }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const accept: Accept = {
    'image/*': []
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false
  } as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return;

    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured. Please add your API keys in the Secrets panel.');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (image) {
        const storageRef = ref(storage, `pins/${user.uid}/${Date.now()}_${image.name}`);
        const uploadResult = await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      await addDoc(collection(db, 'pins'), {
        userId: user.uid,
        title,
        date,
        time,
        notes,
        imageUrl,
        location: { address: location },
        createdAt: serverTimestamp(),
      });

      toast.success('Event pinned successfully!');
      onClose();
      // Reset form
      setTitle('');
      setTime('');
      setNotes('');
      setLocation('');
      setImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error adding pin:', error);
      toast.error('Failed to pin event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToICS = () => {
    const event = {
      title,
      start: `${date.replace(/-/g, '')}T${time.replace(/:/g, '') || '0000'}00Z`,
      description: notes,
      location: location
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${event.title}
DTSTART:${event.start}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title || 'event'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <h3 className="text-xl font-serif font-bold text-stone-800">Pin New Event</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {!isFirebaseConfigured && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0" size={18} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Configuration Required</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Firebase API keys are missing. Please add them to the <b>Secrets</b> panel to enable saving pins.
                </p>
              </div>
            </div>
          )}
          {/* Title input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Event Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's happening?"
              className="w-full text-2xl font-serif border-none focus:ring-0 p-0 placeholder:text-stone-200"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date & Time */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                <Calendar className="text-stone-400" size={20} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase text-stone-400">Date</p>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                <Clock className="text-stone-400" size={20} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase text-stone-400">Time (Optional)</p>
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                <MapPin className="text-stone-400" size={20} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase text-stone-400">Location</p>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add a place"
                    className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Visual Pin</label>
              <div 
                {...getRootProps()} 
                className={cn(
                  "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                  isDragActive ? "border-stone-900 bg-stone-50" : "border-stone-200 hover:border-stone-400",
                  imagePreview ? "border-none" : ""
                )}
              >
                <input {...getInputProps()} />
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-red-500 shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="mx-auto mb-2 text-stone-300" size={32} />
                    <p className="text-xs text-stone-400 font-medium">Drop image or click to upload</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <FileText size={14} />
              <span>Notes</span>
            </div>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add some details or thoughts..."
              className="w-full min-h-[100px] p-4 bg-stone-50 rounded-2xl border border-stone-100 focus:ring-1 focus:ring-stone-200 focus:border-stone-200 text-sm resize-none"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button 
              type="button"
              onClick={exportToICS}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <Download size={14} />
              Export to Calendar
            </button>
          </div>
        </form>

        <div className="p-6 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-white border border-stone-200 rounded-2xl text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !title}
            className="btn-primary flex-1 py-3 px-6"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Save size={18} />
                Pin Event
              </div>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EventModal;
