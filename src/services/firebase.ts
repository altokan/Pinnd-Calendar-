/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage"; // استيراد خدمة التخزين
import { getMessaging } from "firebase/messaging";

/* -------------------------------------------------- */
/* ✅ التحقق من وجود الإعدادات                        */
/* -------------------------------------------------- */

export const isFirebaseConfigured =
  !!import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== "placeholder";

/* -------------------------------------------------- */
/* ✅ إعدادات Firebase                                */
/* -------------------------------------------------- */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/* -------------------------------------------------- */
/* ✅ تهيئة التطبيق                                   */
/* -------------------------------------------------- */

const app = initializeApp(firebaseConfig);

/* -------------------------------------------------- */
/* ✅ خدمة المصادقة (Auth)                            */
/* -------------------------------------------------- */

export const auth = getAuth(app);

/* -------------------------------------------------- */
/* ✅ خدمة قواعد البيانات (Firestore)                 */
/* -------------------------------------------------- */

let db: any;

try {
  // تفعيل الكاش للعمل بدون إنترنت ودعم تعدد التبويبات
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  db = getFirestore(app);
}

export { db };

/* -------------------------------------------------- */
/* ✅ خدمة التخزين (Storage) - المسؤولة عن رفع الصور   */
/* -------------------------------------------------- */

export const storage = getStorage(app); // تم التأكد من تصديرها هنا

/* -------------------------------------------------- */
/* ✅ خدمة الرسائل (Messaging)                        */
/* -------------------------------------------------- */

let messaging: any = null;

if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn("Messaging not supported in this browser");
  }
}

export { messaging };

export default app;
