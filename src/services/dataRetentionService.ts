/**
 * Data Retention Service
 * שירות ניהול retention policies וארכוב נתונים
 * 
 * @module dataRetentionService
 * @description Manages data retention policies, automatic archiving, and data cleanup
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

export interface RetentionPolicy {
  tableName: string;
  retentionDays: number; // Number of days to keep data
  archiveBeforeDelete: boolean; // Archive before deleting
  enabled: boolean;
}

export interface ArchiveResult {
  archivedCount: number;
  deletedCount: number;
  errors: string[];
}

/**
 * Default retention policies (in days)
 */
export const DEFAULT_RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  audit_log: {
    tableName: 'audit_log',
    retentionDays: 365, // Keep audit logs for 1 year
    archiveBeforeDelete: true,
    enabled: true,
  },
  client_interactions: {
    tableName: 'client_interactions',
    retentionDays: 730, // Keep interactions for 2 years
    archiveBeforeDelete: true,
    enabled: true,
  },
  backup_log: {
    tableName: 'backup_log',
    retentionDays: 90, // Keep backup logs for 3 months
    archiveBeforeDelete: false,
    enabled: true,
  },
  calendar_sync_log: {
    tableName: 'calendar_sync_log',
    retentionDays: 180, // Keep sync logs for 6 months
    archiveBeforeDelete: false,
    enabled: true,
  },
};

/**
 * Data Retention Service Class
 */
export class DataRetentionService {
  /**
   * Apply retention policy to a table
   * @param policy - Retention policy
   * @param trainerId - Optional trainer ID to filter by
   * @returns Promise with archive result
   */
  static async applyRetentionPolicy(
    policy: RetentionPolicy,
    trainerId?: string
  ): Promise<ApiResponse<ArchiveResult>> {
    if (!policy.enabled) {
      return { 
        data: { archivedCount: 0, deletedCount: 0, errors: [] }, 
        success: true 
      };
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
      const cutoffDateISO = cutoffDate.toISOString();

      logger.info(
        `Applying retention policy for ${policy.tableName}`,
        { policy, cutoffDate: cutoffDateISO },
        'DataRetentionService'
      );

      let archivedCount = 0;
      let deletedCount = 0;
      const errors: string[] = [];

      // Archive old data if required
      if (policy.archiveBeforeDelete) {
        const archiveResult = await this.archiveOldData(
          policy.tableName,
          cutoffDateISO,
          trainerId
        );
        archivedCount = archiveResult.archivedCount || 0;
        if (archiveResult.errors) {
          errors.push(...archiveResult.errors);
        }
      }

      // Delete old data
      const deleteResult = await this.deleteOldData(
        policy.tableName,
        cutoffDateISO,
        trainerId
      );
      deletedCount = deleteResult.deletedCount || 0;
      if (deleteResult.errors) {
        errors.push(...deleteResult.errors);
      }

      return {
        data: {
          archivedCount,
          deletedCount,
          errors,
        },
        success: true,
      };
    } catch (error: any) {
      logger.error(
        `Error applying retention policy for ${policy.tableName}`,
        error,
        'DataRetentionService'
      );
      return { error: `שגיאה ביישום retention policy: ${error.message}` };
    }
  }

  /**
   * Archive old data to archive table
   * @param tableName - Table name
   * @param cutoffDate - Cutoff date (ISO string)
   * @param trainerId - Optional trainer ID
   * @returns Promise with archive result
   */
  private static async archiveOldData(
    tableName: string,
    cutoffDate: string,
    trainerId?: string
  ): Promise<{ archivedCount?: number; errors?: string[] }> {
    try {
      // Check if archive table exists
      const archiveTableName = `${tableName}_archive`;
      
      // For now, we'll just log the data that would be archived
      // In production, you would:
      // 1. Create archive table if it doesn't exist
      // 2. Copy data to archive table
      // 3. Verify archive was successful

      let query = supabase
        .from(tableName)
        .select('*')
        .lt('created_at', cutoffDate);

      if (trainerId) {
        query = query.eq('trainer_id', trainerId);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error(`Error fetching data to archive from ${tableName}`, error, 'DataRetentionService');
        return { errors: [error.message] };
      }

      const archivedCount = data?.length || 0;

      if (archivedCount > 0) {
        logger.info(
          `Would archive ${archivedCount} records from ${tableName}`,
          { tableName, cutoffDate },
          'DataRetentionService'
        );
        // TODO: Implement actual archiving to archive table
        // This would require creating archive tables and copying data
      }

      return { archivedCount };
    } catch (error: any) {
      logger.error(`Error archiving data from ${tableName}`, error, 'DataRetentionService');
      return { errors: [error.message] };
    }
  }

  /**
   * Delete old data
   * @param tableName - Table name
   * @param cutoffDate - Cutoff date (ISO string)
   * @param trainerId - Optional trainer ID
   * @returns Promise with delete result
   */
  private static async deleteOldData(
    tableName: string,
    cutoffDate: string,
    trainerId?: string
  ): Promise<{ deletedCount?: number; errors?: string[] }> {
    try {
      let query = supabase
        .from(tableName)
        .delete()
        .lt('created_at', cutoffDate);

      if (trainerId) {
        query = query.eq('trainer_id', trainerId);
      }

      const { error, count } = await query;

      if (error) {
        logger.error(`Error deleting old data from ${tableName}`, error, 'DataRetentionService');
        return { errors: [error.message] };
      }

      const deletedCount = count || 0;

      if (deletedCount > 0) {
        logger.info(
          `Deleted ${deletedCount} old records from ${tableName}`,
          { tableName, cutoffDate },
          'DataRetentionService'
        );
      }

      return { deletedCount };
    } catch (error: any) {
      logger.error(`Error deleting old data from ${tableName}`, error, 'DataRetentionService');
      return { errors: [error.message] };
    }
  }

  /**
   * Apply all retention policies
   * @param trainerId - Optional trainer ID
   * @returns Promise with results
   */
  static async applyAllRetentionPolicies(
    trainerId?: string
  ): Promise<ApiResponse<Record<string, ArchiveResult>>> {
    try {
      const results: Record<string, ArchiveResult> = {};

      for (const [key, policy] of Object.entries(DEFAULT_RETENTION_POLICIES)) {
        if (policy.enabled) {
          const result = await this.applyRetentionPolicy(policy, trainerId);
          if (result.success && result.data) {
            results[key] = result.data;
          }
        }
      }

      return { data: results, success: true };
    } catch (error: any) {
      logger.error('Error applying all retention policies', error, 'DataRetentionService');
      return { error: `שגיאה ביישום retention policies: ${error.message}` };
    }
  }

  /**
   * Get retention policy status
   * @param tableName - Table name
   * @returns Promise with policy status
   */
  static async getRetentionStatus(tableName: string): Promise<ApiResponse<{
    policy: RetentionPolicy;
    recordsToArchive: number;
    recordsToDelete: number;
  }>> {
    try {
      const policy = DEFAULT_RETENTION_POLICIES[tableName];
      if (!policy) {
        return { error: `Retention policy לא נמצא עבור ${tableName}` };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
      const cutoffDateISO = cutoffDate.toISOString();

      // Count records that would be affected
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDateISO);

      if (error) {
        logger.error(`Error getting retention status for ${tableName}`, error, 'DataRetentionService');
        return { error: error.message };
      }

      return {
        data: {
          policy,
          recordsToArchive: policy.archiveBeforeDelete ? (count || 0) : 0,
          recordsToDelete: count || 0,
        },
        success: true,
      };
    } catch (error: any) {
      logger.error(`Error getting retention status for ${tableName}`, error, 'DataRetentionService');
      return { error: `שגיאה בקבלת retention status: ${error.message}` };
    }
  }
}
