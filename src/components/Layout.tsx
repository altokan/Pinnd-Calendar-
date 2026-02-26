import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../ThemeContext';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { 
  ChevronLeft, 
  LogOut, 
  User, 
  Shield, 
  Home, 
  PlusCircle, 
  Smartphone, 
  AlertTriangle,
  Moon,
  Sun,
  Palette,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  return (
    <div className="min-h-screen font-sans flex flex-col transition-colors duration-300 bg-stone-50 text-stone-900">
      {!isFirebaseConfigured && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 z-[60]">
          <AlertTriangle size={12} />
          Firebase Configuration Missing - Please check Secrets panel
        </div>
      )}
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 border-b px-4 py-3 transition-all",
        theme.glassmorphism ? "glass" : "bg-white border-stone-200"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                id="back-button"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <Link to="/" className="text-xl font-bold tracking-tight text-stone-800">
              Pinned Calendar
            </Link>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                title="Theme Settings"
              >
                <Palette size={20} />
              </button>
              
              <AnimatePresence>
                {showThemeMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-2xl shadow-xl p-3 z-50"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 px-2">Choose Color</p>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {colors.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => {
                            updateTheme({ primaryColor: c.primary, secondaryColor: c.secondary });
                            setShowThemeMenu(false);
                          }}
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                          style={{ backgroundColor: c.primary }}
                          title={c.name}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        updateTheme({ glassmorphism: !theme.glassmorphism });
                        setShowThemeMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-stone-50 rounded-lg transition-colors flex items-center justify-between"
                    >
                      Glassmorphism
                      <div className={cn(
                        "w-8 h-4 rounded-full transition-colors relative",
                        theme.glassmorphism ? "bg-stone-900" : "bg-stone-200"
                      )}>
                        <div className={cn(
                          "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                          theme.glassmorphism ? "left-4.5" : "left-0.5"
                        )} />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/contact" className="p-2 hover:bg-stone-100 rounded-full transition-colors" title="Contact Us">
              <MessageSquare size={20} />
            </Link>

            {isAdmin && (
              <Link to="/admin" className="p-2 hover:bg-stone-100 rounded-full transition-colors" title="Admin Panel">
                <Shield size={20} />
              </Link>
            )}
            <Link to="/profile" className="p-2 hover:bg-stone-100 rounded-full transition-colors" title="Profile">
              <User size={20} />
            </Link>
            <Link to="/add-to-home" className="hidden md:block p-2 hover:bg-stone-100 rounded-full transition-colors" title="Install App">
              <Smartphone size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Greeting Section */}
      {location.pathname === '/' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto w-full px-4 pt-6 pb-2"
        >
          <h1 className="text-2xl font-serif italic text-stone-800">
            {getGreeting()}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-6 px-4 text-center mt-auto mb-20 md:mb-0">
        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-[0.3em]">
          Designed & Developed by Amjad Altokan
        </p>
      </footer>

      {/* Fixed Bottom Navigation (Mobile) */}
      <nav className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-3 flex justify-around items-center z-50 transition-all",
        theme.glassmorphism ? "glass" : "bg-white border-stone-200"
      )}>
        <Link to="/" className={cn("p-2 rounded-full", location.pathname === '/' ? "text-stone-900 bg-stone-100" : "text-stone-400")}>
          <Home size={24} />
        </Link>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-3 bg-stone-900 text-white rounded-full shadow-lg -mt-10 border-4 border-stone-50 active:scale-95 transition-transform"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <PlusCircle size={28} />
        </button>
        <Link to="/profile" className={cn("p-2 rounded-full", location.pathname === '/profile' ? "text-stone-900 bg-stone-100" : "text-stone-400")}>
          <User size={24} />
        </Link>
      </nav>

      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialDate={new Date()} 
      />
    </div>
  );
};

export default Layout;
