import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

// Register the offline app-shell service worker (see public/sw.js).
// Without this, the app's JS/CSS/HTML themselves can't load at all with no
// network — that's what causes a blank page offline, separate from (and in
// addition to) the form/submission offline caching in utils/offlineSync.js.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal — the app still works online without it, it just won't
      // survive a hard refresh while offline.
    });
  });
}