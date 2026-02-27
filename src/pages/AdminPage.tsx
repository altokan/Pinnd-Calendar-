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
  writeBatch,
  getDocs
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";

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
  Bell,
  Eye,
  EyeOff,
  Edit2
} from "lucide-react";

import { motion } from "motion/react";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";

export default function AdminPage() {

  const [activeTab, setActiveTab] = useState<
    "users" | "security" | "messages" | "settings" | "notifications"
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

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");

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
      snap => snap.exists() && setSettings(snap.data())
    );

    return () => {
      unsubUsers();
      unsubRequests();
      unsubMessages();
      unsubSettings();
    };

  }, []);

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

  return (
    <div className="space-y-8">

      {/* Tabs */}
      <div className="flex flex-wrap rounded-2xl p-2 bg-stone-100 gap-2">
        {[
          { key: "users", label: "Members", icon: Users },
          { key: "security", label: "Security", icon: Key },
          { key: "messages", label: "Messages", icon: Mail },
          { key: "settings", label: "Settings", icon: Settings },
          { key: "notifications", label: "Notifications", icon: Bell }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold",
                activeTab === t.key
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 bg-white"
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Notifications */}
      {activeTab === "notifications" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl"
        >
          <form
            onSubmit={sendNotification}
            className="card-modern p-8 space-y-6"
          >

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                Notification Title
              </label>

              <input
                name="title"
                required
                placeholder="Write notification title..."
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                Message
              </label>

              <textarea
                name="body"
                required
                rows={6}
                placeholder="Write notification message..."
                className="w-full px-4 py-4 rounded-2xl border border-stone-300 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-5 rounded-2xl bg-rose-700 text-white font-bold tracking-wide text-sm shadow-lg hover:bg-rose-800 transition-all"
            >
              Send To All Users
            </button>

          </form>
        </motion.div>
      )}

    </div>
  );
}
