import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, Settings } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await signOut(auth);
      navigate('/login');
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-black text-stone-900">Profile</h1>
      
      {/* بطاقة معلومات المستخدم */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-stone-50 flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center text-stone-300">
          <User size={48} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">{user?.displayName || "User Name"}</h2>
          <p className="text-stone-400 font-medium flex items-center justify-center gap-2">
            <Mail size={14} /> {user?.email}
          </p>
        </div>
      </div>

      {/* قائمة الخيارات */}
      <div className="bg-white rounded-[3rem] overflow-hidden shadow-sm border border-stone-50">
        <button className="w-full p-6 text-left flex items-center justify-between hover:bg-stone-50 transition-colors">
          <div className="flex items-center gap-4 font-bold text-stone-900">
             <Settings size={20} /> Account Settings
          </div>
        </button>

        {/* زر تسجيل الخروج الحصري هنا */}
        <button 
          onClick={handleLogout}
          className="w-full p-6 text-left flex items-center justify-between hover:bg-rose-50 text-rose-500 transition-colors border-t border-stone-50"
        >
          <div className="flex items-center gap-4 font-bold">
             <LogOut size={20} /> Logout
          </div>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
