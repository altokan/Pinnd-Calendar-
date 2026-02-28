import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { ChevronRight, X, Loader2 } from 'lucide-react';

// استيراد motion فقط وتجنب AnimatePresence تماماً لحل مشكلة الـ ReferenceError
import { motion } from 'framer-motion'; 

import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './ThemeContext';

import Layout from './components/Layout';
import NotificationBanner from './components/NotificationBanner';

import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AddToHomeScreen from './pages/AddToHomeScreen';
import ContactPage from './pages/ContactPage';
import NotificationsPage from './pages/NotificationsPage';
import SketchPage from './pages/SketchPage';

import { listenForegroundNotifications } from "./services/firebase-messaging";
import { db } from "./services/firebase";
import { doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false
}) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9F8F6]">
      <Loader2 className="animate-spin text-stone-300" size={40} />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [dynamicSlides, setDynamicSlides] = useState<any[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  useEffect(() => {
    listenForegroundNotifications();
    const unsubConfig = onSnapshot(doc(db, "app_config", "onboarding"), (snap) => {
      if (snap.exists()) {
        const configData = snap.data();
        setDynamicSlides(configData.slides || []);
        const localVersion = localStorage.getItem('app_onboard_version');
        if (localVersion !== configData.onboardingVersion && configData.slides?.length > 0) {
          setShowOnboarding(true);
          localStorage.setItem('target_onboard_version', configData.onboardingVersion);
        }
      }
      setIsConfigLoading(false);
    });
    return () => unsubConfig();
  }, []);

  const handleCompleteOnboarding = () => {
    localStorage.setItem('app_onboard_version', localStorage.getItem('target_onboard_version') || "");
    setShowOnboarding(false);
  };

  if (isConfigLoading) return null;

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <NotificationBanner />
          <Toaster position="top-center" />

          {/* Onboarding - نسخة مبسطة لضمان التوافق مع الآيباد */}
          {showOnboarding && dynamicSlides.length > 0 && (
            <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center font-sans" dir="ltr">
              <button onClick={handleCompleteOnboarding} className="absolute top-8 right-8 text-stone-300">
                <X size={32}/>
              </button>
              
              <div className="w-full max-w-sm space-y-8">
                <div className="w-full aspect-square bg-stone-50 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white mx-auto">
                  <img src={dynamicSlides[onboardStep].img} alt="feature" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-stone-900 leading-tight">{dynamicSlides[onboardStep].title}</h2>
                  <p className="text-stone-400 text-base leading-relaxed font-medium">{dynamicSlides[onboardStep].desc}</p>
                </div>
              </div>

              <div className="absolute bottom-12 w-full max-w-sm px-8 flex flex-col items-center gap-8">
                <div className="flex gap-2">
                  {dynamicSlides.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === onboardStep ? 'w-8 bg-stone-900' : 'w-2 bg-stone-100'}`} />
                  ))}
                </div>
                <button 
                  onClick={() => onboardStep < dynamicSlides.length - 1 ? setOnboardStep(s => s + 1) : handleCompleteOnboarding()}
                  className="w-full bg-stone-900 text-white py-5 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 font-black text-lg"
                >
                  {onboardStep === dynamicSlides.length - 1 ? "Start" : "Next"}
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPage /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
