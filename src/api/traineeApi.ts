/**
 * Trainee API layer
 */

import { supabase } from '../lib/supabase';
import type { ApiResponse } from './types';

/**
 * Get trainee by ID
 */
export async function getTrainee(traineeId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('trainees')
      .select('*, trainer:trainers(full_name)')
      .eq('id', traineeId)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    return { data: data || null, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת נתוני המתאמן' };
  }
}

/**
 * Get all trainees for a trainer
 */
export async function getTrainees(trainerId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('trainees')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת המתאמנים' };
  }
}

/**
 * Create trainee
 */
export async function createTrainee(
  trainerId: string,
  traineeData: any
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('trainees')
      .insert([
        {
          trainer_id: trainerId,
          ...traineeData,
        },
      ])
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה ביצירת המתאמן' };
  }
}

/**
 * Update trainee
 */
export async function updateTrainee(
  traineeId: string,
  traineeData: any
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('trainees')
      .update(traineeData)
      .eq('id', traineeId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בעדכון המתאמן' };
  }
}

/**
 * Delete trainee
 */
export async function deleteTrainee(traineeId: string): Promise<ApiResponse> {
  try {
    const { error } = await supabase
      .from('trainees')
      .delete()
      .eq('id', traineeId);

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה במחיקת המתאמן' };
  }
}
