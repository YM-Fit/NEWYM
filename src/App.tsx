import { useState, Suspense, lazy, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ComponentErrorBoundary from './components/common/ComponentErrorBoundary';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import SkipLinks from './components/common/SkipLinks';
import { useIsTablet } from './hooks/useIsTablet';
import { trackWebVitals, trackBundlePerformance } from './utils/performance';
import { initIndexedDB } from './utils/indexedDb';

// Import Supabase debug utility (runs health check in development)
import './utils/supabaseDebug';

// Lazy load main app components
const TrainerApp = lazy(() => import('./components/trainer/TrainerApp'));
const TraineeApp = lazy(() => import('./components/trainee/TraineeApp'));

// Simple TV Test Page - shows browser info and tests basic rendering
// This is a pure functional component without hooks to ensure maximum compatibility
function TvTestPage() {
  // Get current time (static - will show load time)
  const now = new Date();
  const timeStr = now.toLocaleTimeString('he-IL');
  
  const browserInfo = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    screen: typeof window !== 'undefined' ? `${window.innerWidth} x ${window.innerHeight}` : 'N/A',
    language: typeof navigator !== 'undefined' ? navigator.language : 'N/A',
    cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : false,
    localStorage: typeof localStorage !== 'undefined',
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1a1a2e',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      padding: '40px',
      overflow: 'auto',
      direction: 'rtl',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '48px', 
          marginBottom: '20px', 
          color: '#10b981',
          textAlign: 'center',
        }}>
          ✅ הדפדפן עובד!
        </h1>
        
        <div style={{
          backgroundColor: '#2a2a3e',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '2px solid #10b981',
        }}>
          <h2 style={{ fontSize: '32px', marginBottom: '16px', color: '#10b981' }}>
            🕐 שעת טעינה
          </h2>
          <p style={{ fontSize: '64px', fontWeight: 'bold', textAlign: 'center' }}>
            {timeStr}
          </p>
        </div>
        
        <div style={{
          backgroundColor: '#2a2a3e',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#10b981' }}>
            📺 מידע על הדפדפן
          </h2>
          <div style={{ fontSize: '18px', lineHeight: '2' }}>
            <p><strong>גודל מסך:</strong> {browserInfo.screen}</p>
            <p><strong>שפה:</strong> {browserInfo.language}</p>
            <p><strong>Cookies:</strong> {browserInfo.cookiesEnabled ? 'פעיל' : 'כבוי'}</p>
            <p><strong>LocalStorage:</strong> {browserInfo.localStorage ? 'זמין' : 'לא זמין'}</p>
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#2a2a3e',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#f59e0b' }}>
            🔧 User Agent
          </h2>
          <p style={{ 
            fontSize: '14px', 
            wordBreak: 'break-all',
            backgroundColor: '#1a1a2e',
            padding: '12px',
            borderRadius: '8px',
            direction: 'ltr',
            textAlign: 'left',
          }}>
            {browserInfo.userAgent}
          </p>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ fontSize: '20px', color: '#a3a3a3', marginBottom: '16px' }}>
            אם אתה רואה את הדף הזה, הדפדפן של הטלוויזיה עובד!
          </p>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '16px 32px',
              fontSize: '20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            חזור לאפליקציה
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, userType } = useAuth();
  const [forceShowLogin, setForceShowLogin] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[AppContent] State:', { user: !!user, loading, userType, forceShowLogin });
  }, [user, loading, userType, forceShowLogin]);

  // Force show login after 3 seconds if still loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('[AppContent] Loading timeout - forcing login screen');
        setForceShowLogin(true);
      }, 3000);
      return () => clearTimeout(timeout);
    } else {
      setForceShowLogin(false);
    }
  }, [loading]);

  // Track Web Vitals and performance metrics
  useEffect(() => {
    // Initialize IndexedDB for offline caching
    if ('indexedDB' in window) {
      initIndexedDB().catch((error) => {
        console.warn('[IndexedDB] Failed to initialize:', error);
      });
    }

    // Register Service Worker for caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        // Only log service worker errors in development, and only if not on StackBlitz
        const isStackBlitz = error?.message?.includes('StackBlitz') || 
                            window.location.hostname.includes('stackblitz');
        if (isDev && !isStackBlitz) {
          console.warn('[Service Worker] Failed to register:', error);
        }
      });
    }

    // Track Web Vitals
    trackWebVitals((metric) => {
      console.log('[Web Vitals]', metric);
      // Send to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', metric.name.toLowerCase(), {
          value: Math.round(metric.value),
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
        });
      }
    });

    // Track bundle performance after load
    if (document.readyState === 'complete') {
      trackBundlePerformance();
    } else {
      window.addEventListener('load', () => {
        setTimeout(trackBundlePerformance, 0);
      });
    }
  }, []);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const isTablet = useIsTablet();

  // Show login immediately if forced or if loading for too long
  if (loading && !forceShowLogin) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #09090b, #18181b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div 
          className="text-center animate-fade-in max-w-md px-4"
          style={{
            textAlign: 'center',
            maxWidth: '28rem',
            padding: '0 1rem',
          }}
        >
          <div 
            className="relative inline-block"
            style={{ position: 'relative', display: 'inline-block' }}
          >
            <div 
              className="absolute inset-0 bg-emerald-700/20 rounded-full blur-xl animate-pulse-soft"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderRadius: '50%',
                filter: 'blur(20px)',
              }}
            />
            <div 
              className="relative inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-700/30 border-t-emerald-600"
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '3rem',
                height: '3rem',
                border: '4px solid rgba(16, 185, 129, 0.3)',
                borderTopColor: '#10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
          <p 
            className="mt-6 text-emerald-900 dark:text-muted font-medium animate-fade-in-up" 
            style={{ 
              animationDelay: '0.2s',
              marginTop: '1.5rem',
              color: '#ffffff',
              fontSize: '1.125rem',
              fontWeight: 500,
            }}
          >
            טוען...
          </p>
          <p 
            className="mt-4 text-sm text-emerald-800/70 dark:text-muted/70 animate-fade-in-up" 
            style={{ 
              animationDelay: '0.4s',
              marginTop: '1rem',
              color: '#a1a1aa',
              fontSize: '0.875rem',
            }}
          >
            אם המסך לא נטען תוך 10 שניות, יוצג מסך התחברות
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[AppContent] Rendering login form, authMode:', authMode);
    return authMode === 'login' ? (
      <LoginForm onToggleMode={() => setAuthMode('register')} />
    ) : (
      <RegisterForm onToggleMode={() => setAuthMode('login')} />
    );
  }

  if (userType === 'trainee') {
    return (
      <ComponentErrorBoundary componentName="אפליקציית מתאמן">
        <Suspense
          fallback={
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
              <LoadingSpinner size="lg" variant="ring" text="טוען אפליקציה..." />
            </div>
          }
        >
          <TraineeApp />
        </Suspense>
      </ComponentErrorBoundary>
    );
  }

  return (
    <ComponentErrorBoundary componentName="אפליקציית מאמן">
      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <TrainerApp isTablet={isTablet} />
      </Suspense>
    </ComponentErrorBoundary>
  );
}

export default function App() {
  // Check for TV test mode via URL parameter (?tv=test)
  const tvParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tv') : null;
  const isTvTest = tvParam === 'test';
  
  // Show simple TV test page to verify browser works
  if (isTvTest) {
    return <TvTestPage />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <SkipLinks />
          {/* Aria live region for announcements */}
          <div 
            id="aria-live-announcements" 
            aria-live="polite" 
            aria-atomic="true" 
            className="sr-only"
          />
          {/* Aria live region for errors */}
          <div 
            id="aria-live-errors" 
            aria-live="assertive" 
            aria-atomic="true" 
            className="sr-only"
          />
          <Toaster
            position="top-center"
            toastOptions={{
              className: 'glass-card',
              style: {
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              },
            }}
          />
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
