import { supabase } from '../lib/supabase';
import { rateLimiter } from '../utils/rateLimiter';
import { handleApiError } from '../utils/apiErrorHandler';

export interface MeasurementRecord {
  id: string;
  trainee_id: string;
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
  created_at: string;
}

export interface CreateMeasurementInput {
  trainee_id: string;
  measurement_date: string;
  weight?: number | null;
  body_fat_percentage?: number | null;
  muscle_mass?: number | null;
  water_percentage?: number | null;
  bmi?: number | null;
  bmr?: number | null;
  metabolic_age?: number | null;
  source: 'tanita' | 'manual';
  notes?: string | null;
  pair_member?: 'member_1' | 'member_2' | null;
  chest_back?: number | null;
  belly?: number | null;
  glutes?: number | null;
  thigh?: number | null;
  right_arm?: number | null;
  left_arm?: number | null;
}

export const measurementsApi = {
  async getByTrainee(traineeId: string, limit?: number) {
    rateLimiter.check('getMeasurements', 100);
    let query = supabase
      .from('measurements')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('measurement_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw handleApiError(error, { context: 'measurementsApi.getByTrainee' });
    return data as MeasurementRecord[];
  },

  async create(input: CreateMeasurementInput) {
    rateLimiter.check('createMeasurement', 50);
    const { data, error } = await supabase
      .from('measurements')
      .insert(input)
      .select()
      .single();
    if (error) throw handleApiError(error, { context: 'measurementsApi.create' });
    return data as MeasurementRecord;
  },

  async update(measurementId: string, updates: Partial<CreateMeasurementInput>) {
    rateLimiter.check('updateMeasurement', 50);
    const { data, error } = await supabase
      .from('measurements')
      .update(updates)
      .eq('id', measurementId)
      .select()
      .single();
    if (error) throw handleApiError(error, { context: 'measurementsApi.update' });
    return data as MeasurementRecord;
  },

  async delete(measurementId: string) {
    rateLimiter.check('deleteMeasurement', 20);
    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', measurementId);
    if (error) throw handleApiError(error, { context: 'measurementsApi.delete' });
  },
};
