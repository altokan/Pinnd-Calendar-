import React, { useState, useEffect, useRef } from "react";
import { db, isFirebaseConfigured } from "../services/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  writeBatch
} from "firebase/firestore";

import {
  Users,
  Key,
  Trash2,
  UserPlus,
  Mail,
  Settings,
  Bell,
  Check
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";
import PasswordInput from "../components/PasswordInput";

const AdminPage: React.FC = () => {

  const [users, setUsers] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    "users" | "messages" | "notifications" | "settings" | "requests"
  >("users");

  const prevMessageCount = useRef(0);

  /* ---------------- LISTENERS ---------------- */

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
    );

    const unsubMessages = onSnapshot(
      query(collection(db, "contactMessages"), orderBy("createdAt", "desc")),
      snap => {
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setContactMessages(messages);

        // 🔔 إشعار عند وصول رسالة جديدة
        if (messages.length > prevMessageCount.current) {
          toast("📩 New message received");
        }
        prevMessageCount.current = messages.length;
      }
    );

    return () => {
      unsubUsers();
      unsubMessages();
    };

  }, []);

  /* ---------------- MESSAGES ---------------- */

  const unreadCount = contactMessages.filter(m => !m.read).length;

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "contactMessages", id), { read: true });
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await deleteDoc(doc(db, "contactMessages", id));
    toast.success("Message deleted");
  };

  const deleteAllMessages = async () => {
    if (!confirm("Delete ALL messages?")) return;

    const batch = writeBatch(db);
    contactMessages.forEach(m => {
      batch.delete(doc(db, "contactMessages", m.id));
    });

    await batch.commit();
    toast.success("All messages deleted");
  };

  /* ---------------- SEND NOTIFICATION ---------------- */

  const sendNotification = async (e: any) => {
    e.preventDefault();
    const title = e.target.title.value;
    const body = e.target.body.value;

    await addDoc(collection(db, "notifications"), {
      title,
      body,
      createdAt: serverTimestamp()
    });

    toast.success("Notification queued");
    e.target.reset();
  };

  return (
    <div className="space-y-8">

      {/* TABS */}
      <div className="flex flex-wrap glass rounded-2xl p-1 shadow-sm">

        {[
          { key: "users", label: "Members", icon: Users },
          { key: "messages", label: "Messages", icon: Mail },
          { key: "notifications", label: "Notifications", icon: Bell },
          { key: "settings", label: "Settings", icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold",
                activeTab === tab.key
                  ? "bg-stone-900 text-white"
                  : "text-stone-400 hover:bg-white/50"
              )}
            >
              <Icon size={14} />
              {tab.label}

              {/* 🔴 عداد غير المقروء */}
              {tab.key === "messages" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-2 py-[2px] rounded-full">
                  {unreadCount}
                </span>
              )}

            </button>
          );
        })}

      </div>

      <AnimatePresence mode="wait">

        {/* MESSAGES TAB */}
        {activeTab === "messages" && (
          <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            <div className="flex justify-end">
              {contactMessages.length > 0 && (
                <button
                  onClick={deleteAllMessages}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs"
                >
                  Delete All
                </button>
              )}
            </div>

            {contactMessages.length === 0 ? (
              <div className="card-modern p-10 text-center">
                <Mail className="mx-auto mb-4 text-stone-300" size={40}/>
                No messages yet.
              </div>
            ) : (
              contactMessages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    "card-modern p-6 space-y-3 border",
                    !msg.read && "border-blue-400"
                  )}
                >
                  <div className="flex justify-between items-center">

                    <div>
                      <b>{msg.username}</b>
                      <div className="text-xs text-stone-400">{msg.email}</div>
                    </div>

                    <div className="flex gap-3">

                      {!msg.read && (
                        <button
                          onClick={() => markAsRead(msg.id)}
                          className="text-blue-500 hover:opacity-70"
                          title="Mark as read"
                        >
                          <Check size={16}/>
                        </button>
                      )}

                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="text-red-500 hover:opacity-70"
                        title="Delete"
                      >
                        <Trash2 size={16}/>
                      </button>

                    </div>

                  </div>

                  <p className="text-sm bg-stone-50 p-3 rounded-xl">
                    {msg.message}
                  </p>

                </div>
              ))
            )}

          </motion.div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl">
            <div className="card-modern p-8 space-y-6">

              <h3 className="text-lg font-bold flex items-center gap-2">
                <Bell size={18}/> Send Push Notification
              </h3>

              <form onSubmit={sendNotification} className="space-y-4">
                <input name="title" placeholder="Title" required className="w-full px-4 py-3 bg-stone-50 border rounded-xl"/>
                <textarea name="body" placeholder="Message" required rows={4} className="w-full px-4 py-3 bg-stone-50 border rounded-xl"/>
                <button className="btn-primary w-full py-4">
                  Send To All Users
                </button>
              </form>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};

export default AdminPage;
