import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { 
  collection, doc, setDoc, onSnapshot, query, 
  limit, getDocs, updateDoc, deleteDoc, addDoc, orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Plus, Trash2, Smartphone, CheckCircle2, RefreshCw, 
  Users, ShieldCheck, Bell, Palette, Image as ImageIcon, 
  UploadCloud, Edit3, UserPlus, Send, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'users' | 'security' | 'notifications' | 'settings'>('onboarding');
  const [loading, setLoading] = useState(true);

  // --- States لجميع الأقسام ---
  const [version, setVersion] = useState("1.0");
  const [slides, setSlides] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState({ title: '', body: '' });

  useEffect(() => {
    setLoading(true);
    // جلب بيانات Onboarding
    const unsubOnboard = onSnapshot(doc(db, "app_config", "onboarding"), (snap) => {
      if (snap.exists()) {
        setVersion(snap.data().onboardingVersion);
        setSlides(snap.data().slides || []);
      }
    });

    // جلب بيانات المستخدمين
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const usersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    });

    setLoading(false);
    return () => { unsubOnboard(); unsubUsers(); };
  }, []);

  // --- وظائف الـ Onboarding ---
  const handleFileUpload = async (index: number, file: File) => {
    const storageRef = ref(storage, `onboarding/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      const newSlides = [...slides];
      newSlides[index].img = url;
      setSlides(newSlides);
      toast.success("Image Ready!");
    } catch (e) { toast.error("Upload Error"); }
  };

  const saveOnboarding = async () => {
    await setDoc(doc(db, "app_config", "onboarding"), {
      onboardingVersion: version,
      slides: slides,
      updatedAt: new Date().toISOString()
    });
    toast.success("System Updated & Deployed!");
  };

  // --- وظائف المستخدمين ---
  const deleteUser = async (id: string) => {
    if(window.confirm("Are you sure?")) {
      await deleteDoc(doc(db, "users", id));
      toast.success("User removed");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      {/* 🧭 Navigation Tabs */}
      <div className="flex overflow-x-auto gap-4 py-6 no-scrollbar border-b border-stone-100 mb-8">
        {[
          { id: 'onboarding', icon: <Smartphone size={18}/>, label: 'Onboarding' },
          { id: 'users', icon: <Users size={18}/>, label: 'Users' },
          { id: 'security', icon: <ShieldCheck size={18}/>, label: 'Security' },
          { id: 'notifications', icon: <Bell size={18}/>, label: 'Messages' },
          { id: 'settings', icon: <Palette size={18}/>, label: 'App Theme' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-stone-900 text-white shadow-lg' : 'bg-white text-stone-400 hover:bg-stone-50'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 🖼️ Onboarding Tab */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif italic">Onboarding Manager</h2>
            <div className="flex gap-4">
              <input value={version} onChange={e => setVersion(e.target.value)} className="w-20 p-2 rounded-xl border-none bg-stone-100 text-center font-black"/>
              <button onClick={saveOnboarding} className="bg-green-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-green-700 transition-all shadow-lg"><Save size={18}/> Save & Publish</button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {slides.map((slide, i) => (
              <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4">
                <div className="h-48 bg-stone-50 rounded-[2rem] overflow-hidden relative group">
                  <img src={slide.img} className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer text-white">
                    <UploadCloud size={32} />
                    <input type="file" className="hidden" onChange={e => e.target.files && handleFileUpload(i, e.target.files[0])} />
                  </label>
                </div>
                <input value={slide.title} onChange={e => {const s=[...slides]; s[i].title=e.target.value; setSlides(s);}} className="w-full font-bold border-none bg-stone-50 rounded-xl p-3" placeholder="Title"/>
                <textarea value={slide.desc} onChange={e => {const s=[...slides]; s[i].desc=e.target.value; setSlides(s);}} className="w-full text-sm text-stone-500 border-none bg-stone-50 rounded-xl p-3 h-20" placeholder="Description"/>
                <button onClick={() => setSlides(slides.filter((_, idx)=>idx!==i))} className="text-rose-500 text-xs font-bold flex items-center gap-1 hover:underline"><Trash2 size={14}/> Remove Slide</button>
              </div>
            ))}
            <button onClick={() => setSlides([...slides, {title:'', desc:'', img:''}])} className="border-2 border-dashed border-stone-200 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-stone-300 hover:text-stone-500 transition-all"><Plus size={48}/><span className="font-bold mt-2">Add New Experience</span></button>
          </div>
        </div>
      )}

      {/* 👥 Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif italic">Community Members ({users.length})</h2>
            <button className="bg-stone-900 text-white px-6 py-2 rounded-xl flex items-center gap-2 text-sm font-bold"><UserPlus size={18}/> New User</button>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-50 text-[10px] font-black uppercase tracking-widest text-stone-400">
                <tr>
                  <th className="p-6">User</th>
                  <th className="p-6">Credentials</th>
                  <th className="p-6">Activity</th>
                  <th className="p-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-6">
                      <div className="font-bold text-stone-800">{user.username}</div>
                      <div className="text-xs text-stone-400">{user.email}</div>
                    </td>
                    <td className="p-6">
                      <div className="text-xs font-mono bg-stone-100 p-1 rounded inline-block text-stone-500">PW: {user.password || '********'}</div>
                    </td>
                    <td className="p-6">
                      <div className="text-[10px] text-stone-400 uppercase">Joined: {user.createdAt || 'N/A'}</div>
                      <div className="text-[10px] text-green-500 font-bold uppercase">Online: {user.lastLogin || 'Never'}</div>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-2">
                        <button className="p-2 text-stone-400 hover:text-stone-900"><Edit3 size={18}/></button>
                        <button onClick={() => deleteUser(user.id)} className="p-2 text-rose-300 hover:text-rose-600"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🔔 Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] border border-stone-100 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-amber-600"><Bell size={32}/></div>
            <h2 className="text-2xl font-serif italic">Broadcast Message</h2>
            <p className="text-xs text-stone-400">Send a push notification to all active users</p>
          </div>
          <input 
            placeholder="Message Title" 
            className="w-full p-4 bg-stone-50 border-none rounded-2xl font-bold"
            onChange={e => setNotifications({...notifications, title: e.target.value})}
          />
          <textarea 
            placeholder="Write your message here..." 
            className="w-full p-4 bg-stone-50 border-none rounded-2xl h-32 resize-none"
            onChange={e => setNotifications({...notifications, body: e.target.value})}
          />
          <button className="w-full bg-stone-900 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
            <Send size={18}/> Dispatch Notification
          </button>
        </div>
      )}

      {/* 🎨 Theme Tab (Dashboard Settings) */}
      {activeTab === 'settings' && (
        <div className="grid md:grid-cols-2 gap-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-6">
              <h3 className="font-serif italic text-xl flex items-center gap-2"><Settings size={20}/> Appearance</h3>
              <div className="space-y-4">
                <label className="text-xs font-black uppercase text-stone-400 block">Primary Color</label>
                <div className="flex gap-4">
                  {['#1c1917', '#7c2d12', '#064e3b', '#1e3a8a'].map(c => (
                    <button key={c} className="w-10 h-10 rounded-full border-4 border-white shadow-md" style={{backgroundColor: c}} />
                  ))}
                </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
