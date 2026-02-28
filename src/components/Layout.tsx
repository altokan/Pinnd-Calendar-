import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../ThemeContext';
import { isFirebaseConfigured } from '../services/firebase';
import { 
  ChevronLeft, Shield, PlusCircle, AlertTriangle, Palette, 
  MessageSquare, Calendar, Map, PenTool, Bell, User 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import EventModal from './EventModal';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAdmin } = useAuth();
  const { theme, updateTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showThemeMenu, setShowThemeMenu] = React.useState(false);

  const showBackButton = location.pathname !== '/';

  const navItems = [
    { icon: <Calendar size={24} />, label: 'Calendar', path: '/' },
    { icon: <Map size={24} />, label: 'Explore', path: '/map' },
    { icon: <PenTool size={24} />, label: 'Sketch', path: '/sketch' },
    { icon: <Bell size={24} />, label: 'Alerts', path: '/notifications' },
    { icon: <User size={24} />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-[#F9F8F6] text-stone-900">
      <header className={cn(
        "sticky top-0 z-40 border-b px-6 py-4 transition-all",
        theme.glassmorphism ? "glass backdrop-blur-md bg-white/70" : "bg-white border-stone-100"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-xl">
                <ChevronLeft size={20} />
              </button>
            )}
            <Link to="/" className="text-xl font-serif italic font-bold text-stone-800">Pinned</Link>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin" className="p-2.5 bg-rose-50 rounded-xl text-rose-500 animate-pulse">
                <Shield size={20} />
              </Link>
            )}
            <Link to="/contact" className="p-2.5 hover:bg-stone-100 rounded-xl text-stone-500">
              <MessageSquare size={20} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 pb-40">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50">
        <nav className={cn(
          "h-20 rounded-[2.5rem] shadow-2xl flex items-center justify-around px-4 border border-white/40",
          theme.glassmorphism ? "bg-white/70 backdrop-blur-2xl" : "bg-white"
        )}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 group relative">
                <div 
                  className={cn("p-3 rounded-2xl transition-all duration-300", isActive ? "text-white shadow-lg -translate-y-4 scale-110" : "text-stone-400")}
                  style={isActive ? { backgroundColor: theme.primaryColor } : {}}
                >
                  {item.icon}
                </div>
              </Link>
            );
          })}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all text-white border-4 border-white"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <PlusCircle size={24} />
          </button>
        </nav>
      </div>

      <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialDate={new Date()} />
    </div>
  );
};

export default Layout;
