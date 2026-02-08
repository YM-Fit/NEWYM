import { useState, Suspense, lazy, useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
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
import { isSupabaseConfigured } from './lib/supabase';

import './utils/supabaseDebug';

const TrainerApp = lazy(() => import('./components/trainer/TrainerApp'));
const TraineeApp = lazy(() => import('./components/trainee/TraineeApp'));

function TvTestPage() {
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
      backgroundColor: '#f0f5ed',
      color: '#000000',
      fontFamily: 'Arial, sans-serif',
      padding: '40px',
      overflow: 'auto',
      direction: 'rtl',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '48px',
          marginBottom: '20px',
          color: '#4a6b2a',
          textAlign: 'center',
        }}>
          הדפדפן עובד!
        </h1>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '2px solid #4a6b2a',
        }}>
          <h2 style={{ fontSize: '32px', marginBottom: '16px', color: '#4a6b2a' }}>
            שעת טעינה
          </h2>
          <p style={{ fontSize: '64px', fontWeight: 'bold', textAlign: 'center' }}>
            {timeStr}
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#4a6b2a' }}>
            מידע על הדפדפן
          </h2>
          <div style={{ fontSize: '18px', lineHeight: '2' }}>
            <p><strong>גודל מסך:</strong> {browserInfo.screen}</p>
            <p><strong>שפה:</strong> {browserInfo.language}</p>
            <p><strong>Cookies:</strong> {browserInfo.cookiesEnabled ? 'פעיל' : 'כבוי'}</p>
            <p><strong>LocalStorage:</strong> {browserInfo.localStorage ? 'זמין' : 'לא זמין'}</p>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#b45309' }}>
            User Agent
          </h2>
          <p style={{
            fontSize: '14px',
            wordBreak: 'break-all',
            backgroundColor: '#f0f5ed',
            padding: '12px',
            borderRadius: '8px',
            direction: 'ltr',
            textAlign: 'left',
          }}>
            {browserInfo.userAgent}
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ fontSize: '20px', color: '#505050', marginBottom: '16px' }}>
            אם אתה רואה את הדף הזה, הדפדפן של הטלוויזיה עובד!
          </p>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              backgroundColor: '#4a6b2a',
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

  const debugLogRef = useRef(false);
  useEffect(() => {
    if (import.meta.env.DEV && !debugLogRef.current) {
      console.log('[AppContent] State:', { user: !!user, loading, userType, forceShowLogin });
      debugLogRef.current = true;
    }
  }, [user, loading, userType, forceShowLogin]);

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

  useEffect(() => {
    if ('indexedDB' in window) {
      initIndexedDB().catch((error) => {
        console.warn('[IndexedDB] Failed to initialize:', error);
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        const isStackBlitz = error?.message?.includes('StackBlitz') ||
                            window.location.hostname.includes('stackblitz') ||
                            window.location.hostname.includes('webcontainer');
        if (import.meta.env.DEV && !isStackBlitz) {
          console.warn('[Service Worker] Failed to register:', error);
        }
      });
    }

    trackWebVitals((metric) => {
      console.log('[Web Vitals]', metric);
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', metric.name.toLowerCase(), {
          value: Math.round(metric.value),
          metric_id: metric.timestamp,
          metric_value: metric.value,
          metric_rating: metric.rating,
        });
      }
    });

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

  if (loading && !forceShowLogin) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #f0f5ed, #ffffff, #e8f0e0)',
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
              className="absolute inset-0 rounded-full blur-xl animate-pulse-soft"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(74, 107, 42, 0.2)',
                borderRadius: '50%',
                filter: 'blur(20px)',
              }}
            />
            <div
              className="relative inline-block animate-spin rounded-full h-12 w-12 border-4 border-t"
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '3rem',
                height: '3rem',
                border: '4px solid rgba(74, 107, 42, 0.3)',
                borderTopColor: '#4a6b2a',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
          <p
            className="mt-6 font-medium animate-fade-in-up"
            style={{
              animationDelay: '0.2s',
              marginTop: '1.5rem',
              color: '#1a2e16',
              fontSize: '1.125rem',
              fontWeight: 500,
            }}
          >
            טוען...
          </p>
          <p
            className="mt-4 text-sm animate-fade-in-up"
            style={{
              animationDelay: '0.4s',
              marginTop: '1rem',
              color: '#1a2e16',
              opacity: 0.5,
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
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
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
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
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
  const tvParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tv') : null;
  const isTvTest = tvParam === 'test';

  if (isTvTest) {
    return <TvTestPage />;
  }

  if (!isSupabaseConfigured) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #f0f5ed, #ffffff, #e8f0e0)',
        direction: 'rtl',
        fontFamily: 'Arial, sans-serif',
        padding: '2rem',
      }}>
        <div style={{
          maxWidth: '500px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        }}>
          <h1 style={{ fontSize: '1.5rem', color: '#b91c1c', marginBottom: '1rem' }}>
            שגיאת הגדרות
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#374151', marginBottom: '1rem' }}>
            חסרים משתני סביבה של Supabase.
          </p>
          <p style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            יש ליצור קובץ <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>.env</code> בתיקיית הפרויקט עם המשתנים הבאים:
          </p>
          <pre style={{
            background: '#1f2937',
            color: '#e5e7eb',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'left',
            direction: 'ltr',
            fontSize: '0.85rem',
            overflow: 'auto',
          }}>
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              background: '#4a6b2a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            רענן דף
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SkipLinks />
          <div
            id="aria-live-announcements"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          />
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
                background: 'rgb(var(--color-bg-elevated))',
                color: 'rgb(var(--color-text-primary))',
                border: '1px solid rgb(var(--color-border) / 0.1)',
              },
            }}
          />
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
