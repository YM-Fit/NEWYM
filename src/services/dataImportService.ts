/**
 * Data Import Service
 * שירות ייבוא נתונים - CSV, JSON
 * 
 * @module dataImportService
 * @description Provides data import functionality for CRM data including clients 
 * and interactions. Supports CSV and JSON formats with validation using Zod.
 */

import { z } from 'zod';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';
import { supabase } from '../lib/supabase';
import { isValidEmail, isValidPhone, validateClientName } from '../utils/validation';
import { CRM_VALIDATION, CRM_STATUS, INTERACTION_TYPE } from '../constants/crmConstants';

// Zod schemas for validation
const ClientImportSchema = z.object({
  full_name: z.string().min(CRM_VALIDATION.MIN_CLIENT_NAME_LENGTH),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  trainer_id: z.string().uuid(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  birth_date: z.string().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  client_since: z.string().optional(),
  last_contact_date: z.string().optional(),
  next_followup_date: z.string().optional(),
  contract_type: z.enum(['monthly', 'package', 'session', 'trial']).optional(),
  contract_value: z.number().positive().optional(),
  payment_status: z.enum(['paid', 'pending', 'overdue', 'free']).optional(),
  lead_source: z.string().optional(),
  priority_level: z.enum(['low', 'medium', 'high', 'vip']).optional(),
  tags: z.array(z.string()).optional(),
  crm_status: z.enum([
    CRM_STATUS.LEAD,
    CRM_STATUS.QUALIFIED,
    CRM_STATUS.ACTIVE,
    CRM_STATUS.INACTIVE,
    CRM_STATUS.CHURNED,
    CRM_STATUS.ON_HOLD,
  ]).optional(),
  notes: z.string().optional(),
});

const InteractionImportSchema = z.object({
  trainee_id: z.string().uuid(),
  trainer_id: z.string().uuid(),
  interaction_type: z.enum([
    INTERACTION_TYPE.CALL,
    INTERACTION_TYPE.EMAIL,
    INTERACTION_TYPE.SMS,
    INTERACTION_TYPE.MEETING,
    INTERACTION_TYPE.WORKOUT,
    INTERACTION_TYPE.MESSAGE,
    INTERACTION_TYPE.NOTE,
  ]),
  interaction_date: z.string(),
  subject: z.string().optional(),
  description: z.string().optional(),
  outcome: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.string().optional(),
  google_event_id: z.string().optional(),
});

export type ImportFormat = 'csv' | 'json';
export type ImportDataType = 'clients' | 'interactions';

export interface ImportOptions {
  format: ImportFormat;
  dataType: ImportDataType;
  trainerId: string;
  file: File;
  validateBeforeImport?: boolean;
  skipErrors?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

/**
 * Data Import Service Class
 */
export class DataImportService {
  /**
   * Import data from file
   * @param options - Import options
   * @returns Promise with import result
   */
  static async importData(options: ImportOptions): Promise<ApiResponse<ImportResult>> {
    try {
      logger.debug('Starting data import', { options: { ...options, file: options.file.name } }, 'DataImportService');

      // Parse file based on format
      let parsedData: any[];
      try {
        parsedData = await this.parseFile(options.file, options.format);
      } catch (error) {
        logger.error('Error parsing file', error, 'DataImportService');
        return { error: 'שגיאה בקריאת הקובץ' };
      }

      if (!parsedData || parsedData.length === 0) {
        return { error: 'הקובץ ריק או לא תקין' };
      }

      // Validate data
      const validationResults = await this.validateData(parsedData, options);

      // Separate valid and invalid records
      const validRecords: any[] = [];
      const errors: ImportResult['errors'] = [];

      validationResults.forEach((result, index) => {
        if (result.isValid && result.data) {
          validRecords.push(result.data);
        } else {
          errors.push({
            row: index + 1,
            data: parsedData[index],
            error: result.errors.join('; '),
          });
        }
      });

      if (validRecords.length === 0) {
        return {
          error: 'אין רשומות תקינות לייבא',
          data: {
            success: false,
            imported: 0,
            failed: parsedData.length,
            errors,
          },
        };
      }

      // Import valid records
      let imported = 0;
      let failed = errors.length;

      try {
        const importResult = await this.saveData(validRecords, options);
        imported = importResult.imported;
        failed += importResult.failed;
        errors.push(...importResult.errors);
      } catch (error) {
        logger.error('Error saving data', error, 'DataImportService');
        return { error: 'שגיאה בשמירת נתונים' };
      }

      return {
        data: {
          success: imported > 0,
          imported,
          failed,
          errors: options.skipErrors ? [] : errors,
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error importing data', error, 'DataImportService');
      return { error: 'שגיאה ביבוא נתונים' };
    }
  }

  /**
   * Parse file based on format
   * @param file - File to parse
   * @param format - File format
   * @returns Promise with parsed data
   */
  private static async parseFile(file: File, format: ImportFormat): Promise<any[]> {
    const text = await file.text();

    switch (format) {
      case 'csv':
        return this.parseCSV(text);
      case 'json':
        return this.parseJSON(text);
      default:
        throw new Error('פורמט קובץ לא נתמך');
    }
  }

  /**
   * Parse CSV text
   * @param text - CSV text
   * @returns Parsed data array
   */
  private static parseCSV(text: string): any[] {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    // Parse headers (first line)
    const headers = this.parseCSVLine(lines[0]).map((h) => h.trim().replace(/^\uFEFF/, '')); // Remove BOM

    // Parse data rows
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0 || values.every((v) => !v.trim())) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        row[header] = value === '' ? undefined : value;
      });
      data.push(row);
    }

    return data;
  }

  /**
   * Parse CSV line handling quotes
   * @param line - CSV line
   * @returns Array of values
   */
  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    values.push(current);
    return values;
  }

  /**
   * Parse JSON text
   * @param text - JSON text
   * @returns Parsed data array
   */
  private static parseJSON(text: string): any[] {
    try {
      const parsed = JSON.parse(text);
      // Handle both array and object with data property
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed && typeof parsed === 'object' && parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      } else {
        return [parsed];
      }
    } catch (error) {
      logger.error('Error parsing JSON', error, 'DataImportService');
      throw new Error('קובץ JSON לא תקין');
    }
  }

  /**
   * Validate data using Zod schemas
   * @param data - Data to validate
   * @param options - Import options
   * @returns Array of validation results
   */
  private static async validateData(data: any[], options: ImportOptions): Promise<ValidationResult[]> {
    const schema = options.dataType === 'clients' ? ClientImportSchema : InteractionImportSchema;

    return data.map((row, index) => {
      try {
        // Add trainer_id if missing
        if (!row.trainer_id && options.trainerId) {
          row.trainer_id = options.trainerId;
        }

        // Additional custom validation
        const customValidation = this.customValidate(row, options);

        if (!customValidation.isValid) {
          return {
            isValid: false,
            errors: customValidation.errors,
          };
        }

        // Zod validation
        const result = schema.safeParse(row);

        if (result.success) {
          return {
            isValid: true,
            errors: [],
            data: result.data,
          };
        } else {
          const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
          return {
            isValid: false,
            errors,
          };
        }
      } catch (error) {
        logger.error(`Error validating row ${index + 1}`, error, 'DataImportService');
        return {
          isValid: false,
          errors: ['שגיאה בוולידציה'],
        };
      }
    });
  }

  /**
   * Custom validation beyond Zod
   * @param row - Data row
   * @param options - Import options
   * @returns Validation result
   */
  private static customValidate(row: any, options: ImportOptions): ValidationResult {
    const errors: string[] = [];

    // Validate client name
    if (options.dataType === 'clients' && row.full_name) {
      const nameValidation = validateClientName(row.full_name);
      if (!nameValidation.isValid && nameValidation.error) {
        errors.push(nameValidation.error);
      }
    }

    // Validate email
    if (row.email && row.email.trim() && !isValidEmail(row.email)) {
      errors.push('כתובת אימייל לא תקינה');
    }

    // Validate phone
    if (row.phone && row.phone.trim() && !isValidPhone(row.phone)) {
      errors.push('מספר טלפון לא תקין');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Save validated data to database
   * @param data - Validated data
   * @param options - Import options
   * @returns Promise with save result
   */
  private static async saveData(data: any[], options: ImportOptions): Promise<{ imported: number; failed: number; errors: ImportResult['errors'] }> {
    const errors: ImportResult['errors'] = [];
    let imported = 0;

    try {
      if (options.dataType === 'clients') {
        const result = await supabase.from('trainees').insert(data).select();
        if (result.error) {
          logger.error('Error inserting clients', result.error, 'DataImportService');
          throw result.error;
        }
        imported = result.data?.length || 0;
      } else if (options.dataType === 'interactions') {
        const result = await supabase.from('client_interactions').insert(data).select();
        if (result.error) {
          logger.error('Error inserting interactions', result.error, 'DataImportService');
          throw result.error;
        }
        imported = result.data?.length || 0;
      }
    } catch (error: any) {
      logger.error('Error saving imported data', error, 'DataImportService');
      // Individual row errors would be caught here in a more sophisticated implementation
      errors.push({
        row: 0,
        data: {},
        error: error.message || 'שגיאה בשמירת נתונים',
      });
    }

    return {
      imported,
      failed: data.length - imported,
      errors,
    };
  }

  /**
   * Preview import data without saving
   * @param file - File to preview
   * @param format - File format
   * @param dataType - Data type
   * @returns Promise with preview result
   */
  static async previewImport(
    file: File,
    format: ImportFormat,
    dataType: ImportDataType,
    trainerId: string
  ): Promise<ApiResponse<{ total: number; valid: number; invalid: number; sample: any[]; errors: any[] }>> {
    try {
      const parsedData = await this.parseFile(file, format);
      
      if (!parsedData || parsedData.length === 0) {
        return { error: 'הקובץ ריק או לא תקין' };
      }

      const options: ImportOptions = {
        format,
        dataType,
        trainerId,
        file,
        validateBeforeImport: true,
      };

      const validationResults = await this.validateData(parsedData, options);

      const valid = validationResults.filter((r) => r.isValid).length;
      const invalid = validationResults.length - valid;

      const sample = validationResults.slice(0, 10).map((r, i) => ({
        row: i + 1,
        data: parsedData[i],
        isValid: r.isValid,
        errors: r.errors,
      }));

      const errors = validationResults
        .map((r, i) => ({
          row: i + 1,
          data: parsedData[i],
          errors: r.errors,
        }))
        .filter((e) => e.errors.length > 0)
        .slice(0, 20);

      return {
        data: {
          total: parsedData.length,
          valid,
          invalid,
          sample,
          errors,
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error previewing import', error, 'DataImportService');
      return { error: 'שגיאה בתצוגה מקדימה' };
    }
  }
}