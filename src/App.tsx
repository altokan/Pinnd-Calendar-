import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './ThemeContext';
import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AddToHomeScreen from './pages/AddToHomeScreen';
import ContactPage from './pages/ContactPage';

/* ✅ Push */
import {
  requestPushPermission,
  listenForegroundNotifications
} from "./services/firebase-messaging";

/* --------------------------------------- */

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false
}) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-stone-800 dark:border-stone-200"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

/* ======================================= */

export default function App() {

  /* ✅ استقبال الإشعارات أثناء فتح التطبيق */
  useEffect(() => {
    listenForegroundNotifications();
  }, []);

  /* ✅ زر طلب الإذن */
  const enableNotifications = async () => {
    await requestPushPermission();
    alert("Notifications Enabled ✅");
  };

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>

          {/* ✅ زر التفعيل (iPhone Required) */}
          <button
            onClick={enableNotifications}
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              zIndex: 9999,
              background: "#4f46e5",
              color: "white",
              border: "none",
              padding: "12px 16px",
              borderRadius: "14px",
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            Enable Notifications
          </button>

          <Toaster
            position="top-center"
            toastOptions={{
              className:
                'rounded-2xl font-sans font-medium text-sm dark:bg-stone-900 dark:text-stone-100 dark:border dark:border-stone-800',
            }}
          />

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout><CalendarPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout><ProfilePage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/contact" element={
              <ProtectedRoute>
                <Layout><ContactPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <Layout><AdminPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/add-to-home" element={
              <ProtectedRoute>
                <Layout><AddToHomeScreen /></Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>

        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
