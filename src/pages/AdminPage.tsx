// src/pages/AdminPage.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  collection, query, onSnapshot, doc, deleteDoc,
  updateDoc, setDoc, addDoc, orderBy,
  serverTimestamp, writeBatch, getDocs
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";

import { db, storage, auth } from "../services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  Users, Key, Trash2, Check, Mail,
  Settings, Bell, Eye, EyeOff, Search, Plus, Send
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";

export default function AdminPage() {

  /* ================= STATE ================= */

  const [activeTab, setActiveTab] = useState<
    "users" | "security" | "messages" | "settings" | "notifications"
  >("users");

  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    contactRecipientEmail: "",
    appIconUrl: ""
  });

  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const prevMsgCount = useRef(0);

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  /* ================= LISTENERS ================= */

  useEffect(() => {
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      s => setUsers(s.docs.map(d => ({ uid: d.id, ...d.data() })))
    );

    const unsubRequests = onSnapshot(
      query(collection(db, "resetRequests"), orderBy("createdAt", "desc")),
      s => setResetRequests(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubMessages = onSnapshot(
      query(collection(db, "contactMessages"), orderBy("createdAt", "desc")),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(data);
        if (data.length > prevMsgCount.current) {
          toast.success("📩 رسالة جديدة واردة", { icon: '📧' });
        }
        prevMsgCount.current = data.length;
      });

    const unsubSettings = onSnapshot(
      doc(db, "settings", "admin"),
      d => d.exists() && setSettings(d.data() as any)
    );

    return () => {
      unsubUsers();
      unsubRequests();
      unsubMessages();
      unsubSettings();
    };
  }, []);

  /* ================= HANDLERS ================= */

  const handleCreateUser = async (e: any) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newPassword)
      return toast.error("يرجى ملء جميع الحقول");

    try {
      setCreating(true);
      const check = await getDocs(collection(db, "users"));
      const exists = check.docs.some(
        u => u.data().username?.toLowerCase() === newUsername.toLowerCase()
      );
      if (exists) throw new Error("اسم المستخدم موجود بالفعل");

      const cred = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        username: newUsername,
        email: newEmail,
        role: "user",
        createdAt: Date.now(),
      });

      toast.success("تمت إضافة العضو بنجاح");
      setNewUsername(""); setNewEmail(""); setNewPassword("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = (uid: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      deleteDoc(doc(db, "users", uid));
      toast.success("تم الحذف");
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= UI COMPONENTS ================= */

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8 font-sans text-stone-900">
      
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">لوحة الإدارة</h1>
        <p className="text-stone-500">إدارة المستخدمين، الرسائل، والإعدادات العامة للمنصة.</p>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 bg-stone-100/50 p-1.5 rounded-[2rem] border border-stone-200 w-fit">
        {[
          { key: "users", label: "الأعضاء", icon: Users },
          { key: "security", label: "الأمان", icon: Key },
          { key: "messages", label: "الرسائل", icon: Mail },
          { key: "settings", label: "الإعدادات", icon: Settings },
          { key: "notifications", label: "التنبيهات", icon: Bell }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-white text-black shadow-sm border border-stone-200" 
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-200/50"
              )}
            >
              <Icon size={18} className={isActive ? "text-black" : "text-stone-400"} />
              {t.label}
              {t.key === "messages" && messages.filter(m => !m.read).length > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          
          {/* MEMBERS TAB */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm p-8 space-y-8">
                <div className="flex flex-col gap-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Plus size={20} /> إضافة عضو جديد
                  </h3>
                  <form onSubmit={handleCreateUser} className="grid md:grid-cols-4 gap-4">
                    <input className="px-5 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 ring-black/5 outline-none transition-all" 
                           placeholder="اسم المستخدم" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                    <input className="px-5 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 ring-black/5 outline-none transition-all" 
                           placeholder="البريد الإلكتروني" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                    <input type="password" className="px-5 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 ring-black/5 outline-none transition-all" 
                           placeholder="كلمة المرور" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button disabled={creating} className="bg-black text-white rounded-2xl font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50">
                      {creating ? "جاري الإضافة..." : "إضافة عضو"}
                    </button>
                  </form>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input placeholder="البحث عن عضو (الاسم أو البريد)..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-stone-100/50 border-none focus:ring-2 ring-stone-200 outline-none text-sm" />
                </div>

                <div className="divide-y divide-stone-100">
                  {filteredUsers.map(u => (
                    <div key={u.uid} className="flex justify-between items-center py-5 group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center font-bold text-stone-500 uppercase">
                          {u.username?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-stone-800">{u.username}</p>
                          <p className="text-sm text-stone-400">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="p-2.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-black transition-all"
                                onClick={() => sendPasswordResetEmail(auth, u.email).then(() => toast.success("تم إرسال رابط التعيين"))}>
                          <Key size={18} />
                        </button>
                        <button className="p-2.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-all" 
                                onClick={() => deleteUser(u.uid)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES TAB */}
          {activeTab === "messages" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold italic">Inbox Messages</h3>
                <button onClick={() => { if(confirm("حذف الكل؟")) { /* logic */ } }} 
                  className="text-sm font-semibold text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all">
                  حذف جميع الرسائل
                </button>
              </div>
              
              <div className="grid gap-4">
                {messages.map(m => (
                  <div key={m.id} className={cn(
                    "bg-white rounded-[2rem] border p-6 transition-all duration-300",
                    !m.read ? "border-blue-200 shadow-md ring-1 ring-blue-50" : "border-stone-100 opacity-80"
                  )}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", !m.read ? "bg-blue-500" : "bg-stone-200")} />
                        <div>
                          <p className="font-bold">{m.username}</p>
                          <p className="text-xs text-stone-400">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!m.read && (
                          <button onClick={() => updateDoc(doc(db, "contactMessages", m.id), { read: true })}
                                  className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all">
                            <Check size={16} />
                          </button>
                        )}
                        <button onClick={() => deleteDoc(doc(db, "contactMessages", m.id))}
                                className="p-2 rounded-xl bg-stone-50 text-stone-400 hover:bg-rose-600 hover:text-white transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-stone-600 text-sm leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-100">
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-[3rem] border border-stone-200 shadow-sm p-10 space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Bell size={32} />
                  </div>
                  <h3 className="text-2xl font-bold italic">إرسال تنبيه جماعي</h3>
                  <p className="text-stone-400 text-sm">سيصل هذا التنبيه لجميع مستخدمي التطبيق فوراً</p>
                </div>

                <form onSubmit={async (e: any) => {
                  e.preventDefault();
                  await addDoc(collection(db, "admin_notifications"), {
                    title: e.target.title.value,
                    body: e.target.body.value,
                    createdAt: serverTimestamp()
                  });
                  toast.success("تم الإرسال بنجاح");
                  e.target.reset();
                }} className="space-y-4">
                  <input name="title" required placeholder="عنوان التنبيه" 
                         className="w-full px-6 py-4 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 ring-rose-100 outline-none" />
                  <textarea name="body" rows={5} required placeholder="محتوى الرسالة..."
                            className="w-full px-6 py-4 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 ring-rose-100 outline-none resize-none" />
                  <button className="w-full py-4 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2">
                    <Send size={18} /> إرسال الآن
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] border border-stone-200 p-8">
              <h3 className="text-xl font-bold mb-8">إعدادات النظام</h3>
              <div className="space-y-8">
                <div className="flex items-center gap-8 p-6 bg-stone-50 rounded-[2rem] border border-dashed border-stone-200">
                   <div className="w-24 h-24 rounded-[1.5rem] bg-white border shadow-sm overflow-hidden flex items-center justify-center text-stone-300">
                     {settings.appIconUrl ? <img src={settings.appIconUrl} className="w-full h-full object-cover" /> : <Settings size={40} />}
                   </div>
                   <div className="space-y-2">
                     <p className="font-semibold text-sm">أيقونة التطبيق</p>
                     <input type="file" accept="image/*" onChange={async (e:any) => {
                        const file = e.target.files[0];
                        if(!file) return;
                        const r = ref(storage, "admin/icon_" + Date.now());
                        await uploadBytes(r, file);
                        const url = await getDownloadURL(r);
                        setSettings(p => ({ ...p, appIconUrl: url }));
                        toast.success("تم رفع الأيقونة");
                     }} className="text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-black file:text-white hover:file:bg-stone-800" />
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold px-2">بريد استقبال المراسلات</label>
                  <input 
                    value={settings.contactRecipientEmail || ""}
                    onChange={e => setSettings({ ...settings, contactRecipientEmail: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 ring-black/5 outline-none transition-all"
                    placeholder="example@admin.com"
                  />
                </div>

                <button 
                  onClick={async () => {
                    await setDoc(doc(db, "settings", "admin"), settings);
                    toast.success("تم حفظ الإعدادات");
                  }}
                  className="w-full py-4 rounded-2xl bg-black text-white font-bold hover:shadow-xl transition-all"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
