/**
 * CRM Automation Service
 * שירות לניהול אוטומציה ותזכורות
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import { CRM_ALERTS } from '../constants/crmConstants';
import type { ApiResponse } from '../api/types';

/**
 * Automation Rule
 */
export interface AutomationRule {
  id: string;
  trainer_id: string;
  rule_type: 'reminder' | 'alert' | 'workflow' | 'notification';
  name: string;
  description?: string;
  enabled: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  schedule?: AutomationSchedule;
  created_at: string;
  updated_at: string;
}

/**
 * Automation Condition
 */
export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';
  value: any;
}

/**
 * Automation Action
 */
export interface AutomationAction {
  type: 'send_email' | 'send_sms' | 'create_task' | 'update_status' | 'create_interaction' | 'send_notification';
  params: Record<string, any>;
}

/**
 * Automation Schedule
 */
export interface AutomationSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_event';
  time?: string;
  day_of_week?: number;
  day_of_month?: number;
}

/**
 * Automation Task
 */
export interface AutomationTask {
  id: string;
  rule_id: string;
  trainee_id: string;
  trainer_id: string;
  task_type: string;
  due_date: string;
  completed: boolean;
  created_at: string;
}

/**
 * CRM Automation Service
 */
export class CrmAutomationService {
  /**
   * Get all automation rules for a trainer
   * @param trainerId - Trainer ID
   * @returns Promise with automation rules
   */
  static async getAutomationRules(
    trainerId: string
  ): Promise<ApiResponse<AutomationRule[]>> {
    try {
      const { data, error } = await supabase
        .from('crm_automation_rules')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError(error, 'getAutomationRules', { table: 'crm_automation_rules', trainerId });
        return { error: error.message };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error getting automation rules', error, 'CrmAutomationService');
      return { error: 'שגיאה בטעינת כללי אוטומציה' };
    }
  }

  /**
   * Create automation rule
   * @param rule - Rule data
   * @returns Promise with created rule
   */
  static async createAutomationRule(
    rule: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<AutomationRule>> {
    try {
      const { data, error } = await supabase
        .from('crm_automation_rules')
        .insert([{
          trainer_id: rule.trainer_id,
          rule_type: rule.rule_type,
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          conditions: rule.conditions,
          actions: rule.actions,
          schedule: rule.schedule,
        }])
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'createAutomationRule', { table: 'crm_automation_rules' });
        return { error: error.message };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error creating automation rule', error, 'CrmAutomationService');
      return { error: 'שגיאה ביצירת כלל אוטומציה' };
    }
  }

  /**
   * Update automation rule
   * @param ruleId - Rule ID
   * @param updates - Updates to apply
   * @returns Promise with updated rule
   */
  static async updateAutomationRule(
    ruleId: string,
    updates: Partial<AutomationRule>
  ): Promise<ApiResponse<AutomationRule>> {
    try {
      const { data, error } = await supabase
        .from('crm_automation_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'updateAutomationRule', { table: 'crm_automation_rules', ruleId });
        return { error: error.message };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error updating automation rule', error, 'CrmAutomationService');
      return { error: 'שגיאה בעדכון כלל אוטומציה' };
    }
  }

  /**
   * Delete automation rule
   * @param ruleId - Rule ID
   * @returns Promise with success status
   */
  static async deleteAutomationRule(ruleId: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('crm_automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        logSupabaseError(error, 'deleteAutomationRule', { table: 'crm_automation_rules', ruleId });
        return { error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting automation rule', error, 'CrmAutomationService');
      return { error: 'שגיאה במחיקת כלל אוטומציה' };
    }
  }

  /**
   * Get pending tasks for a trainer
   * @param trainerId - Trainer ID
   * @returns Promise with tasks
   */
  static async getPendingTasks(
    trainerId: string
  ): Promise<ApiResponse<AutomationTask[]>> {
    try {
      const { data, error } = await supabase
        .from('crm_automation_tasks')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('completed', false)
        .lte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true });

      if (error) {
        logSupabaseError(error, 'getPendingTasks', { table: 'crm_automation_tasks', trainerId });
        return { error: error.message };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error getting pending tasks', error, 'CrmAutomationService');
      return { error: 'שגיאה בטעינת משימות' };
    }
  }

  /**
   * Check for clients needing follow-up
   * @param trainerId - Trainer ID
   * @returns Promise with list of clients needing follow-up
   */
  static async checkFollowUpReminders(
    trainerId: string
  ): Promise<ApiResponse<any[]>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CRM_ALERTS.INACTIVE_CLIENT_DAYS);

      const { data: trainees, error } = await supabase
        .from('trainees')
        .select('*')
        .eq('trainer_id', trainerId)
        .or(`last_contact_date.is.null,last_contact_date.lt.${cutoffDate.toISOString()}`)
        .eq('crm_status', 'active');

      if (error) {
        logSupabaseError(error, 'checkFollowUpReminders', { table: 'trainees', trainerId });
        return { error: error.message };
      }

      return { data: trainees || [], success: true };
    } catch (error) {
      logger.error('Error checking follow-up reminders', error, 'CrmAutomationService');
      return { error: 'שגיאה בבדיקת תזכורות מעקב' };
    }
  }

  /**
   * Check for payment due reminders
   * @param trainerId - Trainer ID
   * @returns Promise with list of clients with due payments
   */
  static async checkPaymentReminders(
    trainerId: string
  ): Promise<ApiResponse<any[]>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: trainees, error } = await supabase
        .from('trainees')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('payment_status', 'pending')
        .not('contract_value', 'is', null);

      if (error) {
        logSupabaseError(error, 'checkPaymentReminders', { table: 'trainees', trainerId });
        return { error: error.message };
      }

      // Filter by next_followup_date if exists, or check last_contact_date
      const dueClients = trainees?.filter((trainee) => {
        if (trainee.next_followup_date) {
          return trainee.next_followup_date <= today;
        }
        return true;
      }) || [];

      return { data: dueClients, success: true };
    } catch (error) {
      logger.error('Error checking payment reminders', error, 'CrmAutomationService');
      return { error: 'שגיאה בבדיקת תזכורות תשלום' };
    }
  }

  /**
   * Evaluate automation rule conditions
   * @param rule - Automation rule
   * @param trainee - Trainee data
   * @returns Boolean indicating if conditions match
   */
  static evaluateConditions(
    rule: AutomationRule,
    trainee: any
  ): boolean {
    if (!rule.enabled) return false;

    return rule.conditions.every((condition) => {
      const fieldValue = trainee[condition.field];

      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case 'less_than':
          return Number(fieldValue) < Number(condition.value);
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'is_empty':
          return !fieldValue || fieldValue === '';
        case 'is_not_empty':
          return fieldValue && fieldValue !== '';
        default:
          return false;
      }
    });
  }

  /**
   * Execute automation actions
   * @param actions - Actions to execute
   * @param trainee - Trainee data
   * @param trainerId - Trainer ID
   * @returns Promise with execution results
   */
  static async executeActions(
    actions: AutomationAction[],
    trainee: any,
    trainerId: string
  ): Promise<ApiResponse> {
    try {
      const results = [];

      for (const action of actions) {
        switch (action.type) {
          case 'create_task':
            // Create task in automation_tasks table
            const { error: taskError } = await supabase
              .from('crm_automation_tasks')
              .insert([{
                trainer_id: trainerId,
                trainee_id: trainee.id,
                task_type: action.params.task_type || 'follow_up',
                due_date: action.params.due_date || new Date().toISOString(),
                completed: false,
              }]);

            if (taskError) {
              logger.error('Error creating task', taskError, 'CrmAutomationService');
            } else {
              results.push({ type: 'create_task', success: true });
            }
            break;

          case 'update_status':
            // Update trainee status
            const { error: statusError } = await supabase
              .from('trainees')
              .update({ crm_status: action.params.status })
              .eq('id', trainee.id);

            if (statusError) {
              logger.error('Error updating status', statusError, 'CrmAutomationService');
            } else {
              results.push({ type: 'update_status', success: true });
            }
            break;

          case 'create_interaction':
            // Create interaction record
            const { error: interactionError } = await supabase
              .from('client_interactions')
              .insert([{
                trainee_id: trainee.id,
                trainer_id: trainerId,
                interaction_type: action.params.interaction_type || 'note',
                subject: action.params.subject,
                description: action.params.description,
              }]);

            if (interactionError) {
              logger.error('Error creating interaction', interactionError, 'CrmAutomationService');
            } else {
              results.push({ type: 'create_interaction', success: true });
            }
            break;

          case 'send_notification':
            // This would trigger a notification
            results.push({ type: 'send_notification', success: true });
            break;

          default:
            logger.warn('Unknown action type', { type: action.type }, 'CrmAutomationService');
        }
      }

      return { data: results, success: true };
    } catch (error) {
      logger.error('Error executing actions', error, 'CrmAutomationService');
      return { error: 'שגיאה בביצוע פעולות' };
    }
  }
}
