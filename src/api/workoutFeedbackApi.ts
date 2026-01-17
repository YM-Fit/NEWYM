import { supabase } from '../lib/supabase';
import { handleApiError } from './config';

export interface WorkoutFeedback {
  id: string;
  workout_id: string;
  trainee_id: string;
  overall_rpe: number | null;
  energy_level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high' | null;
  fatigue_level: 'none' | 'light' | 'moderate' | 'high' | 'extreme' | null;
  sleep_hours: number | null;
  nutrition_quality: 'poor' | 'fair' | 'good' | 'excellent' | null;
  notes: string | null;
  created_at: string;
}

export interface CreateWorkoutFeedbackInput {
  workout_id: string;
  trainee_id: string;
  overall_rpe?: number | null;
  energy_level?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high' | null;
  fatigue_level?: 'none' | 'light' | 'moderate' | 'high' | 'extreme' | null;
  sleep_hours?: number | null;
  nutrition_quality?: 'poor' | 'fair' | 'good' | 'excellent' | null;
  notes?: string | null;
}

// Rate limiting helper for workout feedback API
function checkWorkoutFeedbackRateLimit(key: string, maxRequests: number = 100): void {
  const rateLimitResult = rateLimiter.check(key, maxRequests, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }
}

export const workoutFeedbackApi = {
  async getWorkoutFeedback(workoutId: string, traineeId: string): Promise<WorkoutFeedback | null> {
    checkWorkoutFeedbackRateLimit(`getWorkoutFeedback:${workoutId}:${traineeId}`, 100);
    try {
      const { data, error } = await supabase
        .from('workout_feedback')
        .select('*')
        .eq('workout_id', workoutId)
        .eq('trainee_id', traineeId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת פידבק');
    }
  },

  async submitFeedback(input: CreateWorkoutFeedbackInput): Promise<WorkoutFeedback> {
    checkWorkoutFeedbackRateLimit(`submitFeedback:${input.workout_id}:${input.trainee_id}`, 50);
    try {
      const { data, error } = await supabase
        .from('workout_feedback')
        .upsert([input], { onConflict: 'workout_id,trainee_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בשליחת פידבק');
    }
  },

  async getTraineeFeedbackHistory(traineeId: string, limit: number = 10): Promise<WorkoutFeedback[]> {
    try {
      const { data, error } = await supabase
        .from('workout_feedback')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת היסטוריית פידבק');
    }
  },
};
