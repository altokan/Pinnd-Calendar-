import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

/* ✅ Firebase Push Notifications */
import {
  requestNotificationPermission,
  listenForegroundMessages
} from './services/firebase-messaging';

requestNotificationPermission();
listenForegroundMessages();
/* ============================== */

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
