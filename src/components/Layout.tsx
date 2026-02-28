import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../ThemeContext';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { 
  ChevronLeft, 
  Shield, 
  PlusCircle, 
  AlertTriangle,
  Palette,
  MessageSquare,
  Calendar,
  Map,
  PenTool,
  Bell,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // تأكد من أنها framer-motion وليس motion/react لضمان التوافق
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;

    let timeGreeting = '';
    if (hour < 12) timeGreeting = 'Good Morning';
    else if (hour < 18) timeGreeting = 'Good Afternoon';
    else timeGreeting = 'Good Evening';

    if (isWeekend) return `Happy Weekend, ${profile?.username || 'User'}`;
    return `${timeGreeting}, ${profile?.username || 'User'}`;
  };

  const showBackButton = location.pathname !== '/';

  const colors = [
    { name: 'Stone', primary: '#1c1917', secondary: '#78716c' },
    { name: 'Indigo', primary: '#312e81', secondary: '#6366f1' },
    { name: 'Emerald', primary: '#064e3b', secondary: '#10b981' },
    { name: 'Rose', primary: '#881337', secondary: '#f43f5e' },
    { name: 'Amber', primary: '#78350f', secondary: '#f59e0b' },
  ];

  // تعريف عناصر التنقل للشريط السفلي
  const navItems = [
    { icon: <Calendar size={24} />, label: 'Calendar', path: '/' },
    { icon: <Map size={24} />, label: 'Explore', path: '/map' },
    { icon: <PenTool size={24} />, label: 'Sketch', path: '/sketch' },
    { icon: <Bell size={24} />, label: 'Alerts', path: '/notifications' },
    { icon: <User size={24} />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen font-sans flex flex-col transition-colors duration-300 bg-[#F9F8F6] text-stone-900">
      {!isFirebaseConfigured && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 z-[60]">
          <AlertTriangle size={12} />
          Firebase Configuration Missing
        </div>
      )}

      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 border-b px-6 py-4 transition-all",
        theme.glassmorphism ? "glass backdrop-blur-md bg-white/70" : "bg-white border-stone-100"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-stone-100 rounded-xl transition-all"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <Link to="/" className="text-xl font-serif italic font-bold tracking-tight text-stone-800">
              Pinned
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-2.5 hover:bg-stone-100 rounded-xl transition-all text-stone-500"
              >
                <Palette size={20} />
              </button>
              
              <AnimatePresence>
                {showThemeMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-56 bg-white border border-stone-100 rounded-[2rem] shadow-2xl p-4 z-50"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4 px-2">Theme Palette</p>
                    <div className="grid grid-cols-5 gap-3 mb-5 px-2">
                      {colors.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => {
                            updateTheme({ primaryColor: c.primary, secondaryColor: c.secondary });
                            setShowThemeMenu(false);
                          }}
                          className="w-7 h-7 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125"
                          style={{ backgroundColor: c.primary }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        updateTheme({ glassmorphism: !theme.glassmorphism });
                        setShowThemeMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-stone-50 rounded-2xl transition-all flex items-center justify-between border border-stone-50"
                    >
                      Glass Mode
                      <div className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        theme.glassmorphism ? "bg-stone-900" : "bg-stone-200"
                      )}>
                        <div className={cn(
                          "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                          theme.glassmorphism ? "left-6" : "left-1"
                        )} />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/contact" className="p-2.5 hover:bg-stone-100 rounded-xl transition-all text-stone-500">
              <MessageSquare size={20} />
            </Link>

            {isAdmin && (
              <Link to="/admin" className="p-2.5 hover:bg-stone-100 rounded-xl transition-all text-rose-500">
                <Shield size={20} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Greeting Section */}
      {location.pathname === '/' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto w-full px-6 pt-10 pb-4"
        >
          <h1 className="text-4xl font-serif italic text-stone-800 tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation (Floating Premium Style) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50">
        <nav className={cn(
          "h-22 rounded-[3rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex items-center justify-around px-4 border border-white/40 transition-all",
          theme.glassmorphism ? "bg-white/60 backdrop-blur-3xl" : "bg-white border-stone-100"
        )}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 group relative py-2"
              >
                <div className={cn(
                  "p-3.5 rounded-[1.6rem] transition-all duration-300",
                  isActive 
                    ? "bg-stone-900 text-white shadow-xl -translate-y-3 scale-110" 
                    : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                )}
                style={isActive ? { backgroundColor: theme.primaryColor } : {}}
                >
                  {item.icon}
                </div>
                {isActive && (
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] absolute -bottom-3 animate-in fade-in slide-in-from-bottom-1">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
          
          {/* زر الإضافة العائم مدمج في المنتصف أو بجانب العناصر */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-4 bg-stone-900 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-white"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <PlusCircle size={26} />
          </button>
        </nav>
      </div>

      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialDate={new Date()} 
      />
    </div>
  );
};

export default Layout;
