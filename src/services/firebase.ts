/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'placeholder',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'placeholder',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'placeholder',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'placeholder',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'placeholder',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'placeholder',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'placeholder',
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  app = { name: '[DEFAULT]' } as any;
}

let auth: any;
let db: any;
let storage: any;

try {
  auth = getAuth(app);
  
  // Initialize Firestore with persistent cache for offline support
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase service initialization failed:", error);
  // Fallback to basic initialization if persistent cache fails
  if (app.name === '[DEFAULT]') {
    db = getFirestore(app);
  }
}

export { auth, db, storage, isFirebaseConfigured };

export default app;
