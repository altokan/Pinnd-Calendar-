import React, { useState, useEffect } from 'react';
import { db, storage } from '../services/firebase';
import { 
  collection, doc, setDoc, onSnapshot, 
  updateDoc, deleteDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Plus, Trash2, Smartphone, RefreshCw, 
  Users, Bell, Palette, UploadCloud, Edit3, UserPlus, Send, X, Shield, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'users' | 'notifications' | 'settings'>('onboarding');
  const [loading, setLoading] = useState(true);
  
  // States للبيانات
  const [version, setVersion] = useState("1.0.0");
  const [slides, setSlides] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [appConfig, setAppConfig] = useState({ primaryColor: '#1c1917', appLogo: '' });
  
  // States للنوافذ (Modals)
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

  // --- إدارة الصور (Onboarding & Logo) ---
  const handleImageUpload = async (path: string, file: File, callback: (url: string) => void) => {
    const loadingToast = toast.loading("جاري رفع الصورة...");
    try {
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      callback(url);
      toast.success("تم الرفع بنجاح", { id: loadingToast });
    } catch (e) {
      toast.error("فشل الرفع", { id: loadingToast });
    }
  };

  // --- حفظ البيانات ---
  const publishOnboarding = async () => {
    await setDoc(doc(db, "app_config", "onboarding"), {
      onboardingVersion: version,
      slides,
      lastUpdated: serverTimestamp()
    });
    toast.success("تم نشر تحديثات الصور والنسخة!");
  };

  const saveAppStyle = async () => {
    await setDoc(doc(db, "app_config", "appearance"), appConfig);
    toast.success("تم حفظ إعدادات التطبيق");
  };

  // --- إدارة الأعضاء (Add / Update / Delete) ---
  const handleUserAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    try {
      if (userModal.type === 'add') {
        await addDoc(collection(db, "users"), {
          ...data,
          createdAt: new Date().toLocaleString('ar-EG'),
          lastLogin: "لم يسجل دخول بعد",
          role: data.role || 'user'
        });
        toast.success("تم إضافة العضو بنجاح");
      } else {
        await updateDoc(doc(db, "users", userModal.data.id), data);
        toast.success("تم تحديث بيانات العضو");
      }
      setUserModal({ show: false, type: 'add' });
    } catch (e) { toast.error("حدث خطأ ما"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-stone-50"><RefreshCw className="animate-spin text-stone-300" size={48} /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 font-sans text-right" dir="rtl">
      
      {/* التبويبات الرئيسية */}
      <div className="flex gap-3 overflow-x-auto pb-6 mb-10 border-b border-stone-200">
        {[
          { id: 'onboarding', icon: <Smartphone />, label: 'صور الترحيب' },
          { id: 'users', icon: <Users />, label: 'الأعضاء' },
          { id: 'notifications', icon: <Bell />, label: 'الإشعارات' },
          { id: 'settings', icon: <Palette />, label: 'ستايل التطبيق' },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-stone-900 text-white shadow-xl scale-105' : 'bg-white text-stone-400 hover:bg-stone-50'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويبات */}
      <AnimatePresence mode="wait">
        
        {/* Onboarding */}
        {activeTab === 'onboarding' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 flex justify-between items-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-stone-800">إدارة صفحات الترحيب</h2>
                <div className="flex items-center gap-3 bg-stone-50 p-2 rounded-xl border border-stone-100">
                  <span className="text-sm font-bold text-stone-500">رقم الإصدار:</span>
                  <input value={version} onChange={e => setVersion(e.target.value)} className="bg-transparent border-none text-stone-900 font-black w-20 text-center focus:ring-0" />
                </div>
              </div>
              <button onClick={publishOnboarding} className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-2xl font-black shadow-lg flex items-center gap-3 transition-all">
                <Save size={20} /> نشر التغييرات
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slides.map((slide, i) => (
                <div key={i} className="bg-white p-6 rounded-[3rem] border border-stone-100 shadow-sm space-y-4 group">
                  <div className="h-52 bg-stone-100 rounded-[2.5rem] overflow-hidden relative border-4 border-white shadow-inner">
                    {slide.img ? <img src={slide.img} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-stone-300"><UploadCloud size={40}/></div>}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all text-white font-bold gap-2">
                      <UploadCloud /> تغيير الصورة
                      <input type="file" className="hidden" onChange={e => e.target.files && handleImageUpload('onboarding', e.target.files[0], (url) => {
                        const s = [...slides]; s[i].img = url; setSlides(s);
                      })} />
                    </label>
                  </div>
                  <input value={slide.title} onChange={e => {const s=[...slides]; s[i].title=e.target.value; setSlides(s);}} placeholder="العنوان" className="w-full p-3 bg-stone-50 border-none rounded-xl font-bold" />
                  <textarea value={slide.desc} onChange={e => {const s=[...slides]; s[i].desc=e.target.value; setSlides(s);}} placeholder="الوصف" className="w-full p-3 bg-stone-50 border-none rounded-xl h-20 text-sm resize-none" />
                  <button onClick={() => setSlides(slides.filter((_, idx) => idx !== i))} className="text-rose-500 font-bold text-sm flex items-center gap-1 hover:bg-rose-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/> حذف السلايد</button>
                </div>
              ))}
              <button onClick={() => setSlides([...slides, {title:'', desc:'', img:''}])} className="border-4 border-dashed border-stone-200 rounded-[3rem] p-10 flex flex-col items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-white transition-all">
                <Plus size={50} /> <span className="font-bold mt-2">إضافة صفحة جديدة</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Users Management */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-stone-800">الأعضاء والمدراء</h2>
              <button onClick={() => setUserModal({show: true, type: 'add'})} className="bg-stone-900 text-white px-8 py-4 rounded-[1.5rem] font-bold shadow-xl flex items-center gap-3 hover:scale-105 transition-transform">
                <UserPlus size={22}/> إضافة عضو جديد
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-stone-50 text-stone-400 text-sm font-bold border-b border-stone-100">
                  <tr>
                    <th className="p-6 text-right">المستخدم</th>
                    <th className="p-6 text-right">التواريخ</th>
                    <th className="p-6 text-right">الصفة</th>
                    <th className="p-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="p-6">
                        <div className="font-black text-stone-800">{u.username}</div>
                        <div className="text-sm text-stone-400">{u.email}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-[11px] text-stone-400">انضم: {u.createdAt}</div>
                        <div className="text-[11px] text-green-600 font-bold tracking-tighter">آخر دخول: {u.lastLogin}</div>
                      </td>
                      <td className="p-6">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                          {u.role === 'admin' ? 'مدير' : 'عضو'}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-4">
                          <button onClick={() => setUserModal({show: true, type: 'edit', data: u})} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit3 size={18}/></button>
                          <button onClick={async () => { if(confirm("حذف العضو؟")) await deleteDoc(doc(db, "users", u.id)) }} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* App Style Settings */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            <div className="bg-white p-12 rounded-[3.5rem] border border-stone-100 shadow-2xl space-y-10 text-center">
              <div className="space-y-4">
                <div className="w-32 h-32 bg-stone-50 rounded-[2.5rem] mx-auto border-4 border-white shadow-xl overflow-hidden relative group">
                  <img src={appConfig.appLogo || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all text-white text-xs font-bold">
                    تغيير اللوجو
                    <input type="file" className="hidden" onChange={e => e.target.files && handleImageUpload('app_assets', e.target.files[0], (url) => setAppConfig({...appConfig, appLogo: url}))} />
                  </label>
                </div>
                <h3 className="text-xl font-black">هوية التطبيق</h3>
              </div>

              <div className="space-y-6">
                <p className="text-stone-400 font-bold text-sm">لون التطبيق الأساسي</p>
                <div className="flex justify-center gap-5">
                  {['#1c1917', '#7c2d12', '#064e3b', '#1e3a8a', '#be123c', '#6d28d9'].map(color => (
                    <button 
                      key={color} 
                      onClick={() => setAppConfig({...appConfig, primaryColor: color})}
                      className={`w-14 h-14 rounded-2xl border-4 transition-all ${appConfig.primaryColor === color ? 'border-stone-900 scale-125 rotate-6 shadow-xl' : 'border-white shadow-md'}`}
                      style={{backgroundColor: color}}
                    />
                  ))}
                </div>
              </div>

              <button onClick={saveAppStyle} className="w-full bg-stone-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:bg-stone-800 transition-colors flex items-center justify-center gap-3">
                <Save /> حفظ إعدادات التصميم
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* --- User Modal (Add/Edit) --- */}
      {userModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-8 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-xl font-black text-stone-800 flex items-center gap-2">
                {userModal.type === 'add' ? <UserPlus /> : <Edit3 />}
                {userModal.type === 'add' ? 'إضافة عضو جديد' : 'تعديل بيانات العضو'}
              </h3>
              <button onClick={() => setUserModal({show: false, type: 'add'})} className="p-2 hover:bg-stone-200 rounded-full transition-colors"><X/></button>
            </div>
            
            <form onSubmit={handleUserAction} className="p-8 space-y-5 text-right">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-500 mr-2">اسم المستخدم</label>
                <input required name="username" defaultValue={userModal.data?.username} className="w-full p-4 bg-stone-100 border-none rounded-2xl focus:ring-2 ring-stone-900 transition-all font-bold" placeholder="مثلاً: ahmad_123" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-500 mr-2">البريد الإلكتروني</label>
                <input required name="email" type="email" defaultValue={userModal.data?.email} className="w-full p-4 bg-stone-100 border-none rounded-2xl focus:ring-2 ring-stone-900 transition-all font-bold" placeholder="email@example.com" />
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-bold text-stone-500 mr-2">كلمة السر</label>
                <input required name="password" type={showPassword ? "text" : "password"} defaultValue={userModal.data?.password} className="w-full p-4 bg-stone-100 border-none rounded-2xl focus:ring-2 ring-stone-900 transition-all font-bold" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-11 text-stone-400">
                  {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-500 mr-2">صلاحية العضو</label>
                <select name="role" defaultValue={userModal.data?.role || 'user'} className="w-full p-4 bg-stone-100 border-none rounded-2xl font-bold appearance-none">
                  <option value="user">عضو عادي (User)</option>
                  <option value="admin">مدير (Admin)</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-stone-900 text-white py-5 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4">
                {userModal.type === 'add' ? 'إنشاء العضو الآن' : 'حفظ التعديلات'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
