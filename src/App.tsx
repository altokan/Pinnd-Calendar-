import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// حل مشكلة ReferenceError: استيراد motion فقط وتجنب AnimatePresence
import { motion } from 'framer-motion'; 
import { ChevronRight, X, Loader2 } from 'lucide-react';

import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './ThemeContext';

import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

import { db } from "./services/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// مكون الحماية الداخلي لضمان عدم حدوث أخطاء استيراد
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false
}) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [dynamicSlides, setDynamicSlides] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "app_config", "onboarding"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDynamicSlides(data.slides || []);
        if (localStorage.getItem('app_onboard_version') !== data.onboardingVersion) {
          setShowOnboarding(true);
          localStorage.setItem('target_version', data.onboardingVersion);
        }
      }
    });
    return () => unsub();
  }, []);

  const finishOnboard = () => {
    localStorage.setItem('app_onboard_version', localStorage.getItem('target_version') || "");
    setShowOnboarding(false);
  };

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Toaster position="top-center" />
          
          {/* Onboarding - Simple Logic */}
          {showOnboarding && dynamicSlides.length > 0 && (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center" dir="ltr">
              <div className="w-full max-w-sm space-y-8">
                <div className="w-full aspect-square bg-stone-100 rounded-[3rem] overflow-hidden">
                  <img src={dynamicSlides[onboardStep].img} className="w-full h-full object-cover" alt="" />
                </div>
                <h2 className="text-2xl font-black">{dynamicSlides[onboardStep].title}</h2>
                <p className="text-stone-400">{dynamicSlides[onboardStep].desc}</p>
                <button onClick={() => onboardStep < dynamicSlides.length - 1 ? setOnboardStep(s => s + 1) : finishOnboard()} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold">
                  {onboardStep === dynamicSlides.length - 1 ? "Start" : "Next"}
                </button>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPage /></Layout></ProtectedRoute>} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
