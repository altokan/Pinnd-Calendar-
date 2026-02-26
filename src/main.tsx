import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

/* ✅ Push Notifications */
import {
  requestPushPermission,
  listenForegroundNotifications
} from './services/push';

/* تشغيل نظام الاشعارات */
requestPushPermission();
listenForegroundNotifications();
/* ====================== */

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
