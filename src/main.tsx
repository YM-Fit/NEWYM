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
  // Filter out Chameleon (chmln) errors - they're from third-party tools and not our code
  const errorMessage = event.reason?.message || String(event.reason || '');
  const errorStack = event.reason?.stack || '';
  
  if (
    errorMessage.includes('chmln') ||
    errorMessage.includes('messo') ||
    errorStack.includes('chmln') ||
    errorStack.includes('messo') ||
    errorMessage.includes('Cannot read properties of undefined')
  ) {
    // Silently ignore Chameleon errors - they're not our problem
    event.preventDefault();
    return;
  }
  
  captureUnhandledRejection(event.reason);
  // Prevent default browser console error
  event.preventDefault();
});

// Capture uncaught errors
window.addEventListener('error', (event) => {
  // Filter out Chameleon (chmln) errors - they're from third-party tools and not our code
  const errorMessage = event.message || '';
  const errorStack = event.error?.stack || '';
  const errorSource = event.filename || '';
  
  if (
    errorMessage.includes('chmln') ||
    errorMessage.includes('messo') ||
    errorStack.includes('chmln') ||
    errorStack.includes('messo') ||
    errorSource.includes('chmln') ||
    errorSource.includes('messo') ||
    (errorMessage.includes('Cannot read properties of undefined') && errorStack.includes('chmln'))
  ) {
    // Silently ignore Chameleon errors - they're not our problem
    event.preventDefault();
    return;
  }
  
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
    const value = typeof metric.value === 'number' && !isNaN(metric.value) 
      ? metric.value.toFixed(2) 
      : 'N/A';
    console.log('[Performance]', metric.name, `${value}ms`, `(${metric.rating || 'N/A'})`);
  }
  // In production, send to analytics
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
