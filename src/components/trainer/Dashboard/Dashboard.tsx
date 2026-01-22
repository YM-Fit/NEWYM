import { Users, Target, Sparkles, Activity, AlertCircle } from 'lucide-react';
import StatsCard from './StatsCard';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import RecentScaleReadings from './RecentScaleReadings';
import WeightAlerts from '../Measurements/WeightAlerts';
import TodayTraineesSection from './TodayTraineesSection';
import { IdentifiedReading } from '../../../hooks/useGlobalScaleListener';
import { ScaleReading } from '../../../hooks/useScaleListener';
import { useAuth } from '../../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import { Trainee } from '../../../types';

interface DashboardProps {
  onViewChange: (view: string) => void;
  trainees: Trainee[];
  trainerName?: string;
  onToggleSidebar?: () => void;
  onToggleHeader?: () => void;
  scaleReadings?: IdentifiedReading[];
  isScaleListening?: boolean;
  onTraineeClick?: (traineeId: string) => void;
  onSaveMeasurement?: (traineeId: string, traineeName: string, reading: ScaleReading) => Promise<boolean>;
  onNewWorkout?: (trainee: Trainee) => void;
  onViewWorkoutPlan?: (trainee: Trainee) => void;
  onViewMealPlan?: (trainee: Trainee) => void;
}

export default function Dashboard({
  onViewChange,
  trainees,
  trainerName,
  scaleReadings = [],
  isScaleListening = false,
  onTraineeClick,
  onSaveMeasurement,
  onNewWorkout,
  onViewWorkoutPlan,
  onViewMealPlan
}: DashboardProps) {
  const { user } = useAuth();
  const [todayWorkouts, setTodayWorkouts] = useState(0);
  const [recentMeasurements, setRecentMeasurements] = useState(0);

  useEffect(() => {
    if (user && trainees.length > 0) {
      loadTodayStats();
    }
  }, [user, trainees]);

  const loadTodayStats = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const traineeIds = trainees.map(t => t.id);

      if (traineeIds.length === 0) {
        setTodayWorkouts(0);
        setRecentMeasurements(0);
        return;
      }

      // Count today's workouts
      const { data: workoutTrainees } = await supabase
        .from('workout_trainees')
        .select('workout_id')
        .in('trainee_id', traineeIds);

      const workoutIds = workoutTrainees?.map(wt => wt.workout_id) || [];
      
      if (workoutIds.length > 0) {
        const { count: workoutsCount } = await supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .in('id', workoutIds)
          .eq('workout_date', today);
        
        setTodayWorkouts(workoutsCount || 0);
      } else {
        setTodayWorkouts(0);
      }

      // Count recent measurements (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: measurementsCount } = await supabase
        .from('measurements')
        .select('*', { count: 'exact', head: true })
        .in('trainee_id', traineeIds)
        .gte('measurement_date', sevenDaysAgo.toISOString().split('T')[0]);

      setRecentMeasurements(measurementsCount || 0);
    } catch (error) {
      logger.error('Error loading stats:', error, 'Dashboard');
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-trainee':
        onViewChange('add-trainee');
        break;
      case 'view-trainees':
        onViewChange('trainees');
        break;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'בוקר טוב';
    if (hour < 17) return 'צהריים טובים';
    if (hour < 21) return 'ערב טוב';
    return 'לילה טוב';
  };

  if (trainees.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="premium-card-static p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-right">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {getGreeting()}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
                {trainerName ? `שלום, ${trainerName}` : 'שלום'}
              </h1>
              <p className="text-secondary">
                התחל לנהל את הסטודיו שלך
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-surface/50 rounded-xl border border-border/10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-secondary">
                {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>
        </div>

        <div className="premium-card-static p-8 md:p-10 text-center border border-primary/20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3">התחל עכשיו!</h3>
          <p className="text-secondary mb-6 max-w-md mx-auto">
            הוסף את המתאמן הראשון שלך כדי להתחיל לעבוד עם המערכת
          </p>
          <button
            onClick={() => onViewChange('add-trainee')}
            className="btn-primary px-8 py-3.5 rounded-xl font-semibold"
          >
            הוסף מתאמן ראשון
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-10 animate-fade-in">
      {/* Enhanced Header Section */}
      <div className="premium-card-static p-5 md:p-6 lg:p-7 relative overflow-hidden
                      border border-primary/10 hover:border-primary/20 transition-all duration-500">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-primary/15 via-emerald-500/8 to-transparent 
                        rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-emerald-500/10 via-primary/5 to-transparent 
                        rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/20 
                            border border-primary/20 shadow-lg shadow-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-xs md:text-sm font-bold text-primary uppercase tracking-widest">
                  {getGreeting()}
                </span>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight mt-1
                             bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                  {trainerName ? `שלום, ${trainerName}` : 'שלום'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-surface/60 to-surface/40 
                          rounded-xl border-2 border-border/20 hover:border-primary/30
                          transition-all duration-300 hover:scale-105 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
              <span className="text-sm font-semibold text-foreground">
                {new Date().toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            
            {/* Enhanced Quick Stats */}
            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/15 to-emerald-500/10 
                            border border-primary/20 hover:border-primary/30 transition-all duration-300 hover:scale-105
                            shadow-sm">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-base font-extrabold text-foreground">{trainees.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-info/15 to-cyan-500/10 
                            border border-info/20 hover:border-info/30 transition-all duration-300 hover:scale-105
                            shadow-sm">
                <Activity className="w-4 h-4 text-info" />
                <span className="text-base font-extrabold text-foreground">{todayWorkouts}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Trainees Section - MAIN FEATURE - Prominent */}
      {onNewWorkout && onViewWorkoutPlan && onViewMealPlan ? (
        <TodayTraineesSection
          trainees={trainees}
          onNewWorkout={onNewWorkout}
          onViewWorkoutPlan={onViewWorkoutPlan}
          onViewMealPlan={onViewMealPlan}
        />
      ) : (
        <div className="premium-card-static p-8 md:p-10 text-center border border-primary/20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3">מתאמנים של היום</h3>
          <p className="text-secondary mb-6 max-w-md mx-auto">
            אין אימונים מתוזמנים להיום
          </p>
        </div>
      )}

      {/* Secondary Sections - Below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Alerts */}
        {user && (
          <WeightAlerts
            trainerId={user.id}
            onTraineeClick={onTraineeClick}
          />
        )}
        
        {/* Scale Readings */}
        <RecentScaleReadings
          readings={scaleReadings}
          isListening={isScaleListening}
          onTraineeClick={onTraineeClick}
          onSaveMeasurement={onSaveMeasurement}
        />
      </div>

      {/* Stats and Activity - Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Stats Cards */}
        <div className="premium-card-static p-4 md:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-success" />
            סטטיסטיקות מהירות
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
              <span className="text-xs text-secondary">מדידות (7 ימים)</span>
              <span className="text-sm font-bold text-foreground">{recentMeasurements}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
              <span className="text-xs text-secondary">קריאות מאזניים</span>
              <span className="text-sm font-bold text-foreground">{scaleReadings.length}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>

      {/* Quick Actions - Bottom */}
      <div>
        <QuickActions onAction={handleQuickAction} />
      </div>

    </div>
  );
}
