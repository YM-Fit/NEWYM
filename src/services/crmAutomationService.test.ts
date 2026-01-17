/**
 * Tests for CrmAutomationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmAutomationService } from './crmAutomationService';
import { supabase, logSupabaseError } from '../lib/supabase';
import { CRM_ALERTS } from '../constants/crmConstants';
import type { AutomationRule, AutomationAction } from './crmAutomationService';

// Mock dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  logSupabaseError: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('CrmAutomationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAutomationRules', () => {
    it('should return automation rules successfully', async () => {
      const mockRules: AutomationRule[] = [
        {
          id: 'rule-1',
          trainer_id: 'trainer-1',
          rule_type: 'reminder',
          name: 'Test Rule',
          enabled: true,
          conditions: [],
          actions: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRules,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.getAutomationRules('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRules);
    });

    it('should handle empty rules list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.getAutomationRules('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.getAutomationRules('trainer-1');

      expect(result.error).toBe('Database error');
      expect(logSupabaseError).toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmAutomationService.getAutomationRules('trainer-1');

      expect(result.error).toBe('שגיאה בטעינת כללי אוטומציה');
    });
  });

  describe('createAutomationRule', () => {
    it('should create automation rule successfully', async () => {
      const mockRule: AutomationRule = {
        id: 'rule-1',
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockRule,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.createAutomationRule({
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [],
        actions: [],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRule);
    });

    it('should handle database errors', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.createAutomationRule({
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [],
        actions: [],
      });

      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmAutomationService.createAutomationRule({
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [],
        actions: [],
      });

      expect(result.error).toBe('שגיאה ביצירת כלל אוטומציה');
    });
  });

  describe('updateAutomationRule', () => {
    it('should update automation rule successfully', async () => {
      const mockRule: AutomationRule = {
        id: 'rule-1',
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Updated Rule',
        enabled: false,
        conditions: [],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockRule,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.updateAutomationRule('rule-1', {
        enabled: false,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRule);
    });

    it('should handle database errors', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.updateAutomationRule('rule-1', {
        enabled: false,
      });

      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmAutomationService.updateAutomationRule('rule-1', {
        enabled: false,
      });

      expect(result.error).toBe('שגיאה בעדכון כלל אוטומציה');
    });
  });

  describe('deleteAutomationRule', () => {
    it('should delete automation rule successfully', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.deleteAutomationRule('rule-1');

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.deleteAutomationRule('rule-1');

      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmAutomationService.deleteAutomationRule('rule-1');

      expect(result.error).toBe('שגיאה במחיקת כלל אוטומציה');
    });
  });

  describe('getPendingTasks', () => {
    it('should return pending tasks successfully', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          rule_id: 'rule-1',
          trainee_id: 'trainee-1',
          trainer_id: 'trainer-1',
          task_type: 'follow_up',
          due_date: new Date().toISOString(),
          completed: false,
          created_at: new Date().toISOString(),
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTasks,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.getPendingTasks('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTasks);
    });

    it('should handle empty tasks list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.getPendingTasks('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.getPendingTasks('trainer-1');

      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmAutomationService.getPendingTasks('trainer-1');

      expect(result.error).toBe('שגיאה בטעינת משימות');
    });
  });

  describe('checkFollowUpReminders', () => {
    it('should return clients needing follow-up', async () => {
      const now = Date.now();
      const cutoffDate = new Date(now - CRM_ALERTS.INACTIVE_CLIENT_DAYS * 86400000);

      const mockTrainees = [
        {
          id: 'trainee-1',
          trainer_id: 'trainer-1',
          crm_status: 'active',
          last_contact_date: new Date(now - (CRM_ALERTS.INACTIVE_CLIENT_DAYS + 5) * 86400000).toISOString(),
        },
      ];

      // Chain: select -> eq(trainer_id) -> or() -> eq(crm_status) -> resolved
      const mockResolved = vi.fn().mockResolvedValue({
        data: mockTrainees,
        error: null,
      });
      
      const mockEqStatus = vi.fn().mockReturnValue({
        eq: mockResolved,
      });
      
      const mockOr = vi.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      
      const mockEqTrainer = vi.fn().mockReturnValue({
        or: mockOr,
      });
      
      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: mockEqTrainer,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.checkFollowUpReminders('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrainees);
    });

    it('should handle database errors', async () => {
      // Chain: select -> eq(trainer_id) -> or() -> eq(crm_status) -> resolved
      const mockResolved = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
      
      const mockEqStatus = vi.fn().mockReturnValue({
        eq: mockResolved,
      });
      
      const mockOr = vi.fn().mockReturnValue({
        eq: mockEqStatus,
      });
      
      const mockEqTrainer = vi.fn().mockReturnValue({
        or: mockOr,
      });
      
      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: mockEqTrainer,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.checkFollowUpReminders('trainer-1');

      expect(result.error).toBe('Database error');
      expect(result.success).toBeUndefined();
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmAutomationService.checkFollowUpReminders('trainer-1');

      expect(result.error).toBe('שגיאה בבדיקת תזכורות מעקב');
    });
  });

  describe('checkPaymentReminders', () => {
    it('should return clients with pending payments', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockTrainees = [
        {
          id: 'trainee-1',
          trainer_id: 'trainer-1',
          payment_status: 'pending',
          contract_value: 1000,
          next_followup_date: today, // Must be <= today to pass filter
        },
      ];

      const mockNot = vi.fn().mockResolvedValue({
        data: mockTrainees,
        error: null,
      });
      
      const mockEq2 = vi.fn().mockReturnValue({
        not: mockNot,
      });
      
      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });
      
      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: mockEq1,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.checkPaymentReminders('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTrainees);
    });

    it('should handle database errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.checkPaymentReminders('trainer-1');

      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmAutomationService.checkPaymentReminders('trainer-1');

      expect(result.error).toBe('שגיאה בבדיקת תזכורות תשלום');
    });
  });

  describe('evaluateConditions', () => {
    it('should return false if rule is disabled', () => {
      const rule: AutomationRule = {
        id: 'rule-1',
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: false,
        conditions: [],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const trainee = { id: 'trainee-1', crm_status: 'active' };

      const result = CrmAutomationService.evaluateConditions(rule, trainee);

      expect(result).toBe(false);
    });

    it('should evaluate equals condition', () => {
      const rule: AutomationRule = {
        id: 'rule-1',
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [
          { field: 'crm_status', operator: 'equals', value: 'active' },
        ],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const trainee = { id: 'trainee-1', crm_status: 'active' };

      const result = CrmAutomationService.evaluateConditions(rule, trainee);

      expect(result).toBe(true);
    });

    it('should evaluate not_equals condition', () => {
      const rule: AutomationRule = {
        id: 'rule-1',
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [
          { field: 'crm_status', operator: 'not_equals', value: 'active' },
        ],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const trainee = { id: 'trainee-1', crm_status: 'inactive' };

      const result = CrmAutomationService.evaluateConditions(rule, trainee);

      expect(result).toBe(true);
    });

    it('should evaluate greater_than condition', () => {
      const rule: AutomationRule = {
        id: 'rule-1',
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [
          { field: 'contract_value', operator: 'greater_than', value: 1000 },
        ],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const trainee = { id: 'trainee-1', contract_value: 2000 };

      const result = CrmAutomationService.evaluateConditions(rule, trainee);

      expect(result).toBe(true);
    });

    it('should evaluate multiple conditions with AND logic', () => {
      const rule: AutomationRule = {
        id: 'rule-1',
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [
          { field: 'crm_status', operator: 'equals', value: 'active' },
          { field: 'contract_value', operator: 'greater_than', value: 1000 },
        ],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const trainee = { id: 'trainee-1', crm_status: 'active', contract_value: 2000 };

      const result = CrmAutomationService.evaluateConditions(rule, trainee);

      expect(result).toBe(true);
    });

    it('should return false if any condition fails', () => {
      const rule: AutomationRule = {
        id: 'rule-1',
        trainer_id: 'trainer-1',
        rule_type: 'reminder',
        name: 'Test Rule',
        enabled: true,
        conditions: [
          { field: 'crm_status', operator: 'equals', value: 'active' },
          { field: 'contract_value', operator: 'greater_than', value: 1000 },
        ],
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const trainee = { id: 'trainee-1', crm_status: 'active', contract_value: 500 };

      const result = CrmAutomationService.evaluateConditions(rule, trainee);

      expect(result).toBe(false);
    });
  });

  describe('executeActions', () => {
    it('should execute create_task action successfully', async () => {
      const actions: AutomationAction[] = [
        {
          type: 'create_task',
          params: {
            task_type: 'follow_up',
            due_date: new Date().toISOString(),
          },
        },
      ];

      const trainee = { id: 'trainee-1' };

      const mockChain = {
        insert: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.executeActions(actions, trainee, 'trainer-1');

      expect(result.success).toBe(true);
    });

    it('should execute update_status action successfully', async () => {
      const actions: AutomationAction[] = [
        {
          type: 'update_status',
          params: {
            status: 'inactive',
          },
        },
      ];

      const trainee = { id: 'trainee-1' };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.executeActions(actions, trainee, 'trainer-1');

      expect(result.success).toBe(true);
    });

    it('should execute create_interaction action successfully', async () => {
      const actions: AutomationAction[] = [
        {
          type: 'create_interaction',
          params: {
            interaction_type: 'note',
            subject: 'Test Subject',
            description: 'Test Description',
          },
        },
      ];

      const trainee = { id: 'trainee-1' };

      const mockChain = {
        insert: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmAutomationService.executeActions(actions, trainee, 'trainer-1');

      expect(result.success).toBe(true);
    });

    it('should handle exceptions', async () => {
      const actions: AutomationAction[] = [
        {
          type: 'create_task',
          params: {},
        },
      ];

      const trainee = { id: 'trainee-1' };

      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmAutomationService.executeActions(actions, trainee, 'trainer-1');

      expect(result.error).toBe('שגיאה בביצוע פעולות');
    });
  });
});
