import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { 
  Home, 
  User, 
  ShieldCheck, 
  LogOut, 
  Map as MapIcon, 
  Bell, 
  PenTool,
  PlusCircle
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm("Do you want to logout?")) {
      await signOut(auth);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col font-sans">
      {/* منطقة المحتوى */}
      <main className="flex-1 pb-32 p-4 overflow-y-auto">
        {children}
      </main>

      {/* البنر السفلي المحسن - أيقونات سوداء واضحة */}
      <nav className="fixed bottom-6 left-6 right-6 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-[2.5rem] border border-stone-100 flex justify-around items-center p-4 z-[100]">
        
        {/* الرئيسية */}
        <NavLink to="/" className={({isActive}) => isActive ? "text-stone-900 scale-110" : "text-stone-300"}>
          <Home size={24} strokeWidth={2.5} />
        </NavLink>

        {/* الخرائط */}
        <NavLink to="/maps" className={({isActive}) => isActive ? "text-stone-900 scale-110" : "text-stone-300"}>
          <MapIcon size={24} strokeWidth={2.5} />
        </NavLink>

        {/* زر إضافة حدث - مميز في المنتصف */}
        <NavLink to="/add-event" className="bg-stone-900 text-white p-3 rounded-2xl shadow-lg transform -translate-y-2 active:scale-90 transition-all">
          <PlusCircle size={24} strokeWidth={2.5} />
        </NavLink>

        {/* التنبيهات */}
        <NavLink to="/notifications" className={({isActive}) => isActive ? "text-stone-900 scale-110" : "text-stone-300"}>
          <Bell size={24} strokeWidth={2.5} />
        </NavLink>

        {/* البروفايل */}
        <NavLink to="/profile" className={({isActive}) => isActive ? "text-stone-900 scale-110" : "text-stone-300"}>
          <User size={24} strokeWidth={2.5} />
        </NavLink>

        {/* زر الخروج السريع بلون أحمر خفيف */}
        <button onClick={handleLogout} className="text-rose-300 hover:text-rose-500">
          <LogOut size={24} strokeWidth={2.5} />
        </button>

      </nav>
    </div>
  );
};

export default Layout;
