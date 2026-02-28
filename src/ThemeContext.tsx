import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserTheme } from './types';
import { useAuth } from './hooks/useAuth';
import { db } from './services/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface ThemeContextType {
  theme: UserTheme;
  updateTheme: (newTheme: Partial<UserTheme>) => Promise<void>;
}

const defaultTheme: UserTheme = {
  primaryColor: '#1c1917',
  secondaryColor: '#78716c',
  glassmorphism: true,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user } = useAuth();
  const [theme, setTheme] = useState<UserTheme>(defaultTheme);

  // 1. جلب الثيم العام من الأدمن (جديد)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "app_config", "appearance"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTheme(prev => ({ ...prev, primaryColor: data.primaryColor || prev.primaryColor }));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (profile?.theme) {
      setTheme(prev => ({ ...prev, ...profile.theme }));
    }
  }, [profile]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--glass-opacity', theme.glassmorphism ? '0.6' : '1');
    root.style.setProperty('--glass-blur', theme.glassmorphism ? '16px' : '0px');
  }, [theme]);

  const updateTheme = async (newTheme: Partial<UserTheme>) => {
    const updatedTheme = { ...theme, ...newTheme };
    setTheme(updatedTheme);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { theme: updatedTheme });
      } catch (e) { console.error(e); }
    }
  };

  return <ThemeContext.Provider value={{ theme, updateTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
