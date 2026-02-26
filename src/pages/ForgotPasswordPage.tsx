import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { db, isFirebaseConfigured } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User, Mail, Send, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

const ForgotPasswordPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured. Please add your API keys in the Secrets panel.');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'resetRequests'), {
        username,
        email,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      toast.success('Reset request sent to Admin.');
    } catch (error: any) {
      console.error('Reset request error:', error);
      toast.error('Failed to send reset request.');
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
        <div className="p-8 pb-0 flex items-center justify-between">
          <Link to="/login" className="p-2 hover:bg-stone-50 rounded-full transition-colors text-stone-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-serif font-bold text-stone-800">Reset Password</h1>
          <div className="w-10" />
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-900">
              <CheckCircle size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-bold text-stone-800">Request Sent</h2>
              <p className="text-stone-500 text-sm">
                Your password reset request has been sent to the Admin. They will review it and provide you with a new password soon.
              </p>
            </div>
            <Link 
              to="/login" 
              className="block w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {!isFirebaseConfigured && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Configuration Required</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Firebase API keys are missing. Please add them to the <b>Secrets</b> panel to enable requests.
                  </p>
                </div>
              </div>
            )}
            <p className="text-stone-500 text-sm text-center">
              Enter your details below. The Admin will verify your account and reset your password.
            </p>
            
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
                  placeholder="Email Address"
                  className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-200 focus:border-stone-200 outline-none transition-all"
                  required
                />
              </div>
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
                  <Send size={20} />
                  Send Request
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
