/**
 * Audit Service
 * Service for logging all CRM actions for security and compliance
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import type { ApiResponse } from '../api/types';

export type AuditAction =
  | 'create_client'
  | 'update_client'
  | 'delete_client'
  | 'create_interaction'
  | 'update_interaction'
  | 'delete_interaction'
  | 'create_contract'
  | 'update_contract'
  | 'delete_contract'
  | 'create_payment'
  | 'update_payment'
  | 'delete_payment'
  | 'create_document'
  | 'update_document'
  | 'delete_document'
  | 'pipeline_movement'
  | 'status_change'
  | 'bulk_action'
  | 'export_data'
  | 'import_data';

export interface AuditLogEntry {
  id?: string;
  user_id: string;
  action: AuditAction;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

/**
 * Get client IP address and user agent from request
 */
function getRequestMetadata(): { ip_address?: string; user_agent?: string } {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    user_agent: navigator.userAgent,
    // Note: IP address should be retrieved server-side for security
    // This is a placeholder for client-side context
  };
}

/**
 * Log an audit event
 * 
 * @param entry - Audit log entry data
 * @returns Promise resolving to success/error response
 * 
 * @example
 * ```typescript
 * await auditService.log({
 *   user_id: 'trainer-123',
 *   action: 'create_client',
 *   table_name: 'google_calendar_clients',
 *   record_id: 'client-456',
 *   new_data: { name: 'John Doe', email: 'john@example.com' }
 * });
 * ```
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<ApiResponse<string>> {
  try {
    const metadata = getRequestMetadata();
    const auditEntry: Omit<AuditLogEntry, 'id' | 'created_at'> = {
      ...entry,
      ...metadata,
    };

    const { data, error } = await supabase
      .from('audit_log')
      .insert(auditEntry)
      .select('id')
      .single();

    if (error) {
      logSupabaseError('Failed to log audit event', error);
      // Don't throw - audit logging should not break the main flow
      console.error('Audit logging failed:', error);
      return { error: 'Failed to log audit event' };
    }

    return { data: data.id, success: true };
  } catch (err: any) {
    console.error('Audit logging error:', err);
    // Don't throw - audit logging should not break the main flow
    return { error: err.message || 'Failed to log audit event' };
  }
}

/**
 * Get audit logs for a user
 * 
 * @param userId - User ID to get logs for
 * @param options - Query options (limit, offset, filters)
 * @returns Promise resolving to audit logs
 */
export async function getAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    table_name?: string;
    start_date?: Date;
    end_date?: Date;
  }
): Promise<ApiResponse<AuditLogEntry[]>> {
  try {
    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.action) {
      query = query.eq('action', options.action);
    }

    if (options?.table_name) {
      query = query.eq('table_name', options.table_name);
    }

    if (options?.start_date) {
      query = query.gte('created_at', options.start_date.toISOString());
    }

    if (options?.end_date) {
      query = query.lte('created_at', options.end_date.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logSupabaseError('Failed to get audit logs', error);
      return { error: 'Failed to retrieve audit logs' };
    }

    return { data: data as AuditLogEntry[], success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to retrieve audit logs' };
  }
}

/**
 * Audit Service class - convenience wrapper
 */
export class AuditService {
  /**
   * Log a create action
   */
  static async logCreate(
    userId: string,
    tableName: string,
    recordId: string,
    newData: Record<string, any>
  ): Promise<void> {
    const actionMap: Record<string, AuditAction> = {
      'google_calendar_clients': 'create_client',
      'client_interactions': 'create_interaction',
      'crm_contracts': 'create_contract',
      'crm_payments': 'create_payment',
      'crm_documents': 'create_document',
    };

    const action = actionMap[tableName] || ('create_client' as AuditAction);

    await logAuditEvent({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      new_data: newData,
    });
  }

  /**
   * Log an update action
   */
  static async logUpdate(
    userId: string,
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>
  ): Promise<void> {
    const actionMap: Record<string, AuditAction> = {
      'google_calendar_clients': 'update_client',
      'client_interactions': 'update_interaction',
      'crm_contracts': 'update_contract',
      'crm_payments': 'update_payment',
      'crm_documents': 'update_document',
    };

    const action = actionMap[tableName] || ('update_client' as AuditAction);

    await logAuditEvent({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
    });
  }

  /**
   * Log a delete action
   */
  static async logDelete(
    userId: string,
    tableName: string,
    recordId: string,
    oldData: Record<string, any>
  ): Promise<void> {
    const actionMap: Record<string, AuditAction> = {
      'google_calendar_clients': 'delete_client',
      'client_interactions': 'delete_interaction',
      'crm_contracts': 'delete_contract',
      'crm_payments': 'delete_payment',
      'crm_documents': 'delete_document',
    };

    const action = actionMap[tableName] || ('delete_client' as AuditAction);

    await logAuditEvent({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
    });
  }

  /**
   * Log a pipeline movement
   */
  static async logPipelineMovement(
    userId: string,
    recordId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string
  ): Promise<void> {
    await logAuditEvent({
      user_id: userId,
      action: 'pipeline_movement',
      table_name: 'trainees',
      record_id: recordId,
      old_data: { status: fromStatus },
      new_data: { status: toStatus, reason },
    });
  }

  /**
   * Log a bulk action
   */
  static async logBulkAction(
    userId: string,
    tableName: string,
    action: 'bulk_action',
    data: Record<string, any>
  ): Promise<void> {
    await logAuditEvent({
      user_id: userId,
      action,
      table_name: tableName,
      new_data: data,
    });
  }

  /**
   * Log data export
   */
  static async logExport(
    userId: string,
    exportType: string,
    recordCount: number
  ): Promise<void> {
    await logAuditEvent({
      user_id: userId,
      action: 'export_data',
      table_name: 'export',
      new_data: {
        export_type: exportType,
        record_count: recordCount,
      },
    });
  }

  /**
   * Log data import
   */
  static async logImport(
    userId: string,
    importType: string,
    recordCount: number,
    successCount: number,
    errorCount: number
  ): Promise<void> {
    await logAuditEvent({
      user_id: userId,
      action: 'import_data',
      table_name: 'import',
      new_data: {
        import_type: importType,
        record_count: recordCount,
        success_count: successCount,
        error_count: errorCount,
      },
    });
  }

  /**
   * Generic audit event logging (for custom actions)
   */
  static async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    await logAuditEvent(entry);
  }
}
