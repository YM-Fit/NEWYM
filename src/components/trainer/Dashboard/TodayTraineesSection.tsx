import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dumbbell, ClipboardList, UtensilsCrossed, Clock, Users, Calendar, AlertCircle, Scale, CalendarDays, CalendarCheck } from 'lucide-react';
import { Trainee } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Skeleton } from '../../ui/Skeleton';
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
    isTimePassed?: boolean; // Whether the scheduled time has passed
    hasCompletedWorkout?: boolean; // Whether there's a completed workout for this date
    eventStartTime?: string; // For Google Calendar workouts, the actual event start time
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

      // Batch load additional data for all trainees (today + tomorrow) to improve performance
      const allTraineeIds = [
        ...new Set([
          ...result.data.today.map(item => item.trainee?.id),
          ...result.data.tomorrow.map(item => item.trainee?.id)
        ].filter(Boolean) as string[])
      ];
      
      // Batch load last workout dates
      const lastWorkoutDatesMap = new Map<string, string | null>();
      if (allTraineeIds.length > 0) {
        try {
          const { data: lastWorkoutsData } = await supabase
            .from('workout_trainees')
            .select('trainee_id, workouts!inner(workout_date)')
            .in('trainee_id', allTraineeIds)
            .eq('workouts.is_completed', true)
            .order('workouts.workout_date', { ascending: false });
          
          if (lastWorkoutsData) {
            // Group by trainee_id and get the most recent
            const traineeLastWorkouts = new Map<string, string>();
            lastWorkoutsData.forEach((wt: any) => {
              if (wt.trainee_id && wt.workouts?.workout_date) {
                const existing = traineeLastWorkouts.get(wt.trainee_id);
                if (!existing || new Date(wt.workouts.workout_date) > new Date(existing)) {
                  traineeLastWorkouts.set(wt.trainee_id, wt.workouts.workout_date);
                }
              }
            });
            traineeLastWorkouts.forEach((date, traineeId) => {
              lastWorkoutDatesMap.set(traineeId, date);
            });
          }
        } catch (err) {
          logger.debug('Error batch loading last workout dates:', err, 'TodayTraineesSection');
        }
      }
      
      // Batch load unseen weights counts
      const unseenWeightsCountMap = new Map<string, number>();
      if (allTraineeIds.length > 0) {
        try {
          const { data: weightsData } = await supabase
            .from('trainee_self_weights')
            .select('trainee_id')
            .in('trainee_id', allTraineeIds)
            .eq('is_seen_by_trainer', false);
          
          if (weightsData) {
            weightsData.forEach((w: any) => {
              if (w.trainee_id) {
                unseenWeightsCountMap.set(w.trainee_id, (unseenWeightsCountMap.get(w.trainee_id) || 0) + 1);
              }
            });
          }
        } catch (err) {
          logger.debug('Error batch loading unseen weights:', err, 'TodayTraineesSection');
        }
      }

      // Process today's workouts
      const processedToday = result.data.today.map((item) => {
          try {
            const trainee = item.trainee;
            const workout = item.workout;
            
            if (!trainee || !workout) {
              return null;
            }
            
            // Get pre-loaded data
            const lastWorkout = lastWorkoutDatesMap.get(trainee.id) || null;
            const daysSinceLastWorkout = lastWorkout 
              ? Math.floor((new Date().getTime() - new Date(lastWorkout).getTime()) / (1000 * 60 * 60 * 24))
              : null;
            
            const unseenWeightsCount = unseenWeightsCountMap.get(trainee.id) || 0;
          
          // חילוץ זמן האימון - שימוש ב-timezone של ישראל לעקביות
          // For Google Calendar workouts, use eventStartTime if available for accurate time
          let workoutTime: string | undefined;
          const timeSource = workout.eventStartTime || workout.workout_date;
          if (timeSource && typeof timeSource === 'string') {
            try {
              const workoutDate = new Date(timeSource);
              if (!isNaN(workoutDate.getTime())) {
                // Use Israel timezone (Asia/Jerusalem) for consistent display
                workoutTime = workoutDate.toLocaleTimeString('he-IL', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: 'Asia/Jerusalem'
                });
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
              isFromGoogle: workout.isFromGoogle || false,
              isTimePassed: workout.isTimePassed || false,
              hasCompletedWorkout: workout.hasCompletedWorkout || false,
              eventStartTime: workout.eventStartTime // For Google Calendar workouts
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

      // Process tomorrow's workouts (using pre-loaded data)
      const processedTomorrow = result.data.tomorrow.map((item) => {
          try {
            const trainee = item.trainee;
            const workout = item.workout;
            
            if (!trainee || !workout) {
              return null;
            }
            
            // Get pre-loaded data
            const lastWorkout = lastWorkoutDatesMap.get(trainee.id) || null;
            const daysSinceLastWorkout = lastWorkout 
              ? Math.floor((new Date().getTime() - new Date(lastWorkout).getTime()) / (1000 * 60 * 60 * 24))
              : null;
            
            const unseenWeightsCount = unseenWeightsCountMap.get(trainee.id) || 0;
          
          // חילוץ זמן האימון - שימוש ב-timezone של ישראל לעקביות
          // For Google Calendar workouts, use eventStartTime if available for accurate time
          let workoutTime: string | undefined;
          const timeSource = workout.eventStartTime || workout.workout_date;
          if (timeSource && typeof timeSource === 'string') {
            try {
              const workoutDate = new Date(timeSource);
              if (!isNaN(workoutDate.getTime())) {
                // Use Israel timezone (Asia/Jerusalem) for consistent display
                workoutTime = workoutDate.toLocaleTimeString('he-IL', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: 'Asia/Jerusalem'
                });
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
              isFromGoogle: workout.isFromGoogle || false,
              isTimePassed: workout.isTimePassed || false,
              hasCompletedWorkout: workout.hasCompletedWorkout || false,
              eventStartTime: workout.eventStartTime // For Google Calendar workouts
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

  // Skeleton loader component to prevent layout shift
  const TableSkeleton = () => (
    <div className="overflow-x-auto rounded-xl border border-border/20 -mx-2 sm:mx-0">
      <div className="min-w-full inline-block align-middle">
        <table className="w-full min-w-[600px] md:min-w-0">
          <thead className="bg-surface/50">
            <tr className="border-b-2 border-primary/20">
              <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[150px]">מתאמן</th>
              <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[100px]">שעה</th>
              <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[120px]">סטטוס</th>
              <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[180px]">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-border/20">
                <td className="py-3 px-3 md:py-4 md:px-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Skeleton variant="circular" width={40} height={40} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton variant="text" height={16} width="60%" />
                      <Skeleton variant="text" height={12} width="40%" />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 md:py-4 md:px-4">
                  <Skeleton variant="text" height={16} width={60} />
                </td>
                <td className="py-3 px-3 md:py-4 md:px-4">
                  <Skeleton variant="rounded" height={28} width={100} />
                </td>
                <td className="py-3 px-3 md:py-4 md:px-4">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <Skeleton variant="rounded" height={36} width={80} />
                    <Skeleton variant="rounded" height={36} width={36} />
                    <Skeleton variant="rounded" height={36} width={36} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="premium-card-static p-6 md:p-8 lg:p-10 relative overflow-hidden
                      border-2 border-primary/10">
        <div className="relative z-10">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <Skeleton variant="rounded" width={56} height={56} />
                <div className="space-y-2">
                  <Skeleton variant="text" height={32} width={200} />
                  <Skeleton variant="text" height={16} width={300} />
                </div>
              </div>
            </div>
            <Skeleton variant="rounded" width={120} height={60} />
          </div>
          {/* Table skeleton */}
          <TableSkeleton />
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

          {/* Trainees Table - Fixed height to prevent layout shift */}
          {todayTrainees.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/20 -mx-2 sm:mx-0 min-h-[200px]">
              <div className="min-w-full inline-block align-middle">
                <table className="w-full min-w-[600px] md:min-w-0">
                  <thead className="bg-surface/50">
                    <tr className="border-b-2 border-primary/20">
                      <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[150px]">מתאמן</th>
                      <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[100px]">שעה</th>
                      <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[120px]">סטטוס</th>
                      <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[180px]">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayTrainees.map((item, index) => (
                      <TraineeTableRow
                        key={`${item.trainee.id}-${item.workout.id}`}
                        todayTrainee={item}
                        index={index}
                        onNewWorkout={onNewWorkout}
                        onViewWorkoutPlan={onViewWorkoutPlan}
                        onViewMealPlan={onViewMealPlan}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
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

            {/* Trainees Table - Fixed height to prevent layout shift */}
            <div className="overflow-x-auto rounded-xl border border-border/20 -mx-2 sm:mx-0 min-h-[200px]">
              <div className="min-w-full inline-block align-middle">
                <table className="w-full min-w-[600px] md:min-w-0">
                  <thead className="bg-surface/50">
                    <tr className="border-b-2 border-warning/20">
                      <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[150px]">מתאמן</th>
                      <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[100px]">שעה</th>
                      <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[120px]">סטטוס</th>
                      <th className="text-right py-3 px-3 md:py-4 md:px-4 font-bold text-sm md:text-base text-foreground min-w-[180px]">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tomorrowTrainees.map((item, index) => (
                      <TraineeTableRow
                        key={`${item.trainee.id}-${item.workout.id}-tomorrow`}
                        todayTrainee={item}
                        index={index}
                        onNewWorkout={onNewWorkout}
                        onViewWorkoutPlan={onViewWorkoutPlan}
                        onViewMealPlan={onViewMealPlan}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TraineeTableRowProps {
  todayTrainee: TodayTrainee;
  index: number;
  onNewWorkout: (trainee: Trainee) => void;
  onViewWorkoutPlan: (trainee: Trainee) => void;
  onViewMealPlan: (trainee: Trainee) => void;
}

function TraineeTableRow({
  todayTrainee,
  index,
  onNewWorkout,
  onViewWorkoutPlan,
  onViewMealPlan
}: TraineeTableRowProps) {
  const { trainee, workout, status, daysSinceLastWorkout, unseenWeightsCount } = todayTrainee;
  const isActive = daysSinceLastWorkout !== null && daysSinceLastWorkout <= 7;

  // Determine status display based on time passed and completed workout
  let statusDisplay: string;
  let statusColor: string;
  
  if (workout.isTimePassed) {
    // If the scheduled time has passed, show "בוצע" with green checkmark
    statusDisplay = '✓ בוצע';
    statusColor = 'text-success bg-success/20 border-success/30';
  } else {
    // Default status based on the workout status
    statusDisplay = status === 'completed' ? '✓ הושלם' :
                     status === 'scheduled' ? '📅 מתוזמן' :
                     '⏰ מתקרב';
    statusColor = status === 'completed' ? 'text-success bg-success/20 border-success/30' :
                  status === 'scheduled' ? 'text-primary bg-primary/20 border-primary/30' :
                  'text-warning bg-warning/20 border-warning/30';
  }

  return (
    <tr className="border-b border-border/20 hover:bg-surface/50 transition-colors duration-200 group">
      {/* Trainee Name */}
      <td className="py-3 px-3 md:py-4 md:px-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary/25 via-primary/15 to-primary-dark/10 
                          flex items-center justify-center border-2 border-primary/20">
              {trainee.is_pair ? (
                <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              ) : (
                <span className="text-base md:text-lg font-bold text-primary">
                  {trainee.full_name.charAt(0)}
                </span>
              )}
            </div>
            {unseenWeightsCount && unseenWeightsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5
                             bg-gradient-to-br from-info to-cyan-500 rounded-full 
                             flex items-center justify-center 
                             text-xs font-bold text-inverse border-2 border-elevated 
                             animate-pulse shadow-lg shadow-info/50">
                {unseenWeightsCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm md:text-base text-foreground truncate">{trainee.full_name}</div>
            <div className="flex items-center gap-1.5 md:gap-2 mt-1 flex-wrap">
              {workout.isFromGoogle && (
                <div className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-lg 
                              bg-info/15 border border-info/30">
                  <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 text-info" />
                  <span className="text-[10px] md:text-xs font-semibold text-info">גוגל</span>
                </div>
              )}
              {daysSinceLastWorkout !== null && (
                <div className={`px-1.5 md:px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-semibold border ${
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
      </td>

      {/* Time */}
      <td className="py-3 px-3 md:py-4 md:px-4">
        {workout.workout_time ? (
          <div className="flex items-center gap-1.5 md:gap-2">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm md:text-base text-foreground whitespace-nowrap">{workout.workout_time}</span>
          </div>
        ) : (
          <span className="text-secondary text-xs md:text-sm">-</span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 px-3 md:py-4 md:px-4">
        <div className="flex flex-col gap-1">
          <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[10px] md:text-xs font-bold tracking-wide border ${statusColor} whitespace-nowrap`}>
            {statusDisplay}
          </span>
          {/* Show "אימון חדש נוסף" only if there's a completed workout AND the scheduled time has passed */}
          {workout.hasCompletedWorkout && workout.isTimePassed && (
            <span className="px-1.5 md:px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-semibold text-secondary bg-surface/60 border border-border/30 whitespace-nowrap">
              אימון חדש נוסף
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-3 px-3 md:py-4 md:px-4">
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
          <button
            onClick={() => onNewWorkout(trainee)}
            className="btn-primary p-1.5 md:p-2 rounded-lg flex items-center gap-1 md:gap-1.5
                       hover:scale-110 active:scale-95 transition-all duration-300
                       shadow-lg shadow-emerald-700/50 hover:shadow-2xl hover:shadow-emerald-700/70
                       focus:outline-none focus:ring-2 focus:ring-emerald-700/50 focus:ring-offset-2"
            aria-label={`הוסף אימון חדש ל${trainee.full_name}`}
            title="אימון חדש"
          >
            <Dumbbell className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-[10px] md:text-xs font-bold hidden sm:inline">אימון</span>
          </button>
          <button
            onClick={() => onViewWorkoutPlan(trainee)}
            className="bg-surface/60 hover:bg-surface border-2 border-border/20 
                       hover:border-primary/50 p-1.5 md:p-2 rounded-lg flex items-center gap-1 md:gap-1.5
                       transition-all duration-300 hover:scale-105 active:scale-95
                       hover:shadow-lg hover:shadow-primary/20
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            aria-label={`צפה בתוכנית אימון של ${trainee.full_name}`}
            title="תוכנית אימון"
          >
            <ClipboardList className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
          </button>
          <button
            onClick={() => onViewMealPlan(trainee)}
            className="bg-surface/60 hover:bg-surface border-2 border-border/20 
                       hover:border-primary/50 p-1.5 md:p-2 rounded-lg flex items-center gap-1 md:gap-1.5
                       transition-all duration-300 hover:scale-105 active:scale-95
                       hover:shadow-lg hover:shadow-primary/20
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            aria-label={`צפה בתפריט של ${trainee.full_name}`}
            title="תפריט"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
          </button>
        </div>
      </td>
    </tr>
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
