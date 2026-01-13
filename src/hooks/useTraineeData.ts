import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

// Types for the data returned from useTraineeData
export interface MeasurementData {
  id: string;
  measurement_date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  water_percentage: number | null;
  bmi: number | null;
  bmr: number | null;
  metabolic_age: number | null;
  source: 'tanita' | 'manual';
  notes: string | null;
  pair_member: 'member_1' | 'member_2' | null;
  chest_back: number | null;
  belly: number | null;
  glutes: number | null;
  thigh: number | null;
  right_arm: number | null;
  left_arm: number | null;
}

export interface SelfWeightData {
  id: string;
  weight_date: string;
  weight: number;
  is_seen_by_trainer: boolean;
  notes: string | null;
}

export interface WorkoutData {
  id: string;
  date: string;
  exercises: Array<{
    name: string;
    sets: number;
  }>;
  totalVolume: number;
  duration: number;
  isSelfRecorded: boolean;
}

interface WorkoutTraineeJoin {
  workouts: {
    id: string;
    workout_date: string;
    is_completed: boolean;
    is_self_recorded: boolean;
    created_at: string;
    workout_exercises: Array<{
      id: string;
      exercises: {
        name: string;
      } | null;
      exercise_sets: Array<{
        id: string;
        weight: number | null;
        reps: number | null;
        superset_weight: number | null;
        superset_reps: number | null;
        dropset_weight: number | null;
        dropset_reps: number | null;
        superset_dropset_weight: number | null;
        superset_dropset_reps: number | null;
      }>;
    }>;
  };
}

export interface TraineeData {
  measurements: MeasurementData[];
  workouts: WorkoutData[];
  selfWeights: SelfWeightData[];
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
      const formattedWorkouts: WorkoutData[] = (workoutsResult.data as WorkoutTraineeJoin[] | null)
        ?.filter((wt: WorkoutTraineeJoin) => wt.workouts)
        .map((wt: WorkoutTraineeJoin) => {
          const w = wt.workouts;
          const exercises = w.workout_exercises || [];
          const totalVolume = exercises.reduce((sum: number, ex) => {
            const sets = ex.exercise_sets || [];
            return sum + sets.reduce((setSum: number, set) => {
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
            exercises: exercises.map((ex) => ({
              name: ex.exercises?.name || 'תרגיל',
              sets: ex.exercise_sets?.length || 0
            })),
            totalVolume,
            duration: 0,
            isSelfRecorded: w.is_self_recorded || false
          };
        })
        .sort((a: WorkoutData, b: WorkoutData) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

      return {
        measurements: (measurementsResult.data as MeasurementData[]) || [],
        workouts: formattedWorkouts,
        selfWeights: (selfWeightsResult.data as SelfWeightData[]) || [],
      };
    } catch (error) {
      logger.error('Error loading trainee data:', error, 'useTraineeData');
      throw error;
    }
  }, []);

  return { loadTraineeData };
}
