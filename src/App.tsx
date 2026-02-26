import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

/* ✅ Push */
import {
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

  /* استقبال الاشعارات والتطبيق مفتوح */
  useEffect(() => {
    listenForegroundNotifications();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>

          {/* ✅ Banner كبير أعلى التطبيق */}
          <NotificationBanner />

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
