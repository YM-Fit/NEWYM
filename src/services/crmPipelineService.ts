/**
 * CRM Pipeline Service
 * שירות לניהול Pipeline של לקוחות
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import { CRM_STATUS } from '../constants/crmConstants';
import type { ApiResponse } from '../api/types';
import type { Trainee } from '../types';

/**
 * Pipeline Stage
 */
export interface PipelineStage {
  status: typeof CRM_STATUS[keyof typeof CRM_STATUS];
  label: string;
  count: number;
  clients: Trainee[];
  color: string;
}

/**
 * Pipeline Statistics
 */
export interface PipelineStats {
  stages: PipelineStage[];
  total: number;
  conversionRates: Record<string, number>;
  averageTimeInStage: Record<string, number>;
  bottlenecks: string[];
}

/**
 * Lead Score Factors
 */
interface LeadScoreFactors {
  hasEmail: boolean;
  hasPhone: boolean;
  hasCalendarEvents: boolean;
  eventCount: number;
  daysSinceFirstContact: number;
  interactionCount: number;
  contractValue?: number;
}

/**
 * Pipeline Movement
 */
export interface PipelineMovement {
  traineeId: string;
  fromStatus: string;
  toStatus: string;
  movedAt: string;
  reason?: string;
}

/**
 * CRM Pipeline Service
 */
export class CrmPipelineService {
  /**
   * Get all pipeline stages with clients
   * @param trainerId - Trainer ID
   * @returns Promise with pipeline stages
   */
  static async getPipelineStages(
    trainerId: string
  ): Promise<ApiResponse<PipelineStage[]>> {
    try {
      const { data: trainees, error } = await supabase
        .from('trainees')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError(error, 'getPipelineStages', { table: 'trainees', trainerId });
        return { error: error.message };
      }

      const stages: PipelineStage[] = [
        {
          status: CRM_STATUS.LEAD,
          label: 'לידים',
          count: 0,
          clients: [],
          color: 'blue',
        },
        {
          status: CRM_STATUS.QUALIFIED,
          label: 'מוסמכים',
          count: 0,
          clients: [],
          color: 'purple',
        },
        {
          status: CRM_STATUS.ACTIVE,
          label: 'פעילים',
          count: 0,
          clients: [],
          color: 'emerald',
        },
        {
          status: CRM_STATUS.INACTIVE,
          label: 'לא פעילים',
          count: 0,
          clients: [],
          color: 'yellow',
        },
        {
          status: CRM_STATUS.CHURNED,
          label: 'נטשו',
          count: 0,
          clients: [],
          color: 'red',
        },
        {
          status: CRM_STATUS.ON_HOLD,
          label: 'מושעים',
          count: 0,
          clients: [],
          color: 'gray',
        },
      ];

      trainees?.forEach((trainee) => {
        const status = (trainee.crm_status || CRM_STATUS.ACTIVE) as typeof CRM_STATUS[keyof typeof CRM_STATUS];
        const stage = stages.find((s) => s.status === status);
        if (stage) {
          stage.clients.push(trainee as Trainee);
          stage.count++;
        }
      });

      return { data: stages, success: true };
    } catch (error) {
      logger.error('Error getting pipeline stages', error, 'CrmPipelineService');
      return { error: 'שגיאה בטעינת Pipeline' };
    }
  }

  /**
   * Update client status in pipeline
   * @param traineeId - Trainee ID
   * @param newStatus - New CRM status
   * @param reason - Optional reason for status change
   * @returns Promise with success status
   */
  static async updateClientStatus(
    traineeId: string,
    newStatus: typeof CRM_STATUS[keyof typeof CRM_STATUS],
    reason?: string
  ): Promise<ApiResponse> {
    try {
      // Get current status
      const { data: trainee, error: fetchError } = await supabase
        .from('trainees')
        .select('crm_status')
        .eq('id', traineeId)
        .single();

      if (fetchError || !trainee) {
        return { error: 'מתאמן לא נמצא' };
      }

      const oldStatus = trainee.crm_status;

      // Update status
      const { error: updateError } = await supabase
        .from('trainees')
        .update({ crm_status: newStatus })
        .eq('id', traineeId);

      if (updateError) {
        logSupabaseError(updateError, 'updateClientStatus', { table: 'trainees', traineeId });
        return { error: updateError.message };
      }

      // Log pipeline movement
      await this.logPipelineMovement(traineeId, oldStatus || 'active', newStatus, reason);

      return { success: true };
    } catch (error) {
      logger.error('Error updating client status', error, 'CrmPipelineService');
      return { error: 'שגיאה בעדכון סטטוס לקוח' };
    }
  }

  /**
   * Calculate lead score for a trainee
   * @param traineeId - Trainee ID
   * @returns Promise with lead score (0-100)
   */
  static async calculateLeadScore(traineeId: string): Promise<ApiResponse<number>> {
    try {
      const { data: trainee, error: traineeError } = await supabase
        .from('trainees')
        .select('*')
        .eq('id', traineeId)
        .single();

      if (traineeError || !trainee) {
        return { error: 'מתאמן לא נמצא' };
      }

      // Get calendar client data
      let calendarClient = null;
      if (trainee.google_calendar_client_id) {
        const { data: client } = await supabase
          .from('google_calendar_clients')
          .select('*')
          .eq('id', trainee.google_calendar_client_id)
          .single();
        calendarClient = client;
      }

      // Get interactions count
      const { count: interactionCount } = await supabase
        .from('client_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('trainee_id', traineeId);

      const factors: LeadScoreFactors = {
        hasEmail: !!trainee.email,
        hasPhone: !!trainee.phone,
        hasCalendarEvents: !!calendarClient && (calendarClient.total_events_count || 0) > 0,
        eventCount: calendarClient?.total_events_count || 0,
        daysSinceFirstContact: trainee.client_since
          ? Math.floor((Date.now() - new Date(trainee.client_since).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        interactionCount: interactionCount || 0,
        contractValue: trainee.contract_value ? Number(trainee.contract_value) : undefined,
      };

      // Calculate score (0-100)
      let score = 0;

      // Basic info (20 points)
      if (factors.hasEmail) score += 5;
      if (factors.hasPhone) score += 5;
      if (factors.hasEmail && factors.hasPhone) score += 10;

      // Engagement (30 points)
      if (factors.hasCalendarEvents) score += 15;
      if (factors.eventCount > 0) score += Math.min(15, factors.eventCount * 2);

      // Interactions (25 points)
      score += Math.min(25, factors.interactionCount * 5);

      // Contract value (15 points)
      if (factors.contractValue) {
        if (factors.contractValue > 1000) score += 15;
        else if (factors.contractValue > 500) score += 10;
        else if (factors.contractValue > 0) score += 5;
      }

      // Recency (10 points)
      if (factors.daysSinceFirstContact < 30) score += 10;
      else if (factors.daysSinceFirstContact < 90) score += 5;

      return { data: Math.min(100, score), success: true };
    } catch (error) {
      logger.error('Error calculating lead score', error, 'CrmPipelineService');
      return { error: 'שגיאה בחישוב Lead Score' };
    }
  }

  /**
   * Get pipeline statistics
   * @param trainerId - Trainer ID
   * @returns Promise with pipeline statistics
   */
  static async getPipelineStats(
    trainerId: string
  ): Promise<ApiResponse<PipelineStats>> {
    try {
      const stagesResult = await this.getPipelineStages(trainerId);
      if (!stagesResult.success || !stagesResult.data) {
        return { error: stagesResult.error || 'שגיאה בטעינת Pipeline' };
      }

      const stages = stagesResult.data;
      const total = stages.reduce((sum, stage) => sum + stage.count, 0);

      // Calculate conversion rates
      const conversionRates: Record<string, number> = {};
      const leadCount = stages.find((s) => s.status === CRM_STATUS.LEAD)?.count || 0;
      const qualifiedCount = stages.find((s) => s.status === CRM_STATUS.QUALIFIED)?.count || 0;
      const activeCount = stages.find((s) => s.status === CRM_STATUS.ACTIVE)?.count || 0;

      if (leadCount > 0) {
        conversionRates['lead_to_qualified'] = (qualifiedCount / leadCount) * 100;
        conversionRates['lead_to_active'] = (activeCount / leadCount) * 100;
      }
      if (qualifiedCount > 0) {
        conversionRates['qualified_to_active'] = (activeCount / qualifiedCount) * 100;
      }

      // Calculate average time in stage (simplified - would need historical data)
      const averageTimeInStage: Record<string, number> = {};
      stages.forEach((stage) => {
        if (stage.clients.length > 0) {
          const totalDays = stage.clients.reduce((sum, client) => {
            if (client.client_since) {
              const days = Math.floor(
                (Date.now() - new Date(client.client_since).getTime()) / (1000 * 60 * 60 * 24)
              );
              return sum + days;
            }
            return sum;
          }, 0);
          averageTimeInStage[stage.status] = totalDays / stage.clients.length;
        }
      });

      // Identify bottlenecks (stages with high count and low conversion)
      const bottlenecks: string[] = [];
      if (leadCount > 5 && conversionRates['lead_to_qualified'] < 20) {
        bottlenecks.push('lead');
      }
      if (qualifiedCount > 3 && conversionRates['qualified_to_active'] < 30) {
        bottlenecks.push('qualified');
      }

      return {
        data: {
          stages,
          total,
          conversionRates,
          averageTimeInStage,
          bottlenecks,
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error getting pipeline stats', error, 'CrmPipelineService');
      return { error: 'שגיאה בטעינת סטטיסטיקות Pipeline' };
    }
  }

  /**
   * Log pipeline movement
   * @param traineeId - Trainee ID
   * @param fromStatus - Previous status
   * @param toStatus - New status
   * @param reason - Optional reason
   */
  private static async logPipelineMovement(
    traineeId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string
  ): Promise<void> {
    try {
      // This would be stored in a pipeline_movements table
      // For now, we'll log it
      logger.info('Pipeline movement', {
        traineeId,
        fromStatus,
        toStatus,
        reason,
        timestamp: new Date().toISOString(),
      }, 'CrmPipelineService');
    } catch (error) {
      logger.error('Error logging pipeline movement', error, 'CrmPipelineService');
    }
  }

  /**
   * Bulk update client statuses
   * @param traineeIds - Array of trainee IDs
   * @param newStatus - New CRM status
   * @returns Promise with success status
   */
  static async bulkUpdateStatus(
    traineeIds: string[],
    newStatus: typeof CRM_STATUS[keyof typeof CRM_STATUS]
  ): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('trainees')
        .update({ crm_status: newStatus })
        .in('id', traineeIds);

      if (error) {
        logSupabaseError(error, 'bulkUpdateStatus', { table: 'trainees', count: traineeIds.length });
        return { error: error.message };
      }

      // Log movements
      for (const traineeId of traineeIds) {
        const { data: trainee } = await supabase
          .from('trainees')
          .select('crm_status')
          .eq('id', traineeId)
          .single();
        
        if (trainee) {
          await this.logPipelineMovement(
            traineeId,
            trainee.crm_status || 'active',
            newStatus,
            'Bulk update'
          );
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Error bulk updating status', error, 'CrmPipelineService');
      return { error: 'שגיאה בעדכון סטטוסים' };
    }
  }
}
