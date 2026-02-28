import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { 
  Home, 
  User, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  Bell, 
  Menu, 
  X 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (window.confirm("Are you sure you want to log out?")) {
        await signOut(auth);
        toast.success("Logged out");
        navigate('/login');
      }
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const navItems = [
    { path: '/', icon: <Home size={24} />, label: 'Home' },
    { path: '/notifications', icon: <Bell size={24} />, label: 'Alerts' },
    { path: '/profile', icon: <User size={24} />, label: 'Profile' },
    { path: '/admin', icon: <ShieldCheck size={24} />, label: 'Admin', adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col font-sans" dir="ltr">
      
      {/* 📱 Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-5 bg-white border-b border-stone-100 sticky top-0 z-40">
        <h1 className="text-xl font-black tracking-tighter text-stone-900">PINNED</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-stone-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 💻 Sidebar for Desktop / Tablet */}
        <aside className="hidden md:flex w-64 bg-white border-r border-stone-100 flex-col p-6 space-y-8">
          <h1 className="text-2xl font-black text-stone-900 mb-4">PINNED</h1>
          <nav className="flex-1 space-y-2">
            {navItems.map(item => (
              <NavLink 
                key={item.path} 
                to={item.path} 
                className={({isActive}) => `flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${isActive ? 'bg-stone-900 text-white' : 'text-stone-400 hover:bg-stone-50'}`}
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </nav>
          <button onClick={handleLogout} className="flex items-center gap-3 p-4 text-rose-500 font-bold hover:bg-rose-50 rounded-2xl transition-all">
            <LogOut size={22} /> Logout
          </button>
        </aside>

        {/* 📱 Mobile Full-screen Overlay Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-50 bg-white p-8 md:hidden flex flex-col justify-center space-y-6 text-center"
            >
              <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-6 p-2 bg-stone-50 rounded-full"><X/></button>
              {navItems.map(item => (
                <NavLink key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className="text-3xl font-black text-stone-900">{item.label}</NavLink>
              ))}
              <button onClick={handleLogout} className="text-3xl font-black text-rose-500 pt-10 flex items-center justify-center gap-2"><LogOut/> Logout</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🏠 Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* 📱 Mobile Bottom Tab Bar (Very Important for Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-stone-100 flex justify-around p-4 z-40 shadow-2xl rounded-t-[2.5rem]">
        {navItems.map(item => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({isActive}) => `p-3 rounded-2xl transition-all ${isActive ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-300'}`}
          >
            {item.icon}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
