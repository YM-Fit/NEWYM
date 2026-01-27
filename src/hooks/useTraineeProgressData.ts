import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { analyticsApi } from '../api/analyticsApi';
import { logger } from '../utils/logger';

export interface TraineeProgressData {
  streakDays: number;
  workoutsThisMonth: number;
  totalWorkouts: number;
  previousWorkoutData: Map<string, { weight: number; reps: number; date: string }>;
  startDate: string | null;
  loading: boolean;
  error: string | null;
}

interface PreviousSetData {
  weight: number;
  reps: number;
  date: string;
}

export function useTraineeProgressData(traineeId: string | null): TraineeProgressData {
  const [streakDays, setStreakDays] = useState(0);
  const [workoutsThisMonth, setWorkoutsThisMonth] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [previousWorkoutData, setPreviousWorkoutData] = useState<Map<string, PreviousSetData>>(new Map());
  const [startDate, setStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traineeId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadProgressData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load streak
        const streak = await analyticsApi.calculateStreak(traineeId);
        if (isMounted) setStreakDays(streak);

        // Load analytics for monthly and total workouts
        const analytics = await analyticsApi.getTraineeAnalytics(traineeId);
        if (isMounted) {
          setWorkoutsThisMonth(analytics.workouts_this_month);
          setTotalWorkouts(analytics.total_workouts);
        }

        // Load trainee start date
        const { data: trainee } = await supabase
          .from('trainees')
          .select('start_date')
          .eq('id', traineeId)
          .single();

        if (isMounted && trainee) {
          setStartDate(trainee.start_date);
        }

        // Load previous workout data for comparison
        const { data: workoutTrainees } = await supabase
          .from('workout_trainees')
          .select(`
            workouts!inner (
              id,
              workout_date,
              is_completed,
              workout_exercises (
                exercise_id,
                exercise_sets (
                  weight,
                  reps,
                  set_number
                )
              )
            )
          `)
          .eq('trainee_id', traineeId)
          .eq('workouts.is_completed', true)
          .order('workouts(workout_date)', { ascending: false })
          .limit(10);

        if (isMounted && workoutTrainees) {
          const exerciseHistory = new Map<string, PreviousSetData[]>();

          // Build exercise history from completed workouts
          workoutTrainees.forEach((wt: any) => {
            const workout = wt.workouts;
            if (!workout || !workout.workout_exercises) return;

            workout.workout_exercises.forEach((we: any) => {
              const exerciseId = we.exercise_id;
              if (!exerciseId) return;

              // Find the best set (max volume) for this exercise in this workout
              const sets = we.exercise_sets || [];
              if (sets.length === 0) return;

              const bestSet = sets.reduce((max: any, set: any) => {
                const volume = (set.weight || 0) * (set.reps || 0);
                const maxVolume = (max.weight || 0) * (max.reps || 0);
                return volume > maxVolume ? set : max;
              }, sets[0]);

              if (bestSet && bestSet.weight && bestSet.reps) {
                if (!exerciseHistory.has(exerciseId)) {
                  exerciseHistory.set(exerciseId, []);
                }
                exerciseHistory.get(exerciseId)!.push({
                  weight: bestSet.weight,
                  reps: bestSet.reps,
                  date: workout.workout_date,
                });
              }
            });
          });

          // Get the previous (second most recent) data for each exercise
          const previousData = new Map<string, PreviousSetData>();
          exerciseHistory.forEach((history, exerciseId) => {
            // Sort by date descending
            const sorted = history.sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            // Get the second entry (previous workout) if it exists
            if (sorted.length >= 2) {
              previousData.set(exerciseId, sorted[1]);
            } else if (sorted.length === 1) {
              // If only one workout exists, use it as previous
              previousData.set(exerciseId, sorted[0]);
            }
          });

          setPreviousWorkoutData(previousData);
        }
      } catch (err) {
        logger.error('Error loading trainee progress data:', err, 'useTraineeProgressData');
        if (isMounted) {
          setError('שגיאה בטעינת נתוני התקדמות');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProgressData();

    return () => {
      isMounted = false;
    };
  }, [traineeId]);

  return useMemo(() => ({
    streakDays,
    workoutsThisMonth,
    totalWorkouts,
    previousWorkoutData,
    startDate,
    loading,
    error,
  }), [streakDays, workoutsThisMonth, totalWorkouts, previousWorkoutData, startDate, loading, error]);
}
