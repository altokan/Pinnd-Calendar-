import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, User, ShieldCheck, LogOut } from 'lucide-react';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await signOut(auth);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col">
      {/* Content Area */}
      <main className="flex-1 pb-24 p-4">{children}</main>

      {/* Bottom Navigation Bar (iOS Style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-100 flex justify-around p-4 pb-8 z-50">
        <NavLink to="/" className={({isActive}) => isActive ? "text-stone-900" : "text-stone-300"}><Home size={28} /></NavLink>
        <NavLink to="/profile" className={({isActive}) => isActive ? "text-stone-900" : "text-stone-300"}><User size={28} /></NavLink>
        <NavLink to="/admin" className={({isActive}) => isActive ? "text-stone-900" : "text-stone-300"}><ShieldCheck size={28} /></NavLink>
        <button onClick={handleLogout} className="text-rose-400"><LogOut size={28} /></button>
      </nav>
    </div>
  );
};

export default Layout;
