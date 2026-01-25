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

function AppContent() {
  const { user, loading, userType } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log('[AppContent] State:', { user: !!user, loading, userType });
  }, [user, loading, userType]);

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
        console.warn('[Service Worker] Failed to register:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
        <div className="text-center animate-fade-in max-w-md px-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-700/20 rounded-full blur-xl animate-pulse-soft" />
            <div className="relative inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-700/30 border-t-emerald-600"></div>
          </div>
          <p className="mt-6 text-emerald-900 dark:text-muted font-medium animate-fade-in-up" style={{ animationDelay: '0.2s' }}>טוען...</p>
          <p className="mt-4 text-sm text-emerald-800/70 dark:text-muted/70 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            אם המסך לא נטען תוך 10 שניות, יוצג מסך התחברות
          </p>
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
