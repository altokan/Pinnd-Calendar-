import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { 
  collection, doc, setDoc, onSnapshot, query, 
  updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Plus, Trash2, Smartphone, RefreshCw, 
  Users, Bell, Palette, UploadCloud, Edit3, UserPlus, X, Shield, Eye, EyeOff, Key, Clock, Mail, User as UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'users' | 'security' | 'settings'>('onboarding');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState("1.0.0");
  const [slides, setSlides] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [appConfig, setAppConfig] = useState({ primaryColor: '#1c1917', appLogo: '' });
  const [userModal, setUserModal] = useState<{show: boolean, type: 'add' | 'edit', data?: any}>({ show: false, type: 'add' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const unsubOnboard = onSnapshot(doc(db, "app_config", "onboarding"), (snap) => {
      if (snap.exists()) {
        setVersion(snap.data().onboardingVersion || "1.0.0");
        setSlides(snap.data().slides || []);
      }
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsersList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTheme = onSnapshot(doc(db, "app_config", "appearance"), (snap) => {
      if (snap.exists()) setAppConfig(snap.data() as any);
    });

    setLoading(false);
    return () => { unsubOnboard(); unsubUsers(); unsubTheme(); };
  }, []);

  const handleImageUpload = async (path: string, file: File, callback: (url: string) => void) => {
    const loadingToast = toast.loading("Uploading...");
    try {
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      callback(url);
      toast.success("Uploaded!", { id: loadingToast });
    } catch (e) {
      toast.error("Upload failed", { id: loadingToast });
    }
  };

  const saveConfig = async (type: string) => {
    const ref = doc(db, "app_config", type === 'onboard' ? "onboarding" : "appearance");
    const data = type === 'onboard' ? { onboardingVersion: version, slides } : appConfig;
    await setDoc(ref, data, { merge: true });
    toast.success("Settings Saved!");
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-stone-50"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 font-sans text-left" dir="ltr">
      
      {/* 📱 Mobile Responsive Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {[
          { id: 'onboarding', icon: <Smartphone size={18}/>, label: 'Onboarding' },
          { id: 'users', icon: <Users size={18}/>, label: 'Users' },
          { id: 'security', icon: <Shield size={18}/>, label: 'Security' },
          { id: 'settings', icon: <Palette size={18}/>, label: 'App Style' },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap text-sm ${activeTab === tab.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-400 border border-stone-100'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Users Management */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-stone-100 shadow-sm">
              <h2 className="text-xl font-black">Members ({usersList.length})</h2>
              <button onClick={() => setUserModal({show: true, type: 'add'})} className="w-full sm:w-auto bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                <UserPlus size={18}/> Add Member
              </button>
            </div>

            <div className="grid gap-3">
              {usersList.map(u => (
                <div key={u.id} className="bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-900 font-black">{u.username?.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="font-black text-stone-900">@{u.username}</div>
                      <div className="text-xs text-stone-400 font-medium">{u.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0">
                    <div className="text-[10px] text-stone-400 flex items-center gap-1"><Clock size={10}/> Joined: {u.createdAt}</div>
                    <div className="text-[10px] text-green-500 font-bold flex items-center gap-1"><RefreshCw size={10}/> Login: {u.lastLogin}</div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setUserModal({show: true, type: 'edit', data: u})} className="flex-1 sm:flex-none p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={18}/></button>
                    <button onClick={async () => { if(confirm("Delete user?")) await deleteDoc(doc(db, "users", u.id)) }} className="flex-1 sm:flex-none p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* App Style Section */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm text-center space-y-8">
              <div className="relative w-24 h-24 mx-auto group">
                <img src={appConfig.appLogo || 'https://via.placeholder.com/150'} className="w-full h-full object-cover rounded-[2rem] border-4 border-white shadow-lg" />
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-[2rem] flex items-center justify-center cursor-pointer transition-all text-white text-[10px] font-bold">
                  UPLOAD
                  <input type="file" className="hidden" onChange={e => e.target.files && handleImageUpload('app_assets', e.target.files[0], (url) => setAppConfig({...appConfig, appLogo: url}))} />
                </label>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 justify-center">
                {['#1c1917', '#7c2d12', '#064e3b', '#1e3a8a', '#be123c', '#6d28d9', '#4d7c0f'].map(color => (
                  <button key={color} onClick={() => setAppConfig({...appConfig, primaryColor: color})} className={`h-12 rounded-xl border-2 ${appConfig.primaryColor === color ? 'border-black scale-110' : 'border-transparent'}`} style={{backgroundColor: color}} />
                ))}
              </div>
              <button onClick={() => saveConfig('appearance')} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold">Save Style</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Modal */}
      {userModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-white w-full max-w-md rounded-[2.5rem] p-6 space-y-4">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-xl">{userModal.type === 'add' ? 'New User' : 'Edit User'}</h3>
                <button onClick={() => setUserModal({show: false, type: 'add'})}><X/></button>
             </div>
             <form onSubmit={async (e) => {
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.target as HTMLFormElement));
                if (userModal.type === 'add') {
                  await addDoc(collection(db, "users"), { ...d, createdAt: new Date().toLocaleDateString(), lastLogin: 'Never' });
                } else {
                  await updateDoc(doc(db, "users", userModal.data.id), d);
                }
                setUserModal({show: false, type: 'add'});
                toast.success("Done!");
             }} className="space-y-4">
                <input name="username" defaultValue={userModal.data?.username} placeholder="Username" className="w-full p-4 bg-stone-50 rounded-2xl border-none font-bold" required />
                <input name="email" type="email" defaultValue={userModal.data?.email} placeholder="Email" className="w-full p-4 bg-stone-50 rounded-2xl border-none font-bold" required />
                <input name="password" defaultValue={userModal.data?.password} placeholder="Password" type="text" className="w-full p-4 bg-stone-50 rounded-2xl border-none font-bold" required />
                <button className="w-full bg-stone-900 text-white py-4 rounded-2xl font-black">Save Member</button>
             </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
