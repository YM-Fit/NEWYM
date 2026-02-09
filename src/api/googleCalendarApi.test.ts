import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getGoogleCalendarEvents, getGoogleCalendarStatus, updateGoogleCalendarSyncSettings } from './googleCalendarApi';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  logSupabaseError: vi.fn(),
}));

vi.mock('../utils/rateLimiter', () => ({
  rateLimiter: {
    check: vi.fn().mockReturnValue({ allowed: true, remaining: 59, resetTime: Date.now() + 60000 }),
  },
}));

const mockGetValidAccessToken = vi.fn().mockResolvedValue({
  success: true,
  data: 'valid-access-token',
});

vi.mock('../services/oauthTokenService', () => ({
  OAuthTokenService: {
    getValidAccessToken: mockGetValidAccessToken,
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

vi.mock('../utils/rateLimiter', () => ({
  rateLimiter: {
    check: vi.fn().mockReturnValue({
      allowed: true,
      remaining: 100,
      resetTime: Date.now() + 60000,
    }),
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

    const setupCredentialsMock = () => {
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
      return mockCredentialsSelect;
    };

    const setupSyncTableMock = (events: any[] = []) => {
      return vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: events,
          error: null,
        }),
      });
    };

    it('should always fetch from Google API directly', async () => {
      const mockCredentialsSelect = setupCredentialsMock();
      const mockSyncSelect = setupSyncTableMock();

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSyncSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      mockGetValidAccessToken.mockResolvedValue({
        success: true,
        data: 'valid-access-token',
      });

      const mockGoogleEvents = {
        items: [
          {
            id: 'google-event-1',
            summary: 'אימון - יוסי',
            start: { dateTime: '2024-01-15T10:00:00+02:00' },
            end: { dateTime: '2024-01-15T11:00:00+02:00' },
          },
          {
            id: 'google-event-2',
            summary: 'אימון - דני',
            start: { dateTime: '2024-01-20T14:00:00+02:00' },
            end: { dateTime: '2024-01-20T15:00:00+02:00' },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockGoogleEvents,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].id).toBe('google-event-1');
      expect(result.data?.[0].summary).toBe('אימון - יוסי');
      expect(result.data?.[1].summary).toBe('אימון - דני');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('calendar/v3/calendars'),
        expect.any(Object)
      );
    });

    it('should filter out cancelled events from Google API', async () => {
      const mockCredentialsSelect = setupCredentialsMock();
      const mockSyncSelect = setupSyncTableMock();

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSyncSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      mockGetValidAccessToken.mockResolvedValue({
        success: true,
        data: 'valid-access-token',
      });

      const mockGoogleEvents = {
        items: [
          {
            id: 'event-1',
            summary: 'Active event',
            status: 'confirmed',
            start: { dateTime: '2024-01-15T10:00:00+02:00' },
            end: { dateTime: '2024-01-15T11:00:00+02:00' },
          },
          {
            id: 'event-2',
            summary: 'Cancelled event',
            status: 'cancelled',
            start: { dateTime: '2024-01-20T14:00:00+02:00' },
            end: { dateTime: '2024-01-20T15:00:00+02:00' },
          },
        ],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockGoogleEvents,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe('event-1');
    });

    it('should fallback to DB sync table when Google API fails', async () => {
      const mockCachedEvents = [
        {
          google_event_id: 'event-1',
          event_start_time: '2024-01-15T10:00:00Z',
          event_end_time: '2024-01-15T11:00:00Z',
          event_summary: 'אימון - יוסי',
          event_description: null,
          sync_status: 'synced',
          trainees: { full_name: 'יוסי כהן', email: 'yossi@example.com' },
        },
      ];

      const mockCredentialsSelect = setupCredentialsMock();
      const mockSyncSelect = setupSyncTableMock(mockCachedEvents);

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSyncSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      mockGetValidAccessToken.mockResolvedValue({
        success: true,
        data: 'valid-access-token',
      });

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } }),
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe('event-1');
      expect(result.data?.[0].summary).toBe('אימון - יוסי');
    });

    it('should return error when trainer not connected', async () => {
      const mockCredentialsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockCredentialsSelect,
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('Google Calendar לא מחובר');
    });

    it('should return error when token is expired', async () => {
      const mockCredentialsSelect = setupCredentialsMock();

      (supabase.from as any).mockReturnValue({
        select: mockCredentialsSelect,
      });

      const oauthService = await import('../services/oauthTokenService');
      (oauthService.OAuthTokenService.getValidAccessToken as any).mockResolvedValue({
        success: false,
        error: 'נדרש אימות מחדש ל-Google Calendar',
      });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBeUndefined();
      expect(result.error).toBe('נדרש אימות מחדש ל-Google Calendar');
    });

    it('should validate date range', async () => {
      const invalidRange = {
        start: new Date('2024-01-31'),
        end: new Date('2024-01-01'),
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

    it('should handle 401 with token refresh', async () => {
      const mockCredentialsSelect = setupCredentialsMock();
      const mockSyncSelect = setupSyncTableMock();

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'google_calendar_sync') {
          return { select: mockSyncSelect };
        }
        if (table === 'trainer_google_credentials') {
          return { select: mockCredentialsSelect };
        }
        return { select: vi.fn() };
      });

      mockGetValidAccessToken.mockResolvedValue({
        success: true,
        data: 'valid-access-token',
      });

      const oauthService = await import('../services/oauthTokenService');
      (oauthService.OAuthTokenService as any).refreshAccessToken = vi.fn().mockResolvedValue({
        success: true,
        data: { access_token: 'new-token' },
      });

      const mockGoogleEvents = {
        items: [
          {
            id: 'event-1',
            summary: 'Test event',
            start: { dateTime: '2024-01-15T10:00:00+02:00' },
            end: { dateTime: '2024-01-15T11:00:00+02:00' },
          },
        ],
      };

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockGoogleEvents });

      const result = await getGoogleCalendarEvents(trainerId, dateRange);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
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
