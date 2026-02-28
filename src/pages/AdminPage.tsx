import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { 
  collection, doc, setDoc, onSnapshot, query, 
  updateDoc, deleteDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Plus, Trash2, Smartphone, RefreshCw, 
  Users, ShieldCheck, Bell, Palette, UploadCloud, Edit3, UserPlus, Send, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'users' | 'security' | 'notifications' | 'settings'>('onboarding');
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // States
  const [version, setVersion] = useState("1.0");
  const [slides, setSlides] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState({ primaryColor: '#1c1917', appLogo: '' });
  const [notifications, setNotifications] = useState({ title: '', body: '' });

  useEffect(() => {
    setLoading(true);
    // 1. جلب بيانات Onboarding
    const unsubOnboard = onSnapshot(doc(db, "app_config", "onboarding"), (snap) => {
      if (snap.exists()) {
        setVersion(snap.data().onboardingVersion);
        setSlides(snap.data().slides || []);
      }
    });

    // 2. جلب بيانات المستخدمين
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. جلب إعدادات الثيم العامة
    const unsubTheme = onSnapshot(doc(db, "app_config", "appearance"), (snap) => {
      if (snap.exists()) setAppSettings(snap.data() as any);
    });

    setLoading(false);
    return () => { unsubOnboard(); unsubUsers(); unsubTheme(); };
  }, []);

  // --- وظائف الـ Onboarding ---
  const handleFileUpload = async (index: number, file: File) => {
    setIsActionLoading(true);
    const storageRef = ref(storage, `onboarding/slide_${index}_${Date.now()}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      const newSlides = [...slides];
      newSlides[index].img = url;
      setSlides(newSlides);
      toast.success("Image Uploaded!");
    } catch (e) { toast.error("Upload Failed"); }
    finally { setIsActionLoading(false); }
  };

  const saveOnboarding = async () => {
    await setDoc(doc(db, "app_config", "onboarding"), {
      onboardingVersion: version,
      slides,
      updatedAt: new Date().toISOString()
    });
    toast.success("Onboarding Published!");
  };

  // --- وظائف المستخدمين (CRUD) ---
  const handleAddUser = async () => {
    const email = prompt("Enter User Email:");
    const username = prompt("Enter Username:");
    const password = prompt("Enter Password:");
    if (email && username && password) {
      await addDoc(collection(db, "users"), {
        email, username, password, createdAt: new Date().toLocaleDateString(), lastLogin: 'New'
      });
      toast.success("User Added!");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Delete this user permanently?")) {
      await deleteDoc(doc(db, "users", id));
      toast.success("User Deleted");
    }
  };

  // --- وظائف الثيم والإشعارات ---
  const saveThemeSettings = async (color: string) => {
    await setDoc(doc(db, "app_config", "appearance"), { primaryColor: color }, { merge: true });
    toast.success("Theme Color Updated!");
  };

  const sendBroadcast = async () => {
    if (!notifications.title || !notifications.body) return toast.error("Fill all fields");
    await addDoc(collection(db, "admin_notifications"), {
      ...notifications, createdAt: serverTimestamp()
    });
    toast.success("Notification Sent!");
    setNotifications({ title: '', body: '' });
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F9F8F6]"><RefreshCw className="animate-spin text-stone-300" size={40} /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 pt-10">
      {/* التبويبات */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-stone-100 mb-10">
        {[
          { id: 'onboarding', icon: <Smartphone size={18}/>, label: 'Onboarding' },
          { id: 'users', icon: <Users size={18}/>, label: 'Users' },
          { id: 'notifications', icon: <Bell size={18}/>, label: 'Broadcast' },
          { id: 'settings', icon: <Palette size={18}/>, label: 'App Style' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-stone-900 text-white shadow-xl scale-105' : 'bg-white text-stone-400 hover:bg-stone-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Onboarding */}
        {activeTab === 'onboarding' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100">
              <div>
                <h2 className="text-xl font-serif italic">Version Control</h2>
                <p className="text-xs text-stone-400">Current active version: {version}</p>
              </div>
              <div className="flex gap-3">
                <input value={version} onChange={e => setVersion(e.target.value)} className="w-16 p-2 rounded-xl bg-stone-50 border-none text-center font-bold"/>
                <button onClick={saveOnboarding} className="bg-stone-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Save size={16}/> Deploy</button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {slides.map((slide, i) => (
                <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4 relative">
                  <div className="h-40 bg-stone-50 rounded-[2rem] overflow-hidden relative group border-4 border-white shadow-inner">
                    <img src={slide.img || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" />
                    <label className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer text-white">
                      <UploadCloud size={24} />
                      <input type="file" className="hidden" onChange={e => e.target.files && handleFileUpload(i, e.target.files[0])} />
                    </label>
                  </div>
                  <input value={slide.title} onChange={e => {const s=[...slides]; s[i].title=e.target.value; setSlides(s);}} className="w-full font-bold border-none bg-stone-50 rounded-xl p-3" placeholder="Headline"/>
                  <textarea value={slide.desc} onChange={e => {const s=[...slides]; s[i].desc=e.target.value; setSlides(s);}} className="w-full text-xs text-stone-400 border-none bg-stone-50 rounded-xl p-3 h-16" placeholder="Description"/>
                  <button onClick={() => setSlides(slides.filter((_, idx)=>idx!==i))} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                </div>
              ))}
              <button onClick={() => setSlides([...slides, {title:'', desc:'', img:''}])} className="border-2 border-dashed border-stone-100 rounded-[2.5rem] p-12 text-stone-300 hover:bg-white hover:text-stone-500 transition-all"><Plus size={32}/></button>
            </div>
          </motion.div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-2xl font-serif italic text-stone-800">Members List</h2>
              <button onClick={handleAddUser} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg"><UserPlus size={18}/> New Member</button>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-stone-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100">
                  <tr><th className="p-6">Identity</th><th className="p-6">Security</th><th className="p-6">Status</th><th className="p-6">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-stone-50/30 transition-colors">
                      <td className="p-6"><div className="font-bold text-stone-800">{u.username}</div><div className="text-xs text-stone-400">{u.email}</div></td>
                      <td className="p-6 font-mono text-xs text-stone-400 italic">pw: {u.password || '*****'}</td>
                      <td className="p-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest">{u.lastLogin}</td>
                      <td className="p-6 flex gap-3 text-stone-300">
                         <button className="hover:text-stone-900"><Edit3 size={16}/></button>
                         <button onClick={() => handleDeleteUser(u.id)} className="hover:text-rose-500"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Settings (Theme) */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-stone-100 text-center space-y-8">
               <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-800"><Settings size={40}/></div>
               <div>
                 <h2 className="text-2xl font-serif italic">App Branding</h2>
                 <p className="text-stone-400 text-sm">Update the primary identity of the application</p>
               </div>
               <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Primary Theme Color</p>
                 <div className="flex justify-center gap-6">
                   {['#1c1917', '#7c2d12', '#064e3b', '#1e3a8a', '#be123c'].map(c => (
                     <button key={c} onClick={() => saveThemeSettings(c)} className={`w-12 h-12 rounded-full border-4 ${appSettings.primaryColor === c ? 'border-stone-900 scale-125' : 'border-white'} shadow-lg transition-all`} style={{backgroundColor: c}} />
                   ))}
                 </div>
               </div>
            </div>
          </motion.div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl space-y-6">
            <h2 className="text-2xl font-serif italic text-center">Broadcast Message</h2>
            <input value={notifications.title} onChange={e => setNotifications({...notifications, title: e.target.value})} placeholder="Notification Title" className="w-full p-4 bg-stone-50 border-none rounded-2xl font-bold"/>
            <textarea value={notifications.body} onChange={e => setNotifications({...notifications, body: e.target.value})} placeholder="What's happening?" className="w-full p-4 bg-stone-50 border-none rounded-2xl h-32 resize-none text-sm"/>
            <button onClick={sendBroadcast} className="w-full bg-stone-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"><Send size={18}/> Send Now</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
