import { Users, Target, Sparkles, Activity, AlertCircle } from 'lucide-react';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import RecentScaleReadings from './RecentScaleReadings';
import WeightAlerts from '../Measurements/WeightAlerts';
import TodayTraineesSection from './TodayTraineesSection';
import { IdentifiedReading } from '../../../hooks/useGlobalScaleListener';
import { ScaleReading } from '../../../hooks/useScaleListener';
import { useAuth } from '../../../contexts/AuthContext';
import { memo, useMemo, useCallback } from 'react';
import { useDashboardStatsQuery } from '../../../hooks/queries/useDashboardQueries';
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
  onNewPreparedWorkout?: (trainee: Trainee, scheduledWorkoutId?: string) => void;
  onViewWorkoutPlan?: (trainee: Trainee) => void;
  onViewMealPlan?: (trainee: Trainee) => void;
}

export default memo(function Dashboard({
  onViewChange,
  trainees,
  trainerName,
  scaleReadings = [],
  isScaleListening = false,
  onTraineeClick,
  onSaveMeasurement,
  onNewWorkout,
  onNewPreparedWorkout,
  onViewWorkoutPlan,
  onViewMealPlan
}: DashboardProps) {
  const { user } = useAuth();
  const traineeIds = useMemo(() => trainees.map(t => t.id), [trainees]);
  const { data: stats } = useDashboardStatsQuery(user?.id ?? null, traineeIds);
  const todayWorkouts = stats?.todayWorkouts ?? 0;
  const recentMeasurements = stats?.recentMeasurements ?? 0;

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'add-trainee':
        onViewChange('add-trainee');
        break;
      case 'view-trainees':
        onViewChange('trainees');
        break;
    }
  }, [onViewChange]);

  const handleTraineeClickAdapter = useCallback((trainee: Trainee) => {
    onTraineeClick?.(trainee.id);
  }, [onTraineeClick]);

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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                {trainerName ? `שלום, ${trainerName}` : 'שלום'}
              </h1>
              <p className="text-gray-600">
                התחל לנהל את הסטודיו שלך
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-surface/50 rounded-xl border border-border/10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>
        </div>

        <div className="premium-card-static p-8 md:p-10 text-center border border-primary/20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">התחל עכשיו!</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
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
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-primary/15 via-emerald-700/8 to-transparent 
                        rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-emerald-700/10 via-primary/5 to-transparent 
                        rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-700/20 
                            border border-primary/20 shadow-lg shadow-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-xs md:text-sm font-bold text-primary uppercase tracking-widest">
                  {getGreeting()}
                </span>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mt-1">
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
              <span className="text-sm font-semibold text-gray-900">
                {new Date().toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            
            {/* Enhanced Quick Stats */}
            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/15 to-emerald-700/10 
                            border border-primary/20 hover:border-primary/30 transition-all duration-300 hover:scale-105
                            shadow-sm">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-base font-extrabold text-gray-900">{trainees.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-info/15 to-blue-500/10
                            border border-info/20 hover:border-info/30 transition-all duration-300 hover:scale-105
                            shadow-sm">
                <Activity className="w-4 h-4 text-info" />
                <span className="text-base font-extrabold text-gray-900">{todayWorkouts}</span>
              </div>
            </div>

            {/* Studio TV mode button */}
            <button
              type="button"
              onClick={() => onViewChange('studio-tv')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 text-black font-semibold text-sm shadow-lg shadow-emerald-700/30 hover:shadow-emerald-500/50 hover:scale-[1.03] active:scale-[0.99] transition-all"
            >
              <span>מצב טלוויזיה לסטודיו</span>
            </button>
          </div>
        </div>
      </div>

      {/* Today's Trainees Section - MAIN FEATURE - Prominent */}
      {onNewWorkout && onViewWorkoutPlan && onViewMealPlan ? (
        <TodayTraineesSection
          trainees={trainees}
          onNewWorkout={onNewWorkout}
          onNewPreparedWorkout={onNewPreparedWorkout}
          onViewWorkoutPlan={onViewWorkoutPlan}
          onViewMealPlan={onViewMealPlan}
          onTraineeClick={onTraineeClick ? handleTraineeClickAdapter : undefined}
        />
      ) : (
        <div className="premium-card-static p-8 md:p-10 text-center border border-primary/20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">מתאמנים של היום</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
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
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-success" />
            סטטיסטיקות מהירות
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
              <span className="text-xs text-gray-600">מדידות (7 ימים)</span>
              <span className="text-sm font-bold text-gray-900">{recentMeasurements}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
              <span className="text-xs text-gray-600">קריאות מאזניים</span>
              <span className="text-sm font-bold text-gray-900">{scaleReadings.length}</span>
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
});
