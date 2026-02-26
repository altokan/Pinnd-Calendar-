import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../ThemeContext';
import { db, auth, isFirebaseConfigured } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, signOut } from 'firebase/auth';
import { User, Lock, Mail, Save, LogOut, Shield, AlertTriangle, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import PasswordInput from '../components/PasswordInput';

const ProfilePage: React.FC = () => {
  const { profile, user } = useAuth();
  const { theme, updateTheme } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setEmail(profile.email || '');
    }
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
      // Update Firestore profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username,
        email,
      });

      // Update password if provided
      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      toast.success('Profile updated successfully!');
      setNewPassword('');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully.');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout.');
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
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider">Firebase Not Configured</h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              Profile updates require a valid Firebase configuration.
            </p>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif font-bold text-stone-800">Profile Settings</h2>
        {profile?.role === 'admin' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-stone-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest">
            <Shield size={12} />
            Administrator
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
              <User size={20} className="text-stone-400" />
              Account Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:ring-2 focus:ring-stone-200 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-400">New Password (leave blank to keep current)</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="py-3"
                icon={<Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />}
              />
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-stone-100">
            <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
              <Palette size={20} className="text-stone-400" />
              Theme Customization
            </h3>

            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Primary Color</label>
                <div className="flex flex-wrap gap-3">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => updateTheme({ primaryColor: c.primary, secondaryColor: c.secondary })}
                      className={cn(
                        "w-10 h-10 rounded-full border-4 transition-all hover:scale-110",
                        theme.primaryColor === c.primary ? "border-stone-300 scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.primary }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Glassmorphism</label>
                  <p className="text-[10px] text-stone-400">Enable modern translucent visual effects</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateTheme({ glassmorphism: !theme.glassmorphism })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    theme.glassmorphism ? "bg-stone-900" : "bg-stone-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                    theme.glassmorphism ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-stone-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
            
            <button 
              type="button"
              onClick={handleLogout}
              className="py-4 px-8 bg-white border border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </form>
      </div>

      <div className="bg-stone-100 rounded-3xl p-8 border border-stone-200">
        <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">User ID</span>
            <span className="font-mono text-stone-600">{user?.uid}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Account Created</span>
            <span className="text-stone-600">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Role</span>
            <span className="text-stone-600 capitalize">{profile?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
