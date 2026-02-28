import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { collection, doc, setDoc, onSnapshot, query, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Save, Plus, Trash2, Smartphone, RefreshCw, Users, Bell, Palette, UploadCloud, UserPlus, Send, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('onboarding');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState("1.0");
  const [slides, setSlides] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [appConfig, setAppConfig] = useState({ primaryColor: '#1c1917', appLogo: '' });

  useEffect(() => {
    const unsubOnboard = onSnapshot(doc(db, "app_config", "onboarding"), (snap) => {
      if (snap.exists()) {
        setVersion(snap.data().onboardingVersion);
        setSlides(snap.data().slides || []);
      }
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubApp = onSnapshot(doc(db, "app_config", "appearance"), (snap) => {
      if (snap.exists()) setAppConfig(snap.data() as any);
    });

    return () => { unsubOnboard(); unsubUsers(); unsubApp(); };
  }, []);

  const handleUpload = async (path: string, file: File, callback: (url: string) => void) => {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    try {
      const snap = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snap.ref);
      callback(url);
      toast.success("Uploaded!");
    } catch (e) { toast.error("Upload failed"); }
  };

  const saveOnboarding = async () => {
    await setDoc(doc(db, "app_config", "onboarding"), { onboardingVersion: version, slides });
    toast.success("Published Successfully!");
  };

  const deleteUser = async (id: string) => {
    if(confirm("Delete User?")) await deleteDoc(doc(db, "users", id));
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-stone-300" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Sidebar/Tabs */}
      <div className="flex gap-4 border-b border-stone-100 pb-4 overflow-x-auto">
        {['onboarding', 'users', 'notifications', 'app style'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-xl font-bold capitalize transition-all ${activeTab === t ? 'bg-stone-900 text-white' : 'text-stone-400 hover:bg-stone-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <div>
              <h2 className="text-xl font-bold">Onboarding Version</h2>
              <input value={version} onChange={e => setVersion(e.target.value)} className="mt-2 p-2 bg-stone-50 rounded-lg w-20 text-center font-bold outline-none" />
            </div>
            <button onClick={saveOnboarding} className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all">
              <Save size={18}/> Deploy Now
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {slides.map((s, i) => (
              <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-4">
                <div className="h-40 bg-stone-50 rounded-2xl relative group overflow-hidden border-2 border-dashed border-stone-200">
                  <img src={s.img} className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer text-white transition-all">
                    <UploadCloud />
                    <input type="file" className="hidden" onChange={e => e.target.files && handleUpload('onboarding', e.target.files[0], (url) => {
                      const newSlides = [...slides]; newSlides[i].img = url; setSlides(newSlides);
                    })} />
                  </label>
                </div>
                <input value={s.title} onChange={e => {const ns=[...slides]; ns[i].title=e.target.value; setSlides(ns)}} placeholder="Headline" className="w-full p-3 bg-stone-50 rounded-xl font-bold outline-none" />
                <textarea value={s.desc} onChange={e => {const ns=[...slides]; ns[i].desc=e.target.value; setSlides(ns)}} placeholder="Description" className="w-full p-3 bg-stone-50 rounded-xl h-20 outline-none text-sm" />
                <button onClick={() => setSlides(slides.filter((_, idx) => idx !== i))} className="text-rose-500 font-bold text-xs">Remove Slide</button>
              </div>
            ))}
            <button onClick={() => setSlides([...slides, {title:'', desc:'', img:''}])} className="border-2 border-dashed border-stone-200 rounded-[2.5rem] flex items-center justify-center p-12 text-stone-300 hover:text-stone-600 transition-all"><Plus size={40}/></button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-stone-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-stone-50 font-bold text-stone-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="p-6">Member</th>
                <th className="p-6">Joined Date</th>
                <th className="p-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="p-6">
                    <div className="font-bold">{u.username}</div>
                    <div className="text-xs text-stone-400">{u.email}</div>
                  </td>
                  <td className="p-6 text-sm text-stone-500">{u.createdAt || 'Jan 20, 2026'}</td>
                  <td className="p-6">
                    <button onClick={() => deleteUser(u.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'app style' && (
        <div className="max-w-xl mx-auto space-y-8 bg-white p-10 rounded-[3rem] shadow-xl border border-stone-100">
          <div className="text-center">
             <h2 className="text-2xl font-bold">App Customization</h2>
             <p className="text-stone-400 text-sm">Update your logo and primary color instantly</p>
          </div>
          <div className="space-y-4">
            <label className="font-bold text-sm block">App Logo</label>
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 bg-stone-50 rounded-2xl border flex items-center justify-center overflow-hidden">
                  {appConfig.appLogo ? <img src={appConfig.appLogo} className="w-full h-full object-contain"/> : <ImageIcon className="text-stone-200"/>}
               </div>
               <label className="bg-stone-900 text-white px-6 py-2 rounded-xl cursor-pointer text-sm font-bold">
                 Upload New Logo
                 <input type="file" className="hidden" onChange={e => e.target.files && handleUpload('app', e.target.files[0], (url) => setAppConfig({...appConfig, appLogo: url}))} />
               </label>
            </div>
          </div>
          <button onClick={() => setDoc(doc(db, "app_config", "appearance"), appConfig)} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold">Save All Changes</button>
        </div>
      )}
    </div>
  );
}
