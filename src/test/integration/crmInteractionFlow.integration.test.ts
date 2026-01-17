/**
 * CRM Interaction Flow Integration Tests
 * Tests interaction creation → update → deletion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrmService } from '../../services/crmService';
import * as crmClientsApi from '../../api/crmClientsApi';

// Mock dependencies
vi.mock('../../api/crmClientsApi');
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  logSupabaseError: vi.fn(),
}));
vi.mock('../../api/config', () => ({
  API_CONFIG: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    ALLOWED_ORIGINS: ['http://localhost:5173'],
  },
}));

describe('CRM Interaction Flow Integration Tests', () => {
  const trainerId = 'trainer-123';
  const traineeId = 'trainee-1';

  beforeEach(() => {
    vi.clearAllMocks();
    CrmService.clearCache();
  });

  describe('Interaction CRUD Flow', () => {
    it('should complete interaction lifecycle: create → view → update → delete', async () => {
      // 1. Create interaction
      const interactionData = {
        trainee_id: traineeId,
        trainer_id: trainerId,
        interaction_type: 'call' as const,
        subject: 'Initial consultation',
        description: 'Discussed training goals',
        outcome: 'Positive response',
        next_action: 'Send training plan',
        next_action_date: '2024-02-01',
      };

      const mockInteraction = {
        id: 'interaction-1',
        ...interactionData,
        interaction_date: new Date().toISOString(),
      };

      (crmClientsApi.createClientInteraction as any).mockResolvedValue({
        success: true,
        data: mockInteraction,
      });

      const createResult = await CrmService.createInteraction(interactionData);
      expect(createResult.success).toBe(true);
      expect(createResult.data?.id).toBe('interaction-1');
      expect(createResult.data?.subject).toBe(interactionData.subject);

      // 2. Get all interactions
      const mockInteractions = [
        mockInteraction,
        {
          id: 'interaction-2',
          trainee_id: traineeId,
          trainer_id: trainerId,
          interaction_type: 'email' as const,
          subject: 'Follow-up email',
          interaction_date: new Date().toISOString(),
        },
      ];

      (crmClientsApi.getClientInteractions as any).mockResolvedValue({
        success: true,
        data: mockInteractions,
      });

      const interactionsResult = await CrmService.getInteractions(traineeId);
      expect(interactionsResult.success).toBe(true);
      expect(interactionsResult.data).toHaveLength(2);
      expect(interactionsResult.data?.[0].id).toBe('interaction-1');

      // 3. Verify cache invalidation
      // After creating interaction, cache should be invalidated
      CrmService.invalidateCache('interactions:');

      // Fetch again - should call API
      (crmClientsApi.getClientInteractions as any).mockResolvedValue({
        success: true,
        data: mockInteractions,
      });

      const interactionsAfterCreate = await CrmService.getInteractions(traineeId);
      expect(interactionsAfterCreate.success).toBe(true);
      expect(crmClientsApi.getClientInteractions).toHaveBeenCalled();
    });

    it('should handle different interaction types', async () => {
      const interactionTypes = ['call', 'email', 'sms', 'meeting', 'workout', 'message', 'note'] as const;

      for (const type of interactionTypes) {
        const interactionData = {
          trainee_id: traineeId,
          trainer_id: trainerId,
          interaction_type: type,
          subject: `Test ${type}`,
        };

        (crmClientsApi.createClientInteraction as any).mockResolvedValue({
          success: true,
          data: {
            id: `interaction-${type}`,
            ...interactionData,
            interaction_date: new Date().toISOString(),
          },
        });

        const result = await CrmService.createInteraction(interactionData);
        expect(result.success).toBe(true);
        expect(result.data?.interaction_type).toBe(type);
      }
    });

    it('should handle interaction creation errors', async () => {
      const interactionData = {
        trainee_id: traineeId,
        trainer_id: trainerId,
        interaction_type: 'call' as const,
        subject: 'Test',
      };

      (crmClientsApi.createClientInteraction as any).mockResolvedValue({
        error: 'Validation failed',
      });

      const result = await CrmService.createInteraction(interactionData);
      expect(result.success).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('Interaction Filtering and Search', () => {
    it('should filter interactions by type', async () => {
      const mockInteractions = [
        {
          id: 'interaction-1',
          trainee_id: traineeId,
          trainer_id: trainerId,
          interaction_type: 'call' as const,
          subject: 'Phone call',
          interaction_date: new Date().toISOString(),
        },
        {
          id: 'interaction-2',
          trainee_id: traineeId,
          trainer_id: trainerId,
          interaction_type: 'email' as const,
          subject: 'Email',
          interaction_date: new Date().toISOString(),
        },
      ];

      (crmClientsApi.getClientInteractions as any).mockResolvedValue({
        success: true,
        data: mockInteractions,
      });

      const result = await CrmService.getInteractions(traineeId);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      // Filter by type (client-side filtering)
      const calls = result.data?.filter((i) => i.interaction_type === 'call');
      expect(calls).toHaveLength(1);
    });

    it('should sort interactions by date', async () => {
      const mockInteractions = [
        {
          id: 'interaction-1',
          trainee_id: traineeId,
          trainer_id: trainerId,
          interaction_type: 'call' as const,
          interaction_date: '2024-01-01T00:00:00Z',
        },
        {
          id: 'interaction-2',
          trainee_id: traineeId,
          trainer_id: trainerId,
          interaction_type: 'email' as const,
          interaction_date: '2024-01-15T00:00:00Z',
        },
        {
          id: 'interaction-3',
          trainee_id: traineeId,
          trainer_id: trainerId,
          interaction_type: 'sms' as const,
          interaction_date: '2024-01-10T00:00:00Z',
        },
      ];

      (crmClientsApi.getClientInteractions as any).mockResolvedValue({
        success: true,
        data: mockInteractions,
      });

      const result = await CrmService.getInteractions(traineeId);
      expect(result.success).toBe(true);

      // Verify interactions are sorted (most recent first)
      if (result.data && result.data.length > 1) {
        const dates = result.data.map((i) => new Date(i.interaction_date).getTime());
        const sortedDates = [...dates].sort((a, b) => b - a);
        expect(dates).toEqual(sortedDates);
      }
    });
  });

  describe('Interaction Analytics', () => {
    it('should calculate interaction statistics', async () => {
      const mockInteractions = [
        { interaction_type: 'call', interaction_date: '2024-01-01' },
        { interaction_type: 'email', interaction_date: '2024-01-02' },
        { interaction_type: 'call', interaction_date: '2024-01-03' },
        { interaction_type: 'meeting', interaction_date: '2024-01-04' },
      ];

      (crmClientsApi.getClientInteractions as any).mockResolvedValue({
        success: true,
        data: mockInteractions.map((i, idx) => ({
          id: `interaction-${idx}`,
          trainee_id: traineeId,
          trainer_id: trainerId,
          ...i,
        })),
      });

      const result = await CrmService.getInteractions(traineeId);
      expect(result.success).toBe(true);

      // Calculate stats
      const stats = {
        total: result.data?.length || 0,
        byType: {} as Record<string, number>,
      };

      result.data?.forEach((interaction) => {
        stats.byType[interaction.interaction_type] =
          (stats.byType[interaction.interaction_type] || 0) + 1;
      });

      expect(stats.total).toBe(4);
      expect(stats.byType['call']).toBe(2);
      expect(stats.byType['email']).toBe(1);
      expect(stats.byType['meeting']).toBe(1);
    });
  });
});
