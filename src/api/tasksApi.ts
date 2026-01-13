import { supabase } from '../lib/supabase';
import { handleApiError } from './config';

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

      if (error) throw error;
      return data || [];
    } catch (error) {
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

      if (error) throw error;
      return data;
    } catch (error) {
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

      if (error) throw error;
      return data;
    } catch (error) {
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

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בסימון משימה כמושלמת');
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('weekly_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error, 'שגיאה במחיקת משימה');
    }
  },
};
