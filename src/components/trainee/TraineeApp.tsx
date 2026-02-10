import { useState, Suspense, lazy } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTraineeQuery } from '../../hooks/queries/useTraineeQueries';
import { Home, Dumbbell, Scale, LogOut, ClipboardList, Calendar, Brain, Utensils, Activity, Plus, Sun, Moon } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import Logo from '../common/Logo';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const TraineeDashboard = lazy(() => import('./TraineeDashboard'));
const MyMeasurements = lazy(() => import('./MyMeasurements'));
const WorkoutHistory = lazy(() => import('./WorkoutHistory'));
const MyMealPlan = lazy(() => import('./MyMealPlan'));
const MyMentalTools = lazy(() => import('./MyMentalTools'));
const FoodDiary = lazy(() => import('./FoodDiary'));
const SelfWorkoutSession = lazy(() => import('./SelfWorkoutSession'));
const MyCardio = lazy(() => import('./MyCardio'));
const MyWorkoutPlan = lazyWithRetry(() => import('./MyWorkoutPlan'), 3);

export default function TraineeApp() {
  const { signOut, traineeId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: trainee, isLoading: loading } = useTraineeQuery(traineeId ?? null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcut('k', () => {
    if (activeTab === 'dashboard') {
      setActiveTab('self-workout');
    }
  }, { ctrlKey: true });

  useKeyboardShortcut('h', () => {
    setActiveTab('dashboard');
  }, { ctrlKey: true });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark transition-colors duration-300">
        <LoadingSpinner size="xl" text="טוען נתונים..." />
      </div>
    );
  }

  const getFirstName = (fullName: string) => fullName.split(' ')[0];

  return (
    <div className="min-h-screen bg-gradient-dark transition-colors duration-300" dir="rtl">
      <header 
        role="banner"
        className="sticky top-0 z-30 glass-card rounded-none border-x-0 border-t-0 px-4 py-3 md:py-4"
      >
        <div className="mx-auto max-w-5xl flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <Logo 
              size="md" 
              className="drop-shadow-[0_2px_8px_rgba(74,107,42,0.2)]"
              animated={true}
            />
            <div>
              <h1 className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">
                שלום, {getFirstName(trainee?.full_name || '')}
              </h1>
              <p className="text-[11px] md:text-xs text-[var(--color-text-muted)]">
                הגוף שלך בתהליך, נשמור על רצף והתקדמות.
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-amber-400 hover:bg-amber-500/10 transition-all border border-[var(--color-border)] hover:border-amber-500/30"
            title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
            aria-label={theme === 'dark' ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={signOut}
            className="p-2.5 text-[var(--color-text-secondary)] hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all border border-[var(--color-border)] hover:border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            title="התנתק"
            aria-label="התנתק"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav 
        id="main-navigation"
        className="fixed bottom-0 left-0 right-0 z-50 px-3 md:px-4 pb-4 safe-bottom"
        role="navigation"
        aria-label="ניווט ראשי"
      >
        <div className="mx-auto max-w-3xl relative">
          {showMoreMenu && (
            <div 
              className="absolute bottom-full mb-2 left-4 right-4 glass-card p-4 rounded-2xl animate-fade-in border border-[var(--color-border)] shadow-dark-lg z-10"
              role="menu"
              aria-label="תפריט נוסף"
            >
              <div className="mb-3 pb-3 border-b border-[var(--color-border)]">
                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">
                  תזונה ובריאות
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <MoreMenuItem
                  icon={ClipboardList}
                  label="תפריט"
                  onClick={() => { setActiveTab('menu'); setShowMoreMenu(false); }}
                  active={activeTab === 'menu'}
                />
                <MoreMenuItem
                  icon={Utensils}
                  label="יומן אוכל"
                  onClick={() => { setActiveTab('diary'); setShowMoreMenu(false); }}
                  active={activeTab === 'diary'}
                />
                <MoreMenuItem
                  icon={Activity}
                  label="אירובי"
                  onClick={() => { setActiveTab('cardio'); setShowMoreMenu(false); }}
                  active={activeTab === 'cardio'}
                />
              </div>
              
              <div className="mb-3 pb-3 border-b border-[var(--color-border)]">
                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">
                  התפתחות אישית
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <MoreMenuItem
                  icon={Brain}
                  label="מנטלי"
                  onClick={() => { setActiveTab('mental'); setShowMoreMenu(false); }}
                  active={activeTab === 'mental'}
                />
              </div>
            </div>
          )}

          <div className="glass-card px-2 py-2.5 rounded-2xl shadow-lg border border-[var(--color-border)] backdrop-blur-xl">
            <div className="flex items-center justify-around gap-1 relative">
              <TabButton
                icon={Home}
                label="בית"
                active={activeTab === 'dashboard'}
                onClick={() => { setActiveTab('dashboard'); setShowMoreMenu(false); }}
              />
              <TabButton
                icon={Calendar}
                label="תוכנית"
                active={activeTab === 'workout-plan'}
                onClick={() => { setActiveTab('workout-plan'); setShowMoreMenu(false); }}
              />

              <div className="relative -mt-8 sm:-mt-10">
                <button
                  onClick={() => { setActiveTab('self-workout'); setShowMoreMenu(false); }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 flex items-center justify-center shadow-glow transition-transform hover:scale-105 active:scale-95 border-4 border-[var(--color-bg-base)] focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  aria-label="התחל אימון חדש"
                  title="אימון חדש"
                >
                  <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" aria-hidden="true" />
                </button>
              </div>

              <TabButton
                icon={Scale}
                label="מדידות"
                active={activeTab === 'measurements'}
                onClick={() => { setActiveTab('measurements'); setShowMoreMenu(false); }}
              />
              <TabButton
                icon={Dumbbell}
                label="אימונים"
                active={activeTab === 'workouts'}
                onClick={() => { setActiveTab('workouts'); setShowMoreMenu(false); }}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="fixed bottom-[104px] left-3 sm:left-4 z-40">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`glass-card px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all border shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 active:scale-95 min-h-[44px] ${
            showMoreMenu ? 'text-primary-400 border-primary-500/30 bg-primary-500/10 shadow-primary-500/20' : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary-500/30 hover:text-primary-400'
          }`}
          aria-label={showMoreMenu ? 'סגור תפריט נוסף' : 'פתח תפריט נוסף'}
          aria-expanded={showMoreMenu}
          aria-haspopup="true"
        >
          {showMoreMenu ? 'סגור' : 'עוד...'}
        </button>
      </div>

      <main
        id="main-content"
        className="pb-36 px-3 sm:px-4 pt-3 sm:pt-4"
        role="main"
        aria-label="תוכן ראשי"
      >
        <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
        <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
        {activeTab === 'dashboard' && <TraineeDashboard traineeId={traineeId} traineeName={trainee?.full_name || ''} />}
        {activeTab === 'workout-plan' && <MyWorkoutPlan traineeId={traineeId} />}
        {activeTab === 'workouts' && <WorkoutHistory traineeId={traineeId} traineeName={trainee?.full_name} trainerId={trainee?.trainer_id} />}
        {activeTab === 'measurements' && <MyMeasurements traineeId={traineeId} trainerId={trainee?.trainer_id} traineeName={trainee?.full_name} />}
        {activeTab === 'menu' && <MyMealPlan traineeId={traineeId} />}
        {activeTab === 'mental' && <MyMentalTools traineeId={traineeId} />}
        {activeTab === 'diary' && <FoodDiary traineeId={traineeId} />}
        {activeTab === 'cardio' && <MyCardio traineeId={traineeId} />}
        {activeTab === 'self-workout' && trainee && (
          <SelfWorkoutSession
            traineeId={trainee.id}
            trainerId={trainee.trainer_id}
            traineeName={trainee.full_name}
            onBack={() => setActiveTab('dashboard')}
            onSave={() => setActiveTab('workouts')}
          />
        )}
        </Suspense>
        </div>
      </main>
    </div>
  );
}

interface TabButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabButton({ icon: Icon, label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center min-w-[52px] min-h-[48px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${
        active
          ? 'text-primary-400'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
      }`}
    >
      {active && (
        <span className="absolute inset-x-1 bottom-0 h-7 -z-10 rounded-2xl bg-primary-500/10 border border-primary-500/30 shadow-glow-sm" />
      )}
      <Icon className={`w-5 h-5 ${active ? 'drop-shadow-[0_0_8px_rgb(var(--color-primary)_/_0.6)]' : ''}`} />
      <span className="text-[10px] mt-1.5 font-medium tracking-wide">{label}</span>
    </button>
  );
}

interface MoreMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}

function MoreMenuItem({ icon: Icon, label, active, onClick }: MoreMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-3.5 rounded-xl transition-all ${
        active
          ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30 shadow-glow-sm'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-bg-hover)] hover:text-[var(--color-text-primary)] border border-transparent hover:border-primary-500/20'
      }`}
    >
      <Icon className={`w-5 h-5 mb-1.5 ${active ? 'drop-shadow-[0_0_8px_rgb(var(--color-primary)_/_0.5)]' : ''}`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
