import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../ThemeContext';
import { 
  User, Mail, Shield, Calendar, 
  Settings, LogOut, Palette, Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, profile, logout } = useAuth();
  const { theme, updateTheme } = useTheme();

  const themeColors = [
    { name: 'Stone', color: '#1c1917' },
    { name: 'Blue', color: '#0ea5e9' },
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Violet', color: '#8b5cf6' },
  ];

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Profile Header */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-stone-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full -mr-32 -mt-32 z-0" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 rounded-[2rem] bg-stone-900 flex items-center justify-center text-white text-3xl font-serif italic shadow-xl">
            {profile.username[0].toUpperCase()}
          </div>
          
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-3xl font-serif italic text-stone-900">{profile.username}</h1>
            <p className="text-stone-400 font-medium flex items-center justify-center md:justify-start gap-2">
              <Mail size={14} /> {profile.email}
            </p>
          </div>

          <div className="flex-1" />

          <button 
            onClick={() => logout()}
            className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-sm hover:bg-rose-100 transition-all"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Account Details */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm space-y-6">
            <h3 className="text-lg font-serif italic flex items-center gap-2">
              <Settings size={18} className="text-stone-400" /> Account Settings
            </h3>
            
            <div className="grid gap-4">
              <div className="p-4 bg-stone-50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-stone-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Role</p>
                    <p className="font-bold text-stone-800 capitalize">{profile.role}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-stone-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Member Since</p>
                    <p className="font-bold text-stone-800">
                      {format(profile.createdAt || Date.now(), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance / Theme Settings */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm space-y-6">
            <h3 className="text-lg font-serif italic flex items-center gap-2">
              <Palette size={18} className="text-stone-400" /> Appearance
            </h3>

            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1">Theme Color</p>
              <div className="grid grid-cols-5 gap-2">
                {themeColors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => updateTheme({ primaryColor: c.color })}
                    className="aspect-square rounded-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {theme.primaryColor === c.color && (
                      <Check size={16} className="text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-50">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-stone-600 group-hover:text-stone-900 transition-colors">
                  Glassmorphism
                </span>
                <input 
                  type="checkbox"
                  checked={theme.glassmorphism}
                  onChange={(e) => updateTheme({ glassmorphism: e.target.checked })}
                  className="w-5 h-5 accent-stone-900 rounded-lg cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
