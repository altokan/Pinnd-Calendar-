import React from 'react';
import { Smartphone, Apple, Chrome, Share, PlusSquare, MoreVertical, Download } from 'lucide-react';
import { motion } from 'motion/react';

const AddToHomeScreen: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-stone-900 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl">
          <Smartphone size={40} />
        </div>
        <h2 className="text-4xl font-serif font-bold text-stone-800">Install Pinned Calendar</h2>
        <p className="text-stone-500 max-w-md mx-auto">
          Add Pinned Calendar to your home screen for a faster, more integrated experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* iOS Instructions */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-[40px] border border-stone-200 shadow-sm space-y-8"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-stone-50 rounded-2xl text-stone-800">
              <Apple size={24} />
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-800">iPhone / iOS</h3>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold flex-shrink-0">1</div>
              <p className="text-stone-600">Open Pinned Calendar in <span className="font-bold text-stone-900">Safari</span>.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold flex-shrink-0">2</div>
              <p className="text-stone-600">Tap the <span className="inline-flex items-center p-1 bg-stone-50 rounded text-blue-500"><Share size={16} /></span> share icon at the bottom.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold flex-shrink-0">3</div>
              <p className="text-stone-600">Scroll down and tap <span className="font-bold text-stone-900">"Add to Home Screen"</span> <span className="inline-flex items-center p-1 bg-stone-50 rounded text-stone-500"><PlusSquare size={16} /></span>.</p>
            </div>
          </div>

          <div className="pt-4">
            <div className="aspect-video bg-stone-100 rounded-2xl flex items-center justify-center text-stone-300 italic text-sm">
              Visual Guide Placeholder
            </div>
          </div>
        </motion.div>

        {/* Android Instructions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-[40px] border border-stone-200 shadow-sm space-y-8"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-stone-50 rounded-2xl text-stone-800">
              <Chrome size={24} />
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-800">Android / Chrome</h3>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold flex-shrink-0">1</div>
              <p className="text-stone-600">Open Pinned Calendar in <span className="font-bold text-stone-900">Chrome</span>.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold flex-shrink-0">2</div>
              <p className="text-stone-600">Tap the <span className="inline-flex items-center p-1 bg-stone-50 rounded text-stone-500"><MoreVertical size={16} /></span> menu icon in the top right.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold flex-shrink-0">3</div>
              <p className="text-stone-600">Tap <span className="font-bold text-stone-900">"Install app"</span> or <span className="font-bold text-stone-900">"Add to Home screen"</span> <span className="inline-flex items-center p-1 bg-stone-50 rounded text-stone-500"><Download size={16} /></span>.</p>
            </div>
          </div>

          <div className="pt-4">
            <div className="aspect-video bg-stone-100 rounded-2xl flex items-center justify-center text-stone-300 italic text-sm">
              Visual Guide Placeholder
            </div>
          </div>
        </motion.div>
      </div>

      <div className="bg-stone-900 text-white p-10 rounded-[50px] text-center space-y-6 shadow-2xl">
        <h3 className="text-2xl font-serif font-bold">Why Install?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="text-stone-400 font-bold text-lg">01</div>
            <p className="text-sm font-medium">Full-screen immersive experience</p>
          </div>
          <div className="space-y-2">
            <div className="text-stone-400 font-bold text-lg">02</div>
            <p className="text-sm font-medium">Faster access from your home screen</p>
          </div>
          <div className="space-y-2">
            <div className="text-stone-400 font-bold text-lg">03</div>
            <p className="text-sm font-medium">Better performance and reliability</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddToHomeScreen;
