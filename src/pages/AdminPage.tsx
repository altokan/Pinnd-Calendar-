import React, { useEffect, useState, useRef } from "react";
import { db, isFirebaseConfigured } from "../services/firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  serverTimestamp,
  writeBatch,
  setDoc
} from "firebase/firestore";

import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Settings,
  Bell,
  Key,
  Check,
  Search
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import PasswordInput from "../components/PasswordInput";
import { cn } from "../lib/utils";

export default function AdminPage() {

  const [activeTab,setActiveTab]=useState<
    "users"|"requests"|"messages"|"settings"|"notifications"
  >("users");

  const [users,setUsers]=useState<any[]>([]);
  const [messages,setMessages]=useState<any[]>([]);
  const [resetRequests,setResetRequests]=useState<any[]>([]);
  const [search,setSearch]=useState("");

  const [newUsername,setNewUsername]=useState("");
  const [newEmail,setNewEmail]=useState("");
  const [newPassword,setNewPassword]=useState("");

  const prevMsgCount=useRef(0);

  /* ---------------- LISTENERS ---------------- */

  useEffect(()=>{

    if(!isFirebaseConfigured) return;

    const unsubUsers=onSnapshot(
      query(collection(db,"users"),orderBy("createdAt","desc")),
      snap=>setUsers(snap.docs.map(d=>({uid:d.id,...d.data()})))
    );

    const unsubMessages=onSnapshot(
      query(collection(db,"contactMessages"),orderBy("createdAt","desc")),
      snap=>{
        const data=snap.docs.map(d=>({id:d.id,...d.data()}));
        setMessages(data);

        if(data.length>prevMsgCount.current){
          toast("📩 New message received");
        }
        prevMsgCount.current=data.length;
      }
    );

    const unsubRequests=onSnapshot(
      query(collection(db,"resetRequests"),orderBy("createdAt","desc")),
      snap=>setResetRequests(
        snap.docs.map(d=>({id:d.id,...d.data()}))
      )
    );

    return()=>{
      unsubUsers();
      unsubMessages();
      unsubRequests();
    };

  },[]);

  /* ---------------- MEMBERS ---------------- */

  const createUser=async(e:any)=>{
    e.preventDefault();

    await addDoc(collection(db,"users"),{
      username:newUsername,
      email:newEmail,
      password:newPassword,
      role:"user",
      createdAt:Date.now()
    });

    toast.success("Member added");
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
  };

  const deleteUser=async(uid:string)=>{
    if(!confirm("Delete user?")) return;
    await deleteDoc(doc(db,"users",uid));
    toast.success("User deleted");
  };

  const filteredUsers=users.filter(u=>
    u.username?.toLowerCase().includes(search.toLowerCase())||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------- MESSAGES ---------------- */

  const unreadCount=messages.filter(m=>!m.read).length;

  const markRead=(id:string)=>
    updateDoc(doc(db,"contactMessages",id),{read:true});

  const deleteMessage=(id:string)=>
    deleteDoc(doc(db,"contactMessages",id));

  const deleteAllMessages=async()=>{
    if(!confirm("Delete all messages?")) return;

    const batch=writeBatch(db);
    messages.forEach(m=>{
      batch.delete(doc(db,"contactMessages",m.id));
    });
    await batch.commit();

    toast.success("All messages deleted");
  };

  /* ---------------- NOTIFICATIONS ---------------- */

  const sendNotification=async(e:any)=>{
    e.preventDefault();

    await addDoc(collection(db,"notifications"),{
      title:e.target.title.value,
      body:e.target.body.value,
      createdAt:serverTimestamp()
    });

    toast.success("Notification sent");
    e.target.reset();
  };

  /* ---------------- SETTINGS ---------------- */

  const saveSettings=async(e:any)=>{
    e.preventDefault();

    await setDoc(doc(db,"settings","admin"),{
      updatedAt:Date.now()
    });

    toast.success("Settings saved");
  };

  /* ---------------- UI ---------------- */

  return(
  <div className="space-y-8">

    {/* TABS */}
    <div className="flex flex-wrap glass rounded-2xl p-1">

      {[
        {k:"users",t:"Members",i:Users},
        {k:"requests",t:"Security",i:Key},
        {k:"messages",t:"Messages",i:Mail},
        {k:"settings",t:"Settings",i:Settings},
        {k:"notifications",t:"Notifications",i:Bell}
      ].map(tab=>{
        const Icon=tab.i;
        return(
          <button
            key={tab.k}
            onClick={()=>setActiveTab(tab.k as any)}
            className={cn(
              "relative px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold",
              activeTab===tab.k
                ?"bg-stone-900 text-white"
                :"text-stone-400 hover:bg-white/50"
            )}
          >
            <Icon size={14}/>
            {tab.t}

            {tab.k==="messages" && unreadCount>0 &&(
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
      {activeTab==="users"&&(
      <motion.div key="users" initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">

        <form onSubmit={createUser} className="card-modern p-6 grid md:grid-cols-4 gap-4">
          <input placeholder="Username" value={newUsername} onChange={e=>setNewUsername(e.target.value)} required/>
          <input placeholder="Email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} required/>
          <PasswordInput value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Password"/>
          <button className="btn-primary">Add Member</button>
        </form>

        <div className="card-modern p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16}/>
            <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>

          {filteredUsers.map(u=>(
            <div key={u.uid} className="flex justify-between py-3 border-b">
              <div>
                <b>{u.username}</b>
                <div className="text-xs text-stone-400">{u.email}</div>
              </div>
              <button onClick={()=>deleteUser(u.uid)}>
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
        </div>

      </motion.div>
      )}

      {/* SECURITY */}
      {activeTab==="requests"&&(
        <motion.div key="requests" initial={{opacity:0}} animate={{opacity:1}} className="card-modern p-6">
          {resetRequests.map(r=>(
            <div key={r.id} className="py-3 border-b">
              <b>{r.username}</b>
              <div className="text-xs">{r.email}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* MESSAGES */}
      {activeTab==="messages"&&(
      <motion.div key="messages" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">

        {messages.length>0&&(
          <button onClick={deleteAllMessages} className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs">
            Delete All
          </button>
        )}

        {messages.map(m=>(
          <div key={m.id} className={cn("card-modern p-6",!m.read&&"border-blue-400 border")}>
            <div className="flex justify-between">
              <div>
                <b>{m.username}</b>
                <div className="text-xs">{m.email}</div>
              </div>
              <div className="flex gap-3">
                {!m.read&&(
                  <button onClick={()=>markRead(m.id)}>
                    <Check size={16}/>
                  </button>
                )}
                <button onClick={()=>deleteMessage(m.id)}>
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
            <p className="mt-3 bg-stone-50 p-3 rounded-xl">{m.message}</p>
          </div>
        ))}

      </motion.div>
      )}

      {/* SETTINGS */}
      {activeTab==="settings"&&(
        <motion.form key="settings" initial={{opacity:0}} animate={{opacity:1}} onSubmit={saveSettings} className="card-modern p-6">
          <button className="btn-primary w-full">Save Settings</button>
        </motion.form>
      )}

      {/* NOTIFICATIONS */}
      {activeTab==="notifications"&&(
        <motion.div key="notifications" initial={{opacity:0}} animate={{opacity:1}} className="max-w-xl">
          <form onSubmit={sendNotification} className="card-modern p-8 space-y-4">
            <input name="title" placeholder="Title" required/>
            <textarea name="body" placeholder="Message" required rows={4}/>
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
