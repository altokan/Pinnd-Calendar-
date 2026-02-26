import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../ThemeContext';
import { db, auth, isFirebaseConfigured } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, signOut } from 'firebase/auth';
import { User, Lock, Mail, Save, LogOut, Shield, AlertTriangle, Palette, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import PasswordInput from '../components/PasswordInput';
import { requestPushPermission } from '../services/firebase-messaging';

const ProfilePage: React.FC = () => {
  const { profile, user } = useAuth();
  const { theme, updateTheme } = useTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setEmail(profile.email || '');
    }

    const enabled = localStorage.getItem("notifications-enabled");
    setNotificationsEnabled(enabled === "true");
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username,
        email,
      });

      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      toast.success('Profile updated successfully!');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      await requestPushPermission();
      localStorage.setItem("notifications-enabled", "true");
      localStorage.setItem("notifications-dismissed", "true");
      setNotificationsEnabled(true);
      toast.success("Notifications Enabled");
    } else {
      localStorage.setItem("notifications-enabled", "false");
      setNotificationsEnabled(false);
      toast("Notifications Disabled");
    }
  };

  const colors = [
    { name: 'Stone', primary: '#1c1917', secondary: '#78716c' },
    { name: 'Indigo', primary: '#312e81', secondary: '#6366f1' },
    { name: 'Emerald', primary: '#064e3b', secondary: '#10b981' },
    { name: 'Rose', primary: '#881337', secondary: '#f43f5e' },
    { name: 'Amber', primary: '#78350f', secondary: '#f59e0b' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">

      {!isFirebaseConfigured && (
        <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div>
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">
              Firebase Not Configured
            </h3>
            <p className="text-sm text-amber-700">
              Profile updates require a valid Firebase configuration.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif font-bold text-stone-800">
          Profile Settings
        </h2>
        {profile?.role === 'admin' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-stone-900 text-white rounded-full text-xs font-bold uppercase">
            <Shield size={12} />
            Administrator
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">

          <div className="space-y-6">
            <h3 className="text-lg font-serif font-bold flex items-center gap-2">
              <User size={20} /> Account Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-xl"
                placeholder="Username"
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-xl"
                placeholder="Email"
              />
            </div>

            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password (optional)"
              icon={<Lock size={18} />}
            />
          </div>

          <div className="pt-6 border-t space-y-4">
            <h3 className="font-serif font-bold flex items-center gap-2">
              <Bell size={20} /> Notifications
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-stone-400">
                  Receive reminders and admin messages
                </p>
              </div>

              <button
                type="button"
                onClick={toggleNotifications}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors",
                  notificationsEnabled ? "bg-stone-900" : "bg-stone-300"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    notificationsEnabled ? "left-7" : "left-1"
                  )}
                />
              </button>
            </div>
          </div>

          <div className="pt-6 border-t space-y-4">
            <h3 className="font-serif font-bold flex items-center gap-2">
              <Palette size={20} /> Theme
            </h3>

            <div className="flex gap-3 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() =>
                    updateTheme({
                      primaryColor: c.primary,
                      secondaryColor: c.secondary,
                    })
                  }
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: c.primary }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-stone-900 text-white rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              Save Changes
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="py-4 px-8 border rounded-2xl flex items-center gap-2"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

        </form>
      </div>

      <div className="bg-stone-100 rounded-3xl p-8 border border-stone-200">
        <h3 className="text-lg font-serif font-bold mb-4">
          Account Information
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>User ID</span>
            <span className="font-mono">{user?.uid}</span>
          </div>
          <div className="flex justify-between">
            <span>Role</span>
            <span>{profile?.role}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProfilePage;
