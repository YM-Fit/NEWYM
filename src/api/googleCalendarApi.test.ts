import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getGoogleCalendarEvents, getGoogleCalendarStatus, updateGoogleCalendarSyncSettings } from './googleCalendarApi';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('./config', () => ({
  API_CONFIG: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('googleCalendarApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('getGoogleCalendarEvents', () => {
    const trainerId = 'trainer-123';
    const dateRange = {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-31T23:59:59Z'),
    };

    it('should return cached events when available', async () => {
      const mockCachedEvents = [
        {
          google_event_id: 'event-1',
          event_start_time: '2024-01-15T10:00:00Z',
          event_end_time: '2024-01-15T11:00:00Z',
          event_summary: 'אימון - יוסי',
          event_description: 'אימון כוח',
          sync_status: 'synced',
          trainees: {
            full_name: 'יוסי כהן',
            email: 'yossi@example.com',
          },
        },
        {
          google_event_id: 'event-2',
          event_start_time: '2024-01-20T14:00:00Z',
          event_end_time: '2024-01-20T15:00:00Z',
          event_summary: 'אימון - דני',
          event_description: null,
          sync_status: 'synced',
          trainees: null,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockCachedEvents,
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange, { useCache: true });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].id).toBe('event-1');
      expect(result.data?.[0].summary).toBe('אימון - יוסי');
      expect(result.data?.[0].attendees?.[0].email).toBe('yossi@example.com');
      expect(result.data?.[1].summary).toBe('אימון - דני');
    });

    it('should filter events that do not overlap with date range', async () => {
      const mockCachedEvents = [
        {
          google_event_id: 'event-1',
          event_start_time: '2024-01-15T10:00:00Z',
          event_end_time: '2024-01-15T11:00:00Z',
          event_summary: 'אימון - יוסי',
          event_description: null,
          sync_status: 'synced',
          trainees: null,
        },
        {
          // Event that starts before range but ends before range start
          google_event_id: 'event-2',
          event_start_time: '2023-12-30T10:00:00Z',
          event_end_time: '2023-12-31T11:00:00Z',
          event_summary: 'אימון ישן',
          event_description: null,
          sync_status: 'synced',
          trainees: null,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockCachedEvents,
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange, { useCache: true });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only event-1 should be included
      expect(result.data?.[0].id).toBe('event-1');
    });

    it('should fallback to Google API when cache is empty', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockCredentialsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
            default_calendar_id: 'primary',
          },
          error: null,
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      const mockGoogleEvents = {
        items: [
          {
            id: 'google-event-1',
            summary: 'אימון - יוסי',
            start: { dateTime: '2024-01-15T10:00:00+02:00' },
            end: { dateTime: '2024-01-15T11:00:00+02:00' },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockGoogleEvents,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange, { useCache: true });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe('google-event-1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('calendar/v3/calendars'),
        expect.any(Object)
      );
    });

    it('should use Google API when forceRefresh is true', async () => {
      const mockCredentialsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
            default_calendar_id: 'primary',
          },
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockCredentialsSelect,
      });

      const mockGoogleEvents = {
        items: [
          {
            id: 'google-event-1',
            summary: 'אימון - יוסי',
            start: { dateTime: '2024-01-15T10:00:00+02:00' },
            end: { dateTime: '2024-01-15T11:00:00+02:00' },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockGoogleEvents,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange, { forceRefresh: true });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      // Should not query cache when forceRefresh is true
      expect(supabase.from).not.toHaveBeenCalledWith('google_calendar_sync');
    });

    it('should handle cache errors gracefully and fallback to API', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const mockCredentialsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
            default_calendar_id: 'primary',
          },
          error: null,
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      const mockGoogleEvents = { items: [] };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockGoogleEvents,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange, { useCache: true });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalled(); // Should fallback to API
    });

    it('should return error when trainer not connected', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockCredentialsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('Google Calendar לא מחובר');
    });

    it('should return error when token is expired', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockCredentialsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
            token_expires_at: new Date(Date.now() - 3600000).toISOString(), // Expired
            default_calendar_id: 'primary',
          },
          error: null,
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('נדרש אימות מחדש ל-Google Calendar');
    });

    it('should validate date range', async () => {
      const invalidRange = {
        start: new Date('2024-01-31'),
        end: new Date('2024-01-01'), // End before start
      };

      const result = await getGoogleCalendarEvents(trainerId, invalidRange);

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('תאריך התחלה חייב להיות לפני תאריך סיום');
    });

    it('should validate trainerId', async () => {
      const result = await getGoogleCalendarEvents('', dateRange);

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('מזהה מאמן לא תקין');
    });

    it('should handle events without end time', async () => {
      const mockCachedEvents = [
        {
          google_event_id: 'event-1',
          event_start_time: '2024-01-15T10:00:00Z',
          event_end_time: null, // No end time
          event_summary: 'אימון - יוסי',
          event_description: null,
          sync_status: 'synced',
          trainees: null,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockCachedEvents,
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange, { useCache: true });

      expect(result.success).toBe(true);
      expect(result.data?.[0].end.dateTime).toBeDefined();
      // Should default to 1 hour after start
      const startTime = new Date(result.data?.[0].start.dateTime!);
      const endTime = new Date(result.data?.[0].end.dateTime!);
      expect(endTime.getTime() - startTime.getTime()).toBe(60 * 60 * 1000); // 1 hour
    });

    it('should handle Google API errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const mockCredentialsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
            default_calendar_id: 'primary',
          },
          error: null,
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid credentials' },
        }),
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('getGoogleCalendarStatus', () => {
    it('should return connection status', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            auto_sync_enabled: true,
            sync_direction: 'bidirectional',
            sync_frequency: 'realtime',
          },
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getGoogleCalendarStatus('trainer-123');

      expect(result.success).toBe(true);
      expect(result.data?.connected).toBe(true);
      expect(result.data?.autoSyncEnabled).toBe(true);
      expect(result.data?.syncDirection).toBe('bidirectional');
      expect(result.data?.syncFrequency).toBe('realtime');
    });

    it('should return not connected when no credentials', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getGoogleCalendarStatus('trainer-123');

      expect(result.success).toBe(true);
      expect(result.data?.connected).toBe(false);
    });
  });

  describe('updateGoogleCalendarSyncSettings', () => {
    it('should update sync settings', async () => {
      const mockBasicUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      });

      const mockExtendedUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      });

      (supabase.from as any)
        .mockReturnValueOnce({
          update: mockBasicUpdate,
        })
        .mockReturnValueOnce({
          update: mockExtendedUpdate,
        });

      const result = await updateGoogleCalendarSyncSettings('trainer-123', {
        autoSyncEnabled: true,
        syncDirection: 'bidirectional',
        syncFrequency: 'hourly',
      });

      expect(result.success).toBe(true);
      expect(mockBasicUpdate).toHaveBeenCalledWith({
        auto_sync_enabled: true,
      });
      expect(mockExtendedUpdate).toHaveBeenCalledWith({
        sync_direction: 'bidirectional',
        sync_frequency: 'hourly',
      });
    });

    it('should handle update errors', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      const result = await updateGoogleCalendarSyncSettings('trainer-123', {
        autoSyncEnabled: false,
      });

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('Update failed');
    });
  });
});
