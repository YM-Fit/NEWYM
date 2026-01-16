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
  });
});
