import { supabase } from '../lib/supabase';
import { handleApiError } from '../utils/apiErrorHandler';
import { rateLimiter } from '../utils/rateLimiter';

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

// Rate limiting helper for habits API
function checkHabitsRateLimit(key: string, maxRequests: number = 100): void {
  const rateLimitResult = rateLimiter.check(key, maxRequests, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }
}

export const habitsApi = {
  async getTraineeHabits(traineeId: string): Promise<TraineeHabit[]> {
    checkHabitsRateLimit(`getTraineeHabits:${traineeId}`, 100);
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
    checkHabitsRateLimit(`createHabit:${input.trainee_id}`, 50);
    try {
      const { data, error } = await supabase
        .from('trainee_habits')
        .insert([input] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה ביצירת הרגל');
    }
  },

  async updateHabit(habitId: string, updates: Partial<CreateHabitInput>): Promise<TraineeHabit> {
    checkHabitsRateLimit(`updateHabit:${habitId}`, 50);
    try {
      const { data, error } = await supabase
        .from('trainee_habits')
        .update(updates as never)
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
    checkHabitsRateLimit(`deleteHabit:${habitId}`, 20);
    try {
      const { error } = await supabase
        .from('trainee_habits')
        .update({ is_active: false } as never)
        .eq('id', habitId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error, 'שגיאה במחיקת הרגל');
    }
  },

  async getHabitLogs(habitId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> {
    checkHabitsRateLimit(`getHabitLogs:${habitId}`, 100);
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
    checkHabitsRateLimit(`logHabit:${input.habit_id}`, 100);
    try {
      const { data, error } = await supabase
        .from('habit_logs')
        .upsert([input] as any, { onConflict: 'habit_id,log_date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה ברישום הרגל');
    }
  },

  async getHabitStreak(habitId: string): Promise<number> {
    checkHabitsRateLimit(`getHabitStreak:${habitId}`, 100);
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
        const logDate = new Date((data[i] as { log_date: string }).log_date);
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
