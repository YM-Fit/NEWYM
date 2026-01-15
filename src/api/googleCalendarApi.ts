/**
 * Google Calendar API layer
 */

import { supabase } from '../lib/supabase';
import type { ApiResponse } from './types';
import { API_CONFIG } from './config';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
}

export interface CreateEventData {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  location?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
}

/**
 * Initiate Google OAuth flow
 */
export async function initiateGoogleOAuth(
  trainerId: string,
  accessToken: string
): Promise<ApiResponse<string>> {
  try {
    const response = await fetch(
      `${API_CONFIG.SUPABASE_URL}/functions/v1/google-oauth?trainer_id=${trainerId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      return { error: result.error || 'שגיאה ביצירת OAuth URL' };
    }

    return { data: result.authUrl, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה ביצירת OAuth URL' };
  }
}

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleOAuthCallback(
  code: string,
  state: string,
  accessToken: string
): Promise<ApiResponse> {
  try {
    const response = await fetch(
      `${API_CONFIG.SUPABASE_URL}/functions/v1/google-oauth/callback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code, state }),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      return { error: result.error || 'שגיאה באימות Google Calendar' };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה באימות Google Calendar' };
  }
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(
  trainerId: string,
  accessToken: string
): Promise<ApiResponse> {
  try {
    const response = await fetch(
      `${API_CONFIG.SUPABASE_URL}/functions/v1/google-oauth/disconnect`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ trainer_id: trainerId }),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      return { error: result.error || 'שגיאה בניתוק Google Calendar' };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בניתוק Google Calendar' };
  }
}

/**
 * Get Google Calendar connection status
 */
export async function getGoogleCalendarStatus(
  trainerId: string
): Promise<ApiResponse<{ connected: boolean; autoSyncEnabled?: boolean; syncDirection?: 'to_google' | 'from_google' | 'bidirectional'; syncFrequency?: 'realtime' | 'hourly' | 'daily'; defaultCalendarId?: string }>> {
  try {
    const { data, error } = await supabase
      .from('trainer_google_credentials')
      .select('auto_sync_enabled, sync_direction, sync_frequency, default_calendar_id')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    return { 
      data: { 
        connected: !!data, 
        autoSyncEnabled: data?.auto_sync_enabled ?? false,
        syncDirection: (data?.sync_direction as 'to_google' | 'from_google' | 'bidirectional') || 'bidirectional',
        syncFrequency: (data?.sync_frequency as 'realtime' | 'hourly' | 'daily') || 'realtime',
        defaultCalendarId: data?.default_calendar_id || 'primary'
      }, 
      success: true 
    };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בבדיקת סטטוס Google Calendar' };
  }
}

/**
 * Update Google Calendar sync settings
 */
export async function updateGoogleCalendarSyncSettings(
  trainerId: string,
  settings: {
    autoSyncEnabled?: boolean;
    syncDirection?: 'to_google' | 'from_google' | 'bidirectional';
    syncFrequency?: 'realtime' | 'hourly' | 'daily';
    defaultCalendarId?: string;
  }
): Promise<ApiResponse> {
  try {
    const updates: any = {};
    if (settings.autoSyncEnabled !== undefined) {
      updates.auto_sync_enabled = settings.autoSyncEnabled;
    }
    if (settings.syncDirection !== undefined) {
      updates.sync_direction = settings.syncDirection;
    }
    if (settings.syncFrequency !== undefined) {
      updates.sync_frequency = settings.syncFrequency;
    }
    if (settings.defaultCalendarId !== undefined) {
      updates.default_calendar_id = settings.defaultCalendarId;
    }

    const { error } = await supabase
      .from('trainer_google_credentials')
      .update(updates)
      .eq('trainer_id', trainerId);

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בעדכון הגדרות סנכרון' };
  }
}

/**
 * Get list of available Google Calendars
 */
export async function getGoogleCalendars(
  trainerId: string
): Promise<ApiResponse<GoogleCalendar[]>> {
  try {
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, token_expires_at')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    // Check if token needs refresh
    let accessToken = credentials.access_token;
    if (new Date(credentials.token_expires_at) < new Date()) {
      return { error: 'נדרש אימות מחדש ל-Google Calendar' };
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || 'שגיאה בטעינת יומנים מ-Google Calendar';
      return { error: errorMessage };
    }

    const data = await response.json();
    const calendars: GoogleCalendar[] = (data.items || []).map((cal: any) => ({
      id: cal.id,
      summary: cal.summary || cal.id,
      description: cal.description,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    }));

    return { data: calendars, success: true };
  } catch (err: any) {
    const { logger } = await import('../utils/logger');
    logger.error('Error in getGoogleCalendars', err, 'googleCalendarApi');
    return { error: err.message || 'שגיאה בטעינת יומנים מ-Google Calendar' };
  }
}

/**
 * Get Google Calendar events - Optimized to use cached sync data first
 */
export async function getGoogleCalendarEvents(
  trainerId: string,
  dateRange: { start: Date; end: Date },
  options?: { useCache?: boolean; forceRefresh?: boolean }
): Promise<ApiResponse<GoogleCalendarEvent[]>> {
  try {
    // Validate inputs
    if (!trainerId || typeof trainerId !== 'string') {
      return { error: 'מזהה מאמן לא תקין' };
    }

    if (!dateRange?.start || !dateRange?.end || !(dateRange.start instanceof Date) || !(dateRange.end instanceof Date)) {
      return { error: 'טווח תאריכים לא תקין' };
    }

    if (dateRange.start > dateRange.end) {
      return { error: 'תאריך התחלה חייב להיות לפני תאריך סיום' };
    }

    const useCache = options?.useCache !== false; // Default to true
    const forceRefresh = options?.forceRefresh === true;

    // First, try to get events from cached sync table (much faster)
    if (useCache && !forceRefresh) {
      try {
        // Query for events that might overlap with the date range
        // We query a wider range and filter client-side for accuracy
        const queryStart = new Date(dateRange.start);
        queryStart.setDate(queryStart.getDate() - 1); // Include events that might start before but end in range
        
        const { data: cachedEvents, error: cacheError } = await supabase
          .from('google_calendar_sync')
          .select(`
            google_event_id,
            event_start_time,
            event_end_time,
            event_summary,
            event_description,
            sync_status,
            trainees:trainee_id(full_name, email)
          `)
          .eq('trainer_id', trainerId)
          .eq('sync_status', 'synced')
          .gte('event_start_time', queryStart.toISOString())
          .lte('event_start_time', dateRange.end.toISOString())
          .order('event_start_time', { ascending: true });

        // If we have cached data and no error, use it
        if (!cacheError && cachedEvents && cachedEvents.length > 0) {
          // Filter events to ensure they actually overlap with the date range
          const filteredEvents = cachedEvents.filter((cached) => {
            const startTime = new Date(cached.event_start_time);
            const endTime = cached.event_end_time ? new Date(cached.event_end_time) : startTime;
            
            // Event overlaps with range if:
            // - starts before range end AND ends after range start
            return startTime <= dateRange.end && endTime >= dateRange.start;
          });

          if (filteredEvents.length > 0) {
            // Convert cached events to GoogleCalendarEvent format
            const events: GoogleCalendarEvent[] = filteredEvents.map((cached) => {
              const trainee = Array.isArray(cached.trainees) ? cached.trainees[0] : cached.trainees;
              const startTime = new Date(cached.event_start_time);
              const endTime = cached.event_end_time ? new Date(cached.event_end_time) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour if no end time
              
              return {
                id: cached.google_event_id,
                summary: cached.event_summary || `אימון${trainee ? ` - ${trainee.full_name}` : ''}`,
                description: cached.event_description || undefined,
                start: {
                  dateTime: startTime.toISOString(),
                  timeZone: 'Asia/Jerusalem',
                },
                end: {
                  dateTime: endTime.toISOString(),
                  timeZone: 'Asia/Jerusalem',
                },
                attendees: trainee?.email ? [{
                  email: trainee.email,
                  displayName: trainee.full_name || undefined,
                }] : undefined,
              };
            });

            return { data: events, success: true };
          }
        }
        
        // If cache error occurred but we have data, log it but continue to fallback
        if (cacheError) {
          const { logger } = await import('../utils/logger');
          logger.warn('Cache query error (falling back to API)', cacheError, 'getGoogleCalendarEvents');
        }
      } catch (cacheErr: any) {
        // Log cache errors but continue to Google API fallback
        const { logger } = await import('../utils/logger');
        logger.warn('Cache query exception (falling back to API)', cacheErr, 'getGoogleCalendarEvents');
      }
    }

    // Fallback to Google API if cache miss or force refresh requested
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, refresh_token, token_expires_at, default_calendar_id')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    // Check if token needs refresh
    let accessToken = credentials.access_token;
    if (new Date(credentials.token_expires_at) < new Date()) {
      // Token expired - would need to refresh via backend
      return { error: 'נדרש אימות מחדש ל-Google Calendar' };
    }

    const calendarId = credentials.default_calendar_id || 'primary';
    const timeMin = dateRange.start.toISOString();
    const timeMax = dateRange.end.toISOString();
    
    // Build query string properly
    const queryParams = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500', // Increased from default 250
    });
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || 'שגיאה בטעינת אירועים מ-Google Calendar';
      return { error: errorMessage };
    }

    const data = await response.json();
    return { data: data.items || [], success: true };
  } catch (err: any) {
    const { logger } = await import('../utils/logger');
    logger.error('Error in getGoogleCalendarEvents', err, 'googleCalendarApi');
    return { error: err.message || 'שגיאה בטעינת אירועים מ-Google Calendar' };
  }
}

/**
 * Create Google Calendar event
 */
export async function createGoogleCalendarEvent(
  trainerId: string,
  eventData: CreateEventData,
  accessToken: string
): Promise<ApiResponse<string>> {
  try {
    // Get credentials to find calendar ID
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, refresh_token, token_expires_at, default_calendar_id')
      .eq('trainer_id', trainerId)
      .single();

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    let accessTokenToUse = accessToken || credentials.access_token;
    
    // Check if token needs refresh
    if (new Date(credentials.token_expires_at) < new Date()) {
      return { error: 'נדרש אימות מחדש ל-Google Calendar' };
    }

    const calendarId = credentials.default_calendar_id || 'primary';
    
    const eventPayload: any = {
      summary: eventData.summary,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: 'Asia/Jerusalem',
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: 'Asia/Jerusalem',
      },
    };

    if (eventData.description) {
      eventPayload.description = eventData.description;
    }

    if (eventData.location) {
      eventPayload.location = eventData.location;
    }

    if (eventData.attendees && eventData.attendees.length > 0) {
      eventPayload.attendees = eventData.attendees.map(email => ({ email }));
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessTokenToUse}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error?.message || 'שגיאה ביצירת אירוע ב-Google Calendar' };
    }

    const event = await response.json();
    return { data: event.id, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה ביצירת אירוע ב-Google Calendar' };
  }
}

/**
 * Update Google Calendar event
 */
export async function updateGoogleCalendarEvent(
  trainerId: string,
  eventId: string,
  updates: Partial<CreateEventData>,
  accessToken: string
): Promise<ApiResponse> {
  try {
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, default_calendar_id')
      .eq('trainer_id', trainerId)
      .single();

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    const calendarId = credentials.default_calendar_id || 'primary';
    const accessTokenToUse = accessToken || credentials.access_token;

    // Get existing event first
    const getResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessTokenToUse}`,
        },
      }
    );

    if (!getResponse.ok) {
      return { error: 'שגיאה בטעינת אירוע מ-Google Calendar' };
    }

    const existingEvent = await getResponse.json();

    // Merge updates
    const updatedEvent: any = { ...existingEvent };
    if (updates.summary) updatedEvent.summary = updates.summary;
    if (updates.description !== undefined) updatedEvent.description = updates.description;
    if (updates.location !== undefined) updatedEvent.location = updates.location;
    if (updates.startTime) {
      updatedEvent.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: 'Asia/Jerusalem',
      };
    }
    if (updates.endTime) {
      updatedEvent.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: 'Asia/Jerusalem',
      };
    }
    if (updates.attendees) {
      updatedEvent.attendees = updates.attendees.map(email => ({ email }));
    }

    const updateResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessTokenToUse}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEvent),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      return { error: error.error?.message || 'שגיאה בעדכון אירוע ב-Google Calendar' };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בעדכון אירוע ב-Google Calendar' };
  }
}

/**
 * Delete Google Calendar event
 */
export async function deleteGoogleCalendarEvent(
  trainerId: string,
  eventId: string,
  accessToken: string
): Promise<ApiResponse> {
  try {
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, default_calendar_id')
      .eq('trainer_id', trainerId)
      .single();

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    const calendarId = credentials.default_calendar_id || 'primary';
    const accessTokenToUse = accessToken || credentials.access_token;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessTokenToUse}`,
        },
      }
    );

    if (!response.ok) {
      return { error: 'שגיאה במחיקת אירוע ב-Google Calendar' };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה במחיקת אירוע ב-Google Calendar' };
  }
}

/**
 * Sync Google Calendar manually
 */
export async function syncGoogleCalendar(
  trainerId: string,
  accessToken: string
): Promise<ApiResponse> {
  try {
    const response = await fetch(
      `${API_CONFIG.SUPABASE_URL}/functions/v1/sync-google-calendar`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ trainer_id: trainerId }),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      return { error: result.error || 'שגיאה בסנכרון Google Calendar' };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בסנכרון Google Calendar' };
  }
}
