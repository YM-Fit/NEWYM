import { useState, useEffect } from 'react';
import { Dumbbell, ClipboardList, UtensilsCrossed, Clock, Users, Calendar, AlertCircle, Scale } from 'lucide-react';
import { Trainee } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

export interface TodayTrainee {
  trainee: Trainee;
  workout: {
    id: string;
    workout_date: string;
    workout_type: string;
    is_completed: boolean;
    workout_time?: string;
    notes?: string;
  };
  daysSinceLastWorkout?: number | null;
  unseenWeightsCount?: number;
  status: 'scheduled' | 'completed' | 'upcoming';
}

interface TodayTraineesSectionProps {
  trainees: Trainee[];
  onNewWorkout: (trainee: Trainee) => void;
  onViewWorkoutPlan: (trainee: Trainee) => void;
  onViewMealPlan: (trainee: Trainee) => void;
}

// Helper function to get last workout date
const getLastWorkoutDate = async (traineeId: string): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from('workout_trainees')
      .select('workouts!inner(workout_date)')
      .eq('trainee_id', traineeId)
      .eq('workouts.is_completed', true)
      .order('workouts(workout_date)', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    return data?.workouts?.workout_date || null;
  } catch (error) {
    logger.error('Error getting last workout date:', error, 'TodayTraineesSection');
    return null;
  }
};

// Helper function to get unseen weights count
const getUnseenWeightsCount = async (traineeId: string): Promise<number> => {
  try {
    const { count } = await supabase
      .from('trainee_self_weights')
      .select('*', { count: 'exact', head: true })
      .eq('trainee_id', traineeId)
      .eq('is_seen_by_trainer', false);
      
    return count || 0;
  } catch (error) {
    logger.error('Error getting unseen weights count:', error, 'TodayTraineesSection');
    return 0;
  }
};

export default function TodayTraineesSection({
  trainees,
  onNewWorkout,
  onViewWorkoutPlan,
  onViewMealPlan
}: TodayTraineesSectionProps) {
  const [todayTrainees, setTodayTrainees] = useState<TodayTrainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trainees.length > 0) {
      loadTodayTrainees();
    } else {
      setLoading(false);
    }
  }, [trainees]);

  const loadTodayTrainees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const traineeIds = trainees.map(t => t.id);
      
      if (traineeIds.length === 0) {
        setTodayTrainees([]);
        setLoading(false);
        return;
      }

      // Query מתקדם עם כל הנתונים הנדרשים
      const { data, error: queryError } = await supabase
        .from('workout_trainees')
        .select(`
          trainee_id,
          workouts!inner(
            id,
            workout_date,
            workout_type,
            is_completed,
            notes,
            created_at
          ),
          trainees(
            id,
            full_name,
            gender,
            phone,
            email,
            google_calendar_client_id,
            is_pair,
            pair_name_1,
            pair_name_2
          )
        `)
        .in('trainee_id', traineeIds)
        .gte('workouts.workout_date', todayStr)
        .lt('workouts.workout_date', tomorrowStr)
        .order('workouts(workout_date)', { ascending: true });

      if (queryError) {
        throw queryError;
      }

      // עיבוד הנתונים עם helper functions
      const processedTrainees = await Promise.all(
        (data || []).map(async (item: any) => {
          const trainee = item.trainees;
          const workout = item.workouts;
          
          // חישוב ימים מאז אימון אחרון
          const lastWorkout = await getLastWorkoutDate(trainee.id);
          const daysSinceLastWorkout = lastWorkout 
            ? Math.floor((new Date().getTime() - new Date(lastWorkout).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          // חישוב מספר שקילות חדשות
          const unseenWeightsCount = await getUnseenWeightsCount(trainee.id);
          
          // חילוץ זמן האימון (אם workout_date הוא timestamptz)
          let workoutTime: string | undefined;
          if (workout.workout_date && workout.workout_date.includes('T')) {
            const workoutDate = new Date(workout.workout_date);
            workoutTime = workoutDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
          }
          
          // קביעת סטטוס
          const workoutDate = new Date(workout.workout_date);
          const now = new Date();
          const status = workout.is_completed 
            ? 'completed' as const
            : workoutDate > now 
              ? 'upcoming' as const
              : 'scheduled' as const;
          
          return {
            trainee: trainee as Trainee,
            workout: {
              id: workout.id,
              workout_date: workout.workout_date,
              workout_type: workout.workout_type,
              is_completed: workout.is_completed,
              workout_time: workoutTime,
              notes: workout.notes
            },
            daysSinceLastWorkout,
            unseenWeightsCount,
            status
          };
        })
      );
      
      setTodayTrainees(processedTrainees);
    } catch (err: any) {
      logger.error('Error loading today trainees:', err, 'TodayTraineesSection');
      setError('שגיאה בטעינת המתאמנים של היום');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="premium-card-static p-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="טוען מתאמנים של היום..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-card-static p-6 border border-danger/30">
        <div className="flex items-center gap-3 text-danger">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (todayTrainees.length === 0) {
    return (
      <div className="premium-card-static p-8 md:p-10 text-center border border-primary/20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">אין אימונים מתוזמנים להיום</h3>
        <p className="text-secondary mb-6 max-w-md mx-auto">
          אין מתאמנים עם אימון מתוזמן להיום. תוכל להוסיף אימון חדש מהרשימה הכללית.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">מתאמנים של היום</h2>
        </div>
        <span className="text-sm text-secondary bg-surface/50 px-3 py-1 rounded-lg">
          {todayTrainees.length} מתאמנים
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {todayTrainees.map((item, index) => (
          <TraineeCardToday
            key={`${item.trainee.id}-${item.workout.id}`}
            todayTrainee={item}
            index={index}
            onNewWorkout={onNewWorkout}
            onViewWorkoutPlan={onViewWorkoutPlan}
            onViewMealPlan={onViewMealPlan}
          />
        ))}
      </div>
    </div>
  );
}

interface TraineeCardTodayProps {
  todayTrainee: TodayTrainee;
  index: number;
  onNewWorkout: (trainee: Trainee) => void;
  onViewWorkoutPlan: (trainee: Trainee) => void;
  onViewMealPlan: (trainee: Trainee) => void;
}

function TraineeCardToday({
  todayTrainee,
  index,
  onNewWorkout,
  onViewWorkoutPlan,
  onViewMealPlan
}: TraineeCardTodayProps) {
  const { trainee, workout, status, daysSinceLastWorkout, unseenWeightsCount } = todayTrainee;
  const isActive = daysSinceLastWorkout !== null && daysSinceLastWorkout <= 7;

  return (
    <div
      className="premium-card p-4 sm:p-5 md:p-6 relative overflow-hidden group 
                  hover:scale-[1.02] transition-all duration-300
                  animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
      role="article"
      aria-label={`כרטיס מתאמן ${trainee.full_name}`}
    >
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        status === 'completed' ? 'bg-success' :
        status === 'scheduled' ? 'bg-primary' :
        'bg-warning'
      }`} />

      {/* Gradient overlay */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 
                      transition-opacity duration-300 bg-gradient-to-br ${
        status === 'completed' ? 'from-success/10 to-transparent' :
        status === 'scheduled' ? 'from-primary/10 to-transparent' :
        'from-warning/10 to-transparent'
      }`} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br 
                             from-primary/20 to-primary-dark/10 
                             flex items-center justify-center
                             group-hover:from-primary/30 group-hover:to-primary-dark/20
                             transition-all duration-300 shadow-lg">
                {trainee.is_pair ? (
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary" />
                ) : (
                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
                    {trainee.full_name.charAt(0)}
                  </span>
                )}
              </div>
              {unseenWeightsCount && unseenWeightsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 
                               bg-info rounded-full flex items-center justify-center 
                               text-xs font-bold text-white border-2 border-elevated 
                               animate-pulse">
                  {unseenWeightsCount}
                </span>
              )}
            </div>

            {/* Name & Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-foreground mb-1.5 sm:mb-2 truncate">
                {trainee.full_name}
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs font-semibold ${
                  status === 'completed' 
                    ? 'bg-success/20 text-success border border-success/30' :
                  status === 'scheduled'
                    ? 'bg-primary/20 text-primary border border-primary/30' :
                    'bg-warning/20 text-warning border border-warning/30'
                }`}>
                  {status === 'completed' ? 'הושלם' :
                   status === 'scheduled' ? 'מתוזמן' :
                   'מתקרב'}
                </span>
                {workout.workout_time && (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-secondary">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{workout.workout_time}</span>
                  </div>
                )}
                {daysSinceLastWorkout !== null && (
                  <div className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg ${
                    isActive
                      ? 'bg-success/15 text-success'
                      : 'bg-danger/15 text-danger'
                  }`}>
                    {daysSinceLastWorkout} ימים
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* אימון חדש */}
          <button
            onClick={() => onNewWorkout(trainee)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNewWorkout(trainee);
              }
            }}
            className="btn-primary p-3 sm:p-4 rounded-lg sm:rounded-xl flex flex-col items-center gap-1.5 sm:gap-2
                       hover:scale-105 active:scale-95 transition-all duration-200
                       shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/60
                       focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2"
            aria-label={`הוסף אימון חדש ל${trainee.full_name}`}
          >
            <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold">אימון חדש</span>
          </button>

          {/* תוכנית אימון */}
          <button
            onClick={() => onViewWorkoutPlan(trainee)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onViewWorkoutPlan(trainee);
              }
            }}
            className="bg-surface/50 hover:bg-surface border border-border/10 
                       hover:border-primary/30 p-3 sm:p-4 rounded-lg sm:rounded-xl flex flex-col items-center gap-1.5 sm:gap-2
                       transition-all duration-200 hover:scale-105 active:scale-95
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            aria-label={`צפה בתוכנית אימון של ${trainee.full_name}`}
          >
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold text-foreground">תוכנית</span>
          </button>

          {/* תפריט */}
          <button
            onClick={() => onViewMealPlan(trainee)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onViewMealPlan(trainee);
              }
            }}
            className="bg-surface/50 hover:bg-surface border border-border/10 
                       hover:border-primary/30 p-3 sm:p-4 rounded-lg sm:rounded-xl flex flex-col items-center gap-1.5 sm:gap-2
                       transition-all duration-200 hover:scale-105 active:scale-95
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            aria-label={`צפה בתפריט של ${trainee.full_name}`}
          >
            <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold text-foreground">תפריט</span>
          </button>
        </div>
      </div>
    </div>
  );
}
