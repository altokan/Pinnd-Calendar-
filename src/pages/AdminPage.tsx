// src/pages/AdminPage.tsx

import React,{useState,useEffect,useRef} from "react";
import {
collection,query,onSnapshot,doc,deleteDoc,
updateDoc,setDoc,addDoc,orderBy,
serverTimestamp,writeBatch,getDocs
} from "firebase/firestore";

import {
createUserWithEmailAndPassword,
sendPasswordResetEmail
} from "firebase/auth";

import {db,storage,auth} from "../services/firebase";
import {ref,uploadBytes,getDownloadURL} from "firebase/storage";

import {
Users,Key,Trash2,Check,Mail,
Settings,Bell,Eye,EyeOff,Edit2
} from "lucide-react";

import {motion} from "motion/react";
import toast from "react-hot-toast";
import {cn} from "../lib/utils";

export default function AdminPage(){

/* ================= STATE ================= */

const [activeTab,setActiveTab]=useState<
"users"|"security"|"messages"|"settings"|"notifications"
>("users");

const [users,setUsers]=useState<any[]>([]);
const [resetRequests,setResetRequests]=useState<any[]>([]);
const [messages,setMessages]=useState<any[]>([]);
const [settings,setSettings]=useState({
contactRecipientEmail:"",
appIconUrl:""
});

const [search,setSearch]=useState("");
const [showPasswords,setShowPasswords]=useState<Record<string,boolean>>({});
const prevMsgCount=useRef(0);

const [newUsername,setNewUsername]=useState("");
const [newEmail,setNewEmail]=useState("");
const [newPassword,setNewPassword]=useState("");
const [creating,setCreating]=useState(false);

/* ================= LISTENERS ================= */

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
});

const unsubSettings=onSnapshot(
doc(db,"settings","admin"),
d=>d.exists()&&setSettings(d.data() as any)
);

return()=>{
unsubUsers();
unsubRequests();
unsubMessages();
unsubSettings();
};

},[]);

/* ================= MEMBERS ================= */

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

const resetPassword=(email:string)=>{
sendPasswordResetEmail(auth,email);
toast.success("Reset email sent");
};

const deleteUser=(uid:string)=>{
if(!confirm("Delete user?"))return;
deleteDoc(doc(db,"users",uid));
};

/* ================= MESSAGES ================= */

const unreadCount=messages.filter(m=>!m.read).length;

const markRead=(id:string)=>
updateDoc(doc(db,"contactMessages",id),{read:true});

const deleteMessage=(id:string)=>
deleteDoc(doc(db,"contactMessages",id));

const deleteAllMessages=async()=>{
const batch=writeBatch(db);
messages.forEach(m=>
batch.delete(doc(db,"contactMessages",m.id))
);
await batch.commit();
toast.success("All messages deleted");
};

/* ================= SETTINGS ================= */

const uploadIcon=async(e:any)=>{
const file=e.target.files[0];
if(!file)return;

const r=ref(storage,"admin/icon_"+Date.now());
await uploadBytes(r,file);
const url=await getDownloadURL(r);

setSettings(p=>({...p,appIconUrl:url}));
toast.success("Icon uploaded");
};

const saveSettings=async(e:any)=>{
e.preventDefault();
await setDoc(doc(db,"settings","admin"),settings);
toast.success("Settings saved");
};

/* ================= NOTIFICATIONS ================= */

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

const filteredUsers=users.filter(u=>
u.username?.toLowerCase().includes(search.toLowerCase())||
u.email?.toLowerCase().includes(search.toLowerCase())
);

/* ================= UI ================= */

return(
<div className="space-y-10">

{/* TABS */}
<div className="flex flex-wrap gap-3 bg-white border rounded-3xl p-3 shadow-sm">
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
"flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all",
activeTab===t.key
?"bg-black text-white shadow-md"
:"bg-stone-100 text-stone-600 hover:bg-stone-200"
)}>
<Icon size={16}/>
{t.label}
{t.key==="messages"&&unreadCount>0&&(
<span className="ml-2 bg-red-500 text-white text-xs px-2 rounded-full">
{unreadCount}
</span>
)}
</button>
);
})}
</div>

{/* MEMBERS */}
{activeTab==="users"&&(
<motion.div className="bg-white rounded-3xl border shadow-sm p-8 space-y-6">

<form onSubmit={handleCreateUser} className="grid md:grid-cols-4 gap-4">
<input className="input" placeholder="Username" value={newUsername} onChange={e=>setNewUsername(e.target.value)} />
<input className="input" placeholder="Email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} />
<input type="password" className="input" placeholder="Password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
<button className="btn-primary">{creating?"Creating...":"Add Member"}</button>
</form>

<input placeholder="Search..." value={search}
onChange={e=>setSearch(e.target.value)}
className="input w-full"/>

{filteredUsers.map(u=>(
<div key={u.uid} className="flex justify-between border-b py-4">
<div>
<p className="font-semibold">{u.username}</p>
<p className="text-sm text-stone-400">{u.email}</p>
</div>

<div className="flex gap-3">
<button className="icon-btn">
{showPasswords[u.uid]?<EyeOff size={16}/>:<Eye size={16}/>}
</button>

<button className="icon-btn" onClick={()=>resetPassword(u.email)}>
<Key size={16}/>
</button>

<button className="icon-btn text-red-500" onClick={()=>deleteUser(u.uid)}>
<Trash2 size={16}/>
</button>
</div>
</div>
))}
</motion.div>
)}

{/* SECURITY */}
{activeTab==="security"&&(
<motion.div className="bg-white rounded-3xl border shadow-sm p-8 space-y-4">

<h3 className="font-semibold">Password Reset Requests</h3>

{resetRequests.map(r=>(
<div key={r.id} className="flex justify-between border-b py-3">
<div>
<p className="font-semibold">{r.username}</p>
<p className="text-sm text-stone-400">{r.email}</p>
</div>

{r.status!=="completed"&&(
<button
className="px-4 py-2 rounded-xl bg-black text-white text-sm"
onClick={()=>updateDoc(doc(db,"resetRequests",r.id),{status:"completed"})}
>
Complete
</button>
)}

</div>
))}

</motion.div>
)}

{/* MESSAGES */}
{activeTab==="messages"&&(
<motion.div className="space-y-6">

<button
onClick={deleteAllMessages}
className="px-5 py-3 rounded-2xl bg-red-600 text-white font-semibold">
Delete All
</button>

{messages.map(m=>(
<div key={m.id}
className={cn("bg-white rounded-3xl border shadow-sm p-6",
!m.read&&"border-blue-400")}>

<div className="flex justify-between">
<div>
<p className="font-semibold">{m.username}</p>
<p className="text-sm text-stone-400">{m.email}</p>
</div>

<div className="flex gap-3">
{!m.read&&(
<button className="icon-btn" onClick={()=>markRead(m.id)}>
<Check size={16}/>
</button>
)}

<button className="icon-btn text-red-500"
onClick={()=>deleteMessage(m.id)}>
<Trash2 size={16}/>
</button>
</div>
</div>

<p className="mt-4 bg-stone-50 p-4 rounded-2xl">
{m.message}
</p>

</div>
))}

</motion.div>
)}

{/* SETTINGS */}
{activeTab==="settings"&&(
<motion.form
onSubmit={saveSettings}
className="bg-white rounded-3xl border shadow-sm p-8 space-y-6">

<h3 className="font-semibold">Application Settings</h3>

<div className="flex gap-6 items-center">
<div className="w-24 h-24 rounded-2xl overflow-hidden border">
{settings.appIconUrl&&(
<img src={settings.appIconUrl} className="w-full h-full object-cover"/>
)}
</div>

<input type="file" accept="image/*" onChange={uploadIcon}/>
</div>

<input
value={settings.contactRecipientEmail||""}
onChange={e=>setSettings({...settings,contactRecipientEmail:e.target.value})}
placeholder="Reception Email"
className="input"
/>

<button className="btn-primary w-full">
Save Settings
</button>

</motion.form>
)}

{/* NOTIFICATIONS */}
{activeTab==="notifications"&&(
<motion.div className="max-w-2xl bg-white rounded-3xl border shadow-sm p-8">

<form onSubmit={sendNotification} className="space-y-6">

<input name="title" required placeholder="Notification Title" className="input"/>

<textarea name="body" rows={6} required
placeholder="Notification Message"
className="input resize-none"/>

<button className="w-full py-5 rounded-2xl bg-rose-600 text-white font-semibold">
Send To All Users
</button>

</form>

</motion.div>
)}

</div>
);
}
