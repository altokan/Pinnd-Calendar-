import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase'; // تأكد من وجود storage في ملف firebase
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  limit 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Plus, 
  Trash2, 
  Layout as LayoutIcon, 
  Smartphone, 
  CheckCircle2,
  RefreshCw,
  UploadCloud,
  Link as LinkIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OnboardingSlide {
  title: string;
  desc: string;
  img: string;
}

export default function AdminPage() {
  const [version, setVersion] = useState("1.0");
  const [slides, setSlides] = useState<OnboardingSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  useEffect(() => {
    const q = query(collection(db, "app_config"), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setVersion(data.onboardingVersion || "1.0");
        setSlides(data.slides || []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addSlide = () => {
    setSlides([...slides, { title: "", desc: "", img: "" }]);
  };

  const removeSlide = (index: number) => {
    setSlides(slides.filter((_, i) => i !== index));
  };

  const updateSlide = (index: number, field: keyof OnboardingSlide, value: string) => {
    const newSlides = [...slides];
    newSlides[index][field] = value;
    setSlides(newSlides);
  };

  // ✅ وظيفة رفع الصور الجديدة
  const handleFileUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    const storageRef = ref(storage, `onboarding/${Date.now()}_${file.name}`);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      updateSlide(index, 'img', url);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed!");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "app_config", "onboarding"), {
        onboardingVersion: version,
        slides: slides,
        updatedAt: new Date().toISOString()
      });
      toast.success("Changes deployed to all users!");
    } catch (error) {
      toast.error("Failed to sync changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RefreshCw className="animate-spin text-stone-300" size={32} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-8">
        <div>
          <h1 className="text-4xl font-serif italic text-stone-800">Command Center</h1>
          <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Dynamic Onboarding & Version Control</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 font-bold text-sm"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          Deploy to Production
        </button>
      </div>

      {/* Version Card */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-stone-50 rounded-2xl text-stone-600">
            <Smartphone size={24} />
          </div>
          <div>
            <h3 className="font-bold text-stone-800">App Version</h3>
            <p className="text-xs text-stone-400 italic font-serif text-nowrap">Change this to trigger onboarding for users</p>
          </div>
        </div>
        <input 
          type="text" 
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="w-24 text-center py-3 bg-stone-50 border-none rounded-xl font-black text-stone-900 focus:ring-2 focus:ring-stone-200"
        />
      </div>

      {/* Slides Manager */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-serif italic text-2xl text-stone-700">Slide Sequence</h3>
          <button onClick={addSlide} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold text-xs uppercase tracking-widest transition-all">
            <Plus size={16} /> Add Experience
          </button>
        </div>

        <div className="grid gap-8">
          <AnimatePresence>
            {slides.map((slide, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-xl relative group"
              >
                <button 
                  onClick={() => removeSlide(index)}
                  className="absolute -top-3 -right-3 bg-white p-3 rounded-full shadow-lg text-rose-400 hover:text-rose-600 transition-all z-10"
                >
                  <Trash2 size={20} />
                </button>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Media Section */}
                  <div className="space-y-4">
                    <div className="aspect-square bg-stone-50 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-inner flex items-center justify-center relative">
                      {slide.img ? (
                        <img src={slide.img} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <LayoutIcon className="text-stone-200" size={48} />
                      )}
                      
                      {uploadingIndex === index && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                          <RefreshCw className="animate-spin text-stone-900" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                       <label className="flex items-center justify-center gap-2 bg-stone-50 hover:bg-stone-100 p-3 rounded-xl cursor-pointer transition-colors text-stone-600 font-bold text-xs uppercase">
                          <UploadCloud size={16} /> Upload from Device
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(index, e.target.files[0])}
                          />
                       </label>
                       <div className="relative">
                          <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input 
                            type="text" 
                            value={slide.img}
                            onChange={(e) => updateSlide(index, 'img', e.target.value)}
                            placeholder="Or paste direct image URL..."
                            className="w-full pl-8 pr-4 py-2 bg-stone-50 border-none rounded-xl text-[10px] focus:ring-1 focus:ring-stone-200"
                          />
                       </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-stone-300 ml-2 tracking-widest">Main Headline</label>
                      <input 
                        type="text" 
                        value={slide.title}
                        onChange={(e) => updateSlide(index, 'title', e.target.value)}
                        className="w-full p-4 bg-stone-50 border-none rounded-2xl font-bold text-xl text-stone-800 focus:ring-2 focus:ring-stone-100 shadow-inner"
                        placeholder="New Feature Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-stone-300 ml-2 tracking-widest">Supporting Text</label>
                      <textarea 
                        value={slide.desc}
                        onChange={(e) => updateSlide(index, 'desc', e.target.value)}
                        className="w-full p-4 bg-stone-50 border-none rounded-2xl text-sm text-stone-500 focus:ring-2 focus:ring-stone-100 shadow-inner h-32 resize-none leading-relaxed"
                        placeholder="Explain why this matters in 2 lines..."
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-stone-200 pt-10">
        <CheckCircle2 size={16} />
        <span className="text-[8px] font-black uppercase tracking-[0.4em]">Synced with Firebase Cloud Storage</span>
      </div>
    </div>
  );
}
