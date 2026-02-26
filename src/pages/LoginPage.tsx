import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Mail, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import PasswordInput from '../components/PasswordInput';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured. Please add your API keys in the Secrets panel.');
      return;
    }

    setLoading(true);

    try {
      // Special check for hardcoded admin
      if (email === 'admin' && password === 'admin123') {
        // In a real app, we'd use a specific email for the admin in Firebase
        // For this requirement, we'll try to sign in with a placeholder email
        // or just handle it via a specific admin flow.
        // Let's assume the admin email is admin@pinnedcalendar.com
        const adminEmail = 'admin@pinnedcalendar.com';
        try {
          await signInWithEmailAndPassword(auth, adminEmail, 'admin123');
          toast.success('Welcome back, Admin!');
          navigate('/');
          return;
        } catch (err) {
          // If admin user doesn't exist in Firebase yet, we might need to create it
          // but for now let's just use standard login.
          console.error("Admin login failed", err);
        }
      }

      // Standard login
      // If the user entered a username instead of email, we might need to handle that
      // but Firebase Auth uses email.
      const loginEmail = email.includes('@') ? email : `${email}@example.com`;
      
      await signInWithEmailAndPassword(auth, loginEmail, password);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="p-8 pb-0 text-center">
          <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">Pinned Calendar</h1>
          <p className="text-stone-400 text-sm">Organize your visual life, day by day.</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {!isFirebaseConfigured && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0" size={18} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Configuration Required</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Firebase API keys are missing. Please add them to the <b>Secrets</b> panel to enable login.
                </p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username or Email"
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-200 focus:border-stone-200 outline-none transition-all"
                required
              />
            </div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
            <Link to="/forgot-password" title="Reset Password" className="hover:text-stone-600 transition-colors">
              Forgot Password?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>

          <div className="text-center pt-4">
            <p className="text-stone-400 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-stone-900 font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </form>

        <div className="bg-stone-50 p-4 border-t border-stone-100 flex items-center justify-center gap-2">
          <AlertCircle size={14} className="text-stone-400" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400">
            Secure Authentication Powered by Firebase
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
