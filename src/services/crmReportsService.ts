/**
 * CRM Reports Service
 * שירות ליצירת דוחות ואנליטיקה CRM
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import { CRM_STATUS, CRM_ALERTS } from '../constants/crmConstants';
import type { ApiResponse } from '../api/types';
import type { CalendarClient } from '../api/crmClientsApi';

/**
 * Client Pipeline Statistics
 */
export interface ClientPipelineStats {
  leads: number;
  qualified: number;
  active: number;
  inactive: number;
  churned: number;
  onHold: number;
  total: number;
}

/**
 * Revenue Statistics
 */
export interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  averageContractValue: number;
  paidContracts: number;
  pendingPayments: number;
  overduePayments: number;
}

/**
 * Client Activity Statistics
 */
export interface ActivityStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  clientsNeedingFollowUp: number;
  averageEventsPerClient: number;
  averageWorkoutFrequency: number;
}

/**
 * Client Report Data
 */
export interface ClientReport {
  client: CalendarClient;
  daysSinceLastContact: number;
  needsFollowUp: boolean;
  isOverdue: boolean;
  workoutFrequency: number;
}

/**
 * CRM Reports Service
 */
export class CrmReportsService {
  /**
   * Get client pipeline statistics
   * @param trainerId - Trainer ID
   * @returns Promise with pipeline stats
   */
  static async getPipelineStats(
    trainerId: string
  ): Promise<ApiResponse<ClientPipelineStats>> {
    try {
      const { data: trainees, error } = await supabase
        .from('trainees')
        .select('crm_status')
        .eq('trainer_id', trainerId);

      if (error) {
        return { error: error.message };
      }

      const stats: ClientPipelineStats = {
        leads: 0,
        qualified: 0,
        active: 0,
        inactive: 0,
        churned: 0,
        onHold: 0,
        total: trainees?.length || 0,
      };

      trainees?.forEach((trainee) => {
        const status = trainee.crm_status as keyof ClientPipelineStats;
        if (status && status in stats) {
          stats[status]++;
        }
      });

      return { data: stats, success: true };
    } catch (error) {
      logger.error('Error getting pipeline stats', error, 'CrmReportsService');
      return { error: 'שגיאה בטעינת סטטיסטיקות pipeline' };
    }
  }

  /**
   * Get revenue statistics
   * @param trainerId - Trainer ID
   * @returns Promise with revenue stats
   */
  static async getRevenueStats(
    trainerId: string
  ): Promise<ApiResponse<RevenueStats>> {
    try {
      const { data: trainees, error } = await supabase
        .from('trainees')
        .select('contract_value, payment_status, contract_type')
        .eq('trainer_id', trainerId)
        .not('contract_value', 'is', null);

      if (error) {
        logSupabaseError(error, 'getRevenueStats', { table: 'trainees', trainerId });
        return { error: error.message };
      }

      const stats: RevenueStats = {
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageContractValue: 0,
        paidContracts: 0,
        pendingPayments: 0,
        overduePayments: 0,
      };

      let totalValue = 0;
      let monthlyValue = 0;
      let contractCount = 0;

      trainees?.forEach((trainee) => {
        const value = Number(trainee.contract_value) || 0;
        totalValue += value;
        contractCount++;

        if (trainee.contract_type === 'monthly') {
          monthlyValue += value;
        }

        if (trainee.payment_status === 'paid') {
          stats.paidContracts++;
        } else if (trainee.payment_status === 'pending') {
          stats.pendingPayments++;
        } else if (trainee.payment_status === 'overdue') {
          stats.overduePayments++;
        }
      });

      stats.totalRevenue = totalValue;
      stats.monthlyRevenue = monthlyValue;
      stats.averageContractValue = contractCount > 0 ? totalValue / contractCount : 0;

      return { data: stats, success: true };
    } catch (error) {
      logger.error('Error getting revenue stats', error, 'CrmReportsService');
      return { error: 'שגיאה בטעינת סטטיסטיקות הכנסות' };
    }
  }

  /**
   * Get activity statistics
   * @param trainerId - Trainer ID
   * @returns Promise with activity stats
   */
  static async getActivityStats(
    trainerId: string
  ): Promise<ApiResponse<ActivityStats>> {
    try {
      const { data: clients, error: clientsError } = await supabase
        .from('google_calendar_clients')
        .select('*')
        .eq('trainer_id', trainerId);

      if (clientsError) {
        logSupabaseError(clientsError, 'getActivityStats.clients', { table: 'google_calendar_clients', trainerId });
        return { error: clientsError.message };
      }

      const { data: trainees, error: traineesError } = await supabase
        .from('trainees')
        .select('crm_status, last_contact_date')
        .eq('trainer_id', trainerId);

      if (traineesError) {
        logSupabaseError(traineesError, 'getActivityStats.trainees', { table: 'trainees', trainerId });
        return { error: traineesError.message };
      }

      const stats: ActivityStats = {
        totalClients: clients?.length || 0,
        activeClients: 0,
        inactiveClients: 0,
        clientsNeedingFollowUp: 0,
        averageEventsPerClient: 0,
        averageWorkoutFrequency: 0,
      };

      let totalEvents = 0;
      let totalFrequency = 0;
      const now = Date.now();

      clients?.forEach((client) => {
        totalEvents += client.total_events_count || 0;

        if (client.total_events_count > 0 && client.first_event_date && client.last_event_date) {
          const firstDate = new Date(client.first_event_date).getTime();
          const lastDate = new Date(client.last_event_date).getTime();
          const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
          const weeks = daysDiff / 7;
          if (weeks > 0) {
            totalFrequency += (client.total_events_count || 0) / weeks;
          }
        }

        if (client.last_event_date) {
          const daysSinceLastEvent = Math.floor(
            (now - new Date(client.last_event_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastEvent >= CRM_ALERTS.INACTIVE_CLIENT_DAYS) {
            stats.clientsNeedingFollowUp++;
          }
        }
      });

      trainees?.forEach((trainee) => {
        if (trainee.crm_status === CRM_STATUS.ACTIVE) {
          stats.activeClients++;
        } else if (trainee.crm_status === CRM_STATUS.INACTIVE) {
          stats.inactiveClients++;
        }

        if (trainee.last_contact_date) {
          const daysSinceLastContact = Math.floor(
            (now - new Date(trainee.last_contact_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastContact >= CRM_ALERTS.INACTIVE_CLIENT_DAYS) {
            stats.clientsNeedingFollowUp++;
          }
        }
      });

      stats.averageEventsPerClient = stats.totalClients > 0 
        ? totalEvents / stats.totalClients 
        : 0;
      stats.averageWorkoutFrequency = stats.totalClients > 0
        ? totalFrequency / stats.totalClients
        : 0;

      return { data: stats, success: true };
    } catch (error) {
      logger.error('Error getting activity stats', error, 'CrmReportsService');
      return { error: 'שגיאה בטעינת סטטיסטיקות פעילות' };
    }
  }

  /**
   * Get clients needing follow-up
   * @param trainerId - Trainer ID
   * @returns Promise with list of clients needing follow-up
   */
  static async getClientsNeedingFollowUp(
    trainerId: string
  ): Promise<ApiResponse<ClientReport[]>> {
    try {
      const { data: clients, error: clientsError } = await supabase
        .from('google_calendar_clients')
        .select('*')
        .eq('trainer_id', trainerId);

      if (clientsError) {
        logSupabaseError(clientsError, 'getClientsNeedingFollowUp.clients', { table: 'google_calendar_clients', trainerId });
        return { error: clientsError.message };
      }

      const { data: trainees, error: traineesError } = await supabase
        .from('trainees')
        .select('id, last_contact_date, next_followup_date, payment_status')
        .eq('trainer_id', trainerId);

      if (traineesError) {
        logSupabaseError(traineesError, 'getClientsNeedingFollowUp.trainees', { table: 'trainees', trainerId });
        return { error: traineesError.message };
      }

      const reports: ClientReport[] = [];
      const now = Date.now();

      clients?.forEach((client) => {
        const trainee = trainees?.find(t => t.id === client.trainee_id);
        const lastContactDate = trainee?.last_contact_date 
          ? new Date(trainee.last_contact_date).getTime()
          : client.last_event_date 
            ? new Date(client.last_event_date).getTime()
            : null;

        if (!lastContactDate) {
          reports.push({
            client,
            daysSinceLastContact: Infinity,
            needsFollowUp: true,
            isOverdue: false,
            workoutFrequency: 0,
          });
          return;
        }

        const daysSinceLastContact = Math.floor(
          (now - lastContactDate) / (1000 * 60 * 60 * 24)
        );

        const needsFollowUp = daysSinceLastContact >= CRM_ALERTS.INACTIVE_CLIENT_DAYS;
        const isOverdue = trainee?.payment_status === 'overdue' ||
          (trainee?.next_followup_date && 
           new Date(trainee.next_followup_date).getTime() < now);

        let workoutFrequency = 0;
        if (client.first_event_date && client.last_event_date && client.total_events_count > 0) {
          const firstDate = new Date(client.first_event_date).getTime();
          const lastDate = new Date(client.last_event_date).getTime();
          const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
          const weeks = daysDiff / 7;
          if (weeks > 0) {
            workoutFrequency = client.total_events_count / weeks;
          }
        }

        if (needsFollowUp || isOverdue) {
          reports.push({
            client,
            daysSinceLastContact,
            needsFollowUp,
            isOverdue,
            workoutFrequency,
          });
        }
      });

      // Sort by priority (overdue first, then by days since last contact)
      reports.sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) {
          return a.isOverdue ? -1 : 1;
        }
        return b.daysSinceLastContact - a.daysSinceLastContact;
      });

      return { data: reports, success: true };
    } catch (error) {
      logger.error('Error getting clients needing follow-up', error, 'CrmReportsService');
      return { error: 'שגיאה בטעינת לקוחות הזקוקים למעקב' };
    }
  }
}
