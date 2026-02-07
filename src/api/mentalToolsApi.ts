import { supabase } from '../lib/supabase';
import { rateLimiter } from '../utils/rateLimiter';
import { handleApiError } from '../utils/apiErrorHandler';

export interface MentalTool {
  id: string;
  trainee_id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  category: 'motivation' | 'discipline' | 'patience' | 'focus' | 'other';
  priority: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMentalToolInput {
  trainee_id: string;
  trainer_id: string;
  title: string;
  description?: string | null;
  category: MentalTool['category'];
  priority: number;
}

export interface UpdateMentalToolInput {
  title?: string;
  description?: string | null;
  category?: MentalTool['category'];
  priority?: number;
  is_completed?: boolean;
}

export const mentalToolsApi = {
  async getByTrainee(traineeId: string): Promise<MentalTool[]> {
    rateLimiter.check('getMentalTools', 100);
    const { data, error } = await supabase
      .from('mental_tools')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw handleApiError(error, 'שגיאה בטעינת כלים מנטליים', 'mentalToolsApi.getByTrainee');
    return data as MentalTool[];
  },

  async create(input: CreateMentalToolInput): Promise<MentalTool> {
    rateLimiter.check('createMentalTool', 50);
    const { data, error } = await supabase
      .from('mental_tools')
      .insert(input as never)
      .select()
      .single();
    if (error) throw handleApiError(error, 'שגיאה ביצירת כלי מנטלי', 'mentalToolsApi.create');
    return data as MentalTool;
  },

  async update(toolId: string, updates: UpdateMentalToolInput): Promise<MentalTool> {
    rateLimiter.check('updateMentalTool', 50);
    const { data, error } = await supabase
      .from('mental_tools')
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq('id', toolId)
      .select()
      .single();
    if (error) throw handleApiError(error, 'שגיאה בעדכון כלי מנטלי', 'mentalToolsApi.update');
    return data as MentalTool;
  },

  async delete(toolId: string): Promise<void> {
    rateLimiter.check('deleteMentalTool', 20);
    const { error } = await supabase
      .from('mental_tools')
      .delete()
      .eq('id', toolId);
    if (error) throw handleApiError(error, 'שגיאה במחיקת כלי מנטלי', 'mentalToolsApi.delete');
  },

  async toggleComplete(toolId: string, isCompleted: boolean): Promise<MentalTool> {
    rateLimiter.check('updateMentalTool', 50);
    const { data, error } = await supabase
      .from('mental_tools')
      .update({
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', toolId)
      .select()
      .single();
    if (error) throw handleApiError(error, 'שגיאה בעדכון סטטוס כלי מנטלי', 'mentalToolsApi.toggleComplete');
    return data as MentalTool;
  },
};
