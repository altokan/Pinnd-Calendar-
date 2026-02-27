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

const [activeTab,setActiveTab]=useState<
"users"|"security"|"messages"|"settings"|"notifications"
>("users");

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

const [newUsername,setNewUsername]=useState("");
const [newEmail,setNewEmail]=useState("");
const [newPassword,setNewPassword]=useState("");
const [creating,setCreating]=useState(false);

const [editingUser,setEditingUser]=useState<any|null>(null);
const [editUsername,setEditUsername]=useState("");
const [editEmail,setEditEmail]=useState("");

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
const cred=await createUserWithEmailAndPassword(auth,newEmail,newPassword);

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
<span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
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
<input className="px-4 py-3 rounded-2xl border bg-stone-50 focus:ring-2 focus:ring-black outline-none" placeholder="Username" value={newUsername} onChange={e=>setNewUsername(e.target.value)} />
<input className="px-4 py-3 rounded-2xl border bg-stone-50 focus:ring-2 focus:ring-black outline-none" placeholder="Email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} />
<input type="password" className="px-4 py-3 rounded-2xl border bg-stone-50 focus:ring-2 focus:ring-black outline-none" placeholder="Password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
<button className="bg-black text-white rounded-2xl font-semibold hover:bg-stone-800 transition">{creating?"Creating...":"Add Member"}</button>
</form>

<input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}
className="w-full px-4 py-3 rounded-2xl border bg-stone-50 focus:ring-2 focus:ring-black outline-none"/>

{filteredUsers.map(u=>(
<div key={u.uid} className="flex justify-between items-center border-b py-4">
<div>
<p className="font-semibold">{u.username}</p>
<p className="text-sm text-stone-400">{u.email}</p>
</div>
<div className="flex gap-3">
<button className="p-2 rounded-xl hover:bg-stone-100" onClick={()=>setShowPasswords(p=>({...p,[u.uid]:!p[u.uid]}))}>
{showPasswords[u.uid]?<EyeOff size={16}/>:<Eye size={16}/>}
</button>
<button className="p-2 rounded-xl hover:bg-stone-100" onClick={()=>{setEditingUser(u);setEditUsername(u.username);setEditEmail(u.email);}}>
<Edit2 size={16}/>
</button>
<button className="p-2 rounded-xl hover:bg-stone-100" onClick={()=>resetPassword(u.email)}>
<Key size={16}/>
</button>
<button className="p-2 rounded-xl hover:bg-red-50 text-red-500" onClick={()=>deleteUser(u.uid)}>
<Trash2 size={16}/>
</button>
</div>
</div>
))}
</motion.div>
)}

{/* NOTIFICATIONS */}
{activeTab==="notifications"&&(
<motion.div className="max-w-2xl bg-white rounded-3xl border shadow-sm p-8">
<form onSubmit={sendNotification} className="space-y-6">

<div>
<label className="text-sm font-semibold mb-2 block">Notification Title</label>
<input
name="title"
required
placeholder="Write notification title..."
className="w-full px-5 py-4 rounded-2xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-rose-500 outline-none"
/>
</div>

<div>
<label className="text-sm font-semibold mb-2 block">Message</label>
<textarea
name="body"
rows={6}
required
placeholder="Write notification message..."
className="w-full px-5 py-5 rounded-2xl border border-stone-300 bg-stone-50 focus:ring-2 focus:ring-rose-500 outline-none resize-none"
/>
</div>

<button className="w-full py-5 rounded-2xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition">
Send To All Users
</button>

</form>
</motion.div>
)}

</div>
);
}

