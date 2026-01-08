import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Home, Dumbbell, Scale, LogOut, ClipboardList, Calendar, Brain, Utensils, Activity, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import TraineeDashboard from './TraineeDashboard';
import MyMeasurements from './MyMeasurements';
import WorkoutHistory from './WorkoutHistory';
import MyMealPlan from './MyMealPlan';
import MyWorkoutPlan from './MyWorkoutPlan';
import MyMentalTools from './MyMentalTools';
import FoodDiary from './FoodDiary';
import SelfWorkoutSession from './SelfWorkoutSession';
import MyCardio from './MyCardio';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-glow animate-pulse">
          <Activity className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  const getFirstName = (fullName: string) => fullName.split(' ')[0];

  return (
    <div className="min-h-screen bg-zinc-950" dir="rtl">
      <header className="sticky top-0 z-30 glass-card rounded-none border-x-0 border-t-0 px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-lg">
                {trainee?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                שלום, {getFirstName(trainee?.full_name || '')}
              </h1>
              <p className="text-xs text-zinc-500">בואו נתחיל לאמן!</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="p-2.5 text-zinc-400 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all border border-zinc-800 hover:border-red-500/30"
            title="התנתק"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
        <div className="glass-card px-2 py-3 rounded-2xl shadow-dark-lg border border-zinc-800/80">
          <div className="flex items-center justify-around relative">
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
                onClick={() => setActiveTab('self-workout')}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-glow transition-transform hover:scale-105 active:scale-95 border-4 border-zinc-900"
              >
                <Plus className="w-7 h-7 text-white" />
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

        {showMoreMenu && (
          <div className="absolute bottom-full mb-2 left-4 right-4 glass-card p-4 rounded-2xl animate-fade-in border border-zinc-700/50">
            <div className="grid grid-cols-4 gap-3">
              <MoreMenuItem
                icon={ClipboardList}
                label="תפריט"
                onClick={() => { setActiveTab('menu'); setShowMoreMenu(false); }}
                active={activeTab === 'menu'}
              />
              <MoreMenuItem
                icon={Brain}
                label="מנטלי"
                onClick={() => { setActiveTab('mental'); setShowMoreMenu(false); }}
                active={activeTab === 'mental'}
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
          </div>
        )}
      </nav>

      <div className="fixed bottom-24 left-4 z-40">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`glass-card px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
            showMoreMenu ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-zinc-400 border-zinc-700/50 hover:border-zinc-600'
          }`}
        >
          עוד...
        </button>
      </div>

      <main className="pb-32 p-4">
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
      className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
        active
          ? 'text-emerald-400'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`} />
      <span className="text-[10px] mt-1.5 font-medium">{label}</span>
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
      className={`flex flex-col items-center p-4 rounded-xl transition-all ${
        active
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent'
      }`}
    >
      <Icon className="w-5 h-5 mb-1.5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
