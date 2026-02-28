import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  limit 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Plus, 
  Trash2, 
  Layout as LayoutIcon, 
  Smartphone, 
  CheckCircle2,
  RefreshCw
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

  // 1. جلب البيانات الحالية من Firebase عند فتح الصفحة
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

  // 2. إضافة سلايد جديد
  const addSlide = () => {
    setSlides([...slides, { title: "", desc: "", img: "" }]);
  };

  // 3. حذف سلايد
  const removeSlide = (index: number) => {
    setSlides(slides.filter((_, i) => i !== index));
  };

  // 4. تحديث بيانات سلايد معين
  const updateSlide = (index: number, field: keyof OnboardingSlide, value: string) => {
    const newSlides = [...slides];
    newSlides[index][field] = value;
    setSlides(newSlides);
  };

  // 5. حفظ كل الإعدادات إلى Firebase
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // نستخدم وثيقة ثابتة باسم "onboarding" داخل app_config
      await setDoc(doc(db, "app_config", "onboarding"), {
        onboardingVersion: version,
        slides: slides,
        updatedAt: new Date().toISOString()
      });
      toast.success("Configuration updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update configuration");
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-6">
        <div>
          <h1 className="text-3xl font-serif italic text-stone-800">App Command Center</h1>
          <p className="text-stone-400 text-xs font-black uppercase tracking-widest mt-1">Manage Onboarding & System Version</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          <span className="font-bold text-sm">Deploy Changes</span>
        </button>
      </div>

      {/* Version Control Card */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-stone-50 rounded-2xl text-stone-600">
            <Smartphone size={24} />
          </div>
          <div>
            <h3 className="font-bold text-stone-800">System Version</h3>
            <p className="text-xs text-stone-400">Incrementing this forces users to see new onboarding</p>
          </div>
        </div>
        <input 
          type="text" 
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="w-24 text-center py-3 bg-stone-50 border-none rounded-xl font-black text-stone-900 focus:ring-2 focus:ring-stone-200 transition-all"
          placeholder="1.0"
        />
      </div>

      {/* Onboarding Slides Manager */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-serif italic text-xl text-stone-700">Onboarding Slides ({slides.length})</h3>
          <button 
            onClick={addSlide}
            className="flex items-center gap-1 text-stone-500 hover:text-stone-900 font-bold text-xs uppercase tracking-tighter transition-colors"
          >
            <Plus size={16} /> Add New Slide
          </button>
        </div>

        <div className="grid gap-6">
          <AnimatePresence>
            {slides.map((slide, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-stone-50/50 p-6 rounded-[2rem] border border-dashed border-stone-200 relative group"
              >
                <button 
                  onClick={() => removeSlide(index)}
                  className="absolute -top-2 -right-2 bg-white p-2 rounded-full shadow-md text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Image Preview / URL Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 ml-2">Image URL</label>
                    <div className="h-32 bg-white rounded-2xl border border-stone-100 overflow-hidden flex items-center justify-center relative">
                      {slide.img ? (
                        <img src={slide.img} className="w-full h-full object-cover" alt="preview" />
                      ) : (
                        <LayoutIcon className="text-stone-200" size={32} />
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={slide.img}
                      onChange={(e) => updateSlide(index, 'img', e.target.value)}
                      placeholder="https://..."
                      className="w-full text-[10px] p-2 bg-white rounded-lg border-none focus:ring-1 focus:ring-stone-200"
                    />
                  </div>

                  {/* Text Content */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-stone-400 ml-2">Slide Title</label>
                      <input 
                        type="text" 
                        value={slide.title}
                        onChange={(e) => updateSlide(index, 'title', e.target.value)}
                        className="w-full p-3 bg-white rounded-xl border-none font-bold text-stone-800 focus:ring-2 focus:ring-stone-100 shadow-sm"
                        placeholder="e.g. Discover New Features"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-stone-400 ml-2">Description</label>
                      <textarea 
                        value={slide.desc}
                        onChange={(e) => updateSlide(index, 'desc', e.target.value)}
                        className="w-full p-3 bg-white rounded-xl border-none text-sm text-stone-500 focus:ring-2 focus:ring-stone-100 shadow-sm h-20 resize-none"
                        placeholder="Describe the feature in a few words..."
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {slides.length === 0 && (
            <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-stone-200">
              <p className="text-stone-300 font-serif italic">No slides added yet. Click 'Add New Slide' to begin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-center gap-2 text-stone-300 py-10">
        <CheckCircle2 size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Real-time Cloud Sync Enabled</span>
      </div>
    </div>
  );
}
