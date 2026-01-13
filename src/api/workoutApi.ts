/**
 * Workout API layer
 */

import { supabase } from '../lib/supabase';
import type { ApiResponse, SaveWorkoutRequest, SaveWorkoutResponse } from './types';
import { API_CONFIG } from './config';

/**
 * Save workout (create or update)
 */
export async function saveWorkout(
  workoutData: SaveWorkoutRequest,
  accessToken: string
): Promise<ApiResponse<SaveWorkoutResponse>> {
  try {
    const response = await fetch(
      `${API_CONFIG.SUPABASE_URL}/functions/v1/save-workout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(workoutData),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      return { error: result.error || 'שגיאה בשמירת האימון' };
    }

    return { data: result, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בשמירת האימון' };
  }
}

/**
 * Get workouts for a trainee
 */
export async function getTraineeWorkouts(
  traineeId: string
): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
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
      .eq('workouts.is_completed', true);

    if (error) {
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת האימונים' };
  }
}

/**
 * Get workout details with exercises and sets
 */
export async function getWorkoutDetails(
  workoutId: string
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        exercise_id,
        order_index,
        exercises (
          id,
          name,
          muscle_group_id
        ),
        exercise_sets (
          id,
          set_number,
          weight,
          reps,
          rpe,
          set_type,
          superset_exercise_id,
          superset_weight,
          superset_reps,
          dropset_weight,
          dropset_reps
        )
      `)
      .eq('workout_id', workoutId)
      .order('order_index', { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת פרטי האימון' };
  }
}

/**
 * Delete workout
 */
export async function deleteWorkout(
  workoutId: string
): Promise<ApiResponse> {
  try {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה במחיקת האימון' };
  }
}
