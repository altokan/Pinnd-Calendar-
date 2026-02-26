import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !auth.app) {
      console.error("Firebase Auth is not initialized.");
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser && db && db.type === 'firestore') {
          try {
            const docRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const profileData = docSnap.data() as UserProfile;
              setProfile(profileData);
              
              // Auto-promote owner to admin if not already
              if (firebaseUser.email?.toLowerCase() === 'amjad.tokan@gmail.com' && profileData.role !== 'admin') {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
                setProfile({ ...profileData, role: 'admin' });
              }
            }
          } catch (err) {
            console.error("Error fetching user profile:", err);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error in onAuthStateChanged:", error);
      setLoading(false);
    }
  }, []);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
