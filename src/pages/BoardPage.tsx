import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronLeft, ImageIcon, Plus, StickyNote, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils'; // تأكد من وجود دالة cn المساعدة في مشروعك

// استيراد الخدمات من ملف الفايربيس المحدث
import { db, storage, auth } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

// تعريف هيكل عنصر اللوحة (صورة أو نوت) مع موقعه
interface BoardElement {
  id: string;
  type: 'image' | 'note';
  content: string; // رابط الصورة أو نص النوت
  x: number;
  y: number;
  rotation: number; // دوران عشوائي ليعطي مظهراً واقعياً
}

export default function BoardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const corkboardRef = useRef<HTMLDivElement>(null); // مرجع للوحة الفلين لضبط حدود السحب

  const [elements, setElements] = useState<BoardElement[]>([]);
  const [loading, setLoading] = useState(true);

  // معرف المستخدم لربط اللوحة بحسابه
  const userId = auth.currentUser?.uid || "guest_user";
  const boardDocRef = doc(db, "boards", userId);

  // جلب بيانات اللوحة في الوقت الفعلي من Firebase Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(boardDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setElements(docSnap.data().elements || []);
      } else {
        // إنشاء مستند لوحة جديد إذا لم يكن موجوداً
        setDoc(boardDocRef, { elements: [] });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching board:", error);
      toast.error("فشل في تحميل اللوحة");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  // دالة لإضافة نوت ورقي جديد
  const addNewNote = async () => {
    const newNote: BoardElement = {
      id: `note_${Date.now()}`,
      type: 'note',
      content: '', // نوت فارغ في البداية
      x: 50, // موقع افتراضي في أعلى اليسار
      y: 100,
      rotation: Math.random() * 6 - 3, // دوران عشوائي بسيط بين -3 و +3 درجات
    };

    try {
      await updateDoc(boardDocRef, {
        elements: arrayUnion(newNote)
      });
      toast.success('تمت إضافة نوت جديد');
    } catch (error) {
      toast.error('فشل في إضافة النوت');
    }
  };

  // دالة لرفع عدة صور دفعة واحدة وتطبيق الإطار التلقائي
  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    toast.loading(`جاري رفع ${filesArray.length} صور...`, { id: 'upload_toast' });

    let successCount = 0;
    const newImages: BoardElement[] = [];

    for (const file of filesArray) {
      try {
        const reader = new FileReader();
        const uploadPromise = new Promise<void>((resolve, reject) => {
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const id = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            try {
              // رفع الصورة إلى Firebase Storage
              const storageRef = ref(storage, `board/${userId}/${id}`);
              await uploadString(storageRef, base64, 'data_url');
              const downloadURL = await getDownloadURL(storageRef);

              // إنشاء عنصر صورة جديد مع موقعه ودورانه العشوائي
              newImages.push({
                id,
                type: 'image',
                content: downloadURL,
                x: Math.random() * 100 + 100, // موقع عشوائي متداخل قليلاً
                y: Math.random() * 100 + 150,
                rotation: Math.random() * 10 - 5, // دوران عشوائي ليعطي مظهراً واقعياً
              });
              resolve();
            } catch (error) { reject(error); }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await uploadPromise;
        successCount++;
      } catch (error) { console.error("Error uploading file:", file.name, error); }
    }

    if (newImages.length > 0) {
      try {
        await updateDoc(boardDocRef, {
          elements: arrayUnion(...newImages)
        });
        toast.success(`تم رفع ${successCount} صور بنجاح`, { id: 'upload_toast' });
      } catch (error) {
        toast.error('فشل في حفظ الصور في اللوحة', { id: 'upload_toast' });
      }
    } else { toast.error('فشل رفع الصور', { id: 'upload_toast' }); }

    // إعادة ضبط مدخل الملف للسماح برفع نفس الصور مرة أخرى إذا لزم الأمر
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // دالة لحذف عنصر (نوت أو صورة) من اللوحة ومن Firebase
  const deleteElement = async (elementToRemove: BoardElement) => {
    try {
      await updateDoc(boardDocRef, {
        elements: arrayRemove(elementToRemove)
      });
      toast.success('تم الحذف');
    } catch (error) {
      toast.error('فشل في الحذف');
    }
  };

  // دالة لتحديث محتوى النوت الورقي (النص) في Firebase
  const updateNoteContent = useCallback(
    async (id: string, newContent: string) => {
      try {
        const updatedElements = elements.map(el => 
          el.id === id ? { ...el, content: newContent } : el
        );
        // تحديث محلي سريع لإعطاء شعور بالاستجابة الفورية
        setElements(updatedElements); 
        // تحديث في Firebase (يمكن تحسين هذا باستخدام debounce)
        await updateDoc(boardDocRef, { elements: updatedElements });
      } catch (error) { console.error("Error updating note:", error); }
    }, [elements, boardDocRef]
  );

  // دالة لتحديث موقع العنصر (X, Y) بعد التحريك وحفظه في Firebase
  const handleDragEnd = async (id: string, info: any) => {
    try {
      // حساب الموقع الجديد بناءً على إزاحة السحب وموقع اللوحة
      const corkboardRect = corkboardRef.current?.getBoundingClientRect();
      if (!corkboardRect) return;

      const updatedElements = elements.map(el => {
        if (el.id === id) {
          // حساب الإحداثيات الجديدة بدقة بالنسبة للوحة الفلين
          const newX = el.x + info.offset.x;
          const newY = el.y + info.offset.y;
          
          return { ...el, x: newX, y: newY };
        }
        return el;
      });

      // تحديث المواقع في Firebase لتبقى ثابتة للمستخدم
      await updateDoc(boardDocRef, { elements: updatedElements });
    } catch (error) { console.error("Error updating position:", error); }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#bc8a5f] flex items-center justify-center z-[500]">
      <Loader2 className="animate-spin text-white" size={40} />
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden touch-none select-none">
      {/* لوحة الفلين الخلفية */}
      <div 
        ref={corkboardRef}
        className="absolute inset-0 z-0 bg-[#bc8a5f]" 
        style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }} 
      />
      
      {/* زر العودة في أعلى اليسار */}
      <div className="absolute top-6 left-6 z-[100]">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/90 rounded-2xl shadow-xl active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* منطقة العناصر القابلة للسحب (النوتات والصور) */}
      <div className="w-full h-full relative z-10">
        <AnimatePresence>
          {elements.map((el) => (
            <motion.div
              key={el.id}
              drag // تفعيل خاصية السحب
              dragMomentum={false} // إيقاف القصور الذاتي لسحب أكثر دقة
              dragConstraints={corkboardRef} // حصر السحب داخل حدود لوحة الفلين
              onDragEnd={(_, info) => handleDragEnd(el.id, info)} // حفظ الموقع الجديد بعد السحب
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute z-20"
              style={{ x: el.x, y: el.y, rotate: el.rotation, cursor: 'grab' }}
              whileDrag={{ scale: 1.05, cursor: 'grabbing', zIndex: 100 }} // تأثير بَصري أثناء السحب
            >
              {/* شريط أدوات مصغر يظهر فوق العنصر عند الوقوف عليه (للحذف) */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-stone-900 text-white rounded-lg px-3 py-1 flex gap-2 shadow-2xl opacity-0 hover:opacity-100 transition-opacity z-30">
                <button onClick={() => deleteElement(el)} className="hover:text-red-400">
                  <Trash2 size={16}/>
                </button>
              </div>

              {/* دبوس النوت (أيقونة بَصريّة) */}
              {el.type === 'note' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-red-700 drop-shadow-md z-30">
                  <Plus size={20} className="fill-current" />
                </div>
              )}

              {/* العنصر نفسه (نوت ورقي أو صورة مؤطرة) */}
              <div className={cn(
                "relative shadow-xl transition-all rounded-sm",
                el.type === 'note' ? "bg-[#fff9c4] p-6 pr-4" : "bg-white p-3 pb-8" // محاكاة النوت الورقي والإطار الأبيض للصورة
              )}>
                {el.type === 'note' ? (
                  // النوت الورقي (Sticky Note)
                  <textarea 
                    className="bg-transparent border-none outline-none w-full h-32 resize-none text-stone-800 font-handwriting"
                    placeholder="اكتب ملاحظتك هنا..."
                    defaultValue={el.content}
                    onChange={(e) => updateNoteContent(el.id, e.target.value)}
                  />
                ) : (
                  // الصورة القابلة للسحب مع الإطار الأبيض التلقائي
                  <div className="border border-stone-200">
                    <img src={el.content} className="w-48 h-auto pointer-events-none" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* شريط الأدوات الرئيسي (البنر الأسود) - تم رفعه فوق شريط التنقل السفلي */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
        <div className="bg-stone-900/95 backdrop-blur-xl rounded-[2.5rem] p-2 flex items-center justify-between border border-white/10 shadow-2xl">
          {/* زر إضافة نوت ورقي جديد */}
          <button onClick={addNewNote} className="flex items-center gap-2 px-6 py-4 bg-yellow-400 text-stone-900 rounded-full font-black text-xs active:scale-95 transition-all">
            <StickyNote size={16} /> ADD NOTE
          </button>
          
          {/* زر إضافة صور جديدة */}
          <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-stone-800 text-white rounded-full active:scale-95 transition-all">
            <ImageIcon size={20} />
          </button>
          
          {/* زر حفظ يدوي (إضافي للضرورة) */}
          <button onClick={() => toast.success('يتم الحفظ تلقائياً عند الحركة!')} className="p-4 bg-emerald-500 text-white rounded-full active:scale-95 transition-all hover:bg-emerald-600">
            <Save size={18} />
          </button>
        </div>
      </div>

      {/* مدخل ملف مخفي للسماح برفع عدة صور دفعة واحدة */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        multiple // السماح باختيار عدة صور
        onChange={handleMultipleImageUpload} 
      />
    </div>
  );
}
