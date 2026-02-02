import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Home, Dumbbell, Scale, LogOut, ClipboardList, Calendar, Brain, Utensils, Activity, Plus, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import TraineeDashboard from './TraineeDashboard';
import MyMeasurements from './MyMeasurements';
import WorkoutHistory from './WorkoutHistory';
import MyMealPlan from './MyMealPlan';
import MyMentalTools from './MyMentalTools';
import FoodDiary from './FoodDiary';
import SelfWorkoutSession from './SelfWorkoutSession';
import MyCardio from './MyCardio';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import Logo from '../common/Logo';

// Lazy load MyWorkoutPlan to avoid module loading issues
const MyWorkoutPlan = lazy(() => import('./MyWorkoutPlan'));

interface Trainee {
  id: string;
  full_name: string;
  trainer_id: string;
  trainer?: {
    full_name: string;
  };
}

export default function TraineeApp() {
  const { signOut, traineeId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    loadTraineeData();
  }, [traineeId]);

  const loadTraineeData = async () => {
    if (!traineeId) return;

    const { data, error } = await supabase
      .from('trainees')
      .select('*, trainer:trainers(full_name)')
      .eq('id', traineeId)
      .maybeSingle();

    if (error) {
      toast.error('שגיאה בטעינת נתונים');
    } else if (data) {
      setTrainee(data);
    }
    setLoading(false);
  };

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

              <div className="relative -mt-10">
                <button
                  onClick={() => { setActiveTab('self-workout'); setShowMoreMenu(false); }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 flex items-center justify-center shadow-glow transition-transform hover:scale-105 active:scale-95 border-4 border-[var(--color-bg-base)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  aria-label="התחל אימון חדש"
                  title="אימון חדש"
                >
                  <Plus className="w-7 h-7 text-foreground" aria-hidden="true" />
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

      <div className="fixed bottom-24 left-4 z-40">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`glass-card px-4 py-2.5 rounded-xl text-sm font-medium transition-all border shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            showMoreMenu ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-emerald-500/20' : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-emerald-500/30 hover:text-emerald-400'
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
        className="pb-32 px-4 pt-4"
        role="main"
        aria-label="תוכן ראשי"
      >
        <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
        {activeTab === 'dashboard' && <TraineeDashboard traineeId={traineeId} traineeName={trainee?.full_name || ''} />}
        {activeTab === 'workout-plan' && (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען תוכנית אימון..." />}>
            <MyWorkoutPlan traineeId={traineeId} />
          </Suspense>
        )}
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
      className={`relative flex flex-col items-center py-1.5 px-2.5 rounded-2xl transition-all ${
        active
          ? 'text-emerald-400'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
      }`}
    >
      {active && (
        <span className="absolute inset-x-1 bottom-0 h-6 -z-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-glow-sm" />
      )}
      <Icon className={`w-5 h-5 ${active ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`} />
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
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-glow-sm'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-bg-hover)] hover:text-[var(--color-text-primary)] border border-transparent hover:border-emerald-500/20'
      }`}
    >
      <Icon className={`w-5 h-5 mb-1.5 ${active ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
