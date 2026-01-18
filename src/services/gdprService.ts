/**
 * GDPR Compliance Service
 * Service for handling GDPR requirements: data export, deletion, and anonymization
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import type { ApiResponse } from '../api/types';
import { AuditService } from './auditService';

export interface UserDataExport {
  personal_info: {
    trainer?: any;
    trainee?: any;
  };
  training_data: {
    workouts?: any[];
    workout_plans?: any[];
    measurements?: any[];
  };
  nutrition_data: {
    meal_plans?: any[];
    meals?: any[];
    food_diary?: any[];
  };
  metadata: {
    export_date: string;
    user_id: string;
    format: 'json';
  };
}

/**
 * Export all user data (GDPR Right to Data Portability)
 * 
 * @param userId - User ID (trainer or trainee)
 * @param userType - 'trainer' or 'trainee'
 * @returns Promise resolving to exported user data
 * 
 * @example
 * ```typescript
 * const exportData = await gdprService.exportUserData('user-123', 'trainer');
 * // Returns all user data in JSON format
 * ```
 */
export async function exportUserData(
  userId: string,
  userType: 'trainer' | 'trainee'
): Promise<ApiResponse<UserDataExport>> {
  try {
    const exportDate = new Date().toISOString();
    const exportData: UserDataExport = {
      personal_info: {},
      crm_data: {},
      training_data: {},
      nutrition_data: {},
      metadata: {
        export_date: exportDate,
        user_id: userId,
        format: 'json',
      },
    };

    if (userType === 'trainer') {
      // Get trainer personal info
      const { data: trainer } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', userId)
        .single();

      if (trainer) {
        exportData.personal_info.trainer = trainer;
      }

      // Get CRM data
      const { data: clients } = await supabase
        .from('google_calendar_clients')
        .select('*')
        .eq('trainer_id', userId);

      if (clients) {
        exportData.crm_data.clients = clients;
      }

      const { data: interactions } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('trainer_id', userId);

      if (interactions) {
        exportData.crm_data.interactions = interactions;
      }

      const { data: contracts } = await supabase
        .from('crm_contracts')
        .select('*')
        .eq('trainer_id', userId);

      if (contracts) {
        exportData.crm_data.contracts = contracts;
      }

      const { data: payments } = await supabase
        .from('crm_payments')
        .select('*')
        .eq('trainer_id', userId);

      if (payments) {
        exportData.crm_data.payments = payments;
      }

      const { data: documents } = await supabase
        .from('crm_documents')
        .select('*')
        .eq('trainer_id', userId);

      if (documents) {
        exportData.crm_data.documents = documents;
      }
    } else {
      // Get trainee personal info
      const { data: trainee } = await supabase
        .from('trainees')
        .select('*')
        .eq('id', userId)
        .single();

      if (trainee) {
        exportData.personal_info.trainee = trainee;
      }

      // Get training data
      const { data: workouts } = await supabase
        .from('workouts')
        .select('*, workout_trainees(*), workout_exercises(*, exercise_sets(*))')
        .eq('trainer_id', (await supabase.from('trainees').select('trainer_id').eq('id', userId).single()).data?.trainer_id);

      if (workouts) {
        exportData.training_data.workouts = workouts;
      }

      const { data: workoutPlans } = await supabase
        .from('trainee_workout_plans')
        .select('*')
        .eq('trainee_id', userId);

      if (workoutPlans) {
        exportData.training_data.workout_plans = workoutPlans;
      }

      const { data: measurements } = await supabase
        .from('measurements')
        .select('*')
        .eq('trainee_id', userId);

      if (measurements) {
        exportData.training_data.measurements = measurements;
      }

      // Get nutrition data
      const { data: mealPlans } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('trainee_id', userId);

      if (mealPlans) {
        exportData.nutrition_data.meal_plans = mealPlans;
      }

      const { data: meals } = await supabase
        .from('meals')
        .select('*')
        .eq('trainee_id', userId);

      if (meals) {
        exportData.nutrition_data.meals = meals;
      }

      const { data: foodDiary } = await supabase
        .from('food_diary')
        .select('*, food_diary_meals(*)')
        .eq('trainee_id', userId);

      if (foodDiary) {
        exportData.nutrition_data.food_diary = foodDiary;
      }
    }

    // Log audit event
    await AuditService.logCreate(userId, 'gdpr_exports', userId, {
      export_date: exportDate,
      user_type: userType,
    });

    return { data: exportData, success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to export user data' };
  }
}

/**
 * Delete all user data (GDPR Right to Erasure)
 * 
 * @param userId - User ID to delete
 * @param userType - 'trainer' or 'trainee'
 * @returns Promise resolving to success/error response
 * 
 * @example
 * ```typescript
 * await gdprService.deleteUserData('user-123', 'trainer');
 * // All user data will be permanently deleted
 * ```
 */
export async function deleteUserData(
  userId: string,
  userType: 'trainer' | 'trainee'
): Promise<ApiResponse<void>> {
  try {
    // Log audit event before deletion
    await AuditService.logDelete(userId, 'users', userId, {
      user_type: userType,
      deletion_date: new Date().toISOString(),
    });

    if (userType === 'trainer') {
      // Delete trainer data (cascade will handle related data)
      const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', userId);

      if (error) {
        logSupabaseError('Failed to delete trainer data', error);
        return { error: 'Failed to delete trainer data' };
      }
    } else {
      // Delete trainee data
      const { error } = await supabase
        .from('trainees')
        .delete()
        .eq('id', userId);

      if (error) {
        logSupabaseError('Failed to delete trainee data', error);
        return { error: 'Failed to delete trainee data' };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete user data' };
  }
}

/**
 * Anonymize user data (GDPR Right to be Forgotten)
 * Replace identifying information with anonymous placeholders
 * 
 * @param userId - User ID to anonymize
 * @param userType - 'trainer' or 'trainee'
 * @returns Promise resolving to success/error response
 * 
 * @example
 * ```typescript
 * await gdprService.anonymizeUserData('user-123', 'trainer');
 * // Personal information will be anonymized
 * ```
 */
export async function anonymizeUserData(
  userId: string,
  userType: 'trainer' | 'trainee'
): Promise<ApiResponse<void>> {
  try {
    if (userType === 'trainer') {
      // Anonymize trainer data
      const { error } = await supabase
        .from('trainers')
        .update({
          email: `deleted_${userId.substring(0, 8)}@anonymized.local`,
          full_name: 'Deleted User',
        })
        .eq('id', userId);

      if (error) {
        logSupabaseError('Failed to anonymize trainer data', error);
        return { error: 'Failed to anonymize trainer data' };
      }
    } else {
      // Anonymize trainee data
      const { error } = await supabase
        .from('trainees')
        .update({
          full_name: 'Deleted User',
          email: `deleted_${userId.substring(0, 8)}@anonymized.local`,
          phone: null,
          notes: '[Anonymized]',
        })
        .eq('id', userId);

      if (error) {
        logSupabaseError('Failed to anonymize trainee data', error);
        return { error: 'Failed to anonymize trainee data' };
      }
    }

    // Log audit event
    await AuditService.logUpdate(userId, 'users', userId, {}, {
      anonymized: true,
      anonymization_date: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to anonymize user data' };
  }
}

/**
 * GDPR Service class - convenience wrapper
 */
export class GdprService {
  static async exportUserData(userId: string, userType: 'trainer' | 'trainee') {
    return exportUserData(userId, userType);
  }

  static async deleteUserData(userId: string, userType: 'trainer' | 'trainee') {
    return deleteUserData(userId, userType);
  }

  static async anonymizeUserData(userId: string, userType: 'trainer' | 'trainee') {
    return anonymizeUserData(userId, userType);
  }
}
