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
): Promise<ApiResponse<{ connected: boolean; autoSyncEnabled?: boolean }>> {
  try {
    const { data, error } = await supabase
      .from('trainer_google_credentials')
      .select('auto_sync_enabled')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    return { 
      data: { 
        connected: !!data, 
        autoSyncEnabled: data?.auto_sync_enabled ?? false 
      }, 
      success: true 
    };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בבדיקת סטטוס Google Calendar' };
  }
}

/**
 * Get Google Calendar events
 */
export async function getGoogleCalendarEvents(
  trainerId: string,
  dateRange: { start: Date; end: Date }
): Promise<ApiResponse<GoogleCalendarEvent[]>> {
  try {
    // Get credentials from database
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, refresh_token, token_expires_at, default_calendar_id')
      .eq('trainer_id', trainerId)
      .single();

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
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
      `timeMin=${dateRange.start.toISOString()}&` +
      `timeMax=${dateRange.end.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return { error: 'שגיאה בטעינת אירועים מ-Google Calendar' };
    }

    const data = await response.json();
    return { data: data.items || [], success: true };
  } catch (err: any) {
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
