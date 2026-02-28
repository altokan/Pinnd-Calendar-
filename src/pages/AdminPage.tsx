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
  Users, Bell, Palette, UploadCloud, Edit3, UserPlus, Send, X, Shield, Eye, EyeOff, Key, Clock, Mail, User as UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'users' | 'notifications' | 'settings' | 'security'>('onboarding');
  const [loading, setLoading] = useState(true);
  
  // States للبيانات
  const [version, setVersion] = useState("1.0.0");
  const [slides, setSlides] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [appConfig, setAppConfig] = useState({ primaryColor: '#1c1917', appLogo: '' });
  const [securityRequests, setSecurityRequests] = useState<any[]>([]);
  
  // States للنوافذ (Modals)
  const [userModal, setUserModal] = useState<{show: boolean, type: 'add' | 'edit', data?: any}>({ show: false, type: 'add' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // 1. جلب بيانات Onboarding
    const unsubOnboard = onSnapshot(doc(db, "app_config", "onboarding"), (snap) => {
      if (snap.exists()) {
        setVersion(snap.data().onboardingVersion || "1.0.0");
        setSlides(snap.data().slides || []);
      }
    });

    // 2. جلب بيانات المستخدمين
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsersList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. جلب إعدادات الثيم العامة
    const unsubTheme = onSnapshot(doc(db, "app_config", "appearance"), (snap) => {
      if (snap.exists()) setAppConfig(snap.data() as any);
    });

    // 4. جلب طلبات الحماية (نسيان كلمة السر)
    const unsubSecurity = onSnapshot(query(collection(db, "security_requests"), orderBy("createdAt", "desc")), (snap) => {
      setSecurityRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);
    return () => { unsubOnboard(); unsubUsers(); unsubTheme(); unsubSecurity(); };
  }, []);

  // --- إدارة الصور ---
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

  // --- حفظ الإعدادات ---
  const saveAllConfigs = async (type: 'onboarding' | 'appearance') => {
    if (type === 'onboarding') {
      await setDoc(doc(db, "app_config", "onboarding"), { onboardingVersion: version, slides, lastUpdated: serverTimestamp() });
    } else {
      await setDoc(doc(db, "app_config", "appearance"), appConfig);
    }
    toast.success("تم الحفظ بنجاح!");
  };

  // --- إدارة الأعضاء ---
  const handleUserAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    try {
      if (userModal.type === 'add') {
        await addDoc(collection(db, "users"), {
          ...data,
          createdAt: new Date().toLocaleString('ar-EG'),
          lastLogin: "لم يسجل دخول",
          role: data.role || 'user'
        });
        toast.success("تم إضافة العضو بنجاح");
      } else {
        await updateDoc(doc(db, "users", userModal.data.id), data);
        toast.success("تم تحديث البيانات");
      }
      setUserModal({ show: false, type: 'add' });
    } catch (e) { toast.error("فشل الإجراء"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-stone-50"><RefreshCw className="animate-spin text-stone-300" size={48} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 font-sans text-right" dir="rtl">
      
      {/* 🧭 القائمة الجانبية/العلوية */}
      <div className="flex gap-2 overflow-x-auto pb-6 mb-10 border-b border-stone-100">
        {[
          { id: 'onboarding', icon: <Smartphone />, label: 'الترحيب' },
          { id: 'users', icon: <Users />, label: 'الأعضاء' },
          { id: 'security', icon: <Shield />, label: 'الأمان' },
          { id: 'notifications', icon: <Bell />, label: 'الإشعارات' },
          { id: 'settings', icon: <Palette />, label: 'ستايل التطبيق' },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-stone-900 text-white shadow-xl' : 'bg-white text-stone-400 hover:bg-stone-50'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* 1️⃣ Onboarding Section */}
        {activeTab === 'onboarding' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex justify-between items-center border border-stone-50">
              <div className="flex items-center gap-4">
                <span className="font-bold text-stone-400">رقم الإصدار:</span>
                <input value={version} onChange={e => setVersion(e.target.value)} className="w-20 p-2 bg-stone-100 rounded-xl text-center font-black border-none" />
              </div>
              <button onClick={() => saveAllConfigs('onboarding')} className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all">
                <Save size={18}/> حفظ ونشر
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slides.map((slide, i) => (
                <div key={i} className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-stone-50 space-y-4 relative group">
                  <div className="h-48 bg-stone-50 rounded-[2rem] overflow-hidden relative border-2 border-dashed border-stone-100">
                    {slide.img ? <img src={slide.img} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-stone-200"><UploadCloud size={40}/></div>}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all text-white font-bold text-xs">
                      تغيير الصورة
                      <input type="file" className="hidden" onChange={e => e.target.files && handleImageUpload('onboarding', e.target.files[0], (url) => {
                        const s = [...slides]; s[i].img = url; setSlides(s);
                      })} />
                    </label>
                  </div>
                  <input value={slide.title} onChange={e => {const s=[...slides]; s[i].title=e.target.value; setSlides(s);}} placeholder="العنوان" className="w-full p-3 bg-stone-50 border-none rounded-xl font-bold" />
                  <textarea value={slide.desc} onChange={e => {const s=[...slides]; s[i].desc=e.target.value; setSlides(s);}} placeholder="الوصف" className="w-full p-3 bg-stone-50 border-none rounded-xl h-20 text-xs resize-none" />
                  <button onClick={() => setSlides(slides.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={18}/></button>
                </div>
              ))}
              <button onClick={() => setSlides([...slides, {title:'', desc:'', img:''}])} className="border-4 border-dashed border-stone-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-stone-200 hover:text-stone-400 hover:bg-white transition-all">
                <Plus size={40} /> <span className="font-bold">إضافة سلايد</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* 2️⃣ Users Management (المحسنة بالأزرار الواضحة) */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm">
              <h2 className="text-2xl font-black text-stone-800 flex items-center gap-3"><Users className="text-stone-400"/> قائمة الأعضاء ({usersList.length})</h2>
              <button onClick={() => setUserModal({show: true, type: 'add'})} className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-stone-200">
                <UserPlus size={20}/> إضافة عضو جديد
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-stone-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      <th className="p-6 font-black text-stone-400 text-xs uppercase tracking-widest">المستخدم</th>
                      <th className="p-6 font-black text-stone-400 text-xs uppercase tracking-widest">التواريخ</th>
                      <th className="p-6 font-black text-stone-400 text-xs uppercase tracking-widest">الحالة</th>
                      <th className="p-6 font-black text-stone-400 text-xs uppercase tracking-widest text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {usersList.map(u => (
                      <tr key={u.id} className="hover:bg-stone-50/50 transition-colors group">
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 font-bold">{u.username?.charAt(0)}</div>
                            <div>
                              <div className="font-black text-stone-800">{u.username}</div>
                              <div className="text-xs text-stone-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-1 text-[11px] text-stone-500 font-bold"><Clock size={12}/> انضم: {u.createdAt || 'غير مسجل'}</div>
                          <div className="flex items-center gap-1 text-[11px] text-green-600 font-bold"><RefreshCw size={12}/> دخول: {u.lastLogin || 'لا يوجد'}</div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                            {u.role === 'admin' ? 'مدير النظام' : 'عضو عادي'}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex justify-center gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setUserModal({show: true, type: 'edit', data: u})} className="flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all">
                              <Edit3 size={14}/> تعديل
                            </button>
                            <button onClick={async () => { if(confirm("هل أنت متأكد من حذف هذا العضو نهائياً؟")) await deleteDoc(doc(db, "users", u.id)) }} className="flex items-center gap-1 px-4 py-2 bg-rose-50 text-rose-500 rounded-xl font-bold text-xs hover:bg-rose-500 hover:text-white transition-all">
                              <Trash2 size={14}/> حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3️⃣ Security Requests (جديد) */}
        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-black text-stone-800 px-4 flex items-center gap-3"><Shield className="text-stone-400"/> طلبات استعادة الحساب</h2>
            <div className="grid gap-4">
              {securityRequests.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] text-center text-stone-300 font-bold">لا يوجد طلبات حالياً</div>
              ) : (
                securityRequests.map(req => (
                  <div key={req.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Key size={24}/></div>
                      <div>
                        <div className="font-bold text-stone-800">طلب تغيير كلمة سر لـ: {req.email}</div>
                        <div className="text-xs text-stone-400">بتاريخ: {req.createdAt?.toDate().toLocaleString('ar-EG')}</div>
                      </div>
                    </div>
                    <button onClick={async () => await deleteDoc(doc(db, "security_requests", req.id))} className="p-3 text-stone-300 hover:text-rose-500 transition-colors"><X/></button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* 4️⃣ App Style (تحميل الصورة وتغيير الألوان) */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-stone-50 space-y-10">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-stone-50 rounded-[2.5rem] mx-auto border-4 border-white shadow-xl overflow-hidden relative group">
                  <img src={appConfig.appLogo || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all text-white text-[10px] font-black uppercase">
                    تغيير اللوجو
                    <input type="file" className="hidden" onChange={e => e.target.files && handleImageUpload('app_assets', e.target.files[0], (url) => setAppConfig({...appConfig, appLogo: url}))} />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-black text-stone-800">هوية التطبيق البصرية</h3>
                  <p className="text-xs text-stone-400 font-bold mt-1">تعديل الألوان واللوجو الرسمي</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-center text-xs font-black text-stone-300 uppercase tracking-widest">اختر اللون الأساسي</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {['#1c1917', '#7c2d12', '#064e3b', '#1e3a8a', '#be123c', '#6d28d9', '#4d7c0f'].map(color => (
                    <button 
                      key={color} 
                      onClick={() => setAppConfig({...appConfig, primaryColor: color})}
                      className={`w-12 h-12 rounded-2xl border-4 transition-all ${appConfig.primaryColor === color ? 'border-stone-900 scale-125 shadow-lg' : 'border-white shadow-sm'}`}
                      style={{backgroundColor: color}}
                    />
                  ))}
                </div>
              </div>

              <button onClick={() => saveAllConfigs('appearance')} className="w-full bg-stone-900 text-white py-5 rounded-[2rem] font-black shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                <Save size={20}/> حفظ إعدادات التصميم
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* --- User Modal (نافذة إضافة وتعديل الأعضاء) --- */}
      {userModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-black flex items-center gap-2">
                {userModal.type === 'add' ? <UserPlus className="text-blue-500"/> : <Edit3 className="text-blue-500"/>}
                {userModal.type === 'add' ? 'إضافة عضو جديد' : 'تعديل بيانات العضو'}
              </h3>
              <button onClick={() => setUserModal({show: false, type: 'add'})} className="p-2 hover:bg-stone-200 rounded-full transition-colors"><X/></button>
            </div>
            
            <form onSubmit={handleUserAction} className="p-8 space-y-5">
              <div className="space-y-2 text-right">
                <label className="text-xs font-black text-stone-400 mr-2 uppercase tracking-widest">اسم المستخدم</label>
                <div className="relative">
                  <UserIcon className="absolute right-4 top-4 text-stone-300" size={18}/>
                  <input required name="username" defaultValue={userModal.data?.username} className="w-full pr-12 pl-4 py-4 bg-stone-50 border-none rounded-2xl font-bold focus:ring-2 ring-stone-900 transition-all" placeholder="مثلاً: amjad_99" />
                </div>
              </div>
              
              <div className="space-y-2 text-right">
                <label className="text-xs font-black text-stone-400 mr-2 uppercase tracking-widest">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-4 top-4 text-stone-300" size={18}/>
                  <input required name="email" type="email" defaultValue={userModal.data?.email} className="w-full pr-12 pl-4 py-4 bg-stone-50 border-none rounded-2xl font-bold text-left focus:ring-2 ring-stone-900 transition-all" placeholder="email@example.com" />
                </div>
              </div>

              <div className="space-y-2 text-right relative">
                <label className="text-xs font-black text-stone-400 mr-2 uppercase tracking-widest">كلمة السر</label>
                <div className="relative">
                  <Key className="absolute right-4 top-4 text-stone-300" size={18}/>
                  <input required name="password" type={showPassword ? "text" : "password"} defaultValue={userModal.data?.password} className="w-full pr-12 pl-12 py-4 bg-stone-50 border-none rounded-2xl font-bold focus:ring-2 ring-stone-900 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-4 text-stone-300">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-right">
                <label className="text-xs font-black text-stone-400 mr-2 uppercase tracking-widest">الصلاحية</label>
                <select name="role" defaultValue={userModal.data?.role || 'user'} className="w-full p-4 bg-stone-50 border-none rounded-2xl font-black appearance-none focus:ring-2 ring-stone-900 transition-all">
                  <option value="user">عضو عادي (User)</option>
                  <option value="admin">مدير نظام (Admin)</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-stone-900 text-white py-5 rounded-[2rem] font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4">
                {userModal.type === 'add' ? 'إنشاء الحساب الآن' : 'حفظ التعديلات'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
