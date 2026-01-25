import { supabase } from '../lib/supabase';
import { handleApiError } from './config';
import { rateLimiter } from '../utils/rateLimiter';

export interface TraineeGoal {
  id: string;
  trainee_id: string;
  goal_type: 'weight' | 'strength' | 'measurement' | 'custom';
  title: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  target_date: string | null;
  exercise_id: string | null;
  status: 'active' | 'achieved' | 'cancelled';
  notes: string | null;
  pair_member: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  trainee_id: string;
  goal_type: 'weight' | 'strength' | 'measurement' | 'custom';
  title: string;
  target_value?: number | null;
  current_value?: number | null;
  unit?: string | null;
  target_date?: string | null;
  exercise_id?: string | null;
  notes?: string | null;
  pair_member?: string | null;
}

// Rate limiting helper for goals API
function checkGoalsRateLimit(key: string, maxRequests: number = 100): void {
  const rateLimitResult = rateLimiter.check(key, maxRequests, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }
}

export const goalsApi = {
  async getTraineeGoals(traineeId: string): Promise<TraineeGoal[]> {
    checkGoalsRateLimit(`getTraineeGoals:${traineeId}`, 100);
    try {
      const { data, error } = await supabase
        .from('trainee_goals')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת יעדים');
    }
  },

  async createGoal(input: CreateGoalInput): Promise<TraineeGoal> {
    checkGoalsRateLimit(`createGoal:${input.trainee_id}`, 50);
    try {
      const { data, error } = await supabase
        .from('trainee_goals')
        .insert([input] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה ביצירת יעד');
    }
  },

  async updateGoal(goalId: string, updates: Partial<CreateGoalInput>): Promise<TraineeGoal> {
    checkGoalsRateLimit(`updateGoal:${goalId}`, 50);
    try {
      const { data, error } = await supabase
        .from('trainee_goals')
        .update(updates as any)
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בעדכון יעד');
    }
  },

  async deleteGoal(goalId: string): Promise<void> {
    checkGoalsRateLimit(`deleteGoal:${goalId}`, 20);
    try {
      const { error } = await supabase
        .from('trainee_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error, 'שגיאה במחיקת יעד');
    }
  },

  async updateGoalProgress(goalId: string, currentValue: number): Promise<TraineeGoal> {
    checkGoalsRateLimit(`updateGoalProgress:${goalId}`, 100);
    try {
      const { data, error } = await supabase
        .from('trainee_goals')
        .update({ current_value: currentValue } as any)
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בעדכון התקדמות');
    }
  },
};
