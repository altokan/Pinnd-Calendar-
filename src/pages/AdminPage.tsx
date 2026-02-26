import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured, storage } from '../services/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

import {
  Users,
  Key,
  Trash2,
  UserPlus,
  Search,
  Check,
  X,
  Clock,
  Mail,
  Settings,
  Edit2,
  Eye,
  EyeOff,
  Bell,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import PasswordInput from '../components/PasswordInput';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AdminPage: React.FC = () => {

  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    'users' | 'requests' | 'messages' | 'settings' | 'notifications'
  >('users');

  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  /* ---------------- LISTENERS ---------------- */

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
    );

    const unsubRequests = onSnapshot(
      query(collection(db, 'resetRequests'), orderBy('createdAt', 'desc')),
      snap => setResetRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubMessages = onSnapshot(
      query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc')),
      snap => setContactMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubUsers();
      unsubRequests();
      unsubMessages();
    };
  }, []);

  /* ---------------- USER CRUD ---------------- */

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await addDoc(collection(db, 'users'), {
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: 'user',
        createdAt: Date.now()
      });

      toast.success('Member created');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
    } catch {
      toast.error('Create failed');
    }

    setIsCreating(false);
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Delete user?')) return;
    await deleteDoc(doc(db, 'users', uid));
    toast.success('User deleted');
  };

  /* ---------------- SEND NOTIFICATION ---------------- */

  const sendNotification = async (e: any) => {
    e.preventDefault();
    const title = e.target.title.value;
    const body = e.target.body.value;

    try {
      await addDoc(collection(db, 'notifications'), {
        title,
        body,
        createdAt: serverTimestamp()
      });

      toast.success('Notification queued');
      e.target.reset();
    } catch {
      toast.error('Failed sending');
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">

      {/* TABS */}
      <div className="flex flex-wrap glass rounded-2xl p-1 shadow-sm">

        {[
          { key: 'users', label: 'Members', icon: Users },
          { key: 'requests', label: 'Security', icon: Key },
          { key: 'messages', label: 'Messages', icon: Mail },
          { key: 'settings', label: 'Settings', icon: Settings },
          { key: 'notifications', label: 'Notifications', icon: Bell },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === tab.key
                  ? "bg-stone-900 text-white"
                  : "text-stone-400 hover:bg-white/50"
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}

      </div>

      <AnimatePresence mode="wait">

        {/* MEMBERS */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">

            <form onSubmit={handleCreateUser}
              className="card-modern p-6 grid md:grid-cols-4 gap-4">

              <input value={newUsername}
                onChange={e=>setNewUsername(e.target.value)}
                placeholder="Username" required />

              <input value={newEmail}
                onChange={e=>setNewEmail(e.target.value)}
                placeholder="Email" required />

              <PasswordInput value={newPassword}
                onChange={e=>setNewPassword(e.target.value)}
                placeholder="Password" required />

              <button className="btn-primary">
                {isCreating ? 'Adding...' : 'Add'}
              </button>
            </form>

            <div className="card-modern">
              {filteredUsers.map(user=>(
                <div key={user.uid}
                  className="flex justify-between p-4 border-b">

                  <div>
                    <b>{user.username}</b>
                    <div className="text-sm text-stone-400">
                      {user.email}
                    </div>
                  </div>

                  <button onClick={()=>handleDeleteUser(user.uid)}>
                    <Trash2 size={16}/>
                  </button>

                </div>
              ))}
            </div>

          </motion.div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <motion.div key="notifications"
            initial={{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            className="max-w-xl">

            <div className="card-modern p-8 space-y-6">

              <h3 className="text-lg font-bold flex items-center gap-2">
                <Bell size={18}/> Send Push Notification
              </h3>

              <form onSubmit={sendNotification} className="space-y-4">

                <input name="title"
                  placeholder="Title"
                  required
                  className="input-modern w-full" />

                <textarea name="body"
                  placeholder="Message"
                  required
                  rows={4}
                  className="input-modern w-full" />

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
