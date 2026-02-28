import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
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
import SketchPage from './pages/SketchPage'; // ✅ استيراد صفحة السكتش

/* Firebase Services */
import { listenForegroundNotifications } from "./services/firebase-messaging";
import { db } from "./services/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

/* ------------------------------------------------ */

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false
}) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9F8F6]">
        <Loader2 className="animate-spin text-stone-300" size={40} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

/* ================================================= */

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [dynamicSlides, setDynamicSlides] = useState<any[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  useEffect(() => {
    listenForegroundNotifications();

    // 1. جلب إعدادات Onboarding الديناميكية من Firestore
    const qConfig = query(collection(db, "app_config"), limit(1));
    const unsubConfig = onSnapshot(qConfig, (snap) => {
      if (!snap.empty) {
        const configData = snap.docs[0].data();
        const serverVersion = configData.onboardingVersion;
        const slides = configData.slides || [];

        setDynamicSlides(slides);

        // فحص رقم الإصدار المحفوظ محلياً
        const localVersion = localStorage.getItem('app_onboard_version');
        if (localVersion !== serverVersion && slides.length > 0) {
          setShowOnboarding(true);
          // نحفظ الإصدار "المستهدف" مؤقتاً
          localStorage.setItem('target_onboard_version', serverVersion);
        }
      }
      setIsConfigLoading(false);
    });

    // 2. التنبيهات اللحظية للأدمن
    const qNotify = query(
      collection(db, "admin_notifications"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsubNotify = onSnapshot(qNotify, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const data = change.doc.data();
          toast.success(`${data.title}\n${data.body}`, { duration: 6000 });
        }
      });
    });

    return () => {
      unsubConfig();
      unsubNotify();
    };
  }, []);

  const handleCompleteOnboarding = () => {
    const targetVersion = localStorage.getItem('target_onboard_version');
    if (targetVersion) {
      localStorage.setItem('app_onboard_version', targetVersion);
    }
    setShowOnboarding(false);
  };

  if (isConfigLoading) return null;

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <NotificationBanner />
          <Toaster position="top-center" toastOptions={{ className: 'rounded-2xl font-sans text-sm' }} />

          {/* ✨ Dynamic Onboarding Experience ✨ */}
          <AnimatePresence>
            {showOnboarding && dynamicSlides.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center"
              >
                <button onClick={handleCompleteOnboarding} className="absolute top-8 right-8 text-stone-300 hover:text-stone-900 transition-colors">
                  <X size={32}/>
                </button>
                
                <motion.div 
                  key={onboardStep}
                  initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="max-w-md space-y-10"
                >
                  <div className="w-full h-80 bg-stone-50 rounded-[4rem] overflow-hidden shadow-2xl flex items-center justify-center border-8 border-white">
                    <img 
                       src={dynamicSlides[onboardStep].img} 
                       alt="Feature" 
                       className="w-full h-full object-cover"
                       onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/400x400?text=Feature")}
                    />
                  </div>
                  <div className="space-y-4 px-4">
                    <h2 className="text-5xl font-serif italic tracking-tight text-stone-900">{dynamicSlides[onboardStep].title}</h2>
                    <p className="text-stone-400 text-lg leading-relaxed font-medium">{dynamicSlides[onboardStep].desc}</p>
                  </div>
                </motion.div>

                <div className="absolute bottom-16 w-full max-w-md px-10 flex items-center justify-between">
                  <div className="flex gap-3">
                    {dynamicSlides.map((_, i) => (
                      <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === onboardStep ? 'w-10 bg-stone-900' : 'w-2 bg-stone-100'}`} />
                    ))}
                  </div>
                  <button 
                    onClick={() => onboardStep < dynamicSlides.length - 1 ? setOnboardStep(s => s + 1) : handleCompleteOnboarding()}
                    className="bg-stone-900 text-white p-6 rounded-[2rem] shadow-2xl hover:scale-110 active:scale-95 transition-all"
                  >
                    <ChevronRight size={32} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/contact" element={<ProtectedRoute><Layout><ContactPage /></Layout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPage /></Layout></ProtectedRoute>} />
            <Route path="/add-to-home" element={<ProtectedRoute><Layout><AddToHomeScreen /></Layout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
            
            {/* ✅ تم تحديث مسار السكتش */}
            <Route 
              path="/sketch" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <SketchPage />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            <Route path="/map" element={<ProtectedRoute><Layout><div className="min-h-[60vh] flex items-center justify-center font-serif italic text-2xl text-stone-300">Map Exploration (In Progress)</div></Layout></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
