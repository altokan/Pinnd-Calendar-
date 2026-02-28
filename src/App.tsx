import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion'; // تأكد من وجود هذا السطر
import { ChevronRight, X, Loader2 } from 'lucide-react';

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
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F9F8F6]"><Loader2 className="animate-spin" size={40} /></div>;
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
          <Toaster position="top-center" />
          
          <AnimatePresence>
            {showOnboarding && dynamicSlides.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center font-sans"
                dir="ltr"
              >
                <button onClick={handleCompleteOnboarding} className="absolute top-8 right-8 text-stone-300"><X size={32}/></button>
                <motion.div key={onboardStep} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="max-w-md space-y-8">
                  <div className="w-full aspect-square bg-stone-50 rounded-[3rem] overflow-hidden shadow-xl border-4 border-white">
                    <img src={dynamicSlides[onboardStep].img} className="w-full h-full object-cover" alt="onboarding" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-stone-900">{dynamicSlides[onboardStep].title}</h2>
                    <p className="text-stone-400 text-lg leading-relaxed">{dynamicSlides[onboardStep].desc}</p>
                  </div>
                </motion.div>
                <div className="absolute bottom-16 w-full max-w-md px-10 flex flex-col gap-6">
                   <div className="flex justify-center gap-2">
                      {dynamicSlides.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${i === onboardStep ? 'w-8 bg-stone-900' : 'w-2 bg-stone-100'}`} />
                      ))}
                   </div>
                   <button 
                    onClick={() => onboardStep < dynamicSlides.length - 1 ? setOnboardStep(s => s + 1) : handleCompleteOnboarding()}
                    className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-bold text-xl flex items-center justify-center gap-2"
                   >
                    {onboardStep === dynamicSlides.length - 1 ? "Get Started" : "Next"} <ChevronRight size={24} />
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
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
