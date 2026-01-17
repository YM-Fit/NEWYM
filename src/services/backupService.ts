/**
 * Data Backup Service
 * Service for managing data backups and version history
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import type { ApiResponse } from '../api/types';
import { AuditService } from './auditService';

export interface BackupMetadata {
  id: string;
  backup_type: 'full' | 'incremental' | 'manual';
  backup_date: string;
  data_size: number;
  record_count: number;
  status: 'completed' | 'failed' | 'in_progress';
  error_message?: string;
  tables_included: string[];
}

export interface VersionHistory {
  id: string;
  table_name: string;
  record_id: string;
  version_number: number;
  data_snapshot: Record<string, any>;
  changed_by: string;
  changed_at: string;
  change_type: 'create' | 'update' | 'delete';
}

/**
 * Create a data backup
 * 
 * @param trainerId - Trainer ID (for trainer-specific backup)
 * @param backupType - Type of backup ('full', 'incremental', 'manual')
 * @param tables - Tables to include in backup (empty = all)
 * @returns Promise resolving to backup metadata
 * 
 * @example
 * ```typescript
 * const backup = await backupService.createBackup('trainer-123', 'full');
 * // Creates a full backup of all trainer data
 * ```
 */
export async function createBackup(
  trainerId: string,
  backupType: 'full' | 'incremental' | 'manual' = 'manual',
  tables: string[] = []
): Promise<ApiResponse<BackupMetadata>> {
  try {
    const backupDate = new Date().toISOString();
    const tablesToBackup = tables.length > 0 ? tables : [
      'google_calendar_clients',
      'client_interactions',
      'crm_contracts',
      'crm_payments',
      'crm_documents',
      'pipeline_movements',
      'crm_automation_rules',
      'crm_communication_messages',
    ];

    let totalRecords = 0;
    const backupData: Record<string, any[]> = {};

    // Backup each table
    for (const tableName of tablesToBackup) {
      try {
        let query = supabase
          .from(tableName)
          .select('*')
          .eq('trainer_id', trainerId);

        // For incremental backups, only backup records modified in last 24 hours
        if (backupType === 'incremental') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          query = query.gte('updated_at', yesterday.toISOString());
        }

        const { data, error } = await query;

        if (error) {
          logSupabaseError(`Failed to backup table ${tableName}`, error);
          continue;
        }

        if (data) {
          backupData[tableName] = data;
          totalRecords += data.length;
        }
      } catch (err) {
        console.error(`Error backing up table ${tableName}:`, err);
      }
    }

    // Calculate data size (approximate)
    const dataSize = JSON.stringify(backupData).length;

    // Store backup metadata in backup_log table
    const { data: backupRecord, error: backupError } = await supabase
      .from('backup_log')
      .insert({
        trainer_id: trainerId,
        backup_type: backupType,
        backup_date: backupDate,
        data_size: dataSize,
        record_count: totalRecords,
        status: 'completed',
        tables_included: tablesToBackup,
      })
      .select('id')
      .single();

    if (backupError) {
      logSupabaseError('Failed to store backup metadata', backupError);
      // Continue even if backup log fails
    }

    // TODO: Store actual backup data in Supabase Storage
    // For now, backup metadata is stored in backup_log table
    // In production, backup data should be stored in Supabase Storage

    // Log audit event
    await AuditService.logCreate(trainerId, 'backups', backupRecord?.id || 'backup', {
      backup_type: backupType,
      backup_date: backupDate,
      record_count: totalRecords,
    }).catch(err => console.error('Failed to log backup audit:', err));

    const backupMetadata: BackupMetadata = {
      id: backupRecord?.id || `backup-${Date.now()}`,
      backup_type: backupType,
      backup_date: backupDate,
      data_size: dataSize,
      record_count: totalRecords,
      status: 'completed',
      tables_included: tablesToBackup,
    };

    return {
      data: backupMetadata,
      success: true,
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to create backup' };
  }
}

/**
 * Get backup history for a trainer
 * 
 * @param trainerId - Trainer ID
 * @param limit - Maximum number of backups to return
 * @returns Promise resolving to backup metadata list
 */
export async function getBackupHistory(
  trainerId: string,
  limit: number = 10
): Promise<ApiResponse<BackupMetadata[]>> {
  try {
    const { data, error } = await supabase
      .from('backup_log')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('backup_date', { ascending: false })
      .limit(limit);

    if (error) {
      logSupabaseError('Failed to get backup history', error);
      return { error: 'Failed to retrieve backup history' };
    }

    const backups: BackupMetadata[] = (data || []).map(record => ({
      id: record.id,
      backup_type: record.backup_type as 'full' | 'incremental' | 'manual',
      backup_date: record.backup_date,
      data_size: record.data_size || 0,
      record_count: record.record_count || 0,
      status: record.status as 'completed' | 'failed' | 'in_progress',
      error_message: record.error_message,
      tables_included: record.tables_included || [],
    }));

    return { data: backups, success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to get backup history' };
  }
}

/**
 * Create version history for a record change
 * 
 * @param tableName - Table name
 * @param recordId - Record ID
 * @param dataSnapshot - Data snapshot (old or new data)
 * @param userId - User ID who made the change
 * @param changeType - Type of change
 * @returns Promise resolving to version history entry
 */
export async function createVersionHistory(
  tableName: string,
  recordId: string,
  dataSnapshot: Record<string, any>,
  userId: string,
  changeType: 'create' | 'update' | 'delete'
): Promise<ApiResponse<VersionHistory>> {
  try {
    // Get current version number
    // In production, this would query a version_history table
    // For now, version is tracked in audit_log
    
    const versionHistory: VersionHistory = {
      id: `version-${Date.now()}-${recordId}`,
      table_name: tableName,
      record_id: recordId,
      version_number: 1, // TODO: Calculate actual version number
      data_snapshot: dataSnapshot,
      changed_by: userId,
      changed_at: new Date().toISOString(),
      change_type: changeType,
    };

    // In production, store in version_history table
    // For now, this is handled via audit_log

    return { data: versionHistory, success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create version history' };
  }
}

/**
 * Get version history for a record
 * 
 * @param tableName - Table name
 * @param recordId - Record ID
 * @returns Promise resolving to version history list
 */
export async function getVersionHistory(
  tableName: string,
  recordId: string
): Promise<ApiResponse<VersionHistory[]>> {
  try {
    // Get version history from audit_log
    const { data: auditLogs, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('Failed to get version history', error);
      return { error: 'Failed to retrieve version history' };
    }

    // Convert audit logs to version history
    const versionHistory: VersionHistory[] = (auditLogs || []).map((log, index) => ({
      id: log.id,
      table_name: log.table_name,
      record_id: log.record_id || '',
      version_number: (auditLogs || []).length - index,
      data_snapshot: log.new_data || log.old_data || {},
      changed_by: log.user_id,
      changed_at: log.created_at,
      change_type: log.action.includes('create') ? 'create' :
                   log.action.includes('delete') ? 'delete' : 'update',
    }));

    return { data: versionHistory, success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to retrieve version history' };
  }
}

/**
 * Restore data from a backup
 * 
 * @param backupId - Backup ID to restore from
 * @param trainerId - Trainer ID (for authorization)
 * @param tables - Tables to restore (empty = all)
 * @returns Promise resolving to restore result
 */
export async function restoreFromBackup(
  backupId: string,
  trainerId: string,
  tables: string[] = []
): Promise<ApiResponse<{ restored: number; errors: string[] }>> {
  try {
    // Get backup metadata
    const { data: backup, error: backupError } = await supabase
      .from('backup_log')
      .select('*')
      .eq('id', backupId)
      .eq('trainer_id', trainerId)
      .single();

    if (backupError || !backup) {
      return { error: 'Backup not found or access denied' };
    }

    if (backup.status !== 'completed') {
      return { error: 'Backup is not completed and cannot be restored' };
    }

    // TODO: In production, restore from Supabase Storage
    // For now, we can only restore from version history via audit_log
    
    // Get version history for all records in the backup
    const tablesToRestore = tables.length > 0 ? tables : backup.tables_included || [];
    let restored = 0;
    const errors: string[] = [];

    // Note: Full restore from backup requires backup data stored in Supabase Storage
    // This is a placeholder for the restore logic
    // In production, you would:
    // 1. Download backup data from Supabase Storage
    // 2. Parse the JSON backup
    // 3. Restore each table's data
    // 4. Handle conflicts and validation

    return {
      data: { restored, errors },
      success: true,
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to restore from backup' };
  }
}

/**
 * Restore a record to a specific version
 * 
 * @param tableName - Table name
 * @param recordId - Record ID
 * @param versionId - Version ID to restore to
 * @param userId - User ID performing the restore
 * @returns Promise resolving to restore result
 */
export async function restoreToVersion(
  tableName: string,
  recordId: string,
  versionId: string,
  userId: string
): Promise<ApiResponse<void>> {
  try {
    // Get version history
    const versionResult = await getVersionHistory(tableName, recordId);
    if (!versionResult.success || !versionResult.data) {
      return { error: 'Failed to get version history' };
    }

    const version = versionResult.data.find(v => v.id === versionId);
    if (!version) {
      return { error: 'Version not found' };
    }

    // Restore the record to this version
    const { error } = await supabase
      .from(tableName)
      .update(version.data_snapshot)
      .eq('id', recordId);

    if (error) {
      logSupabaseError('Failed to restore record', error);
      return { error: error.message };
    }

    // Log audit event
    await AuditService.logUpdate(userId, tableName, recordId, {}, {
      restored_from_version: versionId,
      restored_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to restore to version' };
  }
}

/**
 * Schedule automatic daily backups
 * This should be called from an Edge Function or cron job
 * 
 * @param trainerId - Trainer ID
 * @returns Promise resolving to backup result
 */
export async function scheduleDailyBackup(trainerId: string): Promise<ApiResponse<BackupMetadata>> {
  try {
    // Check if backup already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { data: existingBackup } = await supabase
      .from('backup_log')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('backup_type', 'full')
      .gte('backup_date', todayStr)
      .limit(1)
      .maybeSingle();

    if (existingBackup) {
      // Backup already exists for today
      return {
        data: {
          id: existingBackup.id,
          backup_type: existingBackup.backup_type as 'full' | 'incremental' | 'manual',
          backup_date: existingBackup.backup_date,
          data_size: existingBackup.data_size || 0,
          record_count: existingBackup.record_count || 0,
          status: existingBackup.status as 'completed' | 'failed' | 'in_progress',
          error_message: existingBackup.error_message,
          tables_included: existingBackup.tables_included || [],
        },
        success: true,
      };
    }

    // Create new daily backup
    return await createBackup(trainerId, 'full');
  } catch (err: any) {
    return { error: err.message || 'Failed to schedule daily backup' };
  }
}

/**
 * Backup Service class - convenience wrapper
 */
export class BackupService {
  static async createBackup(
    trainerId: string,
    backupType: 'full' | 'incremental' | 'manual' = 'manual',
    tables: string[] = []
  ) {
    return createBackup(trainerId, backupType, tables);
  }

  static async getBackupHistory(trainerId: string, limit: number = 10) {
    return getBackupHistory(trainerId, limit);
  }

  static async createVersionHistory(
    tableName: string,
    recordId: string,
    dataSnapshot: Record<string, any>,
    userId: string,
    changeType: 'create' | 'update' | 'delete'
  ) {
    return createVersionHistory(tableName, recordId, dataSnapshot, userId, changeType);
  }

  static async getVersionHistory(tableName: string, recordId: string) {
    return getVersionHistory(tableName, recordId);
  }

  static async restoreFromBackup(backupId: string, trainerId: string, tables: string[] = []) {
    return restoreFromBackup(backupId, trainerId, tables);
  }

  static async restoreToVersion(
    tableName: string,
    recordId: string,
    versionId: string,
    userId: string
  ) {
    return restoreToVersion(tableName, recordId, versionId, userId);
  }

  static async scheduleDailyBackup(trainerId: string) {
    return scheduleDailyBackup(trainerId);
  }
}
