import { supabase } from '../lib/supabase';
import { rateLimiter } from '../utils/rateLimiter';
import { handleApiError } from '../utils/apiErrorHandler';

export interface Equipment {
  id: string;
  trainer_id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export const equipmentApi = {
  async getAll(trainerId: string) {
    rateLimiter.check('getEquipment', 100);
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('name');
    if (error) throw handleApiError(error, 'שגיאה בטעינת ציוד', 'equipmentApi.getAll');
    return data as Equipment[];
  },

  async create(trainerId: string, name: string, category?: string) {
    rateLimiter.check('createEquipment', 50);
    const { data, error } = await supabase
      .from('equipment')
      .insert({ trainer_id: trainerId, name, category } as never)
      .select()
      .single();
    if (error) throw handleApiError(error, 'שגיאה ביצירת ציוד', 'equipmentApi.create');
    return data as Equipment;
  },

  async update(equipmentId: string, updates: { name?: string; category?: string }) {
    rateLimiter.check('updateEquipment', 50);
    const { data, error } = await supabase
      .from('equipment')
      .update(updates as never)
      .eq('id', equipmentId)
      .select()
      .single();
    if (error) throw handleApiError(error, 'שגיאה בעדכון ציוד', 'equipmentApi.update');
    return data as Equipment;
  },

  async delete(equipmentId: string) {
    rateLimiter.check('deleteEquipment', 20);
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', equipmentId);
    if (error) throw handleApiError(error, 'שגיאה במחיקת ציוד', 'equipmentApi.delete');
  },
};
