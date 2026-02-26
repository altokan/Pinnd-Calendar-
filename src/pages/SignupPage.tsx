import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User, Mail, UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import PasswordInput from '../components/PasswordInput';

const SignupPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured. Please add your API keys in the Secrets panel.');
      return;
    }

    setLoading(true);

    try {
      // If email is empty, we'll use a placeholder based on username
      const signupEmail = email || `${username.toLowerCase().replace(/\s/g, '')}@pinnedcalendar.com`;
      
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      const isAdminEmail = signupEmail.toLowerCase() === 'amjad.tokan@gmail.com';
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username,
        email: signupEmail,
        role: isAdminEmail ? 'admin' : 'user',
        createdAt: Date.now(),
      });

      toast.success('Account created successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="p-8 pb-0 flex items-center justify-between">
          <Link to="/login" className="p-2 hover:bg-stone-50 rounded-full transition-colors text-stone-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-serif font-bold text-stone-800">Join Pinned</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <form onSubmit={handleSignup} className="p-8 space-y-5">
          {!isFirebaseConfigured && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0" size={18} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Configuration Required</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Firebase API keys are missing. Please add them to the <b>Secrets</b> panel to enable signup.
                </p>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-200 focus:border-stone-200 outline-none transition-all"
                required
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (Optional)"
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-200 focus:border-stone-200 outline-none transition-all"
              />
            </div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
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
                <UserPlus size={20} />
                Create Account
              </>
            )}
          </button>

          <p className="text-center text-stone-400 text-xs px-4">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default SignupPage;
