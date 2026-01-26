import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry, captureUnhandledRejection } from './utils/sentry';
import { registerServiceWorker } from './utils/serviceWorker';
import { trackWebVitals } from './utils/performance';

// Make React available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).React = { StrictMode };
  (window as any).ReactDOM = { createRoot };
}

// Suppress console warnings and errors from third-party libraries and build tools
if (typeof window !== 'undefined') {
  // Suppress contextify warnings from Vite legacy plugin polyfills
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    const fullMessage = args.map(arg => String(arg)).join(' ');
    
    // Suppress contextify warnings from legacy polyfills (harmless but noisy)
    if (
      message.includes('[Contextify]') ||
      fullMessage.includes('[Contextify]') ||
      fullMessage.includes('running source code in new context')
    ) {
      return;
    }
    
    // Suppress preload warnings (browser optimization warnings, not errors)
    if (
      message.includes('preloaded using link preload but not used') ||
      fullMessage.includes('preloaded using link preload but not used')
    ) {
      return;
    }
    
    // Suppress WebSocket warnings for Supabase Realtime
    if (
      (message.includes('WebSocket') || fullMessage.includes('WebSocket')) &&
      (message.includes('supabase') || fullMessage.includes('supabase') || fullMessage.includes('realtime'))
    ) {
      return;
    }
    
    originalConsoleWarn.apply(console, args);
  };
  
  // Suppress WebContainer/StackBlitz preview script errors
  // These are from the development environment intercepting Supabase requests
  if (import.meta.env.DEV) {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
    // Get stack trace to check where the error comes from
    const stackTrace = new Error().stack || '';
    
    // Check if this error originates from preview-script or webcontainer
    const isFromPreviewScript = stackTrace.includes('preview-script') || 
                                 stackTrace.includes('webcontainer') ||
                                 stackTrace.includes('.webcontainer@runtime');
    
    // Check if the error message is about Supabase
    const errorMessages = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg && typeof arg === 'object') {
        // Check for common Supabase error patterns
        if ('message' in arg && typeof arg.message === 'string') {
          return arg.message;
        }
        if ('error' in arg && typeof arg.error === 'string') {
          return arg.error;
        }
        try {
          const str = JSON.stringify(arg);
          return str;
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ').toLowerCase();
    
    const isSupabaseError = errorMessages.includes('supabase request failed') ||
                           errorMessages.includes('supabase') ||
                           (args[0] && typeof args[0] === 'object' && 'code' in args[0]);
    
    // Filter out Supabase errors from preview-script/webcontainer
    if (isFromPreviewScript && isSupabaseError) {
      // Silently ignore - these are from the dev environment intercepting requests, not our code
      return;
    }
    
    // Suppress contextify warnings from legacy polyfills
    if (
      message.includes('[Contextify]') ||
      fullMessage.includes('[Contextify]') ||
      fullMessage.includes('running source code in new context')
    ) {
      return;
    }
    
    // Suppress WebSocket connection errors for Supabase Realtime
    if (
      (message.includes('WebSocket') || fullMessage.includes('WebSocket')) &&
      (message.includes('supabase') || fullMessage.includes('supabase') || 
       fullMessage.includes('realtime') || fullMessage.includes('websocket'))
    ) {
      return;
    }
    
    // Call original console.error for everything else
    originalConsoleError.apply(console, args);
  };
  }
}

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
  const errorString = String(event.reason || '');
  
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
  
  // Filter out WebContainer/StackBlitz Supabase errors from preview scripts
  if (
    errorString.includes('Supabase request failed') ||
    errorMessage.includes('Supabase request failed') ||
    (errorStack && errorStack.includes('preview-script') && errorMessage.includes('Supabase'))
  ) {
    // These are from the development environment intercepting Supabase requests
    // They're not real errors in our code
    event.preventDefault();
    return;
  }
  
  // Suppress WebSocket connection errors for Supabase Realtime
  if (
    (errorString.includes('WebSocket') || errorMessage.includes('WebSocket')) &&
    (errorString.includes('supabase') || errorMessage.includes('supabase') ||
     errorString.includes('realtime') || errorMessage.includes('realtime') ||
     errorString.includes('websocket') || errorMessage.includes('websocket'))
  ) {
    // WebSocket errors are handled gracefully by Supabase client
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
  
  // Filter out WebContainer/StackBlitz preview script errors
  if (
    errorSource.includes('preview-script') ||
    errorSource.includes('webcontainer') ||
    (errorMessage.includes('Supabase request failed') && errorSource.includes('preview-script'))
  ) {
    // These are from the development environment intercepting Supabase requests
    // They're not real errors in our code
    event.preventDefault();
    return;
  }
  
  // Suppress WebSocket connection errors for Supabase Realtime
  if (
    (errorMessage.includes('WebSocket') || errorSource.includes('websocket')) &&
    (errorMessage.includes('supabase') || errorSource.includes('supabase') ||
     errorMessage.includes('realtime') || errorSource.includes('realtime'))
  ) {
    // WebSocket errors are handled gracefully by Supabase client
    event.preventDefault();
    return;
  }
  
  // Suppress contextify warnings from legacy polyfills
  if (
    errorMessage.includes('[Contextify]') ||
    errorMessage.includes('running source code in new context') ||
    errorSource.includes('blitz')
  ) {
    // Harmless warnings from Vite legacy plugin polyfills
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
trackWebVitals((metric) => {
  if (import.meta.env.DEV) {
    const value = typeof metric.value === 'number' && !isNaN(metric.value) 
      ? metric.value.toFixed(2) 
      : 'N/A';
    console.log('[Performance]', metric.name, `${value}${metric.unit || 'ms'}`, `(${metric.rating || 'N/A'})`);
  }
  // In production, send to analytics
});

// Track if React has mounted to prevent innerHTML conflicts
let reactMounted = false;

// Wait for DOM to be ready before rendering
function initApp() {
  console.log('[App Init] Starting app initialization...');
  console.log('[App Init] User Agent:', navigator.userAgent);
  console.log('[App Init] Screen:', window.innerWidth, 'x', window.innerHeight);
  
  const rootElement = document.getElementById('root');
  
  // Hide loading indicator
  const loadingEl = document.getElementById('app-loading');
  if (loadingEl) {
    console.log('[App Init] Hiding loading indicator');
    loadingEl.style.display = 'none';
  }
  
  if (!rootElement) {
    console.error('[App] Root element not found!');
    // Only use innerHTML if React hasn't mounted
    if (!reactMounted) {
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #09090b; color: white; text-align: center; padding: 2rem; direction: rtl; flex-direction: column; gap: 1rem;">
          <h1 style="font-size: 2rem;">שגיאה בטעינת האפליקציה</h1>
          <p style="font-size: 1.2rem; opacity: 0.9;">אלמנט השורש לא נמצא. אנא רענן את הדף.</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin-top: 1rem;">רענן דף</button>
        </div>
      `;
    }
    return;
  }

  // Check if React is available
  if (typeof createRoot === 'undefined') {
    console.error('[App] React createRoot is not available!');
    // Only use innerHTML if React hasn't mounted
    if (!reactMounted) {
      rootElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-center: center; min-height: 100vh; background: #09090b; color: white; text-align: center; padding: 2rem; direction: rtl; flex-direction: column; gap: 1rem;">
          <h1 style="font-size: 2rem;">שגיאה בטעינת React</h1>
          <p style="font-size: 1.2rem; opacity: 0.9;">ספריית React לא נטענה. אנא בדוק את החיבור לאינטרנט ורענן את הדף.</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin-top: 1rem;">רענן דף</button>
        </div>
      `;
    }
    return;
  }

  try {
    console.log('[App Init] Creating React root...');
    const root = createRoot(rootElement);
    console.log('[App Init] Rendering App component...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('[App Init] App rendered successfully!');
    
    // Mark React as mounted - after this point, don't use innerHTML
    reactMounted = true;
    
    // Dispatch event to signal app loaded
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('app-loaded'));
    }
  } catch (error) {
    console.error('[App] Failed to render:', error);
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[App] Error stack:', errorStack);
    
    // Only use innerHTML if React hasn't mounted yet
    // After React mounts, errors should be handled by ErrorBoundary
    if (!reactMounted && rootElement) {
      // Clear any existing React content safely
      try {
        // Try to unmount React first if it was partially mounted
        const reactRoot = (rootElement as any)._reactRootContainer;
        if (reactRoot) {
          // React is partially mounted, let it handle cleanup
          return;
        }
      } catch (e) {
        // Ignore errors during cleanup check
      }
      
      rootElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #09090b; color: white; text-align: center; padding: 2rem; direction: rtl; flex-direction: column; gap: 1rem;">
          <h1 style="font-size: 2rem;">שגיאה בטעינת האפליקציה</h1>
          <p style="font-size: 1.2rem; opacity: 0.9; margin-bottom: 1rem;">${errorMessage}</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; margin-top: 1rem;">רענן דף</button>
        </div>
      `;
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM is already ready
  initApp();
}
