import { useState, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ComponentErrorBoundary from './components/common/ComponentErrorBoundary';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Lazy load main app components
const TrainerApp = lazy(() => import('./components/trainer/TrainerApp'));
const TraineeApp = lazy(() => import('./components/trainee/TraineeApp'));

function AppContent() {
  const { user, loading, userType } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse-soft" />
            <div className="relative inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500/30 border-t-emerald-600"></div>
          </div>
          <p className="mt-6 text-gray-600 dark:text-zinc-400 font-medium animate-fade-in-up" style={{ animationDelay: '0.2s' }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (!user) {
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
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
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
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <TrainerApp />
      </Suspense>
    </ComponentErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
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
