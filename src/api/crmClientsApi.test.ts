import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getClientsFromCalendar,
  getClientCalendarStats,
  linkTraineeToCalendarClient,
  getClientUpcomingEvents,
  createClientInteraction,
  getClientInteractions,
  type CalendarClient,
} from './crmClientsApi';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  logSupabaseError: vi.fn(),
}));

describe('crmClientsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientsFromCalendar', () => {
    it('should return clients successfully', async () => {
      const mockClients: CalendarClient[] = [
        {
          id: '1',
          trainer_id: 'trainer-1',
          google_client_identifier: 'client@example.com',
          client_name: 'Test Client',
          client_email: 'client@example.com',
          total_events_count: 5,
          upcoming_events_count: 2,
          completed_events_count: 3,
          crm_data: {},
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockClients,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientsFromCalendar('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClients);
      expect(supabase.from).toHaveBeenCalledWith('google_calendar_clients');
    });

    it('should handle errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientsFromCalendar('trainer-1');

      expect(result.error).toBe('Database error');
      expect(result.success).toBeUndefined();
      expect(result.data).toBeUndefined();
    });

    it('should validate trainerId', async () => {
      const result = await getClientsFromCalendar('');
      expect(result.error).toBe('trainerId הוא חובה');

      const result2 = await getClientsFromCalendar(null as any);
      expect(result2.error).toBe('trainerId הוא חובה');
    });

    it('should return empty array when no data', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientsFromCalendar('trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getClientCalendarStats', () => {
    it('should calculate stats correctly', async () => {
      const mockClient = {
        id: '1',
        trainer_id: 'trainer-1',
        total_events_count: 10,
        upcoming_events_count: 3,
        completed_events_count: 7,
        first_event_date: '2024-01-01',
        last_event_date: '2024-12-31',
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockClient,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientCalendarStats('client-1');

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(10);
      expect(result.data?.upcomingEvents).toBe(3);
      expect(result.data?.completedEvents).toBe(7);
      expect(result.data?.workoutFrequency).toBeGreaterThan(0);
    });

    it('should handle client not found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientCalendarStats('client-1');

      expect(result.error).toBe('לקוח לא נמצא');
    });
  });

  describe('linkTraineeToCalendarClient', () => {
    it('should link trainee to client successfully', async () => {
      const mockTrainee = {
        trainer_id: 'trainer-1',
        google_calendar_client_id: null,
      };

      const mockClient = {
        id: 'client-1',
        trainer_id: 'trainer-1',
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

      const updateTraineeChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      const updateClientChain: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      };

      // Setup the chain: eq() -> eq() -> resolved
      const finalChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      updateClientChain.eq
        .mockReturnValueOnce(updateClientChain) // First eq(trainer_id) returns chain
        .mockResolvedValueOnce({ error: null }); // Second eq(client_id) resolves

      (supabase.from as any)
        .mockReturnValueOnce(traineeChain)
        .mockReturnValueOnce(clientChain)
        .mockReturnValueOnce(updateTraineeChain)
        .mockReturnValueOnce(updateClientChain);

      const result = await linkTraineeToCalendarClient('trainee-1', 'client-1', 'trainer-1');

      expect(result.success).toBe(true);
      expect(updateTraineeChain.update).toHaveBeenCalledWith({ google_calendar_client_id: 'client-1' });
      expect(updateClientChain.update).toHaveBeenCalledWith({ trainee_id: 'trainee-1' });
    });

    it('should validate inputs', async () => {
      expect((await linkTraineeToCalendarClient('', 'client-1', 'trainer-1')).error).toBe('traineeId הוא חובה');
      expect((await linkTraineeToCalendarClient('trainee-1', '', 'trainer-1')).error).toBe('clientId הוא חובה');
      expect((await linkTraineeToCalendarClient('trainee-1', 'client-1', '')).error).toBe('trainerId הוא חובה');
    });

    it('should handle trainee not found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await linkTraineeToCalendarClient('trainee-1', 'client-1', 'trainer-1');

      expect(result.error).toBe('מתאמן לא נמצא');
    });

    it('should handle unauthorized trainee', async () => {
      const mockTrainee = {
        trainer_id: 'other-trainer',
        google_calendar_client_id: null,
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrainee,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await linkTraineeToCalendarClient('trainee-1', 'client-1', 'trainer-1');

      expect(result.error).toBe('אין גישה למתאמן זה');
    });
  });

  describe('getClientUpcomingEvents', () => {
    it('should return upcoming events', async () => {
      const mockClient = {
        google_client_identifier: 'client@example.com',
      };

      const mockEvents = [
        {
          id: '1',
          event_start_time: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      const clientChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockClient,
          error: null,
        }),
      };

      const syncChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      };

      (supabase.from as any)
        .mockReturnValueOnce(clientChain)
        .mockReturnValueOnce(syncChain);

      const result = await getClientUpcomingEvents('client-1', 'trainer-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEvents);
    });
  });

  describe('createClientInteraction', () => {
    it('should create interaction successfully', async () => {
      const interaction = {
        trainee_id: 'trainee-1',
        trainer_id: 'trainer-1',
        interaction_type: 'call' as const,
        subject: 'Test',
        description: 'Test description',
      };

      const mockInteraction = {
        id: '1',
        ...interaction,
        interaction_date: new Date().toISOString(),
      };

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockInteraction,
          error: null,
        }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any)
        .mockReturnValueOnce(insertChain)
        .mockReturnValueOnce(updateChain);

      const result = await createClientInteraction(interaction);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInteraction);
    });
  });

  describe('getClientInteractions', () => {
    it('should return interactions', async () => {
      const mockInteractions = [
        {
          id: '1',
          trainee_id: 'trainee-1',
          trainer_id: 'trainer-1',
          interaction_type: 'call' as const,
          interaction_date: new Date().toISOString(),
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockInteractions,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientInteractions('trainee-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInteractions);
    });

    it('should handle empty interactions', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientInteractions('trainee-1');

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

      const result = await getClientInteractions('trainee-1');

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('Database error');
    });
  });

  describe('getClientsFromCalendar with pagination', () => {
    it('should support page-based pagination', async () => {
      const mockClients = Array.from({ length: 10 }, (_, i) => ({
        id: `client-${i}`,
        trainer_id: 'trainer-1',
        google_client_identifier: `client-${i}@example.com`,
        client_name: `Client ${i}`,
        total_events_count: 5,
        upcoming_events_count: 2,
        completed_events_count: 3,
        crm_data: {},
      }));

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockClients.slice(0, 5),
          error: null,
          count: 10,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientsFromCalendar('trainer-1', { page: 1, pageSize: 5 });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should support cursor-based pagination', async () => {
      const mockClients = Array.from({ length: 6 }, (_, i) => ({
        id: `client-${i}`,
        trainer_id: 'trainer-1',
        google_client_identifier: `client-${i}@example.com`,
        client_name: `Client ${i}`,
        total_events_count: 5,
        upcoming_events_count: 2,
        completed_events_count: 3,
        crm_data: {},
      }));

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockClients,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientsFromCalendar('trainer-1', { cursor: 'client-10', pageSize: 5 });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('getClientCalendarStats edge cases', () => {
    it('should handle client with no events', async () => {
      const mockClient = {
        id: '1',
        trainer_id: 'trainer-1',
        total_events_count: 0,
        upcoming_events_count: 0,
        completed_events_count: 0,
        first_event_date: null,
        last_event_date: null,
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockClient,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientCalendarStats('client-1');

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(0);
      expect(result.data?.workoutFrequency).toBeUndefined();
    });

    it('should calculate workout frequency correctly', async () => {
      const firstDate = new Date('2024-01-01');
      const lastDate = new Date('2024-01-29'); // 28 days = 4 weeks
      const mockClient = {
        id: '1',
        trainer_id: 'trainer-1',
        total_events_count: 8, // 8 events in 4 weeks = 2 per week
        upcoming_events_count: 2,
        completed_events_count: 6,
        first_event_date: firstDate.toISOString(),
        last_event_date: lastDate.toISOString(),
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockClient,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getClientCalendarStats('client-1');

      expect(result.success).toBe(true);
      expect(result.data?.workoutFrequency).toBeCloseTo(2, 1); // ~2 events per week
    });
  });

  describe('createClientInteraction edge cases', () => {
    it('should handle interaction with all optional fields', async () => {
      const interaction = {
        trainee_id: 'trainee-1',
        trainer_id: 'trainer-1',
        interaction_type: 'meeting' as const,
        subject: 'Test Subject',
        description: 'Test Description',
        outcome: 'positive',
        next_action: 'Follow up',
        next_action_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        google_event_id: 'event-1',
      };

      const mockInteraction = {
        id: '1',
        ...interaction,
        interaction_date: new Date().toISOString(),
      };

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockInteraction,
          error: null,
        }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any)
        .mockReturnValueOnce(insertChain)
        .mockReturnValueOnce(updateChain);

      const result = await createClientInteraction(interaction);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInteraction);
    });

    it('should handle interaction creation errors', async () => {
      const interaction = {
        trainee_id: 'trainee-1',
        trainer_id: 'trainer-1',
        interaction_type: 'call' as const,
      };

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      };

      (supabase.from as any).mockReturnValue(insertChain);

      const result = await createClientInteraction(interaction);

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('Insert failed');
    });
  });
});
