/**
 * Google Calendar API layer
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import type { ApiResponse } from './types';
import type { Database } from '../types/database';
import { API_CONFIG } from './config';
import { handleApiError } from '../utils/apiErrorHandler';
import { rateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

// Type aliases for cleaner code
type GoogleCredentialsRow = Database['public']['Tables']['trainer_google_credentials']['Row'];
type GoogleCalendarSyncRow = Database['public']['Tables']['google_calendar_sync']['Row'];

// Re-export for use in other files
export type { GoogleCredentialsRow, GoogleCalendarSyncRow };

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
  // Rate limiting: 5 OAuth initiations per minute per trainer (security)
  const rateLimitKey = `initiateGoogleOAuth:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 5, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

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
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה ביצירת OAuth URL',
      context: 'initiateGoogleOAuth',
      additionalInfo: { trainerId },
    });
    return { error: errorMessage };
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
  // Rate limiting: 5 OAuth callbacks per minute (security)
  const rateLimitKey = `handleGoogleOAuthCallback:${state}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 5, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

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
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה באימות Google Calendar',
      context: 'handleGoogleOAuthCallback',
    });
    return { error: errorMessage };
  }
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar(
  trainerId: string,
  accessToken: string
): Promise<ApiResponse> {
  // Rate limiting: 5 disconnect requests per minute per trainer (security)
  const rateLimitKey = `disconnectGoogleCalendar:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 5, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

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
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בניתוק Google Calendar',
      context: 'disconnectGoogleCalendar',
      additionalInfo: { trainerId },
    });
    return { error: errorMessage };
  }
}

/**
 * Get Google Calendar connection status
 */
export async function getGoogleCalendarStatus(
  trainerId: string
): Promise<ApiResponse<{ connected: boolean; autoSyncEnabled?: boolean; syncDirection?: 'to_google' | 'from_google' | 'bidirectional'; syncFrequency?: 'realtime' | 'hourly' | 'daily'; defaultCalendarId?: string }>> {
  try {
    // Start with basic fields that should always exist
    const { data: basicData, error: basicError } = await supabase
      .from('trainer_google_credentials')
      .select('auto_sync_enabled, default_calendar_id')
      .eq('trainer_id', trainerId)
      .maybeSingle() as { data: Pick<GoogleCredentialsRow, 'auto_sync_enabled' | 'default_calendar_id'> | null; error: { code?: string; message: string } | null };

    if (basicError) {
      // If basic query fails, check if it's a "not found" vs actual error
      if (basicError.code === 'PGRST116') {
        // No rows found - user not connected
        return { 
          data: { 
            connected: false,
            autoSyncEnabled: false,
            syncDirection: 'bidirectional' as const,
            syncFrequency: 'realtime' as const,
            defaultCalendarId: 'primary'
          }, 
          success: true 
        };
      }
      
      logSupabaseError(basicError as Parameters<typeof logSupabaseError>[0], 'getGoogleCalendarStatus.basic', { table: 'trainer_google_credentials', trainerId });
      return { error: basicError.message };
    }

    // If no data found, return not connected
    if (!basicData) {
      return { 
        data: { 
          connected: false,
          autoSyncEnabled: false,
          syncDirection: 'bidirectional' as const,
          syncFrequency: 'realtime' as const,
          defaultCalendarId: 'primary'
        }, 
        success: true 
      };
    }

    // Try to get extended fields (may not exist in all schemas)
    let syncDirection: 'to_google' | 'from_google' | 'bidirectional' = 'bidirectional';
    let syncFrequency: 'realtime' | 'hourly' | 'daily' = 'realtime';

    try {
      const { data: extendedData, error: extendedError } = await supabase
        .from('trainer_google_credentials')
        .select('sync_direction, sync_frequency')
        .eq('trainer_id', trainerId)
        .maybeSingle() as { data: Pick<GoogleCredentialsRow, 'sync_direction' | 'sync_frequency'> | null; error: { code?: string; message?: string } | null };

      // If columns don't exist (42703), that's OK - use defaults
      if (extendedError && extendedError.code !== '42703' && !extendedError.message?.includes('does not exist')) {
        // Only log if it's not a "column doesn't exist" error
        logSupabaseError(extendedError as Parameters<typeof logSupabaseError>[0], 'getGoogleCalendarStatus.extended', { table: 'trainer_google_credentials', trainerId });
      }

      if (!extendedError && extendedData) {
        syncDirection = extendedData.sync_direction || 'bidirectional';
        syncFrequency = extendedData.sync_frequency || 'realtime';
      }
    } catch (extendedErr) {
      // If extended fields query fails, use defaults - this is OK
      // Fields might not exist in all database versions
    }

    return { 
      data: { 
        connected: true, 
        autoSyncEnabled: basicData.auto_sync_enabled ?? false,
        syncDirection,
        syncFrequency,
        defaultCalendarId: basicData.default_calendar_id || 'primary'
      }, 
      success: true 
    };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בבדיקת סטטוס Google Calendar',
      context: 'getGoogleCalendarStatus',
      additionalInfo: { trainerId },
    });
    return { error: errorMessage };
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
  // Rate limiting: 20 update requests per minute per trainer
  const rateLimitKey = `updateGoogleCalendarSyncSettings:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 20, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    // First, try to update basic fields that always exist
    const basicUpdates: Record<string, unknown> = {};
    if (settings.autoSyncEnabled !== undefined) {
      basicUpdates.auto_sync_enabled = settings.autoSyncEnabled;
    }
    if (settings.defaultCalendarId !== undefined) {
      basicUpdates.default_calendar_id = settings.defaultCalendarId;
    }

    // Update basic fields first
    if (Object.keys(basicUpdates).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: basicError } = await (supabase as any)
        .from('trainer_google_credentials')
        .update(basicUpdates)
        .eq('trainer_id', trainerId);

      if (basicError) {
        logSupabaseError(basicError, 'updateGoogleCalendarSyncSettings.basic', { table: 'trainer_google_credentials', trainerId });
        return { error: basicError.message };
      }
    }

    // Try to update extended fields if they're provided
    const extendedUpdates: Record<string, unknown> = {};
    if (settings.syncDirection !== undefined) {
      extendedUpdates.sync_direction = settings.syncDirection;
    }
    if (settings.syncFrequency !== undefined) {
      extendedUpdates.sync_frequency = settings.syncFrequency;
    }

    // Update extended fields if provided (may fail if columns don't exist - that's OK)
    if (Object.keys(extendedUpdates).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: extendedError } = await (supabase as any)
        .from('trainer_google_credentials')
        .update(extendedUpdates)
        .eq('trainer_id', trainerId);

      // If columns don't exist, that's OK - we'll just use defaults
      if (extendedError && extendedError.code !== '42703' && !extendedError.message?.includes('does not exist')) {
        logSupabaseError(extendedError, 'updateGoogleCalendarSyncSettings.extended', { table: 'trainer_google_credentials', trainerId });
        // Don't return error - basic fields were updated successfully
        // Extended fields will use defaults until migration is run
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בעדכון הגדרות סנכרון',
      context: 'updateGoogleCalendarSyncSettings',
      additionalInfo: { trainerId },
    });
    return { error: errorMessage };
  }
}

/**
 * Get list of available Google Calendars
 */
export async function getGoogleCalendars(
  trainerId: string
): Promise<ApiResponse<GoogleCalendar[]>> {
  // Rate limiting: 60 requests per minute per trainer
  const rateLimitKey = `getGoogleCalendars:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 60, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, token_expires_at')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    // Get valid access token (refresh if needed)
    const { OAuthTokenService } = await import('../services/oauthTokenService');
    const tokenResult = await OAuthTokenService.getValidAccessToken(trainerId);
    
    if (!tokenResult.success || !tokenResult.data) {
      return { error: tokenResult.error || 'נדרש אימות מחדש ל-Google Calendar' };
    }
    
    const accessToken = tokenResult.data;

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
    interface GoogleCalendarApiItem {
      id: string;
      summary?: string;
      description?: string;
      primary?: boolean;
      accessRole?: string;
    }
    const calendars: GoogleCalendar[] = (data.items || []).map((cal: GoogleCalendarApiItem) => ({
      id: cal.id,
      summary: cal.summary || cal.id,
      description: cal.description,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    }));

    return { data: calendars, success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בטעינת יומנים מ-Google Calendar',
      context: 'getGoogleCalendars',
      additionalInfo: { trainerId },
    });
    return { error: errorMessage };
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
  // Rate limiting: 60 requests per minute per trainer
  const rateLimitKey = `getGoogleCalendarEvents:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 60, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

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
        
        // Type for the cached events query result
        type CachedEventRow = {
          google_event_id: string;
          event_start_time: string;
          event_end_time: string | null;
          event_summary: string | null;
          event_description: string | null;
          sync_status: string;
          trainees: { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null;
        };
        
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
          .order('event_start_time', { ascending: true }) as { data: CachedEventRow[] | null; error: { message: string } | null };

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
            // Validate events exist in Google Calendar and filter out deleted ones
            // We check a sample and if we find deleted events, we fetch from Google to get accurate list
            const validateAndFilterEvents = async (): Promise<GoogleCalendarEvent[]> => {
              try {
                const { OAuthTokenService } = await import('../services/oauthTokenService');
                const tokenResult = await OAuthTokenService.getValidAccessToken(trainerId);
                
                if (!tokenResult.success || !tokenResult.data) {
                  // Can't validate without token - return cached events
                  return filteredEvents.map((cached) => {
                    const trainee = Array.isArray(cached.trainees) ? cached.trainees[0] : cached.trainees;
                    const startTime = new Date(cached.event_start_time);
                    const endTime = cached.event_end_time ? new Date(cached.event_end_time) : new Date(startTime.getTime() + 60 * 60 * 1000);
                    
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
                }
                
                const { data: credentials } = await supabase
                  .from('trainer_google_credentials')
                  .select('default_calendar_id')
                  .eq('trainer_id', trainerId)
                  .maybeSingle() as { data: Pick<GoogleCredentialsRow, 'default_calendar_id'> | null; error: unknown };
                
                if (!credentials) {
                  // No credentials - return cached events
                  return filteredEvents.map((cached) => {
                    const trainee = Array.isArray(cached.trainees) ? cached.trainees[0] : cached.trainees;
                    const startTime = new Date(cached.event_start_time);
                    const endTime = cached.event_end_time ? new Date(cached.event_end_time) : new Date(startTime.getTime() + 60 * 60 * 1000);
                    
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
                }
                
                const calendarId = credentials.default_calendar_id || 'primary';
                const accessToken = tokenResult.data;
                
                // Check a sample of events (first 10) to see if they exist
                // If we find deleted ones, we'll clean up all of them
                const sampleSize = Math.min(10, filteredEvents.length);
                const eventsToCheck = filteredEvents.slice(0, sampleSize);
                
                const deletedEventIds = new Set<string>();
                
                for (const cached of eventsToCheck) {
                  try {
                    const checkResponse = await fetch(
                      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${cached.google_event_id}`,
                      {
                        headers: {
                          'Authorization': `Bearer ${accessToken}`,
                        },
                      }
                    );
                    
                    if (checkResponse.status === 404 || checkResponse.status === 410) {
                      deletedEventIds.add(cached.google_event_id);
                    }
                  } catch (err) {
                    // Skip validation errors - don't block
                  }
                }
                
                // If we found deleted events in the sample, fetch from Google Calendar
                // to get accurate list and clean up sync records
                if (deletedEventIds.size > 0) {
                  const { logger } = await import('../utils/logger');
                  logger.info('Found deleted events in cache, fetching from Google Calendar', 
                    { deletedCount: deletedEventIds.size }, 'getGoogleCalendarEvents');
                  
                  // Fetch actual events from Google Calendar
                  const googleEventsResponse = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
                    `timeMin=${dateRange.start.toISOString()}&` +
                    `timeMax=${dateRange.end.toISOString()}&` +
                    `singleEvents=true&` +
                    `orderBy=startTime&` +
                    `maxResults=2500`,
                    {
                      headers: {
                        'Authorization': `Bearer ${accessToken}`,
                      },
                    }
                  );
                  
                  if (googleEventsResponse.ok) {
                    const googleData = await googleEventsResponse.json();
                    const googleEvents = googleData.items || [];
                    const existingEventIds = new Set(googleEvents.map((e: any) => e.id));
                    
                    // Clean up sync records for events that don't exist in Google Calendar
                    const { data: allSyncRecords } = await supabase
                      .from('google_calendar_sync')
                      .select('id, google_event_id, workout_id, sync_direction')
                      .eq('trainer_id', trainerId)
                      .eq('sync_status', 'synced')
                      .gte('event_start_time', dateRange.start.toISOString())
                      .lte('event_start_time', dateRange.end.toISOString());
                    
                    if (allSyncRecords) {
                      for (const syncRecord of allSyncRecords) {
                        if (!existingEventIds.has(syncRecord.google_event_id)) {
                          // Delete workout if exists and sync direction allows it
                          if (syncRecord.workout_id && syncRecord.sync_direction !== 'to_google') {
                            await supabase
                              .from('workouts')
                              .delete()
                              .eq('id', syncRecord.workout_id)
                              .eq('trainer_id', trainerId);
                          }
                          
                          // Delete sync record
                          await supabase
                            .from('google_calendar_sync')
                            .delete()
                            .eq('id', syncRecord.id);
                        }
                      }
                    }
                    
                    // Return Google Calendar events instead of cached ones
                    // Convert to our format
                    const validEvents: GoogleCalendarEvent[] = googleEvents
                      .filter((e: any) => e.status !== 'cancelled')
                      .map((e: any) => {
                        const startTime = e.start.dateTime || e.start.date;
                        const endTime = e.end.dateTime || e.end.date;
                        
                        return {
                          id: e.id,
                          summary: e.summary || '',
                          description: e.description,
                          start: {
                            dateTime: e.start.dateTime,
                            date: e.start.date,
                            timeZone: e.start.timeZone,
                          },
                          end: {
                            dateTime: e.end.dateTime,
                            date: e.end.date,
                            timeZone: e.end.timeZone,
                          },
                          attendees: e.attendees?.map((a: any) => ({
                            email: a.email,
                            displayName: a.displayName,
                          })),
                          location: e.location,
                        };
                      });
                    
                    return validEvents;
                  }
                }
                
                // No deleted events found, return cached events
                return filteredEvents.map((cached) => {
                  const trainee = Array.isArray(cached.trainees) ? cached.trainees[0] : cached.trainees;
                  const startTime = new Date(cached.event_start_time);
                  const endTime = cached.event_end_time ? new Date(cached.event_end_time) : new Date(startTime.getTime() + 60 * 60 * 1000);
                  
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
              } catch (err) {
                // On error, return cached events (fallback)
                const { logger } = await import('../utils/logger');
                logger.debug('Error validating cached events', err, 'getGoogleCalendarEvents');
                
                return filteredEvents.map((cached) => {
                  const trainee = Array.isArray(cached.trainees) ? cached.trainees[0] : cached.trainees;
                  const startTime = new Date(cached.event_start_time);
                  const endTime = cached.event_end_time ? new Date(cached.event_end_time) : new Date(startTime.getTime() + 60 * 60 * 1000);
                  
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
              }
            };
            
            // Try to validate and get accurate events (with timeout)
            // If validation takes too long, fall back to cached events
            const validationPromise = validateAndFilterEvents();
            const timeoutPromise = new Promise<GoogleCalendarEvent[]>((resolve) => {
              setTimeout(() => {
                // Timeout - return cached events
                resolve(filteredEvents.map((cached) => {
                  const trainee = Array.isArray(cached.trainees) ? cached.trainees[0] : cached.trainees;
                  const startTime = new Date(cached.event_start_time);
                  const endTime = cached.event_end_time ? new Date(cached.event_end_time) : new Date(startTime.getTime() + 60 * 60 * 1000);
                  
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
                }));
              }, 2000); // 2 second timeout
            });
            
            const events = await Promise.race([validationPromise, timeoutPromise]);
            
            return { data: events, success: true };
          }
        }
        
        // If cache error occurred but we have data, log it but continue to fallback
        if (cacheError) {
          const { logger } = await import('../utils/logger');
          logger.warn('Cache query error (falling back to API)', cacheError, 'getGoogleCalendarEvents');
        }
      } catch (cacheErr: unknown) {
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
      .maybeSingle() as { data: Pick<GoogleCredentialsRow, 'access_token' | 'refresh_token' | 'token_expires_at' | 'default_calendar_id'> | null; error: { message: string } | null };

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    // Check if token needs refresh and refresh if needed
    const { OAuthTokenService } = await import('../services/oauthTokenService');
    const tokenResult = await OAuthTokenService.getValidAccessToken(trainerId);
    
    if (!tokenResult.success || !tokenResult.data) {
      return { error: tokenResult.error || 'נדרש אימות מחדש ל-Google Calendar' };
    }
    
    const accessToken = tokenResult.data;

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
      
      // Handle 401 - Token expired or invalid
      if (response.status === 401) {
        // Try to refresh token and retry once
        const { OAuthTokenService } = await import('../services/oauthTokenService');
        const refreshResult = await OAuthTokenService.refreshAccessToken(trainerId);
        
        if (refreshResult.success && refreshResult.data?.access_token) {
          // Retry with new token
          const retryResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${queryParams.toString()}`,
            {
              headers: {
                'Authorization': `Bearer ${refreshResult.data.access_token}`,
              },
            }
          );
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            return { data: data.items || [], success: true };
          }
        }
        
        // If refresh failed or retry failed, ask user to reconnect
        return { error: 'הרשאת Google Calendar פגה - נדרש חיבור מחדש בהגדרות' };
      }
      
      const errorMessage = errorData?.error?.message || 'שגיאה בטעינת אירועים מ-Google Calendar';
      return { error: errorMessage };
    }

    const data = await response.json();
    return { data: data.items || [], success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בטעינת אירועים מ-Google Calendar',
      context: 'getGoogleCalendarEvents',
      additionalInfo: { trainerId },
    });
    return { error: errorMessage };
  }
}

/**
 * Create Google Calendar event
 */
export async function createGoogleCalendarEvent(
  trainerId: string,
  eventData: CreateEventData
): Promise<ApiResponse<string>> {
  // Rate limiting: 50 create requests per minute per trainer
  const rateLimitKey = `createGoogleCalendarEvent:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 50, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    // Get credentials to find calendar ID
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, refresh_token, token_expires_at, default_calendar_id')
      .eq('trainer_id', trainerId)
      .single() as { data: Pick<GoogleCredentialsRow, 'access_token' | 'refresh_token' | 'token_expires_at' | 'default_calendar_id'> | null; error: { message: string } | null };

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    // Get valid Google OAuth access token (refresh if needed)
    // IMPORTANT: Always use the token from OAuthTokenService, not the passed Supabase token
    const { OAuthTokenService } = await import('../services/oauthTokenService');
    const tokenResult = await OAuthTokenService.getValidAccessToken(trainerId);
    
    if (!tokenResult.success || !tokenResult.data) {
      return { error: tokenResult.error || 'נדרש אימות מחדש ל-Google Calendar' };
    }
    
    // Always use the Google OAuth token from the service
    const accessTokenToUse = tokenResult.data;

    const calendarId = credentials.default_calendar_id || 'primary';
    
    interface GoogleCalendarEventPayload {
      summary: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      description?: string;
      location?: string;
      attendees?: Array<{ email: string }>;
    }
    const eventPayload: GoogleCalendarEventPayload = {
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

    const event = await response.json() as { id: string };
    return { data: event.id, success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה ביצירת אירוע ב-Google Calendar',
      context: 'createGoogleCalendarEvent',
      additionalInfo: { trainerId },
    });
    return { error: errorMessage };
  }
}

/**
 * Update Google Calendar event
 */
export async function updateGoogleCalendarEvent(
  trainerId: string,
  eventId: string,
  updates: Partial<CreateEventData>
): Promise<ApiResponse> {
  // Rate limiting: 50 update requests per minute per trainer
  const rateLimitKey = `updateGoogleCalendarEvent:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 50, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, default_calendar_id')
      .eq('trainer_id', trainerId)
      .single() as { data: Pick<GoogleCredentialsRow, 'access_token' | 'default_calendar_id'> | null; error: { message: string } | null };

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    const calendarId = credentials.default_calendar_id || 'primary';
    
    // Get valid access token (refresh if needed)
    const { OAuthTokenService } = await import('../services/oauthTokenService');
    const tokenResult = await OAuthTokenService.getValidAccessToken(trainerId);
    
    if (!tokenResult.success || !tokenResult.data) {
      return { error: tokenResult.error || 'נדרש אימות מחדש ל-Google Calendar' };
    }
    
    let currentToken = tokenResult.data;

    // Helper function to perform the update
    const performUpdate = async (token: string): Promise<{ success: boolean; error?: string; needsRetry?: boolean }> => {
      // Get existing event first
      const getResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!getResponse.ok) {
        if (getResponse.status === 401) {
          return { success: false, needsRetry: true };
        }
        if (getResponse.status === 404 || getResponse.status === 410) {
          // Event was deleted from Google Calendar
          // Return special error code to indicate deletion
          return { success: false, error: 'האירוע לא נמצא ב-Google Calendar (נמחק)', eventDeleted: true };
        }
        return { success: false, error: 'שגיאה בטעינת אירוע מ-Google Calendar' };
      }

      const existingEvent = await getResponse.json() as GoogleCalendarEvent;

      // Merge updates
      const updatedEvent: GoogleCalendarEvent = { ...existingEvent };
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
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedEvent),
        }
      );

      if (!updateResponse.ok) {
        if (updateResponse.status === 401) {
          return { success: false, needsRetry: true };
        }
        const error = await updateResponse.json().catch(() => ({}));
        return { success: false, error: error.error?.message || 'שגיאה בעדכון אירוע ב-Google Calendar' };
      }

      return { success: true };
    };

    // First attempt
    let result = await performUpdate(currentToken);
    
    // If 401, refresh token and retry
    if (result.needsRetry) {
      logger.info('Update got 401, refreshing token and retrying...', { trainerId, eventId }, 'updateGoogleCalendarEvent');
      
      const refreshResult = await OAuthTokenService.refreshAccessToken(trainerId);
      
      if (refreshResult.success && refreshResult.data?.access_token) {
        currentToken = refreshResult.data.access_token;
        result = await performUpdate(currentToken);
        
        if (result.needsRetry) {
          return { error: 'הרשאת Google Calendar פגה - נדרש חיבור מחדש בהגדרות' };
        }
      } else {
        return { error: refreshResult.error || 'נדרש חיבור מחדש ל-Google Calendar' };
      }
    }

    if (!result.success) {
      return { error: result.error || 'שגיאה בעדכון אירוע ב-Google Calendar' };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בעדכון אירוע ב-Google Calendar',
      context: 'updateGoogleCalendarEvent',
      additionalInfo: { trainerId, eventId },
    });
    return { error: errorMessage };
  }
}

/**
 * Delete Google Calendar event
 */
export async function deleteGoogleCalendarEvent(
  trainerId: string,
  eventId: string
): Promise<ApiResponse> {
  // Rate limiting: 30 delete requests per minute per trainer
  const rateLimitKey = `deleteGoogleCalendarEvent:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 30, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, default_calendar_id')
      .eq('trainer_id', trainerId)
      .single() as { data: Pick<GoogleCredentialsRow, 'access_token' | 'default_calendar_id'> | null; error: { message: string } | null };

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    const calendarId = credentials.default_calendar_id || 'primary';
    
    // Get valid Google OAuth access token (refresh if needed)
    // IMPORTANT: Always use the token from OAuthTokenService, not the passed Supabase token
    const { OAuthTokenService } = await import('../services/oauthTokenService');
    const tokenResult = await OAuthTokenService.getValidAccessToken(trainerId);
    
    if (!tokenResult.success || !tokenResult.data) {
      return { error: tokenResult.error || 'נדרש אימות מחדש ל-Google Calendar' };
    }
    
    // Always use the Google OAuth token from the service
    const accessTokenToUse = tokenResult.data;

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
      // Handle 401 - Token expired or invalid
      if (response.status === 401) {
        // Get refresh token and try to refresh
        const { data: fullCreds } = await supabase
          .from('trainer_google_credentials')
          .select('refresh_token')
          .eq('trainer_id', trainerId)
          .single() as { data: { refresh_token: string } | null; error: unknown };
        
        if (fullCreds?.refresh_token) {
          const refreshResult = await OAuthTokenService.refreshAccessToken(trainerId);
          
          if (refreshResult.success && refreshResult.data?.access_token) {
            // Retry with new token
            const retryResponse = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${refreshResult.data.access_token}`,
                },
              }
            );
            
            if (retryResponse.ok || retryResponse.status === 204 || retryResponse.status === 404 || retryResponse.status === 410) {
              return { success: true };
            }
          }
        }
        
        return { error: 'הרשאת Google Calendar פגה - נדרש חיבור מחדש בהגדרות' };
      }
      
      // Handle 404/410 - Event not found or already deleted
      if (response.status === 404 || response.status === 410) {
        logger.info('Event already deleted or not found', { trainerId, eventId, status: response.status }, 'deleteGoogleCalendarEvent');
        return { success: true }; // Consider it deleted
      }
      
      return { error: 'שגיאה במחיקת אירוע ב-Google Calendar' };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה במחיקת אירוע ב-Google Calendar',
      context: 'deleteGoogleCalendarEvent',
      additionalInfo: { trainerId, eventId },
    });
    return { error: errorMessage };
  }
}

/**
 * Sync Google Calendar manually
 */
export async function syncGoogleCalendar(
  trainerId: string,
  accessToken: string
): Promise<ApiResponse> {
  // Rate limiting: 10 sync requests per minute per trainer (expensive operation)
  const rateLimitKey = `syncGoogleCalendar:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 10, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

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
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בסנכרון Google Calendar',
      context: 'syncGoogleCalendar',
      additionalInfo: { trainerId },
    });
    return { error: errorMessage };
  }
}

/**
 * Update calendar event with bidirectional sync
 * Updates both Google Calendar and local workout if synced
 */
export async function updateCalendarEventBidirectional(
  trainerId: string,
  eventId: string,
  updates: {
    startTime?: Date;
    endTime?: Date;
    summary?: string;
    description?: string;
  },
  accessToken: string
): Promise<ApiResponse> {
  // Rate limiting: 30 update requests per minute per trainer
  const rateLimitKey = `updateCalendarEventBidirectional:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 30, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    // Find sync record to check if we need to update workout
    const { data: syncRecord } = await supabase
      .from('google_calendar_sync')
      .select('workout_id, sync_direction, trainee_id')
      .eq('trainer_id', trainerId)
      .eq('google_event_id', eventId)
      .maybeSingle() as { data: Pick<GoogleCalendarSyncRow, 'workout_id' | 'sync_direction' | 'trainee_id'> | null; error: { message: string } | null };

    // Update Google Calendar event
    const { data: credentials } = await supabase
      .from('trainer_google_credentials')
      .select('default_calendar_id')
      .eq('trainer_id', trainerId)
      .maybeSingle() as { data: Pick<GoogleCredentialsRow, 'default_calendar_id'> | null; error: { message: string } | null };

    if (credentials) {
      const updateResult = await updateGoogleCalendarEvent(
        trainerId,
        eventId,
        {
          startTime: updates.startTime,
          endTime: updates.endTime,
          summary: updates.summary,
          description: updates.description,
        },
        accessToken
      );

      if (updateResult.error) {
        return updateResult;
      }
    }

    // Update local workout if synced and sync_direction allows it
    if (syncRecord?.workout_id && syncRecord.sync_direction !== 'to_google') {
      const workoutUpdates: { workout_date?: string; notes?: string | null } = {};
      
      if (updates.startTime) {
        workoutUpdates.workout_date = updates.startTime.toISOString().split('T')[0];
      }
      if (updates.description !== undefined) {
        workoutUpdates.notes = updates.description || null;
      }

      if (Object.keys(workoutUpdates).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: workoutError } = await (supabase as any)
          .from('workouts')
          .update(workoutUpdates)
          .eq('id', syncRecord.workout_id)
          .eq('trainer_id', trainerId);

        if (workoutError) {
          return { error: workoutError.message };
        }
      }
    }

    // Update sync record metadata
    if (syncRecord && (updates.startTime || updates.endTime || updates.summary || updates.description !== undefined)) {
      const syncUpdates: {
        event_start_time?: string;
        event_end_time?: string;
        event_summary?: string;
        event_description?: string | null;
        last_synced_at?: string;
      } = {
        last_synced_at: new Date().toISOString(),
      };

      if (updates.startTime) {
        syncUpdates.event_start_time = updates.startTime.toISOString();
      }
      if (updates.endTime) {
        syncUpdates.event_end_time = updates.endTime.toISOString();
      }
      if (updates.summary) {
        syncUpdates.event_summary = updates.summary;
      }
      if (updates.description !== undefined) {
        syncUpdates.event_description = updates.description || null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('google_calendar_sync')
        .update(syncUpdates)
        .eq('trainer_id', trainerId)
        .eq('google_event_id', eventId);
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בעדכון אירוע',
      context: 'updateCalendarEventBidirectional',
      additionalInfo: { trainerId, eventId },
    });
    return { error: errorMessage };
  }
}

/**
 * Delete calendar event with bidirectional sync
 * Deletes both Google Calendar event and local workout if synced
 */
export async function deleteCalendarEventBidirectional(
  trainerId: string,
  eventId: string,
  accessToken: string
): Promise<ApiResponse> {
  // Rate limiting: 20 delete requests per minute per trainer
  const rateLimitKey = `deleteCalendarEventBidirectional:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 20, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    // Find sync record to check if we need to delete workout
    const { data: syncRecord } = await supabase
      .from('google_calendar_sync')
      .select('workout_id, sync_direction')
      .eq('trainer_id', trainerId)
      .eq('google_event_id', eventId)
      .maybeSingle() as { data: Pick<GoogleCalendarSyncRow, 'workout_id' | 'sync_direction'> | null; error: { message: string } | null };

    // Delete from Google Calendar
    const deleteResult = await deleteGoogleCalendarEvent(trainerId, eventId);
    if (deleteResult.error) {
      return deleteResult;
    }

    // Delete local workout if synced and sync_direction allows it
    if (syncRecord?.workout_id && syncRecord.sync_direction !== 'to_google') {
      const { error: workoutError } = await supabase
        .from('workouts')
        .delete()
        .eq('id', syncRecord.workout_id!)
        .eq('trainer_id', trainerId);

      if (workoutError) {
        // Log error but don't fail - Google Calendar event is already deleted
        const { logger } = await import('../utils/logger');
        logger.error('Error deleting workout after calendar event deletion', workoutError, 'deleteCalendarEventBidirectional');
      }
    }

    // Delete sync record
    await supabase
      .from('google_calendar_sync')
      .delete()
      .eq('trainer_id', trainerId)
      .eq('google_event_id', eventId);

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה במחיקת אירוע',
      context: 'deleteCalendarEventBidirectional',
      additionalInfo: { trainerId, eventId },
    });
    return { error: errorMessage };
  }
}

/**
 * Get sync record for a calendar event
 */
export async function getSyncRecordForEvent(
  trainerId: string,
  eventId: string
): Promise<ApiResponse<{ workout_id: string | null; trainee_id: string | null; sync_direction: string } | null>> {
  try {
    const { data, error } = await supabase
      .from('google_calendar_sync')
      .select('workout_id, trainee_id, sync_direction')
      .eq('trainer_id', trainerId)
      .eq('google_event_id', eventId)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    return { data: data || null, success: true };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בטעינת רשומת סנכרון',
      context: 'getSyncRecordForEvent',
      additionalInfo: { trainerId, eventId },
    });
    return { error: errorMessage };
  }
}

/**
 * Bulk update Google Calendar events for a trainee
 * Used when trainee name or session numbers need to be updated across multiple events
 */
export async function bulkUpdateCalendarEvents(
  traineeId: string,
  trainerId: string,
  updates: {
    summary?: string;
    dateRange?: { start: Date; end: Date };
  }
): Promise<ApiResponse<{ updated: number; failed: number; errors: string[] }>> {
  // Rate limiting: 5 bulk update requests per minute per trainer (expensive operation)
  const rateLimitKey = `bulkUpdateCalendarEvents:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 5, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    // Get all synced events for this trainee
    let query = supabase
      .from('google_calendar_sync')
      .select('id, google_event_id, google_calendar_id, event_start_time, event_end_time, workout_id')
      .eq('trainer_id', trainerId)
      .eq('trainee_id', traineeId)
      .eq('sync_status', 'synced');

    // Apply date range filter if provided
    if (updates.dateRange) {
      query = query
        .gte('event_start_time', updates.dateRange.start.toISOString())
        .lte('event_start_time', updates.dateRange.end.toISOString());
    }

    const { data: syncRecords, error: syncError } = await query;

    if (syncError) {
      return { error: syncError.message };
    }

    if (!syncRecords || syncRecords.length === 0) {
      return { data: { updated: 0, failed: 0, errors: [] }, success: true };
    }

    // Get trainer credentials
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, default_calendar_id')
      .eq('trainer_id', trainerId)
      .single() as { data: Pick<GoogleCredentialsRow, 'access_token' | 'default_calendar_id'> | null; error: { message: string } | null };

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    // Get valid access token (refresh if needed)
    const { OAuthTokenService } = await import('../services/oauthTokenService');
    const tokenResult = await OAuthTokenService.getValidAccessToken(trainerId);
    
    if (!tokenResult.success || !tokenResult.data) {
      return { error: tokenResult.error || 'נדרש אימות מחדש ל-Google Calendar' };
    }
    
    const accessToken = tokenResult.data;

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Update each event (with rate limiting delay between calls)
    for (const record of syncRecords) {
      try {
        // Small delay to respect rate limits (100ms between calls)
        await new Promise(resolve => setTimeout(resolve, 100));

        const updateResult = await updateGoogleCalendarEvent(
          trainerId,
          (record as any).google_event_id,
          { summary: updates.summary }
        );

        if (updateResult.error) {
          // Check if event was deleted (404/410) - if so, delete sync record
          if (updateResult.error.includes('לא נמצא') || updateResult.error.includes('נמחק')) {
            // Get sync record info before deleting (to check sync_direction)
            const { data: syncRecord } = await supabase
              .from('google_calendar_sync')
              .select('workout_id, sync_direction')
              .eq('id', (record as any).id)
              .maybeSingle();
            
            // Delete workout if exists and sync direction allows it
            if (syncRecord?.workout_id && syncRecord.sync_direction !== 'to_google') {
              await supabase
                .from('workouts')
                .delete()
                .eq('id', syncRecord.workout_id)
                .eq('trainer_id', trainerId);
            }
            
            // Delete sync record
            await supabase
              .from('google_calendar_sync')
              .delete()
              .eq('id', (record as any).id);
            
            logger.info('Deleted sync record for event that no longer exists in Google Calendar', 
              { eventId: (record as any).google_event_id }, 'bulkUpdateCalendarEvents');
          } else {
            failed++;
            errors.push(`Event ${(record as any).google_event_id}: ${updateResult.error}`);
            
            // Update sync status to failed
            await supabase
              .from('google_calendar_sync')
              .update({ sync_status: 'failed' } as any)
              .eq('id', (record as any).id);
          }
        } else {
          updated++;
          
          // Update sync record with new summary
          await supabase
            .from('google_calendar_sync')
            .update({
              event_summary: updates.summary,
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced'
            } as any)
            .eq('id', (record as any).id);
        }
      } catch (err: unknown) {
        failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Event ${(record as any).google_event_id}: ${errorMsg}`);
        logger.error('Error updating calendar event in bulk', err, 'bulkUpdateCalendarEvents');
      }
    }

    return {
      data: { updated, failed, errors },
      success: true
    };
  } catch (err: unknown) {
    const errorMessage = handleApiError(err, {
      defaultMessage: 'שגיאה בעדכון אירועי יומן',
      context: 'bulkUpdateCalendarEvents',
      additionalInfo: { trainerId, traineeId },
    });
    return { error: errorMessage };
  }
}
