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
  serverTimestamp,
  getDocs,
  setDoc,
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
  Shield,
  Activity,
  AlertTriangle,
  Mail,
  Settings,
  Edit2,
  Eye,
  EyeOff,
  Bell,
  Camera,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { UserProfile, ResetRequest, ContactMessage, AdminSettings } from '../types';
import { cn } from '../lib/utils';
import PasswordInput from '../components/PasswordInput';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({ 
    contactRecipientEmail: 'admin@pinnedcalendar.com',
    appBannerUrl: ''
  });
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'messages' | 'settings'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // New user form
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    const requestsQuery = query(collection(db, 'resetRequests'), orderBy('createdAt', 'desc'));
    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      setResetRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResetRequest)));
    });

    const messagesQuery = query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'));
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      setContactMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactMessage)));
    });

    const settingsRef = doc(db, 'settings', 'admin');
    const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as AdminSettings;
        setAdminSettings({
          contactRecipientEmail: data.contactRecipientEmail || 'admin@pinnedcalendar.com',
          appBannerUrl: data.appBannerUrl || ''
        });
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeMessages();
      unsubscribeSettings();
    };
  }, []);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `admin/banner_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setAdminSettings(prev => ({ ...prev, appBannerUrl: url }));
      toast.success('Banner uploaded! Save settings to apply.');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload banner.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        toast.success('User deleted successfully.');
      } catch (error) {
        toast.error('Failed to delete user.');
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      // Create Firestore document with password (as requested for admin control)
      const userRef = doc(collection(db, 'users'));
      await setDoc(userRef, {
        uid: userRef.id,
        username: newUsername,
        email: newEmail,
        password: newPassword, // Storing for admin visibility as requested
        role: 'user',
        createdAt: Date.now(),
      });
      toast.success('User added to database.');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to create user.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        username: editUsername,
        password: editPassword
      });
      toast.success('User updated successfully.');
      setEditingUser(null);
    } catch (error) {
      toast.error('Failed to update user.');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'admin'), adminSettings);
      toast.success('Settings updated.');
    } catch (error) {
      toast.error('Failed to update settings.');
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'resetRequests', requestId), {
        status: 'completed'
      });
      toast.success('Request marked as completed.');
    } catch (error) {
      toast.error('Failed to update request.');
    }
  };

  const togglePasswordVisibility = (uid: string) => {
    setShowPasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequestsCount = resetRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-8">
      {!isFirebaseConfigured && (
        <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Firebase Not Configured</h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              The Admin Dashboard requires a valid Firebase configuration. 
              Please add your Firebase API keys to the <b>Secrets</b> panel.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-800">Admin Control</h2>
          <p className="text-stone-400 text-sm">Full management of members, security, and settings.</p>
        </div>

        <div className="flex flex-wrap glass rounded-2xl p-1 shadow-sm">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'users' ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-white/50"
            )}
          >
            <Users size={14} />
            Members
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative",
              activeTab === 'requests' ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-white/50"
            )}
          >
            <Key size={14} />
            Security
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'messages' ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-white/50"
            )}
          >
            <Mail size={14} />
            Messages
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeTab === 'settings' ? "bg-stone-900 text-white" : "text-stone-400 hover:bg-white/50"
            )}
          >
            <Settings size={14} />
            Settings
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Create User Form */}
            <div className="card-modern p-8">
              <h3 className="text-lg font-serif font-bold text-stone-800 mb-6 flex items-center gap-2">
                <UserPlus size={20} />
                Add New Member
              </h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="px-4 py-3 bg-white/50 border border-stone-100 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
                  required
                />
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="px-4 py-3 bg-white/50 border border-stone-100 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
                  required
                />
                <PasswordInput
                  placeholder="Password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-4 py-3 bg-white/50 border border-stone-100 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
                  icon={<Key className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />}
                  required
                />
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="btn-primary"
                >
                  {isCreating ? 'Adding...' : 'Add Member'}
                </button>
              </form>
            </div>

            {/* Users List */}
            <div className="card-modern overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-serif font-bold text-stone-800">Member Directory</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search members..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-stone-50 border border-stone-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-stone-200"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Member</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Password</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredUsers.map(user => (
                      <tr key={user.uid} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 font-bold">
                              {user.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-stone-800">{user.username}</p>
                              <p className="text-xs text-stone-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={async () => {
                              if (user.email?.toLowerCase() === 'amjad.tokan@gmail.com') {
                                toast.error('Cannot change role of the owner.');
                                return;
                              }
                              const newRole = user.role === 'admin' ? 'user' : 'admin';
                              try {
                                await updateDoc(doc(db, 'users', user.uid), { role: newRole });
                                toast.success(`User role updated to ${newRole}.`);
                              } catch (e) {
                                toast.error('Failed to update role.');
                              }
                            }}
                            className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors",
                              user.role === 'admin' ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                            )}
                          >
                            {user.role || 'user'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-stone-500">
                              {showPasswords[user.uid] ? (user as any).password || '••••••••' : '••••••••'}
                            </span>
                            <button 
                              onClick={() => togglePasswordVisibility(user.uid)}
                              className="text-stone-300 hover:text-stone-600 transition-colors"
                            >
                              {showPasswords[user.uid] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditingUser(user);
                                setEditUsername(user.username);
                                setEditPassword((user as any).password || '');
                              }}
                              className="p-2 text-stone-300 hover:text-stone-900 transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.uid)}
                              disabled={user.role === 'admin'}
                              className="p-2 text-stone-300 hover:text-red-500 transition-colors disabled:opacity-0"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div 
            key="requests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-4">
              {resetRequests.length === 0 ? (
                <div className="text-center py-20 card-modern border-dashed">
                  <Clock className="mx-auto mb-4 text-stone-200" size={48} />
                  <p className="text-stone-400 font-serif italic">No password reset requests at the moment.</p>
                </div>
              ) : (
                resetRequests.map(request => (
                  <div key={request.id} className="card-modern p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        request.status === 'pending' ? "bg-amber-50 text-amber-500" : "bg-green-50 text-green-500"
                      )}>
                        <Key size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800">{request.username}</h4>
                        <p className="text-sm text-stone-400">{request.email}</p>
                        <p className="text-[10px] text-stone-300 mt-1 uppercase font-bold">Requested on {new Date(request.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === 'pending' ? (
                        <button 
                          onClick={() => handleCompleteRequest(request.id)}
                          className="btn-primary px-4 py-2 text-sm"
                        >
                          <Check size={16} />
                          Complete
                        </button>
                      ) : (
                        <span className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-bold">
                          <Check size={16} />
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div 
            key="messages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-4">
              {contactMessages.length === 0 ? (
                <div className="text-center py-20 card-modern border-dashed">
                  <Mail className="mx-auto mb-4 text-stone-200" size={48} />
                  <p className="text-stone-400 font-serif italic">No messages yet.</p>
                </div>
              ) : (
                contactMessages.map(msg => (
                  <div key={msg.id} className="card-modern p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 font-bold">
                          {msg.username[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-800">{msg.username}</h4>
                          <p className="text-xs text-stone-400">{msg.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-300 font-bold uppercase">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 bg-stone-50 p-4 rounded-2xl">
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-xl"
          >
            <div className="card-modern p-8 space-y-8">
              <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
                <Settings size={20} />
                Admin Settings
              </h3>

              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Application Banner</label>
                  <div className="relative group">
                    <div className="w-full h-40 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 flex items-center justify-center">
                      {adminSettings.appBannerUrl ? (
                        <img src={adminSettings.appBannerUrl} alt="App Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center space-y-2">
                          <ImageIcon className="mx-auto text-stone-300" size={32} />
                          <p className="text-[10px] text-stone-400 uppercase font-bold">No Banner Set</p>
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-white shadow-lg rounded-xl text-stone-600 hover:text-stone-900 transition-all hover:scale-105"
                        title="Upload Image"
                      >
                        <Upload size={18} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.setAttribute('capture', 'environment');
                            fileInputRef.current.click();
                          }
                        }}
                        className="p-3 bg-white shadow-lg rounded-xl text-stone-600 hover:text-stone-900 transition-all hover:scale-105 md:hidden"
                        title="Take Photo"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleBannerUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400">This banner will be displayed at the top of the application for all users.</p>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-6 pt-6 border-t border-stone-100">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Contact Recipient Email</label>
                    <input 
                      type="email" 
                      value={adminSettings.contactRecipientEmail}
                      onChange={(e) => setAdminSettings({ ...adminSettings, contactRecipientEmail: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
                      required
                    />
                    <p className="text-[10px] text-stone-400">This email will receive notifications for new contact messages.</p>
                  </div>
                  <button 
                    type="submit" 
                    className="btn-primary w-full py-4"
                  >
                    Save All Settings
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-bold text-stone-800">Edit Member</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Username</label>
                  <input 
                    type="text" 
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl outline-none focus:ring-2 focus:ring-stone-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Password</label>
                  <PasswordInput
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="py-3"
                    icon={<Key className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn-primary w-full py-4"
                >
                  Update Member
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
