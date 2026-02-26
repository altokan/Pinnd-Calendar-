import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../services/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  setDoc,
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
  Eye,
  EyeOff,
  Bell
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import PasswordInput from '../components/PasswordInput';

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

  /* ---------------------------------- */
  /* Firestore Listeners                */
  /* ---------------------------------- */

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

  /* ---------------------------------- */
  /* Create User                        */
  /* ---------------------------------- */

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const refUser = doc(collection(db, 'users'));
      await setDoc(refUser, {
        uid: refUser.id,
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

  /* ---------------------------------- */
  /* Send Notification                  */
  /* ---------------------------------- */

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

      {/* Tabs */}
      <div className="flex flex-wrap glass rounded-2xl p-1 shadow-sm">

        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'users'
              ? "bg-stone-900 text-white"
              : "text-stone-400 hover:bg-white/50"
          )}
        >
          <Users size={14}/> Members
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'requests'
              ? "bg-stone-900 text-white"
              : "text-stone-400 hover:bg-white/50"
          )}
        >
          <Key size={14}/> Security
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'messages'
              ? "bg-stone-900 text-white"
              : "text-stone-400 hover:bg-white/50"
          )}
        >
          <Mail size={14}/> Messages
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'settings'
              ? "bg-stone-900 text-white"
              : "text-stone-400 hover:bg-white/50"
          )}
        >
          <Settings size={14}/> Settings
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'notifications'
              ? "bg-stone-900 text-white"
              : "text-stone-400 hover:bg-white/50"
          )}
        >
          <Bell size={14}/> Notifications
        </button>

      </div>

      <AnimatePresence mode="wait">

        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            exit={{opacity:0,y:-10}}
            className="max-w-xl"
          >
            <div className="card-modern p-8 space-y-6">

              <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                <Bell size={18}/> Send Push Notification
              </h3>

              <form onSubmit={sendNotification} className="space-y-4">

                <input
                  name="title"
                  placeholder="Title"
                  required
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl"
                />

                <textarea
                  name="body"
                  placeholder="Message"
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl"
                />

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
