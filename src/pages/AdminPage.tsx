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
  Trash2,
  UserPlus,
  Search,
  Eye,
  EyeOff,
  Bell
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import PasswordInput from '../components/PasswordInput';

const AdminPage: React.FC = () => {

  /* ---------------------------------- */
  /* STATE                              */
  /* ---------------------------------- */

  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] =
    useState<'users' | 'notifications'>('users');

  const [searchTerm, setSearchTerm] = useState('');

  const [showPasswords, setShowPasswords] =
    useState<Record<string, boolean>>({});

  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  /* ---------------------------------- */
  /* USERS LISTENER                     */
  /* ---------------------------------- */

  useEffect(() => {

    if (!isFirebaseConfigured) return;

    const q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, snap => {
      setUsers(
        snap.docs.map(d => ({
          uid: d.id,
          ...d.data()
        }))
      );
    });

    return () => unsub();

  }, []);

  /* ---------------------------------- */
  /* CREATE USER                        */
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

      toast.success("Member created");

      setNewUsername('');
      setNewEmail('');
      setNewPassword('');

    } catch {
      toast.error("Create failed");
    }

    setIsCreating(false);
  };

  /* ---------------------------------- */
  /* DELETE USER                        */
  /* ---------------------------------- */

  const handleDeleteUser = async (uid: string) => {

    if (!confirm("Delete user?")) return;

    await deleteDoc(doc(db, 'users', uid));

    toast.success("User deleted");
  };

  /* ---------------------------------- */
  /* SEND NOTIFICATION                  */
  /* ---------------------------------- */

  const sendNotification = async (e: any) => {

    e.preventDefault();

    const title = e.target.title.value;
    const body = e.target.body.value;

    try {

      await addDoc(collection(db, "notifications"), {
        title,
        body,
        createdAt: serverTimestamp()
      });

      toast.success("Notification queued");
      e.target.reset();

    } catch {
      toast.error("Failed sending");
    }
  };

  /* ---------------------------------- */
  /* FILTER USERS                       */
  /* ---------------------------------- */

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ---------------------------------- */
  /* UI                                 */
  /* ---------------------------------- */

  return (
    <div className="space-y-8">

      {/* Tabs */}

      <div className="flex gap-2 glass rounded-2xl p-1 shadow-sm">

        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold",
            activeTab === 'users'
              ? "bg-stone-900 text-white"
              : "text-stone-400 hover:bg-white/50"
          )}
        >
          <Users size={14}/>
          Members
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold",
            activeTab === 'notifications'
              ? "bg-stone-900 text-white"
              : "text-stone-400 hover:bg-white/50"
          )}
        >
          <Bell size={14}/>
          Notifications
        </button>

      </div>

      <AnimatePresence mode="wait">

        {/* ---------------- USERS TAB ---------------- */}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            className="space-y-6"
          >

            <form
              onSubmit={handleCreateUser}
              className="card-modern p-6 grid grid-cols-1 md:grid-cols-4 gap-4"
            >

              <input
                placeholder="Username"
                value={newUsername}
                onChange={e=>setNewUsername(e.target.value)}
                required
                className="input-modern"
              />

              <input
                placeholder="Email"
                value={newEmail}
                onChange={e=>setNewEmail(e.target.value)}
                required
                className="input-modern"
              />

              <PasswordInput
                placeholder="Password"
                value={newPassword}
                onChange={e=>setNewPassword(e.target.value)}
                className="input-modern"
                required
              />

              <button className="btn-primary">
                {isCreating ? "Adding..." : "Add Member"}
              </button>

            </form>

            <div className="card-modern overflow-hidden">

              <div className="p-4">
                <input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={e=>setSearchTerm(e.target.value)}
                  className="input-modern w-full"
                />
              </div>

              {filteredUsers.map(user=>(
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-4 border-t"
                >

                  <div>
                    <p className="font-bold">{user.username}</p>
                    <p className="text-sm text-stone-400">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-3">

                    <button
                      onClick={()=>setShowPasswords(p=>({...p,[user.uid]:!p[user.uid]}))}
                    >
                      {showPasswords[user.uid]
                        ? <EyeOff size={16}/>
                        : <Eye size={16}/>}
                    </button>

                    <button onClick={()=>handleDeleteUser(user.uid)}>
                      <Trash2 size={16}/>
                    </button>

                  </div>

                </div>
              ))}

            </div>

          </motion.div>
        )}

        {/* ---------------- NOTIFICATIONS TAB ---------------- */}

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
                <Bell size={20}/>
                Send Push Notification
              </h3>

              <form
                onSubmit={sendNotification}
                className="space-y-4"
              >

                <input
                  name="title"
                  placeholder="Notification Title"
                  required
                  className="input-modern w-full"
                />

                <textarea
                  name="body"
                  placeholder="Notification message..."
                  rows={4}
                  required
                  className="input-modern w-full"
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
