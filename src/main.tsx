import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry, captureUnhandledRejection } from './utils/sentry';
import { registerServiceWorker } from './utils/serviceWorker';
import { measureWebVitals } from './utils/performanceMonitor';

// Initialize Sentry error tracking (async, don't block app startup)
initSentry().catch((error) => {
  if (import.meta.env.DEV) {
    console.warn('[Sentry] Initialization failed:', error);
  }
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  captureUnhandledRejection(event.reason);
  // Prevent default browser console error
  event.preventDefault();
});

// Capture uncaught errors
window.addEventListener('error', (event) => {
  // Sentry will automatically capture these via global error handler
  console.error('Uncaught error:', event.error);
});

// Register service worker for offline caching
if (import.meta.env.PROD) {
  registerServiceWorker().catch(console.error);
}

// Measure Web Vitals
measureWebVitals((metric) => {
  if (import.meta.env.DEV) {
    console.log('[Performance]', metric.name, `${metric.value.toFixed(2)}ms`, `(${metric.rating})`);
  }
  // In production, send to analytics
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
