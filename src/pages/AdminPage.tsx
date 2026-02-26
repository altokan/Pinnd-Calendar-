import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  addDoc,
  orderBy,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";

import { db, storage } from "../services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  Users,
  Key,
  Trash2,
  Search,
  Check,
  Clock,
  Mail,
  Settings,
  Eye,
  EyeOff,
  Bell
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";

export default function AdminPage() {

  const [activeTab, setActiveTab] = useState<
    "users" | "requests" | "messages" | "settings" | "notifications"
  >("users");

  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    contactRecipientEmail: "",
    appIconUrl: ""
  });

  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const prevMsgCount = useRef(0);

  /* ================= LISTENERS ================= */

  useEffect(() => {

    const unsubUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
    );

    const unsubRequests = onSnapshot(
      query(collection(db, "resetRequests"), orderBy("createdAt", "desc")),
      snap => setResetRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubMessages = onSnapshot(
      query(collection(db, "contactMessages"), orderBy("createdAt", "desc")),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(data);

        if (data.length > prevMsgCount.current) {
          toast("📩 New message received");
        }

        prevMsgCount.current = data.length;
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, "settings", "admin"),
      snap => {
        if (snap.exists()) setSettings(snap.data());
      }
    );

    return () => {
      unsubUsers();
      unsubRequests();
      unsubMessages();
      unsubSettings();
    };

  }, []);

  /* ================= MEMBERS ================= */

  const deleteUser = async (uid: string) => {
    if (!confirm("Delete user?")) return;
    await deleteDoc(doc(db, "users", uid));
    toast.success("User deleted");
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= SECURITY ================= */

  const completeRequest = async (id: string) => {
    await updateDoc(doc(db, "resetRequests", id), { status: "completed" });
    toast.success("Request completed");
  };

  /* ================= MESSAGES ================= */

  const unreadCount = messages.filter(m => !m.read).length;

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "contactMessages", id), { read: true });
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await deleteDoc(doc(db, "contactMessages", id));
  };

  const deleteAllMessages = async () => {
    if (!confirm("Delete ALL messages?")) return;
    const batch = writeBatch(db);
    messages.forEach(m => {
      batch.delete(doc(db, "contactMessages", m.id));
    });
    await batch.commit();
    toast.success("All messages deleted");
  };

  /* ================= SETTINGS ================= */

  const uploadAppIcon = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = ref(storage, "admin/app_icon_" + Date.now());
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    setSettings(prev => ({ ...prev, appIconUrl: url }));
    toast.success("App icon uploaded");
  };

  const saveSettings = async (e: any) => {
    e.preventDefault();
    await setDoc(doc(db, "settings", "admin"), settings);
    toast.success("Settings saved");
  };

  /* ================= NOTIFICATIONS ================= */

  const sendNotification = async (e: any) => {
    e.preventDefault();

    await addDoc(collection(db, "admin_notifications"), {
      title: e.target.title.value,
      body: e.target.body.value,
      createdAt: serverTimestamp()
    });

    toast.success("Notification sent");
    e.target.reset();
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-8">

      {/* TABS */}
      <div className="flex flex-wrap glass rounded-2xl p-1 shadow-sm">

        {[
          { key: "users", label: "Members", icon: Users },
          { key: "requests", label: "Security", icon: Key },
          { key: "messages", label: "Messages", icon: Mail },
          { key: "settings", label: "Settings", icon: Settings },
          { key: "notifications", label: "Notifications", icon: Bell }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === tab.key
                  ? "bg-stone-900 text-white"
                  : "text-stone-400 hover:bg-white/50"
              )}
            >
              <Icon size={14} />
              {tab.label}

              {tab.key === "messages" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-2 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}

      </div>

      <AnimatePresence mode="wait">

        {/* باقي التبويبات كما هي بدون تغيير */}

        {activeTab === "notifications" && (
          <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl">

            <form onSubmit={sendNotification} className="card-modern p-8 space-y-4">
              <input name="title" placeholder="Title" required className="w-full px-3 py-2 border rounded-xl" />
              <textarea name="body" placeholder="Message" rows={4} required className="w-full px-3 py-2 border rounded-xl" />
              <button className="btn-primary w-full py-4">
                Send To All Users
              </button>
            </form>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
