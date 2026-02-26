// ⚡ FINAL ADMIN PANEL — ORIGINAL + ALL UPGRADES

import React, { useEffect, useState, useRef } from "react";
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
UserPlus,
Search,
Check,
Clock,
Mail,
Settings,
Edit2,
Eye,
EyeOff,
Bell,
Upload,
Camera
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
const [resetRequests,setResetRequests]=useState<any[]>([]);
const [messages,setMessages]=useState<any[]>([]);
const [settings,setSettings]=useState<any>({
contactRecipientEmail:"admin@pinnedcalendar.com",
appBannerUrl:""
});

const [search,setSearch]=useState("");
const [showPasswords,setShowPasswords]=useState<Record<string,boolean>>({});
const prevMsgCount=useRef(0);

const fileInputRef=useRef<HTMLInputElement>(null);

/* ---------------- LISTENERS ---------------- */

useEffect(()=>{

const unsubUsers=onSnapshot(
query(collection(db,"users"),orderBy("createdAt","desc")),
snap=>setUsers(snap.docs.map(d=>({uid:d.id,...d.data()})))
);

const unsubRequests=onSnapshot(
query(collection(db,"resetRequests"),orderBy("createdAt","desc")),
snap=>setResetRequests(snap.docs.map(d=>({id:d.id,...d.data()})))
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

const unsubSettings=onSnapshot(doc(db,"settings","admin"),docSnap=>{
if(docSnap.exists()) setSettings(docSnap.data());
});

return()=>{
unsubUsers();
unsubRequests();
unsubMessages();
unsubSettings();
};

},[]);

/* ---------------- MEMBERS ---------------- */

const deleteUser=async(uid:string)=>{
if(!confirm("Delete user?"))return;
await deleteDoc(doc(db,"users",uid));
toast.success("User deleted");
};

const togglePassword=(uid:string)=>{
setShowPasswords(prev=>({...prev,[uid]:!prev[uid]}));
};

const filteredUsers=users.filter(u=>
u.username?.toLowerCase().includes(search.toLowerCase())||
u.email?.toLowerCase().includes(search.toLowerCase())
);

/* ---------------- SECURITY ---------------- */

const completeRequest=async(id:string)=>{
await updateDoc(doc(db,"resetRequests",id),{status:"completed"});
toast.success("Request completed");
};

/* ---------------- MESSAGES ---------------- */

const unreadCount=messages.filter(m=>!m.read).length;

const markRead=id=>updateDoc(doc(db,"contactMessages",id),{read:true});

const deleteMessage=id=>deleteDoc(doc(db,"contactMessages",id));

const deleteAllMessages=async()=>{
if(!confirm("Delete ALL messages?"))return;
const batch=writeBatch(db);
messages.forEach(m=>batch.delete(doc(db,"contactMessages",m.id)));
await batch.commit();
toast.success("All messages deleted");
};

/* ---------------- SETTINGS ---------------- */

const uploadBanner=async(e:any)=>{
const file=e.target.files[0];
if(!file)return;

const storageRef=ref(storage,"admin/banner_"+Date.now());
await uploadBytes(storageRef,file);
const url=await getDownloadURL(storageRef);

setSettings(prev=>({...prev,appBannerUrl:url}));
toast.success("Banner uploaded");
};

const saveSettings=async(e:any)=>{
e.preventDefault();
await setDoc(doc(db,"settings","admin"),settings);
toast.success("Settings saved");
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

/* ---------------- UI ---------------- */

return(
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
"relative px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold",
activeTab===tab.key
?"bg-stone-900 text-white"
:"text-stone-400 hover:bg-white/50"
)}
>
<Icon size={14}/>
{tab.label}

{tab.key==="messages"&&unreadCount>0&&(
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
<motion.div key="users" initial={{opacity:0}} animate={{opacity:1}} className="card-modern p-6 space-y-4">

<div className="flex items-center gap-2">
<Search size={16}/>
<input placeholder="Search members..." value={search} onChange={e=>setSearch(e.target.value)}/>
</div>

{filteredUsers.map(u=>(
<div key={u.uid} className="flex justify-between border-b py-3">

<div>
<b>{u.username}</b>
<div className="text-xs text-stone-400">{u.email}</div>
</div>

<div className="flex gap-3 items-center">

<span className="font-mono">
{showPasswords[u.uid]?u.password:"••••••"}
</span>

<button onClick={()=>togglePassword(u.uid)}>
{showPasswords[u.uid]?<EyeOff size={16}/>:<Eye size={16}/>}
</button>

<button onClick={()=>deleteUser(u.uid)}>
<Trash2 size={16}/>
</button>

</div>

</div>
))}

</motion.div>
)}

{/* SECURITY */}
{activeTab==="requests"&&(
<motion.div key="requests" initial={{opacity:0}} animate={{opacity:1}} className="card-modern p-6">
{resetRequests.map(r=>(
<div key={r.id} className="flex justify-between border-b py-3">
<div>
<b>{r.username}</b>
<div className="text-xs">{r.email}</div>
</div>
<button onClick={()=>completeRequest(r.id)}>
<Check size={16}/>
</button>
</div>
))}
</motion.div>
)}

{/* MESSAGES */}
{activeTab==="messages"&&(
<motion.div key="messages" initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">

<button onClick={deleteAllMessages} className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs">
Delete All
</button>

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
<motion.form key="settings" onSubmit={saveSettings} initial={{opacity:0}} animate={{opacity:1}} className="card-modern p-6 space-y-6">

<img src={settings.appBannerUrl} className="w-full h-40 object-cover rounded-xl"/>

<input type="file" ref={fileInputRef} onChange={uploadBanner} className="hidden"/>

<button type="button" onClick={()=>fileInputRef.current?.click()} className="btn-primary">
<Upload size={16}/> Upload Banner
</button>

<input
value={settings.contactRecipientEmail}
onChange={e=>setSettings({...settings,contactRecipientEmail:e.target.value})}
/>

<button className="btn-primary w-full">Save Settings</button>

</motion.form>
)}

{/* NOTIFICATIONS */}
{activeTab==="notifications"&&(
<motion.div key="notifications" initial={{opacity:0}} animate={{opacity:1}} className="max-w-xl">

<form onSubmit={sendNotification} className="card-modern p-8 space-y-4">
<input name="title" placeholder="Title" required/>
<textarea name="body" placeholder="Message" rows={4} required/>
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
