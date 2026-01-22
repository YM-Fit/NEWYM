/**
 * Workout API layer
 */

import { supabase } from '../lib/supabase';
import type { ApiResponse, SaveWorkoutRequest, SaveWorkoutResponse } from './types';
import { API_CONFIG } from './config';
import { rateLimiter } from '../utils/rateLimiter';

/**
 * Save workout (create or update)
 */
export async function saveWorkout(
  workoutData: SaveWorkoutRequest,
  accessToken: string
): Promise<ApiResponse<SaveWorkoutResponse>> {
  // Rate limiting: 50 requests per minute per user
  const userId = workoutData.trainee_id || workoutData.trainer_id || 'anonymous';
  const rateLimitKey = `saveWorkout:${userId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 50, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    const response = await fetch(
      `${API_CONFIG.SUPABASE_URL}/functions/v1/save-workout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(workoutData),
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      return { error: result.error || 'שגיאה בשמירת האימון' };
    }

    return { data: result, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בשמירת האימון' };
  }
}

/**
 * Get workouts for a trainee
 */
export async function getTraineeWorkouts(
  traineeId: string
): Promise<ApiResponse<any[]>> {
  // Rate limiting: 100 requests per minute per trainee
  const rateLimitKey = `getTraineeWorkouts:${traineeId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 100, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    const { data, error } = await supabase
      .from('workout_trainees')
      .select(`
        workouts!inner (
          id,
          workout_date,
          is_completed,
          is_self_recorded,
          created_at,
          workout_exercises (
            id,
            exercises (
              name
            ),
            exercise_sets (
              id,
              weight,
              reps,
              superset_weight,
              superset_reps,
              dropset_weight,
              dropset_reps,
              superset_dropset_weight,
              superset_dropset_reps
            )
          )
        )
      `)
      .eq('trainee_id', traineeId)
      .eq('workouts.is_completed', true);

    if (error) {
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת האימונים' };
  }
}

/**
 * Get workout details with exercises and sets
 */
export async function getWorkoutDetails(
  workoutId: string
): Promise<ApiResponse<any>> {
  // Rate limiting: 100 requests per minute per workout
  const rateLimitKey = `getWorkoutDetails:${workoutId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 100, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    const { data, error } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        exercise_id,
        order_index,
        exercises (
          id,
          name,
          muscle_group_id
        ),
        exercise_sets (
          id,
          set_number,
          weight,
          reps,
          rpe,
          set_type,
          superset_exercise_id,
          superset_weight,
          superset_reps,
          dropset_weight,
          dropset_reps
        )
      `)
      .eq('workout_id', workoutId)
      .order('order_index', { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת פרטי האימון' };
  }
}

/**
 * Delete workout
 */
export async function deleteWorkout(
  workoutId: string
): Promise<ApiResponse> {
  // Rate limiting: 20 requests per minute per workout
  const rateLimitKey = `deleteWorkout:${workoutId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 20, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    // First, get workout info before deleting (for calendar sync)
    const { data: workoutInfo } = await supabase
      .from('workouts')
      .select('trainer_id, workout_trainees(trainee_id)')
      .eq('id', workoutId)
      .single();

    const trainerId = workoutInfo?.trainer_id;
    const traineeId = workoutInfo?.workout_trainees?.[0]?.trainee_id;

    // Check if there's a Google Calendar sync record
    const { data: syncRecord } = await supabase
      .from('google_calendar_sync')
      .select('google_event_id')
      .eq('workout_id', workoutId)
      .maybeSingle();

    // Delete the Google Calendar event if it exists
    if (syncRecord?.google_event_id && trainerId) {
      try {
        const { deleteGoogleCalendarEvent } = await import('./googleCalendarApi');
        await deleteGoogleCalendarEvent(trainerId, syncRecord.google_event_id);
      } catch (calendarErr) {
        console.error('Error deleting Google Calendar event:', calendarErr);
        // Continue with workout deletion even if calendar delete fails
      }
    }

    // Delete sync record
    if (syncRecord) {
      await supabase
        .from('google_calendar_sync')
        .delete()
        .eq('workout_id', workoutId);
    }

    // Delete the workout
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);

    if (error) {
      return { error: error.message };
    }

    // After deleting, sync remaining events for this trainee to update numbering
    if (traineeId && trainerId) {
      // Do this in the background (non-blocking)
      import('../services/traineeCalendarSyncService').then(({ syncTraineeEventsToCalendar }) => {
        syncTraineeEventsToCalendar(traineeId, trainerId, 'current_month')
          .then(result => {
            if (result.data && result.data.updated > 0) {
              console.log(`Calendar sync after delete: updated ${result.data.updated} events`);
            }
          })
          .catch(err => console.error('Calendar sync after delete failed:', err));
      }).catch(err => console.error('Failed to load calendar sync service:', err));
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה במחיקת האימון' };
  }
}

/**
 * Sync workout to Google Calendar
 */
export async function syncWorkoutToCalendar(
  workoutId: string,
  trainerId: string,
  accessToken: string
): Promise<ApiResponse<string>> {
  // Rate limiting: 20 sync requests per minute per trainer
  const rateLimitKey = `syncWorkoutToCalendar:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 20, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    // Get workout details
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_trainees!inner(
          trainee_id,
          trainees!inner(full_name, email)
        )
      `)
      .eq('id', workoutId)
      .eq('trainer_id', trainerId)
      .single();

    if (workoutError || !workout) {
      return { error: 'אימון לא נמצא' };
    }

    // Check if already synced
    const { data: existingSync } = await supabase
      .from('google_calendar_sync')
      .select('google_event_id')
      .eq('workout_id', workoutId)
      .maybeSingle();

    if (existingSync?.google_event_id) {
      // Already synced, return existing event ID
      return { data: existingSync.google_event_id, success: true };
    }

    // Import createGoogleCalendarEvent function
    const { createGoogleCalendarEvent } = await import('./googleCalendarApi');
    
    const trainee = workout.workout_trainees?.[0]?.trainees;
    const workoutDate = new Date(workout.workout_date);
    const endDate = new Date(workoutDate);
    endDate.setHours(workoutDate.getHours() + 1); // Default 1 hour workout

    // Generate event title with session info
    let eventSummary = `אימון - ${trainee?.full_name || 'מתאמן'}`;
    try {
      const { generateGoogleCalendarEventTitle } = await import('../utils/traineeSessionUtils');
      eventSummary = await generateGoogleCalendarEventTitle(
        workout.workout_trainees[0].trainee_id,
        trainerId,
        workoutDate
      );
    } catch (titleErr) {
      // Fallback to simple title if generation fails
      console.warn('Could not generate event title with session info:', titleErr);
    }

    const eventResult = await createGoogleCalendarEvent(
      trainerId,
      {
        summary: eventSummary,
        description: workout.notes || undefined,
        startTime: workoutDate,
        endTime: endDate,
        attendees: trainee?.email ? [trainee.email] : undefined,
      },
      accessToken
    );

    if (eventResult.error || !eventResult.data) {
      return { error: eventResult.error || 'שגיאה בסנכרון ל-Google Calendar' };
    }

    const googleEventId = eventResult.data;

    // Save sync record
    const { error: syncError } = await supabase
      .from('google_calendar_sync')
      .insert({
        trainer_id: trainerId,
        trainee_id: workout.workout_trainees[0].trainee_id,
        workout_id: workoutId,
        google_event_id: googleEventId,
        google_calendar_id: 'primary', // Will be updated by credentials lookup
        sync_status: 'synced',
        sync_direction: 'to_google',
        event_start_time: workoutDate.toISOString(),
        event_end_time: endDate.toISOString(),
        event_summary: eventSummary,
        event_description: workout.notes || null,
        last_synced_at: new Date().toISOString(),
      });

    if (syncError) {
      return { error: syncError.message };
    }

    // After successfully syncing this workout, update all other events for this trainee
    // to ensure session numbers are current
    try {
      const { syncTraineeEventsToCalendar } = await import('../services/traineeCalendarSyncService');
      
      // Sync current month events to update session numbers
      // Fire and forget - don't block the response
      syncTraineeEventsToCalendar(
        workout.workout_trainees[0].trainee_id,
        trainerId,
        'current_month'
      ).catch(err => {
        console.error('Error syncing trainee events after workout save:', err);
      });
    } catch (importErr) {
      // If service not available, continue without syncing
      console.warn('Could not import trainee calendar sync service:', importErr);
    }

    return { data: googleEventId, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בסנכרון ל-Google Calendar' };
  }
}

/**
 * Get workouts from Google Calendar
 */
export async function getWorkoutsFromCalendar(
  trainerId: string,
  dateRange: { start: Date; end: Date }
): Promise<ApiResponse<any[]>> {
  // Rate limiting: 60 requests per minute per trainer
  const rateLimitKey = `getWorkoutsFromCalendar:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 60, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    const { getGoogleCalendarEvents } = await import('./googleCalendarApi');
    
    const eventsResult = await getGoogleCalendarEvents(trainerId, dateRange);
    
    if (eventsResult.error || !eventsResult.data) {
      return { error: eventsResult.error || 'שגיאה בטעינת אירועים' };
    }

    // Map calendar events to workout format
    const workouts = eventsResult.data.map(event => ({
      id: event.id,
      workout_date: event.start.dateTime || event.start.date,
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.start,
      end: event.end,
    }));

    return { data: workouts, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת אימונים מה-Calendar' };
  }
}
