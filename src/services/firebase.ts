/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

/* -------------------------------------------------- */
/* ✅ Check Firebase Config                           */
/* -------------------------------------------------- */

export const isFirebaseConfigured =
  !!import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== "placeholder";

/* -------------------------------------------------- */
/* ✅ Firebase Config                                 */
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
/* ✅ Initialize App                                  */
/* -------------------------------------------------- */

const app = initializeApp(firebaseConfig);

/* -------------------------------------------------- */
/* ✅ Auth                                            */
/* -------------------------------------------------- */

export const auth = getAuth(app);

/* -------------------------------------------------- */
/* ✅ Firestore (Offline + Multi Tabs)                */
/* -------------------------------------------------- */

let db;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  db = getFirestore(app);
}

export { db };

/* -------------------------------------------------- */
/* ✅ Storage                                         */
/* -------------------------------------------------- */

export const storage = getStorage(app);

/* -------------------------------------------------- */
/* ✅ Messaging (Push Notifications)                  */
/* -------------------------------------------------- */

let messaging: any = null;

if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn("Messaging not supported");
  }
}

export { messaging };

/* -------------------------------------------------- */

export default app;
