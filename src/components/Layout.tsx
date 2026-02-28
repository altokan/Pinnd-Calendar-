import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { 
  Home, 
  User, 
  ShieldCheck, 
  Map as MapIcon, 
  Bell, 
  PenTool,
  PlusCircle
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col font-sans">
      
      {/* Header العلوي: يحتوي على لوحة التحكم والبروفايل */}
      <header className="flex justify-between items-center p-6 bg-transparent z-10">
        <h1 className="text-xl font-black tracking-tighter text-stone-900">PINNED</h1>
        <div className="flex gap-3">
          {/* زر لوحة التحكم */}
          <NavLink to="/admin" className="p-3 bg-white/50 backdrop-blur-md rounded-2xl border border-white shadow-sm text-stone-900 active:scale-90 transition-all">
            <ShieldCheck size={20} />
          </NavLink>
          {/* زر البروفايل */}
          <NavLink to="/profile" className="p-3 bg-white/50 backdrop-blur-md rounded-2xl border border-white shadow-sm text-stone-900 active:scale-90 transition-all">
            <User size={20} />
          </NavLink>
        </div>
      </header>

      {/* منطقة المحتوى */}
      <main className="flex-1 px-4 pb-32 overflow-y-auto">
        {children}
      </main>

      {/* البنر السفلي العائم (Glassmorphism Floating Nav) */}
      <div className="fixed bottom-8 left-0 right-0 px-6 z-50">
        <nav className="max-w-md mx-auto bg-stone-900/80 backdrop-blur-2xl rounded-[2.5rem] p-3 shadow-2xl border border-white/10 flex justify-around items-center">
          
          {/* الصفحة الرئيسية */}
          <NavLink to="/" className={({isActive}) => isActive ? "bg-white text-stone-900 p-4 rounded-full shadow-lg" : "text-stone-400 p-4 hover:text-white transition-colors"}>
            <Home size={24} />
          </NavLink>

          {/* الخرائط */}
          <NavLink to="/maps" className={({isActive}) => isActive ? "bg-white text-stone-900 p-4 rounded-full shadow-lg" : "text-stone-400 p-4 hover:text-white transition-colors"}>
            <MapIcon size={24} />
          </NavLink>

          {/* زر إضافة حدث (في المنتصف بشكل مميز) */}
          <NavLink to="/add-event" className={({isActive}) => isActive ? "bg-rose-500 text-white p-4 rounded-full shadow-lg" : "bg-white/10 text-white p-4 rounded-full hover:bg-white/20 transition-all"}>
            <PlusCircle size={28} />
          </NavLink>

          {/* السكتش */}
          <NavLink to="/sketch" className={({isActive}) => isActive ? "bg-white text-stone-900 p-4 rounded-full shadow-lg" : "text-stone-400 p-4 hover:text-white transition-colors"}>
            <PenTool size={24} />
          </NavLink>

          {/* التنبيهات */}
          <NavLink to="/notifications" className={({isActive}) => isActive ? "bg-white text-stone-900 p-4 rounded-full shadow-lg" : "text-stone-400 p-4 hover:text-white transition-colors"}>
            <Bell size={24} />
          </NavLink>

        </nav>
      </div>
    </div>
  );
};

export default Layout;
