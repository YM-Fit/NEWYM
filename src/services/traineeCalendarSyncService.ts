/**
 * Trainee Calendar Sync Service
 * Handles synchronization of trainee information to Google Calendar events
 */

import { supabase } from '../lib/supabase';
import { bulkUpdateCalendarEvents } from '../api/googleCalendarApi';
import { 
  getTraineeSessionInfo, 
  formatTraineeNameWithSession,
  generateGoogleCalendarEventTitle,
  sessionInfoCache
} from '../utils/traineeSessionUtils';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

export type SyncScope = 'current_month' | 'current_month_and_future' | 'all';

export interface SyncResult {
  updated: number;
  failed: number;
  errors: string[];
  traineeName: string;
}

/**
 * Sync trainee events to Google Calendar
 * Updates event titles with current trainee name and session numbers
 */
export async function syncTraineeEventsToCalendar(
  traineeId: string,
  trainerId: string,
  scope: SyncScope = 'current_month_and_future'
): Promise<ApiResponse<SyncResult>> {
  try {
    // Get trainee info
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .select('full_name, id')
      .eq('id', traineeId)
      .eq('trainer_id', trainerId)
      .single();

    if (traineeError || !trainee) {
      return { error: 'מתאמן לא נמצא' };
    }

    // Check if trainer has Google Calendar connected
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('id')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    if (credError || !credentials) {
      return { error: 'Google Calendar לא מחובר' };
    }

    // Determine date range based on scope
    const dateRange = calculateDateRange(scope);

    // Get session info for the trainee
    const sessionInfo = await getTraineeSessionInfo(traineeId, trainerId);
    
    // Cache it for future use
    if (sessionInfo) {
      sessionInfoCache.set(traineeId, sessionInfo);
    }

    // Get all events for this trainee in the date range
    let query = supabase
      .from('google_calendar_sync')
      .select('id, google_event_id, event_start_time, workout_id')
      .eq('trainer_id', trainerId)
      .eq('trainee_id', traineeId)
      .eq('sync_status', 'synced');

    if (dateRange) {
      query = query
        .gte('event_start_time', dateRange.start.toISOString())
        .lte('event_start_time', dateRange.end.toISOString());
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      return { error: eventsError.message };
    }

    if (!events || events.length === 0) {
      return {
        data: {
          updated: 0,
          failed: 0,
          errors: [],
          traineeName: trainee.full_name
        },
        success: true
      };
    }

    // Update each event with the new title
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Group events by month for efficient session number calculation
    const eventsByMonth = new Map<string, typeof events>();
    
    for (const event of events) {
      const eventDate = new Date(event.event_start_time);
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      
      const monthEvents = eventsByMonth.get(monthKey) || [];
      monthEvents.push(event);
      eventsByMonth.set(monthKey, monthEvents);
    }

    // Update events month by month
    for (const [monthKey, monthEvents] of eventsByMonth) {
      for (const event of monthEvents) {
        try {
          const eventDate = new Date(event.event_start_time);
          
          // Generate the new event title with session number
          const newTitle = await generateGoogleCalendarEventTitle(
            traineeId,
            trainerId,
            eventDate
          );

          // Update the event via bulk update (single event)
          const updateResult = await bulkUpdateCalendarEvents(
            traineeId,
            trainerId,
            {
              summary: newTitle,
              dateRange: {
                start: eventDate,
                end: new Date(eventDate.getTime() + 1000) // 1 second range
              }
            }
          );

          if (updateResult.error) {
            failed++;
            errors.push(`Event ${event.google_event_id}: ${updateResult.error}`);
          } else if (updateResult.data) {
            updated += updateResult.data.updated;
            failed += updateResult.data.failed;
            errors.push(...updateResult.data.errors);
          }

          // Small delay between updates
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (err) {
          failed++;
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Event ${event.google_event_id}: ${errorMsg}`);
          logger.error('Error updating event in sync', err, 'syncTraineeEventsToCalendar');
        }
      }
    }

    return {
      data: {
        updated,
        failed,
        errors,
        traineeName: trainee.full_name
      },
      success: true
    };
  } catch (err) {
    logger.error('Error in syncTraineeEventsToCalendar', err, 'syncTraineeEventsToCalendar');
    return {
      error: err instanceof Error ? err.message : 'שגיאה בסנכרון אירועי יומן'
    };
  }
}

/**
 * Calculate date range based on sync scope
 */
function calculateDateRange(scope: SyncScope): { start: Date; end: Date } | null {
  const now = new Date();
  
  switch (scope) {
    case 'current_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start: startOfMonth, end: endOfMonth };
    }
    
    case 'current_month_and_future': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // Set end date to 2 years in the future (reasonable limit)
      const futureDate = new Date(now.getFullYear() + 2, 11, 31, 23, 59, 59);
      return { start: startOfMonth, end: futureDate };
    }
    
    case 'all':
      // No date range filter
      return null;
    
    default:
      return null;
  }
}

/**
 * Sync multiple trainees at once (batch operation)
 */
export async function syncMultipleTraineesToCalendar(
  traineeIds: string[],
  trainerId: string,
  scope: SyncScope = 'current_month_and_future'
): Promise<ApiResponse<{ results: SyncResult[]; totalUpdated: number; totalFailed: number }>> {
  try {
    const results: SyncResult[] = [];
    let totalUpdated = 0;
    let totalFailed = 0;

    for (const traineeId of traineeIds) {
      const result = await syncTraineeEventsToCalendar(traineeId, trainerId, scope);
      
      if (result.data) {
        results.push(result.data);
        totalUpdated += result.data.updated;
        totalFailed += result.data.failed;
      } else if (result.error) {
        results.push({
          updated: 0,
          failed: 1,
          errors: [result.error],
          traineeName: traineeId
        });
        totalFailed++;
      }

      // Delay between trainees to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      data: {
        results,
        totalUpdated,
        totalFailed
      },
      success: true
    };
  } catch (err) {
    logger.error('Error in syncMultipleTraineesToCalendar', err, 'syncMultipleTraineesToCalendar');
    return {
      error: err instanceof Error ? err.message : 'שגיאה בסנכרון מתאמנים'
    };
  }
}
