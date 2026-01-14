import { supabase } from '../lib/supabase';
import { handleApiError } from './config';

export interface TraineeHabit {
  id: string;
  trainee_id: string;
  habit_name: string;
  habit_type: 'water' | 'steps' | 'sleep' | 'nutrition' | 'custom';
  target_value: number | null;
  unit: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  actual_value: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateHabitInput {
  trainee_id: string;
  habit_name: string;
  habit_type: 'water' | 'steps' | 'sleep' | 'nutrition' | 'custom';
  target_value?: number | null;
  unit?: string | null;
}

export interface CreateHabitLogInput {
  habit_id: string;
  log_date: string;
  actual_value?: number | null;
  notes?: string | null;
}

export const habitsApi = {
  async getTraineeHabits(traineeId: string): Promise<TraineeHabit[]> {
    try {
      const { data, error } = await supabase
        .from('trainee_habits')
        .select('*')
        .eq('trainee_id', traineeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // If table doesn't exist (404), return empty array instead of throwing
      if (error) {
        // Check if it's a 404 error (table not found) - Supabase returns PostgrestError
        const errorCode = (error as any).code;
        const errorMessage = (error as any).message || '';
        const errorDetails = (error as any).details || '';
        
        // PGRST205 is the error code for table not found
        if (errorCode === 'PGRST205' || 
            errorMessage.includes('schema cache') || 
            errorMessage.includes('not found') ||
            errorDetails.includes('trainee_habits')) {
          console.warn('trainee_habits table does not exist yet, returning empty array');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error: any) {
      // If it's a table not found error, return empty array
      const errorCode = error?.code;
      const errorMessage = error?.message || '';
      const errorDetails = error?.details || '';
      const errorCause = error?.cause;
      
      // Check original error, wrapped error, or cause
      const originalError = errorCause || error;
      const originalCode = originalError?.code;
      const originalMessage = originalError?.message || '';
      const originalDetails = originalError?.details || '';
      
      if (errorCode === 'PGRST205' || 
          originalCode === 'PGRST205' ||
          errorMessage.includes('schema cache') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('Could not find the table') ||
          originalMessage.includes('schema cache') ||
          originalMessage.includes('not found') ||
          originalMessage.includes('Could not find the table') ||
          errorDetails.includes('trainee_habits') ||
          originalDetails.includes('trainee_habits')) {
        console.warn('trainee_habits table does not exist yet, returning empty array');
        return [];
      }
      throw handleApiError(error, 'שגיאה בטעינת הרגלים');
    }
  },

  async createHabit(input: CreateHabitInput): Promise<TraineeHabit> {
    try {
      const { data, error } = await supabase
        .from('trainee_habits')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה ביצירת הרגל');
    }
  },

  async updateHabit(habitId: string, updates: Partial<CreateHabitInput>): Promise<TraineeHabit> {
    try {
      const { data, error } = await supabase
        .from('trainee_habits')
        .update(updates)
        .eq('id', habitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בעדכון הרגל');
    }
  },

  async deleteHabit(habitId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trainee_habits')
        .update({ is_active: false })
        .eq('id', habitId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error, 'שגיאה במחיקת הרגל');
    }
  },

  async getHabitLogs(habitId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> {
    try {
      let query = supabase
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habitId)
        .order('log_date', { ascending: false });

      if (startDate) {
        query = query.gte('log_date', startDate);
      }
      if (endDate) {
        query = query.lte('log_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת לוגים');
    }
  },

  async logHabit(input: CreateHabitLogInput): Promise<HabitLog> {
    try {
      const { data, error } = await supabase
        .from('habit_logs')
        .upsert([input], { onConflict: 'habit_id,log_date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה ברישום הרגל');
    }
  },

  async getHabitStreak(habitId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('log_date')
        .eq('habit_id', habitId)
        .order('log_date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return 0;

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < data.length; i++) {
        const logDate = new Date(data[i].log_date);
        logDate.setHours(0, 0, 0, 0);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);

        if (logDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בחישוב רצף');
    }
  },
};
