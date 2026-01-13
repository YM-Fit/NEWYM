import { supabase } from '../lib/supabase';
import { handleApiError } from './config';
import { logger } from '../utils/logger';

export interface WeeklyTask {
  id: string;
  trainee_id: string;
  trainer_id: string;
  task_title: string;
  task_description: string | null;
  task_type: 'workout_focus' | 'nutrition' | 'habit' | 'measurement' | 'custom';
  priority: 'low' | 'medium' | 'high';
  week_start_date: string;
  week_end_date: string;
  is_completed: boolean;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  trainee_id: string;
  trainer_id: string;
  task_title: string;
  task_description?: string | null;
  task_type: 'workout_focus' | 'nutrition' | 'habit' | 'measurement' | 'custom';
  priority?: 'low' | 'medium' | 'high';
  week_start_date: string;
  week_end_date: string;
}

// Helper to check if error is table-not-found
function isTableNotFoundError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as any;
    // Check for Supabase PostgREST error code PGRST205 (table not found)
    if (err.code === 'PGRST205' || err.code === '42P01') {
      return true;
    }
    // Check error message/hint for table not found
    if (err.message?.includes("Could not find the table") || 
        err.hint?.includes("Could not find the table") ||
        err.message?.includes("does not exist")) {
      return true;
    }
  }
  return false;
}

export const tasksApi = {
  async getTraineeTasks(traineeId: string, weekStart?: string): Promise<WeeklyTask[]> {
    try {
      let query = supabase
        .from('weekly_tasks')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('created_at', { ascending: false });

      if (weekStart) {
        query = query.eq('week_start_date', weekStart);
      }

      const { data, error } = await query;

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (isTableNotFoundError(error)) {
          logger.warn('weekly_tasks table not found. Migration may not have been run.', error, 'tasksApi');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      // Check again in catch block in case error was thrown
      if (isTableNotFoundError(error)) {
        logger.warn('weekly_tasks table not found. Migration may not have been run.', error, 'tasksApi');
        return [];
      }
      throw handleApiError(error, 'שגיאה בטעינת משימות');
    }
  },

  async createTask(input: CreateTaskInput): Promise<WeeklyTask> {
    try {
      const { data, error } = await supabase
        .from('weekly_tasks')
        .insert([input])
        .select()
        .single();

      if (error) {
        if (isTableNotFoundError(error)) {
          throw new Error('טבלת המשימות השבועיות לא קיימת במסד הנתונים. יש להריץ את המיגרציה: 20260115000000_add_advanced_features.sql');
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (isTableNotFoundError(error)) {
        throw new Error('טבלת המשימות השבועיות לא קיימת במסד הנתונים. יש להריץ את המיגרציה: 20260115000000_add_advanced_features.sql');
      }
      throw handleApiError(error, 'שגיאה ביצירת משימה');
    }
  },

  async updateTask(taskId: string, updates: Partial<CreateTaskInput>): Promise<WeeklyTask> {
    try {
      const { data, error } = await supabase
        .from('weekly_tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        if (isTableNotFoundError(error)) {
          throw new Error('טבלת המשימות השבועיות לא קיימת במסד הנתונים. יש להריץ את המיגרציה: 20260115000000_add_advanced_features.sql');
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (isTableNotFoundError(error)) {
        throw new Error('טבלת המשימות השבועיות לא קיימת במסד הנתונים. יש להריץ את המיגרציה: 20260115000000_add_advanced_features.sql');
      }
      throw handleApiError(error, 'שגיאה בעדכון משימה');
    }
  },

  async completeTask(taskId: string, completionNotes?: string): Promise<WeeklyTask> {
    try {
      const { data, error } = await supabase
        .from('weekly_tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes || null,
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        if (isTableNotFoundError(error)) {
          throw new Error('טבלת המשימות השבועיות לא קיימת במסד הנתונים. יש להריץ את המיגרציה: 20260115000000_add_advanced_features.sql');
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (isTableNotFoundError(error)) {
        throw new Error('טבלת המשימות השבועיות לא קיימת במסד הנתונים. יש להריץ את המיגרציה: 20260115000000_add_advanced_features.sql');
      }
      throw handleApiError(error, 'שגיאה בסימון משימה כמושלמת');
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('weekly_tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        if (isTableNotFoundError(error)) {
          throw new Error('טבלת המשימות השבועיות לא קיימת במסד הנתונים. יש להריץ את המיגרציה: 20260115000000_add_advanced_features.sql');
        }
        throw error;
      }
    } catch (error) {
      if (isTableNotFoundError(error)) {
        throw new Error('טבלת המשימות השבועיות לא קיימת במסד הנתונים. יש להריץ את המיגרציה: 20260115000000_add_advanced_features.sql');
      }
      throw handleApiError(error, 'שגיאה במחיקת משימה');
    }
  },
};
