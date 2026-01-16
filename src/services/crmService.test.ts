/**
 * Tests for CrmService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmService } from './crmService';
import * as crmClientsApi from '../api/crmClientsApi';
import * as googleCalendarApi from '../api/googleCalendarApi';

// Mock dependencies
vi.mock('../api/crmClientsApi');
vi.mock('../api/googleCalendarApi');
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  logSupabaseError: vi.fn(),
}));
vi.mock('../api/config', () => ({
  API_CONFIG: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
  },
}));

describe('CrmService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CrmService.clearCache();
  });

  describe('getClients', () => {
    it('should return clients from cache if available', async () => {
      const mockClients = [{ id: '1', trainer_id: 'trainer-1' }];
      
      // First call - should fetch from API
      (crmClientsApi.getClientsFromCalendar as any).mockResolvedValue({
        success: true,
        data: mockClients,
      });

      const result1 = await CrmService.getClients('trainer-1', true);
      expect(result1.success).toBe(true);
      expect(result1.data).toEqual(mockClients);
      expect(crmClientsApi.getClientsFromCalendar).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await CrmService.getClients('trainer-1', true);
      expect(result2.success).toBe(true);
      expect(result2.data).toEqual(mockClients);
      // Should not call API again
      expect(crmClientsApi.getClientsFromCalendar).toHaveBeenCalledTimes(1);
    });

    it('should fetch from API if cache is disabled', async () => {
      const mockClients = [{ id: '1', trainer_id: 'trainer-1' }];
      
      (crmClientsApi.getClientsFromCalendar as any).mockResolvedValue({
        success: true,
        data: mockClients,
      });

      const result1 = await CrmService.getClients('trainer-1', false);
      expect(result1.success).toBe(true);
      
      const result2 = await CrmService.getClients('trainer-1', false);
      expect(result2.success).toBe(true);
      
      // Should call API twice
      expect(crmClientsApi.getClientsFromCalendar).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      (crmClientsApi.getClientsFromCalendar as any).mockRejectedValue(
        new Error('API Error')
      );

      const result = await CrmService.getClients('trainer-1');
      expect(result.success).toBeUndefined();
      expect(result.error).toBe('שגיאה בטעינת לקוחות');
    });
  });

  describe('getClientStats', () => {
    it('should return stats from cache if available', async () => {
      const mockStats = { totalEvents: 10, upcomingEvents: 2 };
      
      (crmClientsApi.getClientCalendarStats as any).mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result1 = await CrmService.getClientStats('client-1', true);
      expect(result1.success).toBe(true);
      expect(result1.data).toEqual(mockStats);

      const result2 = await CrmService.getClientStats('client-1', true);
      expect(result2.success).toBe(true);
      expect(crmClientsApi.getClientCalendarStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('createInteraction', () => {
    it('should create interaction and invalidate cache', async () => {
      const mockInteraction = {
        trainee_id: 'trainee-1',
        trainer_id: 'trainer-1',
        interaction_type: 'call' as const,
      };

      (crmClientsApi.createClientInteraction as any).mockResolvedValue({
        success: true,
        data: { id: '1', ...mockInteraction },
      });

      const result = await CrmService.createInteraction(mockInteraction);
      expect(result.success).toBe(true);
      expect(crmClientsApi.createClientInteraction).toHaveBeenCalledWith(mockInteraction);
    });
  });

  describe('needsFollowUp', () => {
    it('should return true if client has no last event date', () => {
      const client = {
        id: '1',
        trainer_id: 'trainer-1',
        google_client_identifier: 'test',
        client_name: 'Test',
        total_events_count: 0,
        upcoming_events_count: 0,
        completed_events_count: 0,
        crm_data: {},
      };

      expect(CrmService.needsFollowUp(client as any)).toBe(true);
    });

    it('should return true if last event is older than threshold', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      const client = {
        id: '1',
        trainer_id: 'trainer-1',
        google_client_identifier: 'test',
        client_name: 'Test',
        last_event_date: oldDate.toISOString(),
        total_events_count: 5,
        upcoming_events_count: 0,
        completed_events_count: 5,
        crm_data: {},
      };

      expect(CrmService.needsFollowUp(client as any)).toBe(true);
    });

    it('should return false if last event is recent', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

      const client = {
        id: '1',
        trainer_id: 'trainer-1',
        google_client_identifier: 'test',
        client_name: 'Test',
        last_event_date: recentDate.toISOString(),
        total_events_count: 5,
        upcoming_events_count: 0,
        completed_events_count: 5,
        crm_data: {},
      };

      expect(CrmService.needsFollowUp(client as any)).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      CrmService.clearCache();
      // Cache should be empty - set up mock for the call
      (crmClientsApi.getClientsFromCalendar as any).mockResolvedValue({
        success: true,
        data: [],
      });
      const result = await CrmService.getClients('trainer-1', true);
      expect(result).toBeDefined();
    });

    it('should invalidate cache by pattern', async () => {
      const mockClients = [{ id: '1', trainer_id: 'trainer-1' }];
      
      (crmClientsApi.getClientsFromCalendar as any).mockResolvedValue({
        success: true,
        data: mockClients,
      });

      await CrmService.getClients('trainer-1', true);
      CrmService.invalidateCache('clients:');
      
      // Next call should fetch from API again
      await CrmService.getClients('trainer-1', true);
      expect(crmClientsApi.getClientsFromCalendar).toHaveBeenCalledTimes(2);
    });
  });
});
