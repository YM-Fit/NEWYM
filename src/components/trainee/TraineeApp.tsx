import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Home, Dumbbell, Scale, LogOut, ClipboardList, Calendar, Brain, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import TraineeDashboard from './TraineeDashboard';
import MyMeasurements from './MyMeasurements';
import WorkoutHistory from './WorkoutHistory';
import MyMealPlan from './MyMealPlan';
import MyWorkoutPlan from './MyWorkoutPlan';
import MyMentalTools from './MyMentalTools';
import FoodDiary from './FoodDiary';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            שלום, {trainee?.full_name}
          </h1>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <LogOut className="w-5 h-5" />
            התנתק
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="flex justify-around py-2">
          <TabButton icon={Home} label="בית" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <TabButton icon={Calendar} label="תוכנית" active={activeTab === 'workout-plan'} onClick={() => setActiveTab('workout-plan')} />
          <TabButton icon={Dumbbell} label="אימונים" active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} />
          <TabButton icon={Scale} label="מדידות" active={activeTab === 'measurements'} onClick={() => setActiveTab('measurements')} />
          <TabButton icon={ClipboardList} label="תפריט" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
          <TabButton icon={Brain} label="מנטלי" active={activeTab === 'mental'} onClick={() => setActiveTab('mental')} />
          <TabButton icon={Utensils} label="יומן" active={activeTab === 'diary'} onClick={() => setActiveTab('diary')} />
        </div>
      </nav>

      <main className="pb-20 p-4">
        {activeTab === 'dashboard' && <TraineeDashboard traineeId={traineeId} traineeName={trainee?.full_name || ''} />}
        {activeTab === 'workout-plan' && <MyWorkoutPlan traineeId={traineeId} />}
        {activeTab === 'workouts' && <WorkoutHistory traineeId={traineeId} />}
        {activeTab === 'measurements' && <MyMeasurements traineeId={traineeId} trainerId={trainee?.trainer_id} traineeName={trainee?.full_name} />}
        {activeTab === 'menu' && <MyMealPlan traineeId={traineeId} />}
        {activeTab === 'mental' && <MyMentalTools traineeId={traineeId} />}
        {activeTab === 'diary' && <FoodDiary traineeId={traineeId} />}
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
      className={`flex flex-col items-center p-2 ${active ? 'text-green-600' : 'text-gray-500'}`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}
