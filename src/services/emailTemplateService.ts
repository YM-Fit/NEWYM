/**
 * Email Template Service
 * שירות משופר לניהול תבניות אימייל עם preview ו-variable substitution
 */

import { CommunicationService, type CommunicationTemplate } from './communicationService';
import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

/**
 * Email Template with Preview
 */
export interface EmailTemplatePreview {
  template: CommunicationTemplate;
  preview?: {
    subject?: string;
    body: string;
    variables: Record<string, string>;
  };
}

/**
 * Email Template Category
 */
export interface EmailTemplateCategory {
  id: string;
  name: string;
  description?: string;
  templates: CommunicationTemplate[];
}

/**
 * Email Send Result
 */
export interface EmailSendResult {
  sent: number;
  failed: number;
  errors: Array<{ traineeId: string; error: string }>;
}

/**
 * Email Template Service
 */
export class EmailTemplateService {
  /**
   * Get all templates with preview
   * @param trainerId - Trainer ID
   * @param variables - Optional default variables for preview
   * @returns Promise with templates and previews
   */
  static async getTemplatesWithPreview(
    trainerId: string,
    variables?: Record<string, string>
  ): Promise<ApiResponse<EmailTemplatePreview[]>> {
    try {
      const templatesResult = await CommunicationService.getTemplates(trainerId);
      
      if (!templatesResult.success || !templatesResult.data) {
        return templatesResult;
      }

      const defaultVariables = variables || {
        name: 'שם לקוח',
        email: 'client@example.com',
        phone: '050-1234567',
        trainer_name: 'מאמן',
        contract_value: '1000',
        payment_date: '01/01/2025',
      };

      const previews: EmailTemplatePreview[] = templatesResult.data.map(template => ({
        template,
        preview: {
          subject: template.subject ? 
            this.substituteVariables(template.subject, defaultVariables) : 
            undefined,
          body: this.substituteVariables(template.body, defaultVariables),
          variables: defaultVariables,
        },
      }));

      return { data: previews, success: true };
    } catch (error) {
      logger.error('Error getting templates with preview', error, 'EmailTemplateService');
      return { error: 'שגיאה בטעינת תבניות' };
    }
  }

  /**
   * Preview template with custom variables
   * @param template - Template to preview
   * @param variables - Variables for substitution
   * @returns Previewed template
   */
  static previewTemplate(
    template: CommunicationTemplate,
    variables: Record<string, string>
  ): { subject?: string; body: string } {
    return CommunicationService.renderTemplate(template, variables);
  }

  /**
   * Substitute variables in text
   * @param text - Text with variables
   * @param variables - Variables to substitute
   * @returns Text with substituted variables
   */
  static substituteVariables(
    text: string,
    variables: Record<string, string>
  ): string {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  /**
   * Get available variables for template
   * @returns List of available variables
   */
  static getAvailableVariables(): Array<{ key: string; description: string; example: string }> {
    return [
      { key: 'name', description: 'שם הלקוח', example: 'יוסי כהן' },
      { key: 'email', description: 'אימייל הלקוח', example: 'yossi@example.com' },
      { key: 'phone', description: 'טלפון הלקוח', example: '050-1234567' },
      { key: 'trainer_name', description: 'שם המאמן', example: 'דני' },
      { key: 'contract_value', description: 'ערך החוזה', example: '1000' },
      { key: 'payment_date', description: 'תאריך תשלום', example: '01/01/2025' },
      { key: 'next_appointment', description: 'תאריך פגישה הבאה', example: '15/01/2025' },
      { key: 'client_status', description: 'סטטוס הלקוח', example: 'פעיל' },
    ];
  }

  /**
   * Get templates by category
   * @param trainerId - Trainer ID
   * @returns Promise with categorized templates
   */
  static async getTemplatesByCategory(
    trainerId: string
  ): Promise<ApiResponse<EmailTemplateCategory[]>> {
    try {
      const templatesResult = await CommunicationService.getTemplates(trainerId);
      
      if (!templatesResult.success || !templatesResult.data) {
        return templatesResult;
      }

      const categories: EmailTemplateCategory[] = [
        {
          id: 'payment',
          name: 'תשלומים',
          description: 'תבניות הקשורות לתשלומים',
          templates: templatesResult.data.filter(t => 
            t.name.toLowerCase().includes('תשלום') || 
            t.name.toLowerCase().includes('payment') ||
            t.body.includes('{{payment_date}}') ||
            t.body.includes('{{contract_value}}')
          ),
        },
        {
          id: 'reminder',
          name: 'תזכורות',
          description: 'תבניות תזכורת',
          templates: templatesResult.data.filter(t => 
            t.name.toLowerCase().includes('תזכורת') || 
            t.name.toLowerCase().includes('reminder')
          ),
        },
        {
          id: 'welcome',
          name: 'ברוכים הבאים',
          description: 'תבניות ברכה ללקוחות חדשים',
          templates: templatesResult.data.filter(t => 
            t.name.toLowerCase().includes('ברוכים') || 
            t.name.toLowerCase().includes('welcome')
          ),
        },
        {
          id: 'follow-up',
          name: 'מעקב',
          description: 'תבניות מעקב אחר לקוחות',
          templates: templatesResult.data.filter(t => 
            t.name.toLowerCase().includes('מעקב') || 
            t.name.toLowerCase().includes('follow')
          ),
        },
        {
          id: 'other',
          name: 'אחר',
          description: 'תבניות אחרות',
          templates: templatesResult.data.filter(t => {
            const name = t.name.toLowerCase();
            return !name.includes('תשלום') && 
                   !name.includes('payment') &&
                   !name.includes('תזכורת') &&
                   !name.includes('reminder') &&
                   !name.includes('ברוכים') &&
                   !name.includes('welcome') &&
                   !name.includes('מעקב') &&
                   !name.includes('follow');
          }),
        },
      ].filter(cat => cat.templates.length > 0);

      return { data: categories, success: true };
    } catch (error) {
      logger.error('Error getting templates by category', error, 'EmailTemplateService');
      return { error: 'שגיאה במיון תבניות' };
    }
  }

  /**
   * Send email using template
   * @param templateId - Template ID
   * @param traineeId - Trainee ID
   * @param trainerId - Trainer ID
   * @param customVariables - Custom variables to override defaults
   * @returns Promise with send result
   */
  static async sendEmailFromTemplate(
    templateId: string,
    traineeId: string,
    trainerId: string,
    customVariables?: Record<string, string>
  ): Promise<ApiResponse> {
    try {
      // Get template
      const templatesResult = await CommunicationService.getTemplates(trainerId);
      if (!templatesResult.success || !templatesResult.data) {
        return { error: 'שגיאה בטעינת תבנית' };
      }

      const template = templatesResult.data.find(t => t.id === templateId);
      if (!template) {
        return { error: 'תבנית לא נמצאה' };
      }

      // Get trainee data
      const { data: trainee, error: traineeError } = await supabase
        .from('trainees')
        .select('*')
        .eq('id', traineeId)
        .eq('trainer_id', trainerId)
        .single();

      if (traineeError || !trainee) {
        logSupabaseError(traineeError!, 'sendEmailFromTemplate.trainee', { table: 'trainees', traineeId });
        return { error: 'לקוח לא נמצא' };
      }

      // Get trainer data
      const { data: trainer, error: trainerError } = await supabase
        .from('trainers')
        .select('full_name')
        .eq('id', trainerId)
        .single();

      // Build variables
      const variables: Record<string, string> = {
        name: trainee.full_name || '',
        email: trainee.email || '',
        phone: trainee.phone || '',
        trainer_name: trainer?.full_name || 'מאמן',
        contract_value: trainee.contract_value?.toString() || '0',
        payment_date: trainee.next_payment_date || '',
        next_appointment: trainee.next_appointment_date || '',
        client_status: trainee.crm_status || 'פעיל',
        ...customVariables,
      };

      // Render template
      const rendered = CommunicationService.renderTemplate(template, variables);

      // Send email
      if (template.template_type === 'email' && trainee.email) {
        const result = await CommunicationService.sendEmail(
          trainee.email,
          rendered.subject || '',
          rendered.body,
          trainerId,
          traineeId
        );
        return result;
      }

      return { error: 'אימייל לא זמין ללקוח' };
    } catch (error) {
      logger.error('Error sending email from template', error, 'EmailTemplateService');
      return { error: 'שגיאה בשליחת אימייל' };
    }
  }

  /**
   * Send bulk emails using template
   * @param templateId - Template ID
   * @param traineeIds - Array of trainee IDs
   * @param trainerId - Trainer ID
   * @param customVariables - Custom variables to override defaults
   * @returns Promise with send results
   */
  static async sendBulkEmailsFromTemplate(
    templateId: string,
    traineeIds: string[],
    trainerId: string,
    customVariables?: Record<string, string>
  ): Promise<ApiResponse<EmailSendResult>> {
    try {
      const result: EmailSendResult = {
        sent: 0,
        failed: 0,
        errors: [],
      };

      // Send to each trainee
      for (const traineeId of traineeIds) {
        try {
          const sendResult = await this.sendEmailFromTemplate(
            templateId,
            traineeId,
            trainerId,
            customVariables
          );

          if (sendResult.success) {
            result.sent++;
          } else {
            result.failed++;
            result.errors.push({
              traineeId,
              error: sendResult.error || 'שגיאה לא ידועה',
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            traineeId,
            error: error instanceof Error ? error.message : 'שגיאה לא ידועה',
          });
        }
      }

      return { data: result, success: true };
    } catch (error) {
      logger.error('Error sending bulk emails', error, 'EmailTemplateService');
      return { error: 'שגיאה בשליחת אימיילים מרובים' };
    }
  }

  /**
   * Validate template variables
   * @param template - Template to validate
   * @returns Validation result
   */
  static validateTemplate(template: CommunicationTemplate): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!template.name || template.name.trim() === '') {
      errors.push('שם תבנית חובה');
    }

    if (!template.body || template.body.trim() === '') {
      errors.push('תוכן תבנית חובה');
    }

    if (template.template_type === 'email' && (!template.subject || template.subject.trim() === '')) {
      errors.push('נושא אימייל חובה');
    }

    // Extract variables from template
    const bodyVariables = this.extractVariables(template.body);
    const subjectVariables = template.subject ? this.extractVariables(template.subject) : [];

    // Check for undefined variables
    const allVariables = [...new Set([...bodyVariables, ...subjectVariables])];
    const availableVariables = this.getAvailableVariables().map(v => v.key);

    allVariables.forEach(variable => {
      if (!availableVariables.includes(variable)) {
        warnings.push(`משתנה לא מוכר: {{${variable}}}`);
      }
    });

    // Check for closing braces
    if ((template.body.match(/\{\{/g) || []).length !== (template.body.match(/\}\}/g) || []).length) {
      errors.push('סוגריים לא תואמים במשתנים');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extract variables from text
   * @param text - Text to extract variables from
   * @returns Array of variable names
   */
  private static extractVariables(text: string): string[] {
    const regex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }
}
