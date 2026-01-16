/**
 * Communication Service
 * שירות לניהול תקשורת עם לקוחות
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

/**
 * Communication Template
 */
export interface CommunicationTemplate {
  id: string;
  trainer_id: string;
  template_type: 'email' | 'sms' | 'whatsapp';
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Communication Message
 */
export interface CommunicationMessage {
  id: string;
  trainee_id: string;
  trainer_id: string;
  message_type: 'email' | 'sms' | 'whatsapp' | 'in_app';
  subject?: string;
  body: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  template_id?: string;
}

/**
 * Communication Service
 */
export class CommunicationService {
  /**
   * Get all communication templates
   * @param trainerId - Trainer ID
   * @returns Promise with templates
   */
  static async getTemplates(
    trainerId: string
  ): Promise<ApiResponse<CommunicationTemplate[]>> {
    try {
      const { data, error } = await supabase
        .from('crm_communication_templates')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError(error, 'getTemplates', { table: 'crm_communication_templates', trainerId });
        return { error: error.message };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error getting templates', error, 'CommunicationService');
      return { error: 'שגיאה בטעינת תבניות' };
    }
  }

  /**
   * Create communication template
   * @param template - Template data
   * @returns Promise with created template
   */
  static async createTemplate(
    template: Omit<CommunicationTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<CommunicationTemplate>> {
    try {
      // Extract variables from template body
      const variables = this.extractVariables(template.body);

      const { data, error } = await supabase
        .from('crm_communication_templates')
        .insert([{
          trainer_id: template.trainer_id,
          template_type: template.template_type,
          name: template.name,
          subject: template.subject,
          body: template.body,
          variables,
        }])
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'createTemplate', { table: 'crm_communication_templates' });
        return { error: error.message };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error creating template', error, 'CommunicationService');
      return { error: 'שגיאה ביצירת תבנית' };
    }
  }

  /**
   * Update communication template
   * @param templateId - Template ID
   * @param updates - Updates to apply
   * @returns Promise with updated template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<CommunicationTemplate>
  ): Promise<ApiResponse<CommunicationTemplate>> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Re-extract variables if body changed
      if (updates.body) {
        updateData.variables = this.extractVariables(updates.body);
      }

      const { data, error } = await supabase
        .from('crm_communication_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'updateTemplate', { table: 'crm_communication_templates', templateId });
        return { error: error.message };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error updating template', error, 'CommunicationService');
      return { error: 'שגיאה בעדכון תבנית' };
    }
  }

  /**
   * Delete communication template
   * @param templateId - Template ID
   * @returns Promise with success status
   */
  static async deleteTemplate(templateId: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('crm_communication_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        logSupabaseError(error, 'deleteTemplate', { table: 'crm_communication_templates', templateId });
        return { error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting template', error, 'CommunicationService');
      return { error: 'שגיאה במחיקת תבנית' };
    }
  }

  /**
   * Render template with variables
   * @param template - Template
   * @param variables - Variable values
   * @returns Rendered template
   */
  static renderTemplate(
    template: CommunicationTemplate,
    variables: Record<string, string>
  ): { subject?: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    // Replace variables in subject
    if (subject) {
      Object.entries(variables).forEach(([key, value]) => {
        subject = subject!.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
    }

    // Replace variables in body
    Object.entries(variables).forEach(([key, value]) => {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return { subject, body };
  }

  /**
   * Extract variables from template text
   * @param text - Template text
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

  /**
   * Send email (placeholder - would integrate with email provider)
   * @param to - Recipient email
   * @param subject - Email subject
   * @param body - Email body
   * @param trainerId - Trainer ID
   * @param traineeId - Trainee ID
   * @returns Promise with success status
   */
  static async sendEmail(
    to: string,
    subject: string,
    body: string,
    trainerId: string,
    traineeId: string
  ): Promise<ApiResponse> {
    try {
      // TODO: Integrate with email provider (SendGrid, Mailgun, etc.)
      // For now, just log the message
      logger.info('Email sent', { to, subject, trainerId, traineeId }, 'CommunicationService');

      // Save to communication history
      const { error } = await supabase
        .from('crm_communication_messages')
        .insert([{
          trainee_id: traineeId,
          trainer_id: trainerId,
          message_type: 'email',
          subject,
          body,
          sent_at: new Date().toISOString(),
          status: 'sent',
        }]);

      if (error) {
        logger.error('Error saving communication', error, 'CommunicationService');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error sending email', error, 'CommunicationService');
      return { error: 'שגיאה בשליחת אימייל' };
    }
  }

  /**
   * Send SMS (placeholder - would integrate with SMS provider)
   * @param to - Recipient phone number
   * @param body - SMS body
   * @param trainerId - Trainer ID
   * @param traineeId - Trainee ID
   * @returns Promise with success status
   */
  static async sendSMS(
    to: string,
    body: string,
    trainerId: string,
    traineeId: string
  ): Promise<ApiResponse> {
    try {
      // TODO: Integrate with SMS provider (Twilio, etc.)
      // For now, just log the message
      logger.info('SMS sent', { to, trainerId, traineeId }, 'CommunicationService');

      // Save to communication history
      const { error } = await supabase
        .from('crm_communication_messages')
        .insert([{
          trainee_id: traineeId,
          trainer_id: trainerId,
          message_type: 'sms',
          body,
          sent_at: new Date().toISOString(),
          status: 'sent',
        }]);

      if (error) {
        logger.error('Error saving communication', error, 'CommunicationService');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error sending SMS', error, 'CommunicationService');
      return { error: 'שגיאה בשליחת SMS' };
    }
  }

  /**
   * Get communication history for a trainee
   * @param traineeId - Trainee ID
   * @returns Promise with communication history
   */
  static async getCommunicationHistory(
    traineeId: string
  ): Promise<ApiResponse<CommunicationMessage[]>> {
    try {
      const { data, error } = await supabase
        .from('crm_communication_messages')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('sent_at', { ascending: false });

      if (error) {
        logSupabaseError(error, 'getCommunicationHistory', { table: 'crm_communication_messages', traineeId });
        return { error: error.message };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error getting communication history', error, 'CommunicationService');
      return { error: 'שגיאה בטעינת היסטוריית תקשורת' };
    }
  }

  /**
   * Send bulk messages
   * @param traineeIds - Array of trainee IDs
   * @param templateId - Template ID
   * @param variables - Variable values (will be merged with trainee-specific data)
   * @param trainerId - Trainer ID
   * @returns Promise with results
   */
  static async sendBulkMessages(
    traineeIds: string[],
    templateId: string,
    variables: Record<string, string>,
    trainerId: string
  ): Promise<ApiResponse<{ sent: number; failed: number }>> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('crm_communication_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        return { error: 'תבנית לא נמצאה' };
      }

      let sent = 0;
      let failed = 0;

      // Get trainees data
      const { data: trainees, error: traineesError } = await supabase
        .from('trainees')
        .select('*')
        .in('id', traineeIds);

      if (traineesError) {
        return { error: traineesError.message };
      }

      // Send to each trainee
      for (const trainee of trainees || []) {
        try {
          const traineeVariables = {
            ...variables,
            name: trainee.full_name,
            email: trainee.email || '',
            phone: trainee.phone || '',
          };

          const rendered = this.renderTemplate(template, traineeVariables);

          if (template.template_type === 'email' && trainee.email) {
            await this.sendEmail(trainee.email, rendered.subject || '', rendered.body, trainerId, trainee.id);
            sent++;
          } else if (template.template_type === 'sms' && trainee.phone) {
            await this.sendSMS(trainee.phone, rendered.body, trainerId, trainee.id);
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          logger.error('Error sending to trainee', { traineeId: trainee.id, error }, 'CommunicationService');
          failed++;
        }
      }

      return { data: { sent, failed }, success: true };
    } catch (error) {
      logger.error('Error sending bulk messages', error, 'CommunicationService');
      return { error: 'שגיאה בשליחת הודעות מרובות' };
    }
  }
}
