import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface TraineeData {
  measurements: any[];
  workouts: any[];
  selfWeights: any[];
}

export function useTraineeData() {
  const loadTraineeData = useCallback(async (traineeId: string): Promise<TraineeData> => {
    try {
      // טעינה מקבילית עם select רק שדות נדרשים
      const [measurementsResult, workoutsResult, selfWeightsResult] = await Promise.all([
        supabase
          .from('measurements')
          .select('id, measurement_date, weight, body_fat_percentage, muscle_mass, water_percentage, bmi, bmr, metabolic_age, source, notes, pair_member, chest_back, belly, glutes, thigh, right_arm, left_arm')
          .eq('trainee_id', traineeId)
          .order('measurement_date', { ascending: false })
          .limit(50),
        
        supabase
          .from('workout_trainees')
          .select(`
            workouts!inner (
              id,
              workout_date,
              is_completed,
              is_self_recorded,
              created_at,
              workout_exercises (
                id,
                exercises (
                  name
                ),
                exercise_sets (
                  id,
                  weight,
                  reps,
                  superset_weight,
                  superset_reps,
                  dropset_weight,
                  dropset_reps,
                  superset_dropset_weight,
                  superset_dropset_reps
                )
              )
            )
          `)
          .eq('trainee_id', traineeId)
          .eq('workouts.is_completed', true)
          .order('workouts.workout_date', { ascending: false })
          .limit(50),
        
        supabase
          .from('trainee_self_weights')
          .select('id, weight_date, weight, is_seen_by_trainer, notes')
          .eq('trainee_id', traineeId)
          .order('weight_date', { ascending: false })
          .limit(50),
      ]);

      // בדיקת שגיאות
      const errors = [
        measurementsResult.error,
        workoutsResult.error,
        selfWeightsResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        const errorMessages = errors.map(e => e?.message).join(', ');
        throw new Error(`Failed to load trainee data: ${errorMessages}`);
      }

      // Format workouts data
      const formattedWorkouts = workoutsResult.data
        ?.filter((wt: any) => wt.workouts)
        .map((wt: any) => {
          const w = wt.workouts;
          const exercises = w.workout_exercises || [];
          const totalVolume = exercises.reduce((sum: number, ex: any) => {
            const sets = ex.exercise_sets || [];
            return sum + sets.reduce((setSum: number, set: any) => {
              let setVolume = (set.weight || 0) * (set.reps || 0);
              if (set.superset_weight && set.superset_reps) {
                setVolume += set.superset_weight * set.superset_reps;
              }
              if (set.dropset_weight && set.dropset_reps) {
                setVolume += set.dropset_weight * set.dropset_reps;
              }
              if (set.superset_dropset_weight && set.superset_dropset_reps) {
                setVolume += set.superset_dropset_weight * set.superset_dropset_reps;
              }
              return setSum + setVolume;
            }, 0);
          }, 0);

          return {
            id: w.id,
            date: w.workout_date,
            exercises: exercises.map((ex: any) => ({
              name: ex.exercises?.name || 'תרגיל',
              sets: ex.exercise_sets?.length || 0
            })),
            totalVolume,
            duration: 0,
            isSelfRecorded: w.is_self_recorded || false
          };
        })
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

      return {
        measurements: measurementsResult.data || [],
        workouts: formattedWorkouts,
        selfWeights: selfWeightsResult.data || [],
      };
    } catch (error) {
      logger.error('Error loading trainee data:', error, 'useTraineeData');
      throw error;
    }
  }, []);

  return { loadTraineeData };
}
