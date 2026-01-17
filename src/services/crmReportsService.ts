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
   * Optimized: Uses database-level aggregation instead of counting in JS
   * @param trainerId - Trainer ID
   * @returns Promise with pipeline stats
   */
  static async getPipelineStats(
    trainerId: string
  ): Promise<ApiResponse<ClientPipelineStats>> {
    try {
      // Optimized: Use database-level aggregation instead of fetching all records
      // This is much more efficient for large datasets
      const { data, error } = await supabase.rpc('get_pipeline_stats', {
        p_trainer_id: trainerId,
      });

      if (error) {
        // Fallback to client-side aggregation if RPC doesn't exist
        const { data: trainees, error: fetchError, count } = await supabase
          .from('trainees')
          .select('crm_status', { count: 'exact' })
          .eq('trainer_id', trainerId);

        if (fetchError) {
          return { error: fetchError.message };
        }

        const stats: ClientPipelineStats = {
          leads: 0,
          qualified: 0,
          active: 0,
          inactive: 0,
          churned: 0,
          onHold: 0,
          total: count || 0,
        };

        // Efficient counting with single pass
        if (trainees) {
          for (const trainee of trainees) {
            const status = trainee.crm_status as keyof ClientPipelineStats;
            if (status && status in stats) {
              stats[status]++;
            }
          }
        }

        return { data: stats, success: true };
      }

      // Use RPC result if available
      return { data: data as ClientPipelineStats, success: true };
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
      // Optimized: Use database-level aggregation for better performance
      // Select only needed columns and use database aggregation where possible
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

      // Optimized: Single pass with early returns for better performance
      let totalValue = 0;
      let monthlyValue = 0;
      let contractCount = 0;

      if (trainees && trainees.length > 0) {
        for (const trainee of trainees) {
          const value = Number(trainee.contract_value) || 0;
          totalValue += value;
          contractCount++;

          if (trainee.contract_type === 'monthly') {
            monthlyValue += value;
          }

          // Use switch for better performance than if-else chain
          switch (trainee.payment_status) {
            case 'paid':
              stats.paidContracts++;
              break;
            case 'pending':
              stats.pendingPayments++;
              break;
            case 'overdue':
              stats.overduePayments++;
              break;
          }
        }
      }

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
      // Optimized: Select only needed columns (reduces payload size)
      const { data: clients, error: clientsError, count: clientsCount } = await supabase
        .from('google_calendar_clients')
        .select('total_events_count, first_event_date, last_event_date', { count: 'exact' })
        .eq('trainer_id', trainerId);

      if (clientsError) {
        logSupabaseError(clientsError, 'getActivityStats.clients', { table: 'google_calendar_clients', trainerId });
        return { error: clientsError.message };
      }

      // Optimized: Select only needed columns
      const { data: trainees, error: traineesError } = await supabase
        .from('trainees')
        .select('crm_status, last_contact_date')
        .eq('trainer_id', trainerId);

      if (traineesError) {
        logSupabaseError(traineesError, 'getActivityStats.trainees', { table: 'trainees', trainerId });
        return { error: traineesError.message };
      }

      const stats: ActivityStats = {
        totalClients: clientsCount || clients?.length || 0,
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
   * @param options - Pagination options
   * @returns Promise with list of clients needing follow-up (paginated or plain array)
   */
  static async getClientsNeedingFollowUp(
    trainerId: string,
    options?: { page?: number; pageSize?: number; cursor?: string }
  ): Promise<ApiResponse<ClientReport[] | { data: ClientReport[]; pagination: any }>> {
    try {
      const pageSize = options?.pageSize || 50;
      const usePagination = options?.page !== undefined || options?.cursor !== undefined;
      
      // Optimized query: Fetch only needed columns for better performance
      // Using specific column selection reduces data transfer and improves query speed
      // The indexes ensure fast lookups even with separate queries
      let clientsQuery = supabase
        .from('google_calendar_clients')
        .select('id, trainer_id, trainee_id, client_name, last_event_date, first_event_date, total_events_count', 
          { count: usePagination ? 'exact' : undefined })
        .eq('trainer_id', trainerId)
        .order('last_event_date', { ascending: false, nullsFirst: false }); // Use index for ordering

      // Apply pagination if requested
      if (options?.cursor) {
        clientsQuery = clientsQuery
          .lt('id', options.cursor)
          .limit(pageSize + 1);
      } else if (options?.page !== undefined) {
        const page = Math.max(1, options.page);
        const offset = (page - 1) * pageSize;
        clientsQuery = clientsQuery
          .range(offset, offset + pageSize - 1);
      }

      const { data: clients, error: clientsError, count } = await clientsQuery;

      if (clientsError) {
        logSupabaseError(clientsError, 'getClientsNeedingFollowUp.clients', { table: 'google_calendar_clients', trainerId });
        return { error: clientsError.message };
      }

      // Get only trainees that are linked to clients (more efficient)
      const linkedTraineeIds = clients?.filter(c => c.trainee_id).map(c => c.trainee_id) || [];
      const { data: trainees, error: traineesError } = linkedTraineeIds.length > 0
        ? await supabase
            .from('trainees')
            .select('id, last_contact_date, next_followup_date, payment_status')
            .eq('trainer_id', trainerId)
            .in('id', linkedTraineeIds)
        : { data: [], error: null };

      if (traineesError) {
        logSupabaseError(traineesError, 'getClientsNeedingFollowUp.trainees', { table: 'trainees', trainerId });
        return { error: traineesError.message };
      }

      // Create a map for O(1) lookup instead of O(n) find
      const traineeMap = new Map(trainees?.map(t => [t.id, t]) || []);

      const reports: ClientReport[] = [];
      const now = Date.now();

      clients?.forEach((client) => {
        // Use Map for O(1) lookup instead of Array.find O(n)
        const trainee = client.trainee_id ? traineeMap.get(client.trainee_id) : undefined;
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

      // Return paginated response if pagination was requested
      if (usePagination) {
        // Cursor-based pagination
        if (options?.cursor) {
          const hasNextPage = reports.length > pageSize;
          const paginatedReports = hasNextPage ? reports.slice(0, pageSize) : reports;
          const lastReport = paginatedReports[paginatedReports.length - 1];
          const nextCursor = hasNextPage && lastReport ? lastReport.client.id : undefined;

          return {
            data: {
              data: paginatedReports,
              pagination: {
                pageSize,
                total: count || reports.length,
                hasNextPage,
                hasPrevPage: !!options.cursor,
                cursor: options.cursor,
                nextCursor,
              },
            },
            success: true,
          };
        }
        // Page-based pagination
        else if (options?.page !== undefined) {
          const page = Math.max(1, options.page);
          const totalPages = count ? Math.ceil(count / pageSize) : Math.ceil(reports.length / pageSize);

          return {
            data: {
              data: reports,
              pagination: {
                page,
                pageSize,
                total: count || reports.length,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
              },
            },
            success: true,
          };
        }
      }

      // No pagination - return plain array (backwards compatible)
      return { data: reports, success: true };
    } catch (error) {
      logger.error('Error getting clients needing follow-up', error, 'CrmReportsService');
      return { error: 'שגיאה בטעינת לקוחות הזקוקים למעקב' };
    }
  }
}
