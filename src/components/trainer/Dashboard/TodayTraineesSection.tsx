import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dumbbell, ClipboardList, UtensilsCrossed, Clock, Users, Calendar, AlertCircle, Scale, CalendarDays, CalendarCheck } from 'lucide-react';
import { Trainee } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { getScheduledWorkoutsForTodayAndTomorrow } from '../../../api/workoutApi';
import { useAuth } from '../../../contexts/AuthContext';

export interface TodayTrainee {
  trainee: Trainee;
  workout: {
    id: string;
    workout_date: string;
    workout_type: string;
    is_completed: boolean;
    workout_time?: string;
    notes?: string;
    isFromGoogle?: boolean;
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
      .order('workouts.workout_date', { ascending: false })
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
  const { user } = useAuth();
  const [todayTrainees, setTodayTrainees] = useState<TodayTrainee[]>([]);
  const [tomorrowTrainees, setTomorrowTrainees] = useState<TodayTrainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const lastTraineeIdsRef = useRef<string>('');

  // Create a stable dependency based on trainee IDs
  const traineeIdsString = useMemo(() => {
    return trainees.map(t => t.id).sort().join(',');
  }, [trainees]);

  const loadTodayTrainees = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const traineeIds = trainees.map(t => t.id);
      
      if (traineeIds.length === 0) {
        setTodayTrainees([]);
        setTomorrowTrainees([]);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Get trainer_id from the first trainee (all trainees belong to the same trainer)
      const trainerId = trainees[0]?.trainer_id || user.id;
      if (!trainerId) {
        setTodayTrainees([]);
        setTomorrowTrainees([]);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Use the new unified API function
      let result;
      try {
        result = await getScheduledWorkoutsForTodayAndTomorrow(trainerId, traineeIds);
      } catch (err) {
        // Catch any unexpected errors and log them
        logger.debug('Unexpected error loading scheduled workouts:', err, 'TodayTraineesSection');
        setTodayTrainees([]);
        setTomorrowTrainees([]);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      
      if (result.error) {
        logger.debug('Error loading scheduled workouts:', result.error, 'TodayTraineesSection');
        setTodayTrainees([]);
        setTomorrowTrainees([]);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      if (!result.data) {
        setTodayTrainees([]);
        setTomorrowTrainees([]);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Process today's workouts
      const processedToday = await Promise.all(
        result.data.today.map(async (item) => {
          try {
            const trainee = item.trainee;
            const workout = item.workout;
            
            if (!trainee || !workout) {
              return null;
            }
            
            // חישוב ימים מאז אימון אחרון
            let lastWorkout: string | null = null;
            let daysSinceLastWorkout: number | null = null;
            try {
              lastWorkout = await getLastWorkoutDate(trainee.id);
              daysSinceLastWorkout = lastWorkout 
                ? Math.floor((new Date().getTime() - new Date(lastWorkout).getTime()) / (1000 * 60 * 60 * 24))
                : null;
            } catch (err) {
              // If getting last workout fails, continue without it
              logger.debug('Error getting last workout date:', err, 'TodayTraineesSection');
            }
            
            // חישוב מספר שקילות חדשות
            let unseenWeightsCount = 0;
            try {
              unseenWeightsCount = await getUnseenWeightsCount(trainee.id);
            } catch (err) {
              // If getting unseen weights fails, continue without it
              logger.debug('Error getting unseen weights count:', err, 'TodayTraineesSection');
            }
          
          // חילוץ זמן האימון
          let workoutTime: string | undefined;
          if (workout.workout_date && typeof workout.workout_date === 'string') {
            try {
              const workoutDate = new Date(workout.workout_date);
              if (!isNaN(workoutDate.getTime())) {
                workoutTime = workoutDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
              }
            } catch (e) {
              // Ignore date parsing errors
            }
          }
          
          // קביעת סטטוס
          let status: 'scheduled' | 'completed' | 'upcoming' = 'scheduled';
          if (workout.is_completed) {
            status = 'completed';
          } else if (workout.workout_date) {
            try {
              const workoutDate = new Date(workout.workout_date);
              const now = new Date();
              if (!isNaN(workoutDate.getTime()) && workoutDate > now) {
                status = 'upcoming';
              }
            } catch (e) {
              // Ignore date parsing errors, default to 'scheduled'
            }
          }
          
          return {
            trainee: trainee as Trainee,
            workout: {
              id: workout.id,
              workout_date: workout.workout_date,
              workout_type: workout.workout_type,
              is_completed: workout.is_completed,
              workout_time: workoutTime,
              notes: workout.notes,
              isFromGoogle: workout.isFromGoogle || false
            },
            daysSinceLastWorkout,
            unseenWeightsCount,
            status
          };
          } catch (err) {
            // If processing a single item fails, return null and continue with others
            logger.debug('Error processing workout item:', err, 'TodayTraineesSection');
            return null;
          }
        })
      );

      // Process tomorrow's workouts
      const processedTomorrow = await Promise.all(
        result.data.tomorrow.map(async (item) => {
          try {
            const trainee = item.trainee;
            const workout = item.workout;
            
            if (!trainee || !workout) {
              return null;
            }
            
            // חישוב ימים מאז אימון אחרון
            let lastWorkout: string | null = null;
            let daysSinceLastWorkout: number | null = null;
            try {
              lastWorkout = await getLastWorkoutDate(trainee.id);
              daysSinceLastWorkout = lastWorkout 
                ? Math.floor((new Date().getTime() - new Date(lastWorkout).getTime()) / (1000 * 60 * 60 * 24))
                : null;
            } catch (err) {
              // If getting last workout fails, continue without it
              logger.debug('Error getting last workout date:', err, 'TodayTraineesSection');
            }
            
            // חישוב מספר שקילות חדשות
            let unseenWeightsCount = 0;
            try {
              unseenWeightsCount = await getUnseenWeightsCount(trainee.id);
            } catch (err) {
              // If getting unseen weights fails, continue without it
              logger.debug('Error getting unseen weights count:', err, 'TodayTraineesSection');
            }
          
          // חילוץ זמן האימון
          let workoutTime: string | undefined;
          if (workout.workout_date && typeof workout.workout_date === 'string') {
            try {
              const workoutDate = new Date(workout.workout_date);
              if (!isNaN(workoutDate.getTime())) {
                workoutTime = workoutDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
              }
            } catch (e) {
              // Ignore date parsing errors
            }
          }
          
          // קביעת סטטוס - מחר תמיד "upcoming"
          const status: 'scheduled' | 'completed' | 'upcoming' = workout.is_completed ? 'completed' : 'upcoming';
          
          return {
            trainee: trainee as Trainee,
            workout: {
              id: workout.id,
              workout_date: workout.workout_date,
              workout_type: workout.workout_type,
              is_completed: workout.is_completed,
              workout_time: workoutTime,
              notes: workout.notes,
              isFromGoogle: workout.isFromGoogle || false
            },
            daysSinceLastWorkout,
            unseenWeightsCount,
            status
          };
          } catch (err) {
            // If processing a single item fails, return null and continue with others
            logger.debug('Error processing workout item:', err, 'TodayTraineesSection');
            return null;
          }
        })
      );
      
      // Filter out any null values
      const validToday = processedToday.filter((t): t is TodayTrainee => t !== null);
      const validTomorrow = processedTomorrow.filter((t): t is TodayTrainee => t !== null);
      
      setTodayTrainees(validToday);
      setTomorrowTrainees(validTomorrow);
    } catch (err: any) {
      // Only log as debug to avoid console spam - network errors are expected in some environments
      logger.debug('Error loading scheduled workouts:', err, 'TodayTraineesSection');
      // Don't show error message - just show empty state
      setTodayTrainees([]);
      setTomorrowTrainees([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [trainees, user]);

  useEffect(() => {
    // Skip if already loading or if trainee IDs haven't changed
    if (isLoadingRef.current || lastTraineeIdsRef.current === traineeIdsString) {
      return;
    }

    if (trainees.length > 0) {
      lastTraineeIdsRef.current = traineeIdsString;
      loadTodayTrainees();
    } else {
      setLoading(false);
      setTodayTrainees([]);
    }
  }, [traineeIdsString, trainees.length, loadTodayTrainees]);

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

  const hasAnyWorkouts = todayTrainees.length > 0 || tomorrowTrainees.length > 0;

  if (!hasAnyWorkouts && !loading) {
    return (
      <div className="premium-card-static p-8 md:p-10 text-center border border-primary/20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">אין אימונים מתוזמנים להיום ומחר</h3>
        <p className="text-secondary mb-6 max-w-md mx-auto">
          אין מתאמנים עם אימון מתוזמן להיום או למחר. תוכל להוסיף אימון חדש מהרשימה הכללית.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Today's Trainees Section */}
      <div className="premium-card-static p-6 md:p-8 lg:p-10 relative overflow-hidden
                      border-2 border-primary/10 hover:border-primary/20 transition-all duration-500">
        {/* Enhanced Background gradient effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/10 via-emerald-700/5 to-transparent 
                        rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-emerald-700/10 via-primary/5 to-transparent 
                        rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" 
             style={{ animationDelay: '1s' }} />
        
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 
                        opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="relative z-10">
          {/* Enhanced Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
                  <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/20 to-emerald-700/20 
                                border-2 border-primary/30 shadow-lg shadow-primary/20">
                    <Calendar className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mb-1
                              bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    מתאמנים של היום
                  </h2>
                  <p className="text-sm md:text-base text-secondary/80 font-medium">
                    כל המתאמנים עם אימון מתוזמן להיום • ניהול מהיר ונוח
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-primary/25 via-emerald-700/20 to-primary/25 
                            border-2 border-primary/30 shadow-lg shadow-primary/10
                            hover:scale-105 transition-transform duration-300">
                <span className="text-2xl md:text-3xl font-extrabold text-primary">{todayTrainees.length}</span>
                <span className="text-sm md:text-base text-secondary/80 font-semibold mr-2">מתאמנים</span>
              </div>
            </div>
          </div>

          {/* Trainees Grid */}
          {todayTrainees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
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
          ) : (
            <div className="text-center py-12">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/30 to-primary-dark/20 
                              flex items-center justify-center border-2 border-primary/30 shadow-xl">
                  <Calendar className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">אין אימונים מתוזמנים להיום</h3>
              <p className="text-sm md:text-base text-secondary/80 max-w-md mx-auto">
                תוכל להוסיף אימון חדש מהרשימה הכללית או לתזמן אימונים מראש
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tomorrow's Trainees Section */}
      {tomorrowTrainees.length > 0 && (
        <div className="premium-card-static p-6 md:p-8 lg:p-10 relative overflow-hidden
                        border-2 border-warning/10 hover:border-warning/20 transition-all duration-500">
          {/* Enhanced Background gradient effects */}
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-warning/10 via-amber-500/5 to-transparent 
                          rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-amber-500/10 via-warning/5 to-transparent 
                          rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" 
               style={{ animationDelay: '1.5s' }} />
          
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-warning/0 via-warning/5 to-warning/0 
                          opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="relative z-10">
            {/* Enhanced Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-warning/20 rounded-2xl blur-xl animate-pulse" />
                    <div className="relative p-3 rounded-2xl bg-gradient-to-br from-warning/30 via-warning/20 to-amber-500/20 
                                  border-2 border-warning/30 shadow-lg shadow-warning/20">
                      <CalendarDays className="w-7 h-7 text-warning" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mb-1
                                bg-gradient-to-r from-foreground to-warning bg-clip-text text-transparent">
                      מתאמנים של מחר
                    </h2>
                    <p className="text-sm md:text-base text-secondary/80 font-medium">
                      כל המתאמנים עם אימון מתוזמן למחר • תכנון מראש
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-warning/25 via-amber-500/20 to-warning/25 
                              border-2 border-warning/30 shadow-lg shadow-warning/10
                              hover:scale-105 transition-transform duration-300">
                  <span className="text-2xl md:text-3xl font-extrabold text-warning">{tomorrowTrainees.length}</span>
                  <span className="text-sm md:text-base text-secondary/80 font-semibold mr-2">מתאמנים</span>
                </div>
              </div>
            </div>

            {/* Trainees Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
              {tomorrowTrainees.map((item, index) => (
                <TraineeCardToday
                  key={`${item.trainee.id}-${item.workout.id}-tomorrow`}
                  todayTrainee={item}
                  index={index}
                  onNewWorkout={onNewWorkout}
                  onViewWorkoutPlan={onViewWorkoutPlan}
                  onViewMealPlan={onViewMealPlan}
                />
              ))}
            </div>
          </div>
        </div>
      )}
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

  // Get status colors and styles
  const statusConfig = {
    completed: {
      bar: 'bg-gradient-to-r from-success to-emerald-700',
      badge: 'bg-success/20 text-success border-success/30 shadow-success/20',
      gradient: 'from-success/15 via-success/5 to-transparent',
      glow: 'shadow-success/10'
    },
    scheduled: {
      bar: 'bg-gradient-to-r from-primary to-emerald-700',
      badge: 'bg-primary/20 text-primary border-primary/30 shadow-primary/20',
      gradient: 'from-primary/15 via-primary/5 to-transparent',
      glow: 'shadow-primary/10'
    },
    upcoming: {
      bar: 'bg-gradient-to-r from-warning to-amber-500',
      badge: 'bg-warning/20 text-warning border-warning/30 shadow-warning/20',
      gradient: 'from-warning/15 via-warning/5 to-transparent',
      glow: 'shadow-warning/10'
    }
  };

  const config = statusConfig[status];

  return (
    <div
      className="premium-card p-5 sm:p-6 md:p-7 relative overflow-hidden group 
                  hover:scale-[1.03] hover:-translate-y-1
                  transition-all duration-500 ease-out
                  animate-fade-in-up
                  border border-border/20 hover:border-primary/40"
      style={{ animationDelay: `${index * 100}ms` }}
      role="article"
      aria-label={`כרטיס מתאמן ${trainee.full_name}`}
    >
      {/* Animated Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${config.bar} 
                      group-hover:h-2 transition-all duration-300`} />

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 
                      transition-opacity duration-500 pointer-events-none">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} 
                        animate-pulse`} />
      </div>

      {/* Glow effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 
                      transition-opacity duration-500 pointer-events-none
                      ${config.glow} shadow-2xl`} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Enhanced Avatar with ring */}
            <div className="relative flex-shrink-0">
              <div className={`absolute inset-0 rounded-2xl ${config.bar} opacity-0 
                              group-hover:opacity-20 blur-xl transition-opacity duration-500`} />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 
                             rounded-2xl bg-gradient-to-br 
                             from-primary/25 via-primary/15 to-primary-dark/10 
                             flex items-center justify-center
                             group-hover:from-primary/35 group-hover:via-primary/25 group-hover:to-primary-dark/20
                             transition-all duration-500 shadow-xl
                             border-2 border-primary/20 group-hover:border-primary/40">
                {trainee.is_pair ? (
                  <Users className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary" />
                ) : (
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                    {trainee.full_name.charAt(0)}
                  </span>
                )}
              </div>
              {unseenWeightsCount && unseenWeightsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7
                               bg-gradient-to-br from-info to-cyan-500 rounded-full 
                               flex items-center justify-center 
                               text-xs font-bold text-inverse border-2 border-elevated 
                               animate-pulse shadow-lg shadow-info/50">
                  {unseenWeightsCount}
                </span>
              )}
            </div>

            {/* Name & Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 
                           group-hover:text-primary transition-colors duration-300 truncate">
                {trainee.full_name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide
                                border shadow-sm ${config.badge}
                                group-hover:scale-105 transition-transform duration-200`}>
                  {status === 'completed' ? '✓ הושלם' :
                   status === 'scheduled' ? '📅 מתוזמן' :
                   '⏰ מתקרב'}
                </span>
                {workout.isFromGoogle && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg 
                                bg-info/15 border border-info/30
                                group-hover:bg-info/20 group-hover:border-info/40
                                transition-all duration-200"
                       title="מסונכרן מיומן גוגל">
                    <CalendarCheck className="w-3.5 h-3.5 text-info" />
                    <span className="text-xs sm:text-sm font-semibold text-info">
                      גוגל
                    </span>
                  </div>
                )}
                {workout.workout_time && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg 
                                bg-surface/60 border border-border/20
                                group-hover:bg-surface group-hover:border-primary/30
                                transition-all duration-200">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {workout.workout_time}
                    </span>
                  </div>
                )}
                {daysSinceLastWorkout !== null && (
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold
                                border shadow-sm transition-all duration-200
                                group-hover:scale-105 ${
                    isActive
                      ? 'bg-success/15 text-success border-success/30'
                      : 'bg-danger/15 text-danger border-danger/30'
                  }`}>
                    {daysSinceLastWorkout} ימים
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* אימון חדש - Primary */}
          <button
            onClick={() => onNewWorkout(trainee)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNewWorkout(trainee);
              }
            }}
            className="btn-primary p-4 sm:p-5 rounded-xl flex flex-col items-center gap-2
                       hover:scale-110 active:scale-95 transition-all duration-300
                       shadow-lg shadow-emerald-700/50 hover:shadow-2xl hover:shadow-emerald-700/70
                       focus:outline-none focus:ring-2 focus:ring-emerald-700/50 focus:ring-offset-2
                       group/btn relative overflow-hidden"
            aria-label={`הוסף אימון חדש ל${trainee.full_name}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                          translate-x-[-100%] group-hover/btn:translate-x-[100%] 
                          transition-transform duration-700" />
            <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-bold relative z-10">אימון חדש</span>
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
            className="bg-surface/60 hover:bg-surface border-2 border-border/20 
                       hover:border-primary/50 p-4 sm:p-5 rounded-xl flex flex-col items-center gap-2
                       transition-all duration-300 hover:scale-105 active:scale-95
                       hover:shadow-lg hover:shadow-primary/20
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
                       group/btn relative overflow-hidden"
            aria-label={`צפה בתוכנית אימון של ${trainee.full_name}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent 
                          translate-x-[-100%] group-hover/btn:translate-x-[100%] 
                          transition-transform duration-700" />
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-primary relative z-10" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-bold text-foreground relative z-10">תוכנית</span>
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
            className="bg-surface/60 hover:bg-surface border-2 border-border/20 
                       hover:border-primary/50 p-4 sm:p-5 rounded-xl flex flex-col items-center gap-2
                       transition-all duration-300 hover:scale-105 active:scale-95
                       hover:shadow-lg hover:shadow-primary/20
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
                       group/btn relative overflow-hidden"
            aria-label={`צפה בתפריט של ${trainee.full_name}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent 
                          translate-x-[-100%] group-hover/btn:translate-x-[100%] 
                          transition-transform duration-700" />
            <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-primary relative z-10" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-bold text-foreground relative z-10">תפריט</span>
          </button>
        </div>
      </div>
    </div>
  );
}
