import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { LogIn, User, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import PasswordInput from '../components/PasswordInput';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState(''); // Can be username or email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let emailToSignIn = identifier;

      // 1. Check if the input is a Username instead of Email
      if (!identifier.includes('@')) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("username", "==", identifier.trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error('Username not found.');
        }
        emailToSignIn = querySnapshot.docs[0].data().email;
      }

      // 2. Perform Sign In
      const userCredential = await signInWithEmailAndPassword(auth, emailToSignIn, password);
      const user = userCredential.user;

      // 3. Optional: Check for Email Verification
      if (!user.emailVerified) {
        toast.error('Please verify your email before logging in.', {
          icon: <AlertCircle className="text-amber-500" />,
        });
        setLoading(false);
        return;
      }

      // 4. Update lastLogin in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date().toLocaleString('en-US'),
        emailVerified: true
      });

      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4" dir="ltr">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 border border-stone-100">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-stone-900">Welcome Back</h1>
          <p className="text-stone-400 font-medium">Login to your Pinned account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
            <input 
              value={identifier} 
              onChange={e => setIdentifier(e.target.value)} 
              placeholder="Username or Email" 
              className="w-full pl-12 pr-4 py-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-stone-900 transition-all font-bold" 
              required 
            />
          </div>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
          
          <button disabled={loading} className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : <><LogIn size={20}/> Login</>}
          </button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-sm text-stone-400 font-bold">
            Don't have an account? <Link to="/signup" className="text-stone-900 underline">Sign Up</Link>
          </p>
          <Link to="/forgot-password" size="sm" className="text-xs text-stone-300 hover:text-stone-900 block transition-colors">Forgot Password?</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
