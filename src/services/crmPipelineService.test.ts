/**
 * Tests for CrmPipelineService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmPipelineService } from './crmPipelineService';
import { supabase, logSupabaseError } from '../lib/supabase';
import { CRM_STATUS } from '../constants/crmConstants';
import { createMockClient } from '../test/utils/testHelpers';

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
    info: vi.fn(),
  },
}));

describe('CrmPipelineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPipelineStages', () => {
    it('should return pipeline stages successfully', async () => {
      const mockTrainees = [
        { id: '1', trainer_id: 'trainer-1', crm_status: 'lead', created_at: new Date().toISOString() },
        { id: '2', trainer_id: 'trainer-1', crm_status: 'qualified', created_at: new Date().toISOString() },
        { id: '3', trainer_id: 'trainer-1', crm_status: 'active', created_at: new Date().toISOString() },
        { id: '4', trainer_id: 'trainer-1', crm_status: 'inactive', created_at: new Date().toISOString() },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmPipelineService.getPipelineStages('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(6); // 6 stages
      expect(result.data?.find(s => s.status === 'lead')?.count).toBe(1);
      expect(result.data?.find(s => s.status === 'active')?.count).toBe(1);
    });

    it('should handle trainees without status (default to active)', async () => {
      const mockTrainees = [
        { id: '1', trainer_id: 'trainer-1', crm_status: null, created_at: new Date().toISOString() },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmPipelineService.getPipelineStages('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data?.find(s => s.status === 'active')?.count).toBe(1);
    });

    it('should handle empty trainees list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmPipelineService.getPipelineStages('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data?.every(s => s.count === 0)).toBe(true);
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

      const result = await CrmPipelineService.getPipelineStages('trainer-1');

      expect(result.error).toBe('Database error');
      expect(logSupabaseError).toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmPipelineService.getPipelineStages('trainer-1');

      expect(result.error).toBe('שגיאה בטעינת Pipeline');
    });
  });

  describe('updateClientStatus', () => {
    it('should update client status successfully', async () => {
      const mockTrainee = { id: 'trainee-1', crm_status: 'lead' };

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrainee,
          error: null,
        }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trainees') {
          // First call: fetch, Second call: update
          let callCount = 0;
          return {
            select: vi.fn().mockReturnValue(fetchChain),
            update: vi.fn().mockReturnValue(updateChain),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockTrainee,
              error: null,
            }),
          };
        }
        return fetchChain;
      });

      const result = await CrmPipelineService.updateClientStatus('trainee-1', CRM_STATUS.ACTIVE, 'Test reason');

      expect(result.success).toBe(true);
    });

    it('should handle trainee not found', async () => {
      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      (supabase.from as any).mockReturnValue(fetchChain);

      const result = await CrmPipelineService.updateClientStatus('trainee-1', CRM_STATUS.ACTIVE);

      expect(result.error).toBe('מתאמן לא נמצא');
    });

    it('should handle update errors', async () => {
      const mockTrainee = { id: 'trainee-1', crm_status: 'lead' };

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrainee,
          error: null,
        }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      };

      (supabase.from as any).mockImplementation(() => {
        return {
          select: vi.fn().mockReturnValue(fetchChain),
          update: vi.fn().mockReturnValue(updateChain),
        };
      });

      const result = await CrmPipelineService.updateClientStatus('trainee-1', CRM_STATUS.ACTIVE);

      expect(result.error).toBe('Update failed');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmPipelineService.updateClientStatus('trainee-1', CRM_STATUS.ACTIVE);

      expect(result.error).toBe('שגיאה בעדכון סטטוס לקוח');
    });
  });

  describe('calculateLeadScore', () => {
    it('should calculate lead score successfully', async () => {
      const mockTrainee = {
        id: 'trainee-1',
        email: 'test@example.com',
        phone: '0501234567',
        contract_value: 1500,
        client_since: new Date(Date.now() - 20 * 86400000).toISOString(),
        google_calendar_client_id: 'client-1',
      };

      const mockClient = {
        id: 'client-1',
        total_events_count: 5,
      };

      const traineeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrainee,
          error: null,
        }),
      };

      const clientChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockClient,
          error: null,
        }),
      };

      const interactionChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          count: 3,
        }),
      };

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trainees') {
          return traineeChain;
        }
        if (table === 'google_calendar_clients') {
          return clientChain;
        }
        if (table === 'client_interactions') {
          return interactionChain;
        }
        return traineeChain;
      });

      const result = await CrmPipelineService.calculateLeadScore('trainee-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeGreaterThan(0);
      expect(result.data).toBeLessThanOrEqual(100);
    });

    it('should handle trainee not found', async () => {
      const traineeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      (supabase.from as any).mockReturnValue(traineeChain);

      const result = await CrmPipelineService.calculateLeadScore('trainee-1');

      expect(result.error).toBe('מתאמן לא נמצא');
    });

    it('should calculate score with minimum factors', async () => {
      const mockTrainee = {
        id: 'trainee-1',
        email: null,
        phone: null,
        contract_value: null,
        client_since: null,
        google_calendar_client_id: null,
      };

      const traineeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrainee,
          error: null,
        }),
      };

      const interactionChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          count: 0,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trainees') {
          return traineeChain;
        }
        if (table === 'client_interactions') {
          return interactionChain;
        }
        return traineeChain;
      });

      const result = await CrmPipelineService.calculateLeadScore('trainee-1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmPipelineService.calculateLeadScore('trainee-1');

      expect(result.error).toBe('שגיאה בחישוב Lead Score');
    });
  });

  describe('getPipelineStats', () => {
    it('should return pipeline statistics successfully', async () => {
      const mockTrainees = [
        { id: '1', trainer_id: 'trainer-1', crm_status: 'lead', client_since: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: '2', trainer_id: 'trainer-1', crm_status: 'lead', client_since: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: '3', trainer_id: 'trainer-1', crm_status: 'qualified', client_since: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: '4', trainer_id: 'trainer-1', crm_status: 'active', client_since: new Date().toISOString(), created_at: new Date().toISOString() },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmPipelineService.getPipelineStats('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.total).toBe(4);
      expect(result.data?.conversionRates).toBeDefined();
    });

    it('should identify bottlenecks', async () => {
      const mockTrainees = Array.from({ length: 10 }, (_, i) => ({
        id: `trainee-${i}`,
        trainer_id: 'trainer-1',
        crm_status: 'lead',
        client_since: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmPipelineService.getPipelineStats('trainer-1');

      expect(result.success).toBe(true);
      // With 10 leads and 0 qualified, conversion rate is 0% (< 20%), so should identify bottleneck
      expect(result.data?.bottlenecks).toContain('lead');
    });

    it('should handle errors from getPipelineStages', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmPipelineService.getPipelineStats('trainer-1');

      expect(result.error).toBe('Database error');
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should bulk update statuses successfully', async () => {
      const traineeIds = ['trainee-1', 'trainee-2'];

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'trainee-1', crm_status: 'lead' },
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trainees') {
          return {
            update: vi.fn().mockReturnValue(updateChain),
            select: vi.fn().mockReturnValue(fetchChain),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'trainee-1', crm_status: 'lead' },
              error: null,
            }),
            in: vi.fn().mockReturnThis(),
          };
        }
        return updateChain;
      });

      const result = await CrmPipelineService.bulkUpdateStatus(traineeIds, CRM_STATUS.ACTIVE);

      expect(result.success).toBe(true);
    });

    it('should handle update errors', async () => {
      const traineeIds = ['trainee-1'];

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      };

      (supabase.from as any).mockReturnValue(updateChain);

      const result = await CrmPipelineService.bulkUpdateStatus(traineeIds, CRM_STATUS.ACTIVE);

      expect(result.error).toBe('Update failed');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmPipelineService.bulkUpdateStatus(['trainee-1'], CRM_STATUS.ACTIVE);

      expect(result.error).toBe('שגיאה בעדכון סטטוסים');
    });
  });
});
