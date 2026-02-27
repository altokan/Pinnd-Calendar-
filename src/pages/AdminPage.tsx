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

/* ---------------- TABS ---------------- */

const [activeTab,setActiveTab]=useState<
"users"|"security"|"messages"|"settings"|"notifications"
>("users");

/* ---------------- DATA ---------------- */

const [users,setUsers]=useState<any[]>([]);
const [resetRequests,setResetRequests]=useState<any[]>([]);
const [messages,setMessages]=useState<any[]>([]);
const [settings,setSettings]=useState<any>({
contactRecipientEmail:"",
appIconUrl:""
});

const [search,setSearch]=useState("");
const [showPasswords,setShowPasswords]=useState<Record<string,boolean>>({});
const prevMsgCount=useRef(0);

/* ---------------- MEMBER CREATE ---------------- */

const [newUsername,setNewUsername]=useState("");
const [newEmail,setNewEmail]=useState("");
const [newPassword,setNewPassword]=useState("");
const [creating,setCreating]=useState(false);

/* ---------------- EDIT USER ---------------- */

const [editingUser,setEditingUser]=useState<any|null>(null);
const [editUsername,setEditUsername]=useState("");
const [editEmail,setEditEmail]=useState("");

/* ---------------- LISTENERS ---------------- */

useEffect(()=>{

const unsubUsers=onSnapshot(
query(collection(db,"users"),orderBy("createdAt","desc")),
s=>setUsers(s.docs.map(d=>({uid:d.id,...d.data()})))
);

const unsubRequests=onSnapshot(
query(collection(db,"resetRequests"),orderBy("createdAt","desc")),
s=>setResetRequests(s.docs.map(d=>({id:d.id,...d.data()})))
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

const unsubSettings=onSnapshot(
doc(db,"settings","admin"),
d=>d.exists()&&setSettings(d.data())
);

return()=>{
unsubUsers();
unsubRequests();
unsubMessages();
unsubSettings();
};

},[]);

/* ---------------- CREATE MEMBER ---------------- */

const handleCreateUser=async(e:any)=>{
e.preventDefault();

if(!newUsername||!newEmail||!newPassword)
return toast.error("Fill all fields");

const check=await getDocs(collection(db,"users"));

const exists=check.docs.some(
u=>u.data().username?.toLowerCase()===newUsername.toLowerCase()
);

if(exists) return toast.error("Username exists");

try{

setCreating(true);

const cred=await createUserWithEmailAndPassword(
auth,newEmail,newPassword
);

await setDoc(doc(db,"users",cred.user.uid),{
uid:cred.user.uid,
username:newUsername,
email:newEmail,
role:"user",
createdAt:Date.now(),
lastLogin:null
});

toast.success("Member added");

setNewUsername("");
setNewEmail("");
setNewPassword("");

}catch(e:any){
toast.error(e.message);
}finally{
setCreating(false);
}
};

/* ---------------- USER ACTIONS ---------------- */

const updateUser=async()=>{
if(!editingUser)return;

await updateDoc(doc(db,"users",editingUser.uid),{
username:editUsername,
email:editEmail
});

toast.success("User updated");
setEditingUser(null);
};

const resetPassword=(email:string)=>{
sendPasswordResetEmail(auth,email);
toast.success("Reset email sent");
};

const deleteUser=async(uid:string)=>{
if(!confirm("Delete user?"))return;
await deleteDoc(doc(db,"users",uid));
toast.success("User deleted");
};

/* ---------------- MESSAGES ---------------- */

const unreadCount=messages.filter(m=>!m.read).length;

const markRead=(id:string)=>
updateDoc(doc(db,"contactMessages",id),{read:true});

const deleteMessage=(id:string)=>
deleteDoc(doc(db,"contactMessages",id));

const deleteAllMessages=async()=>{
const batch=writeBatch(db);
messages.forEach(m=>batch.delete(doc(db,"contactMessages",m.id)));
await batch.commit();
toast.success("All messages deleted");
};

/* ---------------- SETTINGS ---------------- */

const uploadIcon=async(e:any)=>{
const file=e.target.files[0];
if(!file)return;

const r=ref(storage,"admin/icon_"+Date.now());
await uploadBytes(r,file);
const url=await getDownloadURL(r);

setSettings((p:any)=>({...p,appIconUrl:url}));
toast.success("Icon uploaded");
};

const saveSettings=async(e:any)=>{
e.preventDefault();
await setDoc(doc(db,"settings","admin"),settings);
toast.success("Settings saved");
};

/* ---------------- SEND NOTIFICATION ---------------- */

const sendNotification=async(e:any)=>{
e.preventDefault();

await addDoc(collection(db,"admin_notifications"),{
title:e.target.title.value,
body:e.target.body.value,
createdAt:serverTimestamp()
});

toast.success("Notification sent");
e.target.reset();
};

/* ---------------- FILTER ---------------- */

const filteredUsers=users.filter(u=>
u.username?.toLowerCase().includes(search.toLowerCase())||
u.email?.toLowerCase().includes(search.toLowerCase())
);

/* ================= UI ================= */

return(
<div className="space-y-8">

{/* ---------- TABS ---------- */}

<div className="flex flex-wrap rounded-2xl p-2 bg-stone-100 gap-2">
{[
{key:"users",label:"Members",icon:Users},
{key:"security",label:"Security",icon:Key},
{key:"messages",label:"Messages",icon:Mail},
{key:"settings",label:"Settings",icon:Settings},
{key:"notifications",label:"Notifications",icon:Bell}
].map(t=>{
const Icon=t.icon;
return(
<button
key={t.key}
onClick={()=>setActiveTab(t.key as any)}
className={cn(
"flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold",
activeTab===t.key
?"bg-stone-900 text-white"
:"bg-white text-stone-500"
)}>
<Icon size={14}/>
{t.label}
{t.key==="messages"&&unreadCount>0&&(
<span className="ml-1 bg-red-500 text-white text-[10px] px-2 rounded-full">
{unreadCount}
</span>
)}
</button>
);
})}
</div>

{/* ================= MEMBERS ================= */}

{activeTab==="users"&&(
<motion.div className="card-modern p-6 space-y-6">

<form onSubmit={handleCreateUser} className="grid md:grid-cols-4 gap-4">
<input placeholder="Username" value={newUsername}
onChange={e=>setNewUsername(e.target.value)} className="input"/>

<input placeholder="Email" value={newEmail}
onChange={e=>setNewEmail(e.target.value)} className="input"/>

<input type="password" placeholder="Password"
value={newPassword}
onChange={e=>setNewPassword(e.target.value)}
className="input"/>

<button className="btn-primary">
{creating?"Creating...":"Add Member"}
</button>
</form>

<input placeholder="Search..." value={search}
onChange={e=>setSearch(e.target.value)}
className="input"/>

{filteredUsers.map(u=>(
<div key={u.uid} className="flex justify-between border-b py-3">

<div>
<b>{u.username}</b>
<div className="text-xs text-stone-400">{u.email}</div>
</div>

<div className="flex gap-3">

<button onClick={()=>
setShowPasswords(p=>({...p,[u.uid]:!p[u.uid]}))
}>
{showPasswords[u.uid]?<EyeOff size={16}/>:<Eye size={16}/>}
</button>

<button onClick={()=>{
setEditingUser(u);
setEditUsername(u.username);
setEditEmail(u.email);
}}>
<Edit2 size={16}/>
</button>

<button onClick={()=>resetPassword(u.email)}>
<Key size={16}/>
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

{activeTab==="security"&&(
<motion.div className="card-modern p-6 space-y-4">

{resetRequests.map(r=>(
<div key={r.id} className="flex justify-between border-b py-3">
<div>
<b>{r.username}</b>
<div className="text-xs">{r.email}</div>
</div>

{r.status!=="completed"&&(
<button onClick={()=>updateDoc(doc(db,"resetRequests",r.id),{status:"completed"})}>
<Check size={16}/>
</button>
)}
</div>
))}

</motion.div>
)}

{/* ================= MESSAGES ================= */}

{activeTab==="messages"&&(
<motion.div className="space-y-4">

<button onClick={deleteAllMessages}
className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs">
Delete All
</button>

{messages.map(m=>(
<div key={m.id}
className={cn("card-modern p-6",!m.read&&"border-blue-400 border")}>

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

{/* ================= SETTINGS ================= */}

{activeTab==="settings"&&(
<motion.form onSubmit={saveSettings}
className="card-modern p-6 space-y-6">

<h3 className="font-bold">Application Icon</h3>

<div className="flex gap-6 items-center">
<div className="w-24 h-24 rounded-2xl overflow-hidden border">
{settings.appIconUrl&&(
<img src={settings.appIconUrl}
className="w-full h-full object-cover"/>
)}
</div>

<input type="file" accept="image/*" onChange={uploadIcon}/>
</div>

<input
value={settings.contactRecipientEmail}
onChange={e=>setSettings({...settings,contactRecipientEmail:e.target.value})}
className="input"
/>

<button className="btn-primary w-full">
Save Settings
</button>

</motion.form>
)}

{/* ================= NOTIFICATIONS ================= */}

{activeTab==="notifications"&&(
<motion.div className="max-w-2xl">

<form onSubmit={sendNotification} className="notification-form">
className="card-modern p-8 space-y-6">

<input
name="title"
required
placeholder="Notification Title"
className="input border"
/>

<textarea
name="body"
rows={6}
required
placeholder="Notification Message"
className="input border"
/>

<button className="w-full py-5 rounded-2xl bg-rose-700 text-white font-bold">
Send To All Users
</button>

</form>

</motion.div>
)}

</div>
);
}
