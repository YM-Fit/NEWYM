/**
 * Data Export Service
 * שירות ייצוא נתונים - CSV, JSON, Excel
 * 
 * @module dataExportService
 * @description Provides data export functionality for application data 
 * interactions, and reports. Supports CSV, JSON, and Excel formats.
 */

import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';
import { supabase } from '../lib/supabase';

export type ExportFormat = 'csv' | 'json' | 'excel';
export type ExportDataType = 'reports' | 'all';

export interface ExportOptions {
  format: ExportFormat;
  dataType: ExportDataType;
  trainerId: string;
  filters?: {
    dateRange?: { start: string; end: string };
    status?: string[];
    clientIds?: string[];
  };
  includeMetadata?: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: Blob;
  filename?: string;
  error?: string;
}

/**
 * Data Export Service Class
 */
export class DataExportService {
  /**
   * Export data to specified format
   * @param options - Export options
   * @returns Promise with export result
   */
  static async exportData(options: ExportOptions): Promise<ApiResponse<ExportResult>> {
    try {
      logger.debug('Starting data export', { options }, 'DataExportService');

      let data: any[] = [];

      // Fetch data based on type
      switch (options.dataType) {
        case 'reports':
          data = await this.fetchReportsData(options);
          break;
        case 'all':
          data = await this.fetchAllData(options);
          break;
        default:
          return { error: 'סוג נתונים לא חוקי' };
      }

      if (!data || data.length === 0) {
        return { error: 'אין נתונים לייצוא' };
      }

      // Apply filters if provided
      const filteredData = this.applyFilters(data, options.filters);

      // Export based on format
      let result: ExportResult;
      switch (options.format) {
        case 'csv':
          result = await this.exportToCSV(filteredData, options);
          break;
        case 'json':
          result = await this.exportToJSON(filteredData, options);
          break;
        case 'excel':
          result = await this.exportToExcel(filteredData, options);
          break;
        default:
          return { error: 'פורמט ייצוא לא חוקי' };
      }

      return { data: result, success: true };
    } catch (error) {
      logger.error('Error exporting data', error, 'DataExportService');
      return { error: 'שגיאה בייצוא נתונים' };
    }
  }

  /**
   * Fetch reports data (placeholder - would need actual reports service)
   * @param options - Export options
   * @returns Promise with reports data
   */
  private static async fetchReportsData(options: ExportOptions): Promise<any[]> {
    logger.warn('Reports export not fully implemented', { options }, 'DataExportService');
    return [];
  }

  /**
   * Fetch all data types
   * @param options - Export options
   * @returns Promise with all data
   */
  private static async fetchAllData(options: ExportOptions): Promise<any[]> {
    const reports = await this.fetchReportsData(options);
    return reports.map((r: any) => ({ ...r, _type: 'report' }));
  }

  /**
   * Apply filters to data
   * @param data - Data to filter
   * @param filters - Filter options
   * @returns Filtered data
   */
  private static applyFilters(data: any[], filters?: ExportOptions['filters']): any[] {
    if (!filters) return data;

    let filtered = [...data];


    return filtered;
  }

  /**
   * Export data to CSV format
   * @param data - Data to export
   * @param options - Export options
   * @returns Export result
   */
  private static async exportToCSV(data: any[], options: ExportOptions): Promise<ExportResult> {
    if (!data || data.length === 0) {
      return { success: false, error: 'אין נתונים לייצוא' };
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.map((h) => this.formatHeaderForCSV(h));

    // Create CSV rows
    const csvRows = data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Handle nested objects/arrays
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      })
    );

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Add BOM for Hebrew support
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    const filename = this.generateFilename(options, 'csv');

    return {
      success: true,
      data: blob,
      filename,
    };
  }

  /**
   * Export data to JSON format
   * @param data - Data to export
   * @param options - Export options
   * @returns Export result
   */
  private static async exportToJSON(data: any[], options: ExportOptions): Promise<ExportResult> {
    if (!data || data.length === 0) {
      return { success: false, error: 'אין נתונים לייצוא' };
    }

    const exportObject = options.includeMetadata
      ? {
          metadata: {
            exportedAt: new Date().toISOString(),
            dataType: options.dataType,
            recordCount: data.length,
            trainerId: options.trainerId,
          },
          data,
        }
      : data;

    const jsonContent = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });

    const filename = this.generateFilename(options, 'json');

    return {
      success: true,
      data: blob,
      filename,
    };
  }

  /**
   * Export data to Excel format
   * @param data - Data to export
   * @param options - Export options
   * @returns Export result
   */
  private static async exportToExcel(data: any[], options: ExportOptions): Promise<ExportResult> {
    if (!data || data.length === 0) {
      return { success: false, error: 'אין נתונים לייצוא' };
    }

    try {
      // Convert data to worksheet format
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Auto-size columns (basic implementation)
      const maxWidth = 50;
      const wscols = Object.keys(data[0]).map(() => ({
        wch: maxWidth,
      }));
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      // Add metadata sheet if requested
      if (options.includeMetadata) {
        const metadataSheet = XLSX.utils.json_to_sheet([
          {
            Property: 'Exported At',
            Value: new Date().toISOString(),
          },
          {
            Property: 'Data Type',
            Value: options.dataType,
          },
          {
            Property: 'Record Count',
            Value: data.length,
          },
          {
            Property: 'Trainer ID',
            Value: options.trainerId,
          },
        ]);
        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
      }

      // Convert to binary string
      const excelBuffer = XLSX.write(workbook, {
        type: 'array',
        bookType: 'xlsx',
      });

      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const filename = this.generateFilename(options, 'xlsx');

      return {
        success: true,
        data: blob,
        filename,
      };
    } catch (error) {
      logger.error('Error creating Excel file', error, 'DataExportService');
      return { success: false, error: 'שגיאה ביצירת קובץ Excel' };
    }
  }

  /**
   * Generate filename for export
   * @param options - Export options
   * @param extension - File extension
   * @returns Filename
   */
  private static generateFilename(options: ExportOptions, extension: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const dataTypeLabel = options.dataType === 'all' ? 'all-data' : options.dataType;
    return `${dataTypeLabel}-${timestamp}.${extension}`;
  }

  /**
   * Format header for CSV (Hebrew support)
   * @param header - Header key
   * @returns Formatted header
   */
  private static formatHeaderForCSV(header: string): string {
    // Map common headers to Hebrew labels
    const headerMap: Record<string, string> = {
      id: 'מזהה',
      trainer_id: 'מזהה מאמן',
      trainee_id: 'מזהה מתאמן',
      client_name: 'שם לקוח',
      client_email: 'אימייל',
      client_phone: 'טלפון',
      interaction_type: 'סוג אינטראקציה',
      interaction_date: 'תאריך אינטראקציה',
      subject: 'נושא',
      description: 'תיאור',
      outcome: 'תוצאה',
      next_action: 'פעולה הבאה',
      next_action_date: 'תאריך פעולה הבאה',
      created_at: 'תאריך יצירה',
    };

    return headerMap[header] || header;
  }

  /**
   * Trigger download of exported file
   * @param blob - File blob
   * @param filename - Filename
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    // Safely remove the element if it's still in the DOM
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch (e) {
        // Element may have already been removed, ignore
      }
    }, 0);
    URL.revokeObjectURL(url);
  }

  /**
   * Create a scheduled export
   * @param scheduleConfig - Schedule configuration
   * @returns Promise with scheduled export result
   */
  static async createScheduledExport(scheduleConfig: ScheduledExportConfig): Promise<ApiResponse<any>> {
    try {
      // Calculate next run time
      const { data: nextRunData, error: nextRunError } = await supabase.rpc('calculate_next_run_time', {
        p_schedule_type: scheduleConfig.scheduleType,
        p_schedule_config: scheduleConfig.scheduleConfig,
        p_last_run_at: null,
      });

      if (nextRunError) {
        logger.error('Error calculating next run time', nextRunError, 'DataExportService');
        return { error: 'שגיאה בחישוב זמן הרצה הבא' };
      }

      const { data, error } = await supabase
        .from('scheduled_exports')
        .insert({
          trainer_id: scheduleConfig.trainerId,
          name: scheduleConfig.name,
          description: scheduleConfig.description,
          enabled: scheduleConfig.enabled ?? true,
          format: scheduleConfig.format,
          data_type: scheduleConfig.dataType,
          filters: scheduleConfig.filters || {},
          include_metadata: scheduleConfig.includeMetadata ?? false,
          schedule_type: scheduleConfig.scheduleType,
          schedule_config: scheduleConfig.scheduleConfig,
          delivery_method: scheduleConfig.deliveryMethod,
          delivery_config: scheduleConfig.deliveryConfig,
          next_run_at: nextRunData,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating scheduled export', error, 'DataExportService');
        return { error: 'שגיאה ביצירת ייצוא מתוזמן' };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error creating scheduled export', error, 'DataExportService');
      return { error: 'שגיאה ביצירת ייצוא מתוזמן' };
    }
  }

  /**
   * Get all scheduled exports for a trainer
   * @param trainerId - Trainer ID
   * @returns Promise with scheduled exports
   */
  static async getScheduledExports(trainerId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('scheduled_exports')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching scheduled exports', error, 'DataExportService');
        return { error: 'שגיאה בטעינת ייצואים מתוזמנים' };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error fetching scheduled exports', error, 'DataExportService');
      return { error: 'שגיאה בטעינת ייצואים מתוזמנים' };
    }
  }

  /**
   * Update a scheduled export
   * @param exportId - Scheduled export ID
   * @param updates - Updates to apply
   * @returns Promise with update result
   */
  static async updateScheduledExport(
    exportId: string,
    updates: Partial<ScheduledExportConfig>
  ): Promise<ApiResponse<any>> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Recalculate next run time if schedule changed
      if (updates.scheduleType || updates.scheduleConfig) {
        const { data: currentExport } = await supabase
          .from('scheduled_exports')
          .select('schedule_type, schedule_config, last_run_at')
          .eq('id', exportId)
          .single();

        if (currentExport) {
          const { data: nextRunData, error: nextRunError } = await supabase.rpc('calculate_next_run_time', {
            p_schedule_type: updates.scheduleType || currentExport.schedule_type,
            p_schedule_config: updates.scheduleConfig || currentExport.schedule_config,
            p_last_run_at: currentExport.last_run_at,
          });

          if (!nextRunError && nextRunData) {
            updateData.next_run_at = nextRunData;
          }
        }
      }

      const { data, error } = await supabase
        .from('scheduled_exports')
        .update(updateData)
        .eq('id', exportId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating scheduled export', error, 'DataExportService');
        return { error: 'שגיאה בעדכון ייצוא מתוזמן' };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error updating scheduled export', error, 'DataExportService');
      return { error: 'שגיאה בעדכון ייצוא מתוזמן' };
    }
  }

  /**
   * Delete a scheduled export
   * @param exportId - Scheduled export ID
   * @returns Promise with delete result
   */
  static async deleteScheduledExport(exportId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('scheduled_exports')
        .delete()
        .eq('id', exportId);

      if (error) {
        logger.error('Error deleting scheduled export', error, 'DataExportService');
        return { error: 'שגיאה במחיקת ייצוא מתוזמן' };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting scheduled export', error, 'DataExportService');
      return { error: 'שגיאה במחיקת ייצוא מתוזמן' };
    }
  }

  /**
   * Toggle scheduled export enabled status
   * @param exportId - Scheduled export ID
   * @param enabled - Enabled status
   * @returns Promise with update result
   */
  static async toggleScheduledExport(exportId: string, enabled: boolean): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('scheduled_exports')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', exportId)
        .select()
        .single();

      if (error) {
        logger.error('Error toggling scheduled export', error, 'DataExportService');
        return { error: 'שגיאה בעדכון סטטוס ייצוא מתוזמן' };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error toggling scheduled export', error, 'DataExportService');
      return { error: 'שגיאה בעדכון סטטוס ייצוא מתוזמן' };
    }
  }
}

/**
 * Scheduled Export Configuration
 */
export interface ScheduledExportConfig {
  trainerId: string;
  name: string;
  description?: string;
  enabled?: boolean;
  format: ExportFormat;
  dataType: ExportDataType;
  filters?: ExportOptions['filters'];
  includeMetadata?: boolean;
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'custom';
  scheduleConfig: {
    time?: string; // HH:mm format
    day_of_week?: number; // 0-6 (Sunday-Saturday)
    day_of_month?: number; // 1-31
    [key: string]: any;
  };
  deliveryMethod: 'email' | 'storage' | 'webhook';
  deliveryConfig: {
    email?: string;
    webhook_url?: string;
    storage_path?: string;
    [key: string]: any;
  };
}