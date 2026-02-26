import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, isFirebaseConfigured } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, getDocs, where, limit } from 'firebase/firestore';
import { Mail, Send, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

const ContactPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (!isFirebaseConfigured) {
      toast.error('Firebase is not configured.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'contactMessages'), {
        userId: user.uid,
        username: profile.username,
        email: profile.email || '',
        message,
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Contact error:', error);
      toast.error('Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-stone-800 dark:text-stone-100">Contact Us</h2>
        <p className="text-stone-500 dark:text-stone-400">Have a question or feedback? We'd love to hear from you.</p>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {submitted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-900 dark:text-stone-100">
              <CheckCircle size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-100">Message Received</h3>
              <p className="text-stone-500 dark:text-stone-400">
                Thank you for reaching out! Our team will get back to you as soon as possible.
              </p>
            </div>
            <button 
              onClick={() => setSubmitted(false)}
              className="px-8 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl font-bold hover:opacity-90 transition-all"
            >
              Send Another Message
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {!isFirebaseConfigured && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">Configuration Required</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    Firebase is not configured. Messaging is currently disabled.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Name</label>
                  <input 
                    type="text" 
                    value={profile?.username || ''} 
                    disabled 
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl text-stone-400 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Email</label>
                  <input 
                    type="email" 
                    value={profile?.email || ''} 
                    disabled 
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl text-stone-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Message</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you?"
                  rows={5}
                  className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-stone-200 dark:focus:ring-stone-700 outline-none transition-all resize-none"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !isFirebaseConfigured}
              className="w-full py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-stone-200 dark:shadow-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  Send Message
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-stone-100 dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 text-center space-y-2">
          <Mail className="mx-auto text-stone-400" size={24} />
          <h4 className="font-bold text-stone-800 dark:text-stone-100">Email Us</h4>
          <p className="text-xs text-stone-500 dark:text-stone-400">support@pinnedcalendar.com</p>
        </div>
        <div className="p-6 bg-stone-100 dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 text-center space-y-2">
          <MessageSquare className="mx-auto text-stone-400" size={24} />
          <h4 className="font-bold text-stone-800 dark:text-stone-100">Live Chat</h4>
          <p className="text-xs text-stone-500 dark:text-stone-400">Available 9am - 5pm EST</p>
        </div>
        <div className="p-6 bg-stone-100 dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 text-center space-y-2">
          <CheckCircle className="mx-auto text-stone-400" size={24} />
          <h4 className="font-bold text-stone-800 dark:text-stone-100">Response Time</h4>
          <p className="text-xs text-stone-500 dark:text-stone-400">Within 24 hours</p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
