import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './ThemeContext';
import Layout from './components/Layout';

import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import MapsPage from './pages/MapsPage';
import BoardPage from './pages/board'; // تأكد أن هذا الملف موجود في src/pages/board.tsx
import NotificationsPage from './pages/NotificationsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import AddEventPage from './pages/AddEventPage';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Toaster position="top-center" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
            <Route path="/sketch" element={<ProtectedRoute><Layout><BoardPage /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" size={40} /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};
