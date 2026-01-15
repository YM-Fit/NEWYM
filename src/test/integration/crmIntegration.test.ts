/**
 * CRM Integration Tests
 * End-to-end tests for CRM functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrmService } from '../../services/crmService';
import { CrmReportsService } from '../../services/crmReportsService';
import * as crmClientsApi from '../../api/crmClientsApi';
import { supabase } from '../../lib/supabase';

// Mock dependencies
vi.mock('../../api/crmClientsApi');
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('CRM Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CrmService.clearCache();
  });

  describe('Client Management Flow', () => {
    it('should complete full client lifecycle', async () => {
      const trainerId = 'trainer-123';
      const mockClients = [
        {
          id: 'client-1',
          trainer_id: trainerId,
          google_client_identifier: 'client1@test.com',
          client_name: 'Test Client',
          total_events_count: 0,
          upcoming_events_count: 0,
          completed_events_count: 0,
          crm_data: {},
        },
      ];

      // 1. Get clients
      (crmClientsApi.getClientsFromCalendar as any).mockResolvedValue({
        success: true,
        data: mockClients,
      });

      const clientsResult = await CrmService.getClients(trainerId);
      expect(clientsResult.success).toBe(true);
      expect(clientsResult.data).toEqual(mockClients);

      // 2. Get client stats
      (crmClientsApi.getClientCalendarStats as any).mockResolvedValue({
        success: true,
        data: {
          totalEvents: 0,
          upcomingEvents: 0,
          completedEvents: 0,
        },
      });

      const statsResult = await CrmService.getClientStats('client-1');
      expect(statsResult.success).toBe(true);
      expect(statsResult.data?.totalEvents).toBe(0);

      // 3. Create interaction
      const mockInteraction = {
        trainee_id: 'trainee-1',
        trainer_id: trainerId,
        interaction_type: 'call' as const,
        subject: 'Test call',
      };

      (crmClientsApi.createClientInteraction as any).mockResolvedValue({
        success: true,
        data: { id: 'interaction-1', ...mockInteraction },
      });

      const interactionResult = await CrmService.createInteraction(mockInteraction);
      expect(interactionResult.success).toBe(true);
    });

    it('should handle cache invalidation correctly', async () => {
      const trainerId = 'trainer-123';
      const mockClients = [{ id: 'client-1', trainer_id: trainerId }];

      (crmClientsApi.getClientsFromCalendar as any).mockResolvedValue({
        success: true,
        data: mockClients,
      });

      // First call - should fetch from API
      await CrmService.getClients(trainerId, true);
      expect(crmClientsApi.getClientsFromCalendar).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await CrmService.getClients(trainerId, true);
      expect(crmClientsApi.getClientsFromCalendar).toHaveBeenCalledTimes(1);

      // Invalidate cache
      CrmService.invalidateCache('clients:');

      // Third call - should fetch from API again
      await CrmService.getClients(trainerId, true);
      expect(crmClientsApi.getClientsFromCalendar).toHaveBeenCalledTimes(2);
    });
  });

  describe('Reports Integration', () => {
    it('should generate complete reports', async () => {
      const trainerId = 'trainer-123';

      // Mock trainees data
      const mockTrainees = [
        { id: 'trainee-1', trainer_id: trainerId, crm_status: 'active', contract_value: 1000 },
        { id: 'trainee-2', trainer_id: trainerId, crm_status: 'lead', contract_value: 500 },
      ];

      const mockClients = [
        {
          id: 'client-1',
          trainer_id: trainerId,
          total_events_count: 10,
          first_event_date: '2024-01-01',
          last_event_date: '2024-12-31',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTrainees,
          error: null,
        }),
      });

      // Test pipeline stats
      const pipelineResult = await CrmReportsService.getPipelineStats(trainerId);
      expect(pipelineResult.success).toBe(true);
      expect(pipelineResult.data?.active).toBeGreaterThan(0);

      // Test revenue stats
      const revenueResult = await CrmReportsService.getRevenueStats(trainerId);
      expect(revenueResult.success).toBe(true);
      expect(revenueResult.data?.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const trainerId = 'trainer-123';

      (crmClientsApi.getClientsFromCalendar as any).mockRejectedValue(
        new Error('Network error')
      );

      const result = await CrmService.getClients(trainerId);
      expect(result.success).toBeUndefined();
      expect(result.error).toBe('שגיאה בטעינת לקוחות');
    });

    it('should handle partial failures', async () => {
      const trainerId = 'trainer-123';

      // Clients succeed, stats fail
      (crmClientsApi.getClientsFromCalendar as any).mockResolvedValue({
        success: true,
        data: [{ id: 'client-1' }],
      });

      (crmClientsApi.getClientCalendarStats as any).mockRejectedValue(
        new Error('Stats error')
      );

      const clientsResult = await CrmService.getClients(trainerId);
      expect(clientsResult.success).toBe(true);

      const statsResult = await CrmService.getClientStats('client-1');
      expect(statsResult.success).toBeUndefined();
      expect(statsResult.error).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should use cache for repeated calls', async () => {
      const trainerId = 'trainer-123';
      const mockClients = [{ id: 'client-1' }];

      (crmClientsApi.getClientsFromCalendar as any).mockResolvedValue({
        success: true,
        data: mockClients,
      });

      // Make multiple calls
      const promises = Array(10).fill(null).map(() => 
        CrmService.getClients(trainerId, true)
      );

      await Promise.all(promises);

      // Should only call API once due to caching
      expect(crmClientsApi.getClientsFromCalendar).toHaveBeenCalledTimes(1);
    });
  });
});
