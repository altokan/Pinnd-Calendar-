// ... (بقية الاستيرادات والتعريفات السابقة بدون تغيير)

export default function CalendarPage() {
  const { user } = useAuth();
  // ... (بقية الـ States)
  const [greeting, setGreeting] = useState('');

  // تحديث منطق التحية ليتضمن نهاية الأسبوع
  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = day === 0 || day === 6;

      let msg = '';
      if (hour >= 5 && hour < 12) msg = 'Good Morning';
      else if (hour >= 12 && hour < 17) msg = 'Good Afternoon';
      else if (hour >= 17 && hour < 21) msg = 'Good Evening';
      else msg = 'Good Night';

      if (isWeekend) {
        setGreeting(`Happy Weekend, ${msg}`);
      } else {
        setGreeting(msg);
      }
    };
    updateGreeting();
  }, []);

  // ... (بقية الـ useEffects والدوال)

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
      {/* Header المحدث */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-16">
        <div className="space-y-8">
          <div className="space-y-1">
            {/* تكبير اسم التطبيق */}
            <h1 className="text-4xl md:text-5xl font-serif italic text-black tracking-tight">
              Pinned Calendar
            </h1>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xl font-serif italic text-stone-400">
                {greeting},
              </span>
              {/* جعل أول حرف من الاسم كبيراً */}
              <span className="text-xl font-serif italic text-red-600 capitalize">
                {user?.displayName || user?.email?.split('@')[0] || 'member'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-7xl md:text-8xl font-serif italic text-stone-900 tracking-tighter leading-none">
              {format(currentDate, 'MMMM')}
            </h2>
            <p className="text-stone-400 font-black tracking-[0.4em] uppercase text-[10px] mt-4 ml-2">
              Lifestyle Planning
            </p>
          </div>
        </div>

        {/* أزرار التنقل - تبقى كما هي */}
        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-xl p-2 rounded-2xl border-white border-2 shadow-xl self-start md:mt-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-6 text-[11px] font-black uppercase tracking-widest text-stone-700">Today</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* باقي الكود (الشبكة، المودال، الخريطة) يبقى كما هو دون أي تغيير */}
// ...
