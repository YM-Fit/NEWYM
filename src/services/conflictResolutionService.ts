/**
 * Conflict Resolution Service
 * שירות לפתרון קונפליקטים בנתונים
 * 
 * @module conflictResolutionService
 * @description Handles data conflicts, especially in sync scenarios
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

export type ConflictResolutionStrategy = 
  | 'server_wins' 
  | 'client_wins' 
  | 'newer_wins' 
  | 'manual' 
  | 'merge';

export interface Conflict {
  id: string;
  tableName: string;
  recordId: string;
  conflictType: 'update' | 'delete' | 'create';
  serverData: Record<string, any>;
  clientData: Record<string, any>;
  detectedAt: string;
  resolvedAt?: string;
  resolutionStrategy?: ConflictResolutionStrategy;
  resolvedBy?: string;
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedData?: Record<string, any>;
  resolvedBy: string;
}

/**
 * Conflict Resolution Service Class
 */
export class ConflictResolutionService {
  /**
   * Detect conflicts between server and client data
   * @param tableName - Table name
   * @param recordId - Record ID
   * @param clientData - Client data
   * @param serverData - Server data
   * @returns Promise with conflict detection result
   */
  static async detectConflict(
    tableName: string,
    recordId: string,
    clientData: Record<string, any>,
    serverData: Record<string, any>
  ): Promise<ApiResponse<Conflict | null>> {
    try {
      // Check if there's a conflict
      const hasConflict = this.hasConflict(clientData, serverData);

      if (!hasConflict) {
        return { data: null, success: true };
      }

      // Determine conflict type
      const conflictType = this.determineConflictType(clientData, serverData);

      const conflict: Conflict = {
        id: `${tableName}_${recordId}_${Date.now()}`,
        tableName,
        recordId,
        conflictType,
        serverData,
        clientData,
        detectedAt: new Date().toISOString(),
      };

      // Store conflict for manual resolution if needed
      await this.storeConflict(conflict);

      return { data: conflict, success: true };
    } catch (error: any) {
      logger.error('Error detecting conflict', error, 'ConflictResolutionService');
      return { error: `שגיאה בזיהוי קונפליקט: ${error.message}` };
    }
  }

  /**
   * Check if there's a conflict between client and server data
   * @param clientData - Client data
   * @param serverData - Server data
   * @returns True if conflict exists
   */
  private static hasConflict(
    clientData: Record<string, any>,
    serverData: Record<string, any>
  ): boolean {
    // Compare updated_at timestamps
    const clientUpdated = clientData.updated_at || clientData.created_at;
    const serverUpdated = serverData.updated_at || serverData.created_at;

    if (!clientUpdated || !serverUpdated) {
      return false;
    }

    // If timestamps are different, there might be a conflict
    if (new Date(clientUpdated).getTime() !== new Date(serverUpdated).getTime()) {
      return true;
    }

    // Compare key fields
    const keyFields = ['full_name', 'email', 'phone', 'crm_status', 'payment_status'];
    for (const field of keyFields) {
      if (clientData[field] !== serverData[field]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine conflict type
   * @param clientData - Client data
   * @param serverData - Server data
   * @returns Conflict type
   */
  private static determineConflictType(
    clientData: Record<string, any>,
    serverData: Record<string, any>
  ): 'update' | 'delete' | 'create' {
    if (!serverData || Object.keys(serverData).length === 0) {
      return 'create';
    }

    if (!clientData || Object.keys(clientData).length === 0) {
      return 'delete';
    }

    return 'update';
  }

  /**
   * Store conflict for manual resolution
   * @param conflict - Conflict object
   */
  private static async storeConflict(conflict: Conflict): Promise<void> {
    try {
      // In a real implementation, you would store conflicts in a database table
      // For now, we'll just log them
      logger.warn('Conflict detected', conflict, 'ConflictResolutionService');
      
      // TODO: Store in conflicts table
      // await supabase.from('data_conflicts').insert(conflict);
    } catch (error) {
      logger.error('Error storing conflict', error, 'ConflictResolutionService');
    }
  }

  /**
   * Resolve conflict using a strategy
   * @param conflict - Conflict object
   * @param resolution - Resolution details
   * @returns Promise with resolution result
   */
  static async resolveConflict(
    conflict: Conflict,
    resolution: ConflictResolution
  ): Promise<ApiResponse<Record<string, any>>> {
    try {
      let resolvedData: Record<string, any>;

      switch (resolution.strategy) {
        case 'server_wins':
          resolvedData = conflict.serverData;
          break;

        case 'client_wins':
          resolvedData = conflict.clientData;
          break;

        case 'newer_wins':
          const clientTime = new Date(conflict.clientData.updated_at || conflict.clientData.created_at).getTime();
          const serverTime = new Date(conflict.serverData.updated_at || conflict.serverData.created_at).getTime();
          resolvedData = clientTime > serverTime ? conflict.clientData : conflict.serverData;
          break;

        case 'merge':
          resolvedData = this.mergeData(conflict.clientData, conflict.serverData);
          break;

        case 'manual':
          if (!resolution.resolvedData) {
            return { error: 'נדרש resolvedData עבור manual resolution' };
          }
          resolvedData = resolution.resolvedData;
          break;

        default:
          return { error: 'אסטרטגיית פתרון לא חוקית' };
      }

      // Apply resolved data to database
      const { data, error } = await supabase
        .from(conflict.tableName)
        .update(resolvedData)
        .eq('id', conflict.recordId)
        .select()
        .single();

      if (error) {
        logger.error('Error applying conflict resolution', error, 'ConflictResolutionService');
        return { error: `שגיאה ביישום פתרון קונפליקט: ${error.message}` };
      }

      // Mark conflict as resolved
      await this.markConflictResolved(conflict.id, resolution);

      return { data: resolvedData, success: true };
    } catch (error: any) {
      logger.error('Error resolving conflict', error, 'ConflictResolutionService');
      return { error: `שגיאה בפתרון קונפליקט: ${error.message}` };
    }
  }

  /**
   * Merge client and server data
   * @param clientData - Client data
   * @param serverData - Server data
   * @returns Merged data
   */
  private static mergeData(
    clientData: Record<string, any>,
    serverData: Record<string, any>
  ): Record<string, any> {
    const merged = { ...serverData };

    // Merge non-null client values
    for (const [key, value] of Object.entries(clientData)) {
      if (value !== null && value !== undefined && value !== '') {
        // Prefer newer value if timestamps exist
        const clientTime = new Date(clientData.updated_at || clientData.created_at).getTime();
        const serverTime = new Date(serverData.updated_at || serverData.created_at).getTime();
        
        if (clientTime > serverTime || !serverData[key]) {
          merged[key] = value;
        }
      }
    }

    return merged;
  }

  /**
   * Mark conflict as resolved
   * @param conflictId - Conflict ID
   * @param resolution - Resolution details
   */
  private static async markConflictResolved(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    try {
      // In a real implementation, you would update the conflicts table
      logger.info('Conflict resolved', { conflictId, resolution }, 'ConflictResolutionService');
      
      // TODO: Update conflicts table
      // await supabase
      //   .from('data_conflicts')
      //   .update({
      //     resolvedAt: new Date().toISOString(),
      //     resolutionStrategy: resolution.strategy,
      //     resolvedBy: resolution.resolvedBy,
      //   })
      //   .eq('id', conflictId);
    } catch (error) {
      logger.error('Error marking conflict as resolved', error, 'ConflictResolutionService');
    }
  }

  /**
   * Get unresolved conflicts
   * @param tableName - Optional table name filter
   * @returns Promise with conflicts list
   */
  static async getUnresolvedConflicts(
    tableName?: string
  ): Promise<ApiResponse<Conflict[]>> {
    try {
      // In a real implementation, you would fetch from conflicts table
      // For now, return empty array
      logger.debug('Getting unresolved conflicts', { tableName }, 'ConflictResolutionService');
      
      // TODO: Fetch from conflicts table
      // const { data, error } = await supabase
      //   .from('data_conflicts')
      //   .select('*')
      //   .is('resolvedAt', null)
      //   .eq(tableName ? 'tableName' : 'id', tableName || 'id', tableName || '');
      
      return { data: [], success: true };
    } catch (error: any) {
      logger.error('Error getting unresolved conflicts', error, 'ConflictResolutionService');
      return { error: `שגיאה בקבלת קונפליקטים: ${error.message}` };
    }
  }

  /**
   * Auto-resolve conflicts using default strategy
   * @param conflicts - Array of conflicts
   * @param defaultStrategy - Default resolution strategy
   * @param resolvedBy - User ID who resolved
   * @returns Promise with resolution results
   */
  static async autoResolveConflicts(
    conflicts: Conflict[],
    defaultStrategy: ConflictResolutionStrategy = 'newer_wins',
    resolvedBy: string
  ): Promise<ApiResponse<{ resolved: number; failed: number; errors: string[] }>> {
    try {
      let resolved = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const conflict of conflicts) {
        const resolution: ConflictResolution = {
          conflictId: conflict.id,
          strategy: defaultStrategy,
          resolvedBy,
        };

        const result = await this.resolveConflict(conflict, resolution);

        if (result.success) {
          resolved++;
        } else {
          failed++;
          errors.push(result.error || 'Unknown error');
        }
      }

      return {
        data: { resolved, failed, errors },
        success: true,
      };
    } catch (error: any) {
      logger.error('Error auto-resolving conflicts', error, 'ConflictResolutionService');
      return { error: `שגיאה בפתרון אוטומטי של קונפליקטים: ${error.message}` };
    }
  }
}
