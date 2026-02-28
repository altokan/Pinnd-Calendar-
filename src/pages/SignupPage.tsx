import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User, Mail, UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';
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
      const signupEmail = email || `${username.toLowerCase().replace(/\s/g, '')}@pinned.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password);
      const user = userCredential.user;

      // ✅ إنشاء بيانات المستخدم بتنسيق متوافق مع صفحة الأدمن
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username,
        email: signupEmail,
        password: password, // حفظها للعرض في الأدمن كما طلبت
        role: 'user',
        createdAt: new Date().toLocaleDateString('ar-EG'),
        lastLogin: 'سجل لأول مرة'
      });

      toast.success('مرحباً بك في Pinned!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-stone-900">إنشاء حساب</h1>
          <p className="text-stone-400">انضم لمجتمع Pinned المنظم</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 text-right">
          <div className="relative">
            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="اسم المستخدم" className="w-full pr-12 pl-4 py-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-stone-900 transition-all font-bold" required />
          </div>
          <div className="relative">
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="الإيميل (اختياري)" className="w-full pr-12 pl-4 py-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-stone-900 transition-all font-bold text-left" />
          </div>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة السر" required />
          
          <button disabled={loading} className="w-full py-5 bg-stone-900 text-white rounded-[2rem] font-black shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : <><UserPlus size={20}/> ابدأ الآن</>}
          </button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-sm font-bold text-stone-400 hover:text-stone-900 transition-colors">لديك حساب؟ سجل دخولك هنا</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
