/**
 * Bulk Actions Service
 * שירות לפעולות מרובות על לקוחות
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import { SegmentationService } from './segmentationService';
import { CrmPipelineService } from './crmPipelineService';
import { EmailTemplateService } from './emailTemplateService';
import { exportClientsToCSV, exportClientsToPDF } from '../utils/exportUtils';
import { CRM_STATUS, type CrmStatus } from '../constants/crmConstants';
import type { ApiResponse } from '../api/types';
import type { Trainee } from '../types';

/**
 * Bulk Action Result
 */
export interface BulkActionResult {
  success: number;
  failed: number;
  errors: Array<{ traineeId: string; error: string }>;
}

/**
 * Bulk Update Options
 */
export interface BulkUpdateOptions {
  crm_status?: CrmStatus;
  payment_status?: string;
  contract_type?: string;
  contract_value?: number;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Bulk Actions Service
 */
export class BulkActionsService {
  /**
   * Bulk update clients
   * @param traineeIds - Array of trainee IDs
   * @param updates - Updates to apply
   * @returns Promise with bulk update result
   */
  static async bulkUpdate(
    traineeIds: string[],
    updates: BulkUpdateOptions
  ): Promise<ApiResponse<BulkActionResult>> {
    try {
      if (!traineeIds || traineeIds.length === 0) {
        return { error: 'לא נבחרו לקוחות' };
      }

      const result: BulkActionResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Prepare update data
      const updateData: any = {};

      if (updates.crm_status) {
        updateData.crm_status = updates.crm_status;
      }
      if (updates.payment_status) {
        updateData.payment_status = updates.payment_status;
      }
      if (updates.contract_type) {
        updateData.contract_type = updates.contract_type;
      }
      if (updates.contract_value !== undefined) {
        updateData.contract_value = updates.contract_value;
      }
      if (updates.tags) {
        updateData.tags = updates.tags;
      }
      if (updates.customFields) {
        Object.assign(updateData, updates.customFields);
      }

      // Perform bulk update
      const updateResult = await SegmentationService.bulkUpdateClients(traineeIds, updateData);

      if (updateResult.success) {
        result.success = traineeIds.length;
        
        // If status was updated, log pipeline movements
        if (updates.crm_status) {
          await CrmPipelineService.bulkUpdateStatus(traineeIds, updates.crm_status);
        }
      } else {
        result.failed = traineeIds.length;
        result.errors.push({
          traineeId: 'all',
          error: updateResult.error || 'שגיאה בעדכון',
        });
      }

      return { data: result, success: true };
    } catch (error) {
      logger.error('Error bulk updating clients', error, 'BulkActionsService');
      return { error: 'שגיאה בעדכון לקוחות' };
    }
  }

  /**
   * Bulk delete clients
   * @param traineeIds - Array of trainee IDs
   * @param trainerId - Trainer ID (for validation)
   * @returns Promise with bulk delete result
   */
  static async bulkDelete(
    traineeIds: string[],
    trainerId: string
  ): Promise<ApiResponse<BulkActionResult>> {
    try {
      if (!traineeIds || traineeIds.length === 0) {
        return { error: 'לא נבחרו לקוחות' };
      }

      const result: BulkActionResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Verify all trainees belong to trainer
      const { data: trainees, error: verifyError } = await supabase
        .from('trainees')
        .select('id')
        .eq('trainer_id', trainerId)
        .in('id', traineeIds);

      if (verifyError) {
        logSupabaseError(verifyError, 'bulkDelete.verify', { table: 'trainees', trainerId });
        return { error: 'שגיאה באימות לקוחות' };
      }

      const validIds = (trainees || []).map(t => t.id);
      const invalidIds = traineeIds.filter(id => !validIds.includes(id));

      if (invalidIds.length > 0) {
        invalidIds.forEach(id => {
          result.errors.push({
            traineeId: id,
            error: 'לקוח לא נמצא או לא שייך למאמן',
          });
        });
        result.failed = invalidIds.length;
      }

      // Delete valid trainees
      if (validIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('trainees')
          .delete()
          .in('id', validIds);

        if (deleteError) {
          logSupabaseError(deleteError, 'bulkDelete', { table: 'trainees', count: validIds.length });
          validIds.forEach(id => {
            result.errors.push({
              traineeId: id,
              error: deleteError.message,
            });
          });
          result.failed += validIds.length;
        } else {
          result.success = validIds.length;
        }
      }

      return { data: result, success: true };
    } catch (error) {
      logger.error('Error bulk deleting clients', error, 'BulkActionsService');
      return { error: 'שגיאה במחיקת לקוחות' };
    }
  }

  /**
   * Bulk update status
   * @param traineeIds - Array of trainee IDs
   * @param newStatus - New CRM status
   * @returns Promise with bulk update result
   */
  static async bulkUpdateStatus(
    traineeIds: string[],
    newStatus: CrmStatus
  ): Promise<ApiResponse<BulkActionResult>> {
    try {
      if (!traineeIds || traineeIds.length === 0) {
        return { error: 'לא נבחרו לקוחות' };
      }

      const result = await CrmPipelineService.bulkUpdateStatus(traineeIds, newStatus);

      if (result.success) {
        return {
          data: {
            success: traineeIds.length,
            failed: 0,
            errors: [],
          },
          success: true,
        };
      }

      return {
        data: {
          success: 0,
          failed: traineeIds.length,
          errors: [{
            traineeId: 'all',
            error: result.error || 'שגיאה בעדכון סטטוס',
          }],
        },
        success: false,
      };
    } catch (error) {
      logger.error('Error bulk updating status', error, 'BulkActionsService');
      return { error: 'שגיאה בעדכון סטטוסים' };
    }
  }

  /**
   * Bulk export clients
   * @param traineeIds - Array of trainee IDs (empty for all)
   * @param trainerId - Trainer ID
   * @param format - Export format ('csv' | 'pdf')
   * @param filters - Optional filter criteria
   * @returns Promise with export result
   */
  static async bulkExport(
    traineeIds: string[],
    trainerId: string,
    format: 'csv' | 'pdf' = 'csv',
    filters?: any
  ): Promise<ApiResponse> {
    try {
      // Get trainees data
      let query = supabase
        .from('trainees')
        .select('*')
        .eq('trainer_id', trainerId);

      if (traineeIds && traineeIds.length > 0) {
        query = query.in('id', traineeIds);
      }

      if (filters) {
        // Apply filters if provided
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            query = query.eq(key, value);
          }
        });
      }

      const { data: trainees, error } = await query;

      if (error) {
        logSupabaseError(error, 'bulkExport', { table: 'trainees', trainerId });
        return { error: 'שגיאה בטעינת לקוחות' };
      }

      if (!trainees || trainees.length === 0) {
        return { error: 'אין לקוחות לייצוא' };
      }

      // Convert trainees to CalendarClient format if needed
      const clients = trainees.map(t => ({
        id: t.id,
        client_name: t.full_name || '',
        client_email: t.email || '',
        client_phone: t.phone || '',
        trainee_id: t.id,
        total_events_count: 0,
        upcoming_events_count: 0,
      }));

      // Export based on format
      const filename = `clients-export-${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        exportClientsToCSV(clients, filename);
      } else {
        await exportClientsToPDF(clients, filename);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error bulk exporting', error, 'BulkActionsService');
      return { error: 'שגיאה בייצוא לקוחות' };
    }
  }

  /**
   * Bulk send emails
   * @param traineeIds - Array of trainee IDs
   * @param templateId - Email template ID
   * @param trainerId - Trainer ID
   * @param customVariables - Custom variables for template
   * @returns Promise with send result
   */
  static async bulkSendEmails(
    traineeIds: string[],
    templateId: string,
    trainerId: string,
    customVariables?: Record<string, string>
  ): Promise<ApiResponse<BulkActionResult>> {
    try {
      if (!traineeIds || traineeIds.length === 0) {
        return { error: 'לא נבחרו לקוחות' };
      }

      const result = await EmailTemplateService.sendBulkEmailsFromTemplate(
        templateId,
        traineeIds,
        trainerId,
        customVariables
      );

      if (result.success && result.data) {
        return result;
      }

      return {
        data: {
          success: 0,
          failed: traineeIds.length,
          errors: [{
            traineeId: 'all',
            error: result.error || 'שגיאה בשליחת אימיילים',
          }],
        },
        success: false,
      };
    } catch (error) {
      logger.error('Error bulk sending emails', error, 'BulkActionsService');
      return { error: 'שגיאה בשליחת אימיילים מרובים' };
    }
  }

  /**
   * Bulk add tags
   * @param traineeIds - Array of trainee IDs
   * @param tags - Tags to add
   * @returns Promise with bulk update result
   */
  static async bulkAddTags(
    traineeIds: string[],
    tags: string[]
  ): Promise<ApiResponse<BulkActionResult>> {
    try {
      if (!traineeIds || traineeIds.length === 0) {
        return { error: 'לא נבחרו לקוחות' };
      }

      if (!tags || tags.length === 0) {
        return { error: 'לא נבחרו תגיות' };
      }

      // Get current tags for each trainee
      const { data: trainees, error: fetchError } = await supabase
        .from('trainees')
        .select('id, tags')
        .in('id', traineeIds);

      if (fetchError) {
        logSupabaseError(fetchError, 'bulkAddTags.fetch', { table: 'trainees' });
        return { error: 'שגיאה בטעינת לקוחות' };
      }

      const result: BulkActionResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Update each trainee with merged tags
      for (const trainee of trainees || []) {
        const currentTags = (trainee.tags || []) as string[];
        const mergedTags = [...new Set([...currentTags, ...tags])];

        const { error: updateError } = await supabase
          .from('trainees')
          .update({ tags: mergedTags })
          .eq('id', trainee.id);

        if (updateError) {
          result.failed++;
          result.errors.push({
            traineeId: trainee.id,
            error: updateError.message,
          });
        } else {
          result.success++;
        }
      }

      return { data: result, success: true };
    } catch (error) {
      logger.error('Error bulk adding tags', error, 'BulkActionsService');
      return { error: 'שגיאה בהוספת תגיות' };
    }
  }

  /**
   * Bulk remove tags
   * @param traineeIds - Array of trainee IDs
   * @param tags - Tags to remove
   * @returns Promise with bulk update result
   */
  static async bulkRemoveTags(
    traineeIds: string[],
    tags: string[]
  ): Promise<ApiResponse<BulkActionResult>> {
    try {
      if (!traineeIds || traineeIds.length === 0) {
        return { error: 'לא נבחרו לקוחות' };
      }

      if (!tags || tags.length === 0) {
        return { error: 'לא נבחרו תגיות' };
      }

      // Get current tags for each trainee
      const { data: trainees, error: fetchError } = await supabase
        .from('trainees')
        .select('id, tags')
        .in('id', traineeIds);

      if (fetchError) {
        logSupabaseError(fetchError, 'bulkRemoveTags.fetch', { table: 'trainees' });
        return { error: 'שגיאה בטעינת לקוחות' };
      }

      const result: BulkActionResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Update each trainee with filtered tags
      for (const trainee of trainees || []) {
        const currentTags = (trainee.tags || []) as string[];
        const filteredTags = currentTags.filter(tag => !tags.includes(tag));

        const { error: updateError } = await supabase
          .from('trainees')
          .update({ tags: filteredTags })
          .eq('id', trainee.id);

        if (updateError) {
          result.failed++;
          result.errors.push({
            traineeId: trainee.id,
            error: updateError.message,
          });
        } else {
          result.success++;
        }
      }

      return { data: result, success: true };
    } catch (error) {
      logger.error('Error bulk removing tags', error, 'BulkActionsService');
      return { error: 'שגיאה בהסרת תגיות' };
    }
  }
}
