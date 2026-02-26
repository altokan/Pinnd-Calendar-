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

  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  /* ---------------------------------- */
  /* Delete User                        */
  /* ---------------------------------- */

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

  /* ---------------------------------- */
  /* UI                                 */
  /* ---------------------------------- */

  return (
    <div className="space-y-8">

      {/* Tabs */}
      <div className="flex flex-wrap glass rounded-2xl p-1 shadow-sm">

        <button onClick={() => setActiveTab('users')}
          className={cn("tab-btn", activeTab === 'users' && "active-tab")}>
          <Users size={14}/> Members
        </button>

        <button onClick={() => setActiveTab('requests')}
          className={cn("tab-btn", activeTab === 'requests' && "active-tab")}>
          <Key size={14}/> Security
        </button>

        <button onClick={() => setActiveTab('messages')}
          className={cn("tab-btn", activeTab === 'messages' && "active-tab")}>
          <Mail size={14}/> Messages
        </button>

        <button onClick={() => setActiveTab('settings')}
          className={cn("tab-btn", activeTab === 'settings' && "active-tab")}>
          <Settings size={14}/> Settings
        </button>

        <button onClick={() => setActiveTab('notifications')}
          className={cn("tab-btn", activeTab === 'notifications' && "active-tab")}>
          <Bell size={14}/> Notifications
        </button>

      </div>

      <AnimatePresence mode="wait">

        {/* USERS */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{opacity:0}} animate={{opacity:1}}>
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

            <div className="card-modern mt-6">
              {users.map(user=>(
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

              <form onSubmit={sendNotification}
                className="space-y-4">

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
