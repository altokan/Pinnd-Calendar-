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
  where,
  getDocs
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  updatePassword
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
  Pencil
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";

export default function AdminPage() {

  /* ================================================= */
  /* STATES                                            */
  /* ================================================= */

  const [activeTab, setActiveTab] =
    useState<"users" | "requests" | "messages" | "settings" | "notifications">("users");

  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    contactRecipientEmail: "",
    appIconUrl: ""
  });

  const [search, setSearch] = useState("");

  /* ADD USER */
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  /* EDIT USER */
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const prevMsgCount = useRef(0);

  /* ================================================= */
  /* LISTENERS                                         */
  /* ================================================= */

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

        if (data.length > prevMsgCount.current)
          toast("📩 New message received");

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

  /* ================================================= */
  /* MEMBERS                                           */
  /* ================================================= */

  const handleCreateUser = async (e:any) => {
    e.preventDefault();

    if (!newUsername || !newEmail || !newPassword)
      return toast.error("Fill all fields");

    /* منع username مكرر */
    const q = query(
      collection(db,"users"),
      where("username","==",newUsername)
    );

    const exist = await getDocs(q);
    if(!exist.empty)
      return toast.error("Username already exists");

    const cred = await createUserWithEmailAndPassword(
      auth,
      newEmail,
      newPassword
    );

    const uid = cred.user.uid;

    await setDoc(doc(db,"users",uid),{
      uid,
      username:newUsername,
      email:newEmail,
      password:newPassword,
      role:"user",
      createdAt:serverTimestamp(),
      lastLogin:serverTimestamp()
    });

    toast.success("Member created");

    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
  };

  const deleteUser = async(uid:string)=>{
    if(!confirm("Delete user?")) return;
    await deleteDoc(doc(db,"users",uid));
    toast.success("User deleted");
  };

  /* EDIT USER */

  const openEdit = (u:any)=>{
    setEditingUser(u);
    setEditUsername(u.username);
    setEditEmail(u.email);
    setEditPassword(u.password || "");
  };

  const saveEdit = async(e:any)=>{
    e.preventDefault();

    await updateDoc(
      doc(db,"users",editingUser.uid),
      {
        username:editUsername,
        email:editEmail,
        password:editPassword
      }
    );

    toast.success("User updated");
    setEditingUser(null);
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* ================================================= */
  /* SECURITY                                          */
  /* ================================================= */

  const completeRequest = async(id:string)=>{
    await updateDoc(doc(db,"resetRequests",id),{status:"completed"});
  };

  /* ================================================= */
  /* MESSAGES                                          */
  /* ================================================= */

  const unreadCount = messages.filter(m=>!m.read).length;

  const markRead = async(id:string)=>{
    await updateDoc(doc(db,"contactMessages",id),{read:true});
  };

  const deleteMessage = async(id:string)=>{
    await deleteDoc(doc(db,"contactMessages",id));
  };

  const deleteAllMessages = async()=>{
    const batch = writeBatch(db);
    messages.forEach(m=>{
      batch.delete(doc(db,"contactMessages",m.id));
    });
    await batch.commit();
  };

  /* ================================================= */
  /* SETTINGS                                          */
  /* ================================================= */

  const uploadAppIcon = async(e:any)=>{
    const file = e.target.files[0];
    const storageRef = ref(storage,"admin/app_icon_"+Date.now());
    await uploadBytes(storageRef,file);
    const url = await getDownloadURL(storageRef);

    setSettings({...settings,appIconUrl:url});
  };

  const saveSettings = async(e:any)=>{
    e.preventDefault();
    await setDoc(doc(db,"settings","admin"),settings);
    toast.success("Settings saved");
  };

  /* ================================================= */
  /* NOTIFICATIONS                                     */
  /* ================================================= */

  const sendNotification = async(e:any)=>{
    e.preventDefault();

    await addDoc(collection(db,"admin_notifications"),{
      title:e.target.title.value,
      body:e.target.body.value,
      createdAt:serverTimestamp()
    });

    toast.success("Notification sent");
    e.target.reset();
  };

  /* ================================================= */
  /* UI                                                */
  /* ================================================= */

  return (
    <div className="space-y-8">

      {/* TABS */}
      <div className="flex flex-wrap glass rounded-2xl p-1">

        {[
          {key:"users",label:"Members",icon:Users},
          {key:"requests",label:"Security",icon:Key},
          {key:"messages",label:"Messages",icon:Mail},
          {key:"settings",label:"Settings",icon:Settings},
          {key:"notifications",label:"Notifications",icon:Bell}
        ].map(tab=>{
          const Icon=tab.icon;

          return(
            <button
              key={tab.key}
              onClick={()=>setActiveTab(tab.key as any)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold",
                activeTab===tab.key
                  ?"bg-stone-900 text-white"
                  :"text-stone-400"
              )}
            >
              <Icon size={14}/>
              {tab.label}

              {tab.key==="messages" && unreadCount>0 &&(
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-2 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}

      </div>

      <AnimatePresence mode="wait">

        {/* ================= MEMBERS ================= */}

        {activeTab==="users" &&(
          <motion.div
            key="users"
            initial={{opacity:0}}
            animate={{opacity:1}}
            className="card-modern p-6 space-y-6"
          >

            {/* ADD MEMBER */}
            <form onSubmit={handleCreateUser} className="grid md:grid-cols-4 gap-4">
              <input placeholder="Username" value={newUsername} onChange={e=>setNewUsername(e.target.value)} className="bg-stone-50 p-2 rounded-xl border"/>
              <input placeholder="Email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="bg-stone-50 p-2 rounded-xl border"/>
              <input type="password" placeholder="Password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="bg-stone-50 p-2 rounded-xl border"/>
              <button className="btn-primary">Add Member</button>
            </form>

            {/* SEARCH */}
            <div className="flex gap-2">
              <Search size={16}/>
              <input
                placeholder="Search..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
                className="bg-stone-50 p-2 rounded-xl border"
              />
            </div>

            {/* USERS LIST */}
            {filteredUsers.map(u=>(
              <div key={u.uid} className="flex justify-between border-b py-3">

                <div>
                  <b>{u.username}</b>
                  <div className="text-xs text-stone-400">{u.email}</div>

                  <div className="text-[11px] text-stone-400">
                    Created: {u.createdAt?.seconds
                      ? new Date(u.createdAt.seconds*1000).toLocaleDateString()
                      : "-"}
                  </div>

                  <div className="text-[11px] text-stone-400">
                    Last Login: {u.lastLogin?.seconds
                      ? new Date(u.lastLogin.seconds*1000).toLocaleString()
                      : "-"}
                  </div>
                </div>

                <div className="flex gap-3 items-center">

                  <span className="font-mono">
                    {showPasswords[u.uid] ? u.password : "••••••"}
                  </span>

                  <button onClick={()=>
                    setShowPasswords(p=>({...p,[u.uid]:!p[u.uid]}))
                  }>
                    {showPasswords[u.uid] ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>

                  <button onClick={()=>openEdit(u)}>
                    <Pencil size={16}/>
                  </button>

                  <button onClick={()=>deleteUser(u.uid)}>
                    <Trash2 size={16}/>
                  </button>

                </div>

              </div>
            ))}

          </motion.div>
        )}

        {/* ================= SECURITY ================= */}

        {activeTab==="requests" &&(
          <motion.div key="sec" className="card-modern p-6 space-y-4">
            {resetRequests.map(r=>(
              <div key={r.id} className="flex justify-between border-b py-3">
                <div>{r.username}</div>
                {r.status!=="completed" &&
                  <button onClick={()=>completeRequest(r.id)}>
                    <Check size={16}/>
                  </button>}
              </div>
            ))}
          </motion.div>
        )}

        {/* ================= MESSAGES ================= */}

        {activeTab==="messages" &&(
          <motion.div key="msg" className="space-y-4">

            <button onClick={deleteAllMessages} className="bg-red-600 text-white px-4 py-2 rounded-xl">
              Delete All
            </button>

            {messages.map(m=>(
              <div key={m.id} className="card-modern p-6">
                <div className="flex justify-between">
                  <b>{m.username}</b>

                  <div className="flex gap-2">
                    {!m.read && <button onClick={()=>markRead(m.id)}><Check size={16}/></button>}
                    <button onClick={()=>deleteMessage(m.id)}><Trash2 size={16}/></button>
                  </div>
                </div>

                <p className="mt-3">{m.message}</p>
              </div>
            ))}

          </motion.div>
        )}

        {/* ================= SETTINGS ================= */}

        {activeTab==="settings" &&(
          <motion.form key="set" onSubmit={saveSettings} className="card-modern p-6 space-y-6">

            <input type="file" onChange={uploadAppIcon}/>

            {settings.appIconUrl &&(
              <img src={settings.appIconUrl} className="w-24 h-24 rounded-xl"/>
            )}

            <input
              value={settings.contactRecipientEmail}
              onChange={e=>setSettings({...settings,contactRecipientEmail:e.target.value})}
              className="bg-stone-50 p-2 rounded-xl border"
              placeholder="Contact Email"
            />

            <button className="btn-primary w-full py-3">
              Save Settings
            </button>

          </motion.form>
        )}

        {/* ================= NOTIFICATIONS ================= */}

        {activeTab==="notifications" &&(
          <motion.div key="notif" className="max-w-xl">

            <form onSubmit={sendNotification} className="card-modern p-6 space-y-4">
              <input name="title" placeholder="Title" required className="w-full p-2 border rounded-xl"/>
              <textarea name="body" placeholder="Message" required className="w-full p-2 border rounded-xl"/>
              <button className="btn-primary w-full py-3">
                Send To All Users
              </button>
            </form>

          </motion.div>
        )}

      </AnimatePresence>

      {/* EDIT MODAL */}
      {editingUser &&(
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <form onSubmit={saveEdit} className="bg-white p-6 rounded-2xl space-y-4 w-[350px]">

            <input value={editUsername} onChange={e=>setEditUsername(e.target.value)} className="w-full border p-2 rounded-xl"/>
            <input value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="w-full border p-2 rounded-xl"/>
            <input value={editPassword} onChange={e=>setEditPassword(e.target.value)} className="w-full border p-2 rounded-xl"/>

            <button className="btn-primary w-full py-2">
              Save Changes
            </button>

          </form>
        </div>
      )}

    </div>
  );
}
