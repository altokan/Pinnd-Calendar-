import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserTheme } from './types';
import { useAuth } from './hooks/useAuth';
import { db } from './services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ThemeContextType {
  theme: UserTheme;
  updateTheme: (newTheme: Partial<UserTheme>) => Promise<void>;
}

const defaultTheme: UserTheme = {
  primaryColor: '#1c1917', // stone-900
  secondaryColor: '#78716c', // stone-500
  glassmorphism: true,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user } = useAuth();
  const [theme, setTheme] = useState<UserTheme>(defaultTheme);

  useEffect(() => {
    if (profile?.theme) {
      setTheme({ ...defaultTheme, ...profile.theme });
    } else {
      setTheme(defaultTheme);
    }
  }, [profile]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply colors
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    
    // Ensure dark mode class is removed as it's no longer supported
    root.classList.remove('dark');
    
    // Apply glassmorphism intensity
    // We keep the option but the user wants it as a core style
    root.style.setProperty('--glass-opacity', theme.glassmorphism ? '0.6' : '1');
    root.style.setProperty('--glass-blur', theme.glassmorphism ? '16px' : '0px');
  }, [theme]);

  const updateTheme = async (newTheme: Partial<UserTheme>) => {
    const updatedTheme = { ...theme, ...newTheme };
    setTheme(updatedTheme);

    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          theme: updatedTheme
        });
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
