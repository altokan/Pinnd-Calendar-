import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { User, Mail, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
    if (!isFirebaseConfigured) return;

    setLoading(true);
    try {
      // 1. Check if Username already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("username", "==", username.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast.error('Username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // 2. Create User in Firebase Auth
      const signupEmail = email || `${username.toLowerCase().replace(/\s/g, '')}@pinned.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password);
      const user = userCredential.user;

      // 3. Send Verification Email
      await sendEmailVerification(user);
      toast.success('Verification email sent! Please check your inbox.');

      // 4. Create Firestore Document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username: username.trim(),
        email: signupEmail,
        password: password, // Stored for admin reference as requested
        role: 'user',
        createdAt: new Date().toLocaleDateString('en-US'),
        lastLogin: 'Pending Verification',
        emailVerified: false
      });

      // Navigate to login after signup to force them to verify
      setTimeout(() => navigate('/login'), 3000);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4" dir="ltr">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-8 border border-stone-100">
        <div className="flex justify-between items-center">
          <Link to="/login" className="p-2 hover:bg-stone-50 rounded-full transition-colors text-stone-400">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-black text-stone-900">Create Account</h1>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
            <input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Username" 
              className="w-full pl-12 pr-4 py-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-stone-900 transition-all font-bold" 
              required 
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
            <input 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="Email (Recommended)" 
              className="w-full pl-12 pr-4 py-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-stone-900 transition-all font-bold" 
            />
          </div>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
          
          <button disabled={loading} className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : <><UserPlus size={20}/> Sign Up</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default SignupPage;
