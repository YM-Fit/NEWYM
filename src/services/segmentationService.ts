/**
 * Segmentation Service
 * שירות לניהול segmentation ופילטרים
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';
import type { Trainee } from '../types';

/**
 * Filter Condition
 */
export interface FilterCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty';
  value: any;
}

/**
 * Segment
 */
export interface Segment {
  id: string;
  trainer_id: string;
  name: string;
  description?: string;
  filter_criteria: FilterCondition[];
  auto_update: boolean;
  client_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Segmentation Service
 */
export class SegmentationService {
  /**
   * Get all segments for a trainer
   * @param trainerId - Trainer ID
   * @returns Promise with segments
   */
  static async getSegments(
    trainerId: string
  ): Promise<ApiResponse<Segment[]>> {
    try {
      const { data, error } = await supabase
        .from('crm_segments')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError(error, 'getSegments', { table: 'crm_segments', trainerId });
        return { error: error.message };
      }

      // Calculate client count for each segment
      const segmentsWithCount = await Promise.all(
        (data || []).map(async (segment) => {
          const clientsResult = await this.getSegmentClients(segment.id);
          return {
            ...segment,
            client_count: clientsResult.success && clientsResult.data ? clientsResult.data.length : 0,
          };
        })
      );

      return { data: segmentsWithCount, success: true };
    } catch (error) {
      logger.error('Error getting segments', error, 'SegmentationService');
      return { error: 'שגיאה בטעינת segments' };
    }
  }

  /**
   * Create segment
   * @param segment - Segment data
   * @returns Promise with created segment
   */
  static async createSegment(
    segment: Omit<Segment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<Segment>> {
    try {
      const { data, error } = await supabase
        .from('crm_segments')
        .insert([{
          trainer_id: segment.trainer_id,
          name: segment.name,
          description: segment.description,
          filter_criteria: segment.filter_criteria,
          auto_update: segment.auto_update,
        }])
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'createSegment', { table: 'crm_segments' });
        return { error: error.message };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error creating segment', error, 'SegmentationService');
      return { error: 'שגיאה ביצירת segment' };
    }
  }

  /**
   * Update segment
   * @param segmentId - Segment ID
   * @param updates - Updates to apply
   * @returns Promise with updated segment
   */
  static async updateSegment(
    segmentId: string,
    updates: Partial<Segment>
  ): Promise<ApiResponse<Segment>> {
    try {
      const { data, error } = await supabase
        .from('crm_segments')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', segmentId)
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'updateSegment', { table: 'crm_segments', segmentId });
        return { error: error.message };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error updating segment', error, 'SegmentationService');
      return { error: 'שגיאה בעדכון segment' };
    }
  }

  /**
   * Delete segment
   * @param segmentId - Segment ID
   * @returns Promise with success status
   */
  static async deleteSegment(segmentId: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('crm_segments')
        .delete()
        .eq('id', segmentId);

      if (error) {
        logSupabaseError(error, 'deleteSegment', { table: 'crm_segments', segmentId });
        return { error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting segment', error, 'SegmentationService');
      return { error: 'שגיאה במחיקת segment' };
    }
  }

  /**
   * Get clients matching segment criteria
   * @param segmentId - Segment ID
   * @returns Promise with matching clients
   */
  static async getSegmentClients(
    segmentId: string
  ): Promise<ApiResponse<Trainee[]>> {
    try {
      const { data: segment, error: segmentError } = await supabase
        .from('crm_segments')
        .select('*')
        .eq('id', segmentId)
        .single();

      if (segmentError || !segment) {
        return { error: 'Segment לא נמצא' };
      }

      return this.filterClients(segment.trainer_id, segment.filter_criteria);
    } catch (error) {
      logger.error('Error getting segment clients', error, 'SegmentationService');
      return { error: 'שגיאה בטעינת לקוחות segment' };
    }
  }

  /**
   * Filter clients based on criteria
   * @param trainerId - Trainer ID
   * @param criteria - Filter criteria
   * @returns Promise with filtered clients
   */
  static async filterClients(
    trainerId: string,
    criteria: FilterCondition[]
  ): Promise<ApiResponse<Trainee[]>> {
    try {
      let query = supabase
        .from('trainees')
        .select('*')
        .eq('trainer_id', trainerId);

      // Apply filters
      criteria.forEach((condition) => {
        switch (condition.operator) {
          case 'equals':
            query = query.eq(condition.field, condition.value);
            break;
          case 'not_equals':
            query = query.neq(condition.field, condition.value);
            break;
          case 'greater_than':
            query = query.gt(condition.field, condition.value);
            break;
          case 'less_than':
            query = query.lt(condition.field, condition.value);
            break;
          case 'contains':
            query = query.ilike(condition.field, `%${condition.value}%`);
            break;
          case 'in':
            query = query.in(condition.field, condition.value);
            break;
          case 'not_in':
            // Supabase doesn't have not_in, so we'll filter in memory
            break;
          case 'is_empty':
            query = query.is(condition.field, null);
            break;
          case 'is_not_empty':
            query = query.not(condition.field, 'is', null);
            break;
        }
      });

      const { data, error } = await query;

      if (error) {
        logSupabaseError(error, 'filterClients', { table: 'trainees', trainerId });
        return { error: error.message };
      }

      // Apply not_in filter in memory if needed
      let filteredData = data || [];
      criteria.forEach((condition) => {
        if (condition.operator === 'not_in' && Array.isArray(condition.value)) {
          filteredData = filteredData.filter(
            (client: any) => !condition.value.includes(client[condition.field])
          );
        }
      });

      return { data: filteredData as Trainee[], success: true };
    } catch (error) {
      logger.error('Error filtering clients', error, 'SegmentationService');
      return { error: 'שגיאה בסינון לקוחות' };
    }
  }

  /**
   * Bulk update clients
   * @param traineeIds - Array of trainee IDs
   * @param updates - Updates to apply
   * @returns Promise with success status
   */
  static async bulkUpdateClients(
    traineeIds: string[],
    updates: Partial<Trainee>
  ): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('trainees')
        .update(updates)
        .in('id', traineeIds);

      if (error) {
        logSupabaseError(error, 'bulkUpdateClients', { table: 'trainees', count: traineeIds.length });
        return { error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error bulk updating clients', error, 'SegmentationService');
      return { error: 'שגיאה בעדכון לקוחות' };
    }
  }

  /**
   * Export filtered clients
   * @param trainerId - Trainer ID
   * @param criteria - Filter criteria
   * @returns Promise with export data
   */
  static async exportFilteredClients(
    trainerId: string,
    criteria: FilterCondition[]
  ): Promise<ApiResponse<any[]>> {
    try {
      const result = await this.filterClients(trainerId, criteria);
      if (!result.success || !result.data) {
        return result;
      }

      // Format for export
      const exportData = result.data.map((client) => ({
        שם: client.full_name,
        אימייל: client.email || '',
        טלפון: client.phone || '',
        סטטוס: client.crm_status || '',
        'ערך חוזה': client.contract_value || 0,
        'סטטוס תשלום': client.payment_status || '',
      }));

      return { data: exportData, success: true };
    } catch (error) {
      logger.error('Error exporting clients', error, 'SegmentationService');
      return { error: 'שגיאה בייצוא לקוחות' };
    }
  }
}
