/**
 * Tests for CrmReportsService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmReportsService } from './crmReportsService';
import { supabase, logSupabaseError } from '../lib/supabase';
import { CRM_STATUS, CRM_ALERTS } from '../constants/crmConstants';
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
  },
}));

describe('CrmReportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPipelineStats', () => {
    it('should return pipeline stats successfully', async () => {
      const mockTrainees = [
        { crm_status: 'lead' },
        { crm_status: 'lead' },
        { crm_status: 'qualified' },
        { crm_status: 'active' },
        { crm_status: 'active' },
        { crm_status: 'inactive' },
        { crm_status: 'churned' },
        { crm_status: 'on_hold' },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmReportsService.getPipelineStats('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        leads: 2,
        qualified: 1,
        active: 2,
        inactive: 1,
        churned: 1,
        onHold: 1,
        total: 8,
      });
    });

    it('should handle empty trainees list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmReportsService.getPipelineStats('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        leads: 0,
        qualified: 0,
        active: 0,
        inactive: 0,
        churned: 0,
        onHold: 0,
        total: 0,
      });
    });

    it('should handle database errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmReportsService.getPipelineStats('trainer-1');

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmReportsService.getPipelineStats('trainer-1');

      expect(result.error).toBe('שגיאה בטעינת סטטיסטיקות pipeline');
    });
  });

  describe('getRevenueStats', () => {
    it('should return revenue stats successfully', async () => {
      const mockTrainees = [
        { contract_value: 1000, payment_status: 'paid', contract_type: 'monthly' },
        { contract_value: 2000, payment_status: 'pending', contract_type: 'monthly' },
        { contract_value: 3000, payment_status: 'overdue', contract_type: 'one-time' },
        { contract_value: 1500, payment_status: 'paid', contract_type: 'monthly' },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmReportsService.getRevenueStats('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalRevenue: 7500,
        monthlyRevenue: 4500, // 1000 + 2000 + 1500
        averageContractValue: 1875, // 7500 / 4
        paidContracts: 2,
        pendingPayments: 1,
        overduePayments: 1,
      });
    });

    it('should handle empty trainees list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await CrmReportsService.getRevenueStats('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data?.averageContractValue).toBe(0);
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

      const result = await CrmReportsService.getRevenueStats('trainer-1');

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('Database error');
      expect(logSupabaseError).toHaveBeenCalled();
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmReportsService.getRevenueStats('trainer-1');

      expect(result.error).toBe('שגיאה בטעינת סטטיסטיקות הכנסות');
    });
  });

  describe('getActivityStats', () => {
    it('should return activity stats successfully', async () => {
      const now = Date.now();
      const mockClients = [
        {
          ...createMockClient(),
          total_events_count: 10,
          first_event_date: new Date(now - 30 * 86400000).toISOString(),
          last_event_date: new Date(now - 5 * 86400000).toISOString(),
        },
        {
          ...createMockClient({ id: 'client-2' }),
          total_events_count: 5,
          first_event_date: new Date(now - 20 * 86400000).toISOString(),
          last_event_date: new Date(now - 1 * 86400000).toISOString(),
        },
      ];

      const mockTrainees = [
        { crm_status: 'active', last_contact_date: new Date(now - 5 * 86400000).toISOString() },
        { crm_status: 'inactive', last_contact_date: new Date(now - 20 * 86400000).toISOString() },
      ];

      const clientsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockClients,
          error: null,
        }),
      };

      const traineesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_clients') {
          return clientsChain;
        }
        return traineesChain;
      });

      const result = await CrmReportsService.getActivityStats('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data?.totalClients).toBe(2);
      expect(result.data?.activeClients).toBeGreaterThanOrEqual(1);
      expect(result.data?.inactiveClients).toBeGreaterThanOrEqual(1);
      expect(result.data?.averageEventsPerClient).toBe(7.5); // (10 + 5) / 2
    });

    it('should handle clients needing follow-up', async () => {
      const now = Date.now();
      const mockClients = [
        {
          ...createMockClient(),
          last_event_date: new Date(now - (CRM_ALERTS.INACTIVE_CLIENT_DAYS + 10) * 86400000).toISOString(),
        },
      ];

      const mockTrainees = [
        { crm_status: 'active', last_contact_date: new Date(now - (CRM_ALERTS.INACTIVE_CLIENT_DAYS + 5) * 86400000).toISOString() },
      ];

      const clientsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockClients,
          error: null,
        }),
      };

      const traineesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_clients') {
          return clientsChain;
        }
        return traineesChain;
      });

      const result = await CrmReportsService.getActivityStats('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data?.clientsNeedingFollowUp).toBeGreaterThan(0);
    });

    it('should handle database errors for clients', async () => {
      const clientsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Clients error' },
        }),
      };

      (supabase.from as any).mockReturnValue(clientsChain);

      const result = await CrmReportsService.getActivityStats('trainer-1');

      expect(result.error).toBe('Clients error');
    });

    it('should handle database errors for trainees', async () => {
      const clientsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const traineesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Trainees error' },
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_clients') {
          return clientsChain;
        }
        return traineesChain;
      });

      const result = await CrmReportsService.getActivityStats('trainer-1');

      expect(result.error).toBe('Trainees error');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmReportsService.getActivityStats('trainer-1');

      expect(result.error).toBe('שגיאה בטעינת סטטיסטיקות פעילות');
    });
  });

  describe('getClientsNeedingFollowUp', () => {
    it('should return clients needing follow-up', async () => {
      const now = Date.now();
      const mockClient = {
        ...createMockClient(),
        last_event_date: new Date(now - (CRM_ALERTS.INACTIVE_CLIENT_DAYS + 10) * 86400000).toISOString(),
      };

      const mockTrainee = {
        id: 'trainee-1',
        last_contact_date: new Date(now - (CRM_ALERTS.INACTIVE_CLIENT_DAYS + 5) * 86400000).toISOString(),
        next_followup_date: null,
        payment_status: 'paid',
      };

      const clientsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [mockClient],
          error: null,
        }),
      };

      const traineesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [mockTrainee],
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_clients') {
          return clientsChain;
        }
        return traineesChain;
      });

      const result = await CrmReportsService.getClientsNeedingFollowUp('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should handle overdue payments', async () => {
      const now = Date.now();
      const mockClient = {
        ...createMockClient(),
        id: 'client-1',
        trainee_id: 'trainee-1',
        last_event_date: new Date(now - 1 * 86400000).toISOString(),
      };
      const mockTrainee = {
        id: 'trainee-1',
        last_contact_date: new Date(now - 1 * 86400000).toISOString(),
        next_followup_date: new Date(now - 1 * 86400000).toISOString(),
        payment_status: 'overdue',
      };

      const clientsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [mockClient],
          error: null,
        }),
      };

      const traineesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [mockTrainee],
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_clients') {
          return clientsChain;
        }
        return traineesChain;
      });

      const result = await CrmReportsService.getClientsNeedingFollowUp('trainer-1');

      expect(result.success).toBe(true);
      if (result.data && result.data.length > 0) {
        // Check if any report has isOverdue or needsFollowUp
        const hasOverdue = result.data.some(r => r.isOverdue === true);
        const needsFollowUp = result.data.some(r => r.needsFollowUp === true);
        expect(hasOverdue || needsFollowUp).toBe(true);
      }
    });

    it('should handle clients without trainee', async () => {
      const now = Date.now();
      const mockClient = {
        ...createMockClient(),
        trainee_id: null,
        last_event_date: new Date(now - (CRM_ALERTS.INACTIVE_CLIENT_DAYS + 10) * 86400000).toISOString(),
      };

      const clientsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [mockClient],
          error: null,
        }),
      };

      const traineesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_clients') {
          return clientsChain;
        }
        return traineesChain;
      });

      const result = await CrmReportsService.getClientsNeedingFollowUp('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should handle database errors', async () => {
      const clientsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(clientsChain);

      const result = await CrmReportsService.getClientsNeedingFollowUp('trainer-1');

      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await CrmReportsService.getClientsNeedingFollowUp('trainer-1');

      expect(result.error).toBe('שגיאה בטעינת לקוחות הזקוקים למעקב');
    });
  });
});
