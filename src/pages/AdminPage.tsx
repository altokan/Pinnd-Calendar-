// src/pages/AdminPage.tsx

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

import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, storage, auth } from "../services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  Users,
  Key,
  Trash2,
  Search,
  Check,
  Mail,
  Settings,
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

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [search, setSearch] = useState("");
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

  /* ================= ADD MEMBER ================= */

  const handleCreateUser = async (e: any) => {
    e.preventDefault();

    if (!newUsername || !newEmail || !newPassword) {
      toast.error("Fill all fields");
      return;
    }

    setIsCreating(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newEmail,
        newPassword
      );

      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        username: newUsername,
        email: newEmail,
        role: "user",
        createdAt: Date.now()
      });

      toast.success("Member created successfully");

      setNewUsername("");
      setNewEmail("");
      setNewPassword("");

    } catch (error: any) {
      toast.error(error.message || "Error creating user");
    } finally {
      setIsCreating(false);
    }
  };

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

        {/* MEMBERS */}
        {activeTab === "users" && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-modern p-6 space-y-6">

            <form onSubmit={handleCreateUser} className="grid md:grid-cols-4 gap-4">
              <input placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="bg-stone-50 px-3 py-2 rounded-xl border"/>
              <input placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="bg-stone-50 px-3 py-2 rounded-xl border"/>
              <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-stone-50 px-3 py-2 rounded-xl border"/>
              <button disabled={isCreating} className="btn-primary">{isCreating ? "Creating..." : "Add Member"}</button>
            </form>

            {filteredUsers.map(u => (
              <div key={u.uid} className="flex justify-between border-b py-3">
                <div>
                  <b>{u.username}</b>
                  <div className="text-xs text-stone-400">{u.email}</div>
                </div>
                <button onClick={() => deleteUser(u.uid)}>
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
