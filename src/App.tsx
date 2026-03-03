import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

/* استيراد الهوية والثيم */
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './ThemeContext';

/* استيراد المكونات الأساسية */
import Layout from './components/Layout';

/* استيراد الصفحات بناءً على هيكل ملفاتك الجديد */
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import MapsPage from './pages/MapsPage';
import BoardPage from './pages/BoardPage'; // تم التعديل هنا لاستيراد الصفحة الجديدة
import NotificationsPage from './pages/NotificationsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import AddEventPage from './pages/AddEventPage';

/**
 * مكون حماية المسارات (Protected Route)
 * يمنع الوصول للصفحات إلا بعد تسجيل الدخول
 */
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

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          {/* مكون التنبيهات (Toast) positioning to top-center as per screenshot but keeping existing config */}
          <Toaster 
            position="top-center" 
            toastOptions={{ 
              className: 'rounded-2xl font-sans text-sm shadow-lg',
              duration: 4000 
            }} 
          />

          <Routes>
            {/* 1. المسارات العامة (بدون تسجيل دخول) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            
            {/* 2. المسارات المحمية (تحتاج تسجيل دخول) داخل الـ Layout */}
            
            {/* الصفحة الرئيسية (التقويم) */}
            <Route path="/" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
            
            {/* الخرائط */}
            <Route path="/maps" element={<ProtectedRoute><Layout><MapsPage /></Layout></ProtectedRoute>} />
            
            {/* صفحة اللوحة الجديدة (تم توجيه رابط /sketch إليها لضمان عمل الأزرار الحالية) */}
            <Route path="/sketch" element={<ProtectedRoute><Layout><BoardPage /></Layout></ProtectedRoute>} />
            
            {/* الإشعارات */}
            <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
            
            {/* الملف الشخصي */}
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            
            {/* إضافة حدث جديد */}
            <Route path="/add-event" element={<ProtectedRoute><Layout><AddEventPage /></Layout></ProtectedRoute>} />
            
            {/* تفاصيل الحدث */}
            <Route path="/event/:id" element={<ProtectedRoute><Layout><EventDetailsPage /></Layout></ProtectedRoute>} />
            
            {/* صفحة الإدارة (للمشرفين فقط) */}
            <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPage /></Layout></ProtectedRoute>} />

            {/* إعادة توجيه أي مسار غير موجود للرئيسية */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
