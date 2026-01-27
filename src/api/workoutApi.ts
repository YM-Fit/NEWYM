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
          failure,
          superset_exercise_id,
          superset_weight,
          superset_reps,
          dropset_weight,
          dropset_reps,
          equipment_id,
          equipment:equipment_id (
            id,
            name,
            emoji
          )
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
 * Get scheduled workouts for today and tomorrow
 * Includes workouts from both local database and Google Calendar sync
 */
export async function getScheduledWorkoutsForTodayAndTomorrow(
  trainerId: string,
  traineeIds: string[]
): Promise<ApiResponse<{
  today: Array<{
    trainee: any;
    workout: any;
    isFromGoogle?: boolean;
  }>;
  tomorrow: Array<{
    trainee: any;
    workout: any;
    isFromGoogle?: boolean;
  }>;
}>> {
  // Rate limiting: 30 requests per minute per trainer
  const rateLimitKey = `getScheduledWorkoutsForTodayAndTomorrow:${trainerId}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 30, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי בקשות. נסה שוב מאוחר יותר.' };
  }

  try {
    if (!traineeIds || traineeIds.length === 0) {
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    if (!trainerId) {
      return { error: 'מזהה מאמן לא תקין' };
    }

    // Calculate date ranges for today and tomorrow
    // workout_date is a TIMESTAMPTZ field, so we need to use ISO timestamps
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Use ISO timestamps for TIMESTAMPTZ field comparison
    const todayStr = today.toISOString();
    const tomorrowStr = tomorrow.toISOString();
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString();

    // Get workouts from workouts table - both SCHEDULED and COMPLETED workouts
    // This ensures scheduled workouts remain visible even after they're completed
    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select(`
        id,
        workout_date,
        workout_type,
        is_completed,
        notes,
        created_at,
        trainer_id
      `)
      .eq('trainer_id', trainerId)
      // Show both scheduled (is_completed=false) and completed (is_completed=true) workouts
      .gte('workout_date', todayStr)
      .lt('workout_date', dayAfterTomorrowStr)
      .order('workout_date', { ascending: true });

    if (workoutsError) {
      // Log error but return empty result instead of failing completely
      console.warn('Error loading workouts for scheduled view:', workoutsError);
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    if (!workoutsData || workoutsData.length === 0) {
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    const workoutIds = workoutsData.map(w => w.id);

    if (workoutIds.length === 0) {
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    // Get workout_trainees for these workouts, filtered by our trainee IDs
    const { data: workoutTraineesData, error: wtError } = await supabase
      .from('workout_trainees')
      .select('trainee_id, workout_id')
      .in('workout_id', workoutIds)
      .in('trainee_id', traineeIds);

    if (wtError) {
      // Log error but return empty result instead of failing completely
      console.warn('Error loading workout_trainees for scheduled view:', wtError);
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    if (!workoutTraineesData || workoutTraineesData.length === 0) {
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    // Get unique trainee IDs from the results
    const traineeIdsInWorkouts = [...new Set(workoutTraineesData.map(wt => wt.trainee_id))];

    // Fetch trainee details
    if (traineeIdsInWorkouts.length === 0) {
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    const { data: traineesData, error: traineesError } = await supabase
      .from('trainees')
      .select('id, full_name, gender, phone, email, is_pair, pair_name_1, pair_name_2')
      .in('id', traineeIdsInWorkouts);

    if (traineesError) {
      // Log error but return empty result instead of failing completely
      console.warn('Error loading trainees for scheduled view:', traineesError);
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    // Check which workouts are synced from Google Calendar and get their event_start_time
    // Only query if we have workout IDs
    let googleSyncedWorkoutIds = new Set<string>();
    const googleSyncEventTimes = new Map<string, string>(); // Map workout_id -> event_start_time
    if (workoutIds.length > 0) {
      const { data: googleSyncData, error: googleSyncError } = await supabase
        .from('google_calendar_sync')
        .select('workout_id, sync_direction, event_start_time')
        .in('workout_id', workoutIds)
        .eq('sync_status', 'synced');

      // If there's an error (e.g., RLS policy issue), just continue without Google sync info
      // This is not critical - the workouts will still show, just without the Google indicator
      if (!googleSyncError && googleSyncData) {
        googleSyncData
          .filter(sync => sync.workout_id && (sync.sync_direction === 'from_google' || sync.sync_direction === 'bidirectional'))
          .forEach(sync => {
            googleSyncedWorkoutIds.add(sync.workout_id!);
            // Store event_start_time for accurate time display
            if (sync.event_start_time) {
              googleSyncEventTimes.set(sync.workout_id!, sync.event_start_time);
            }
          });
      }
    }

    // Create maps for quick lookup
    const traineesMap = new Map((traineesData || []).map(t => [t.id, t]));
    const workoutsMap = new Map(workoutsData.map(w => [w.id, w]));

    // Create a map of completed workouts by trainee and date (YYYY-MM-DD)
    // Format: "traineeId:YYYY-MM-DD" -> true
    const completedWorkoutsByTraineeAndDate = new Map<string, boolean>();
    if (completedWorkoutsData && completedWorkoutsData.length > 0) {
      const completedWorkoutIds = completedWorkoutsData.map(w => w.id);
      const { data: completedWorkoutTrainees } = await supabase
        .from('workout_trainees')
        .select('trainee_id, workout_id')
        .in('workout_id', completedWorkoutIds)
        .in('trainee_id', traineeIds);

      if (completedWorkoutTrainees) {
        completedWorkoutTrainees.forEach(wt => {
          const workout = completedWorkoutsData.find(w => w.id === wt.workout_id);
          if (workout) {
            const workoutDate = new Date(workout.workout_date);
            const dateKey = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth() + 1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
            completedWorkoutsByTraineeAndDate.set(`${wt.trainee_id}:${dateKey}`, true);
          }
        });
      }
    }

    // Build the data structure - combine workout_trainees with workouts and trainees
    const allWorkouts = workoutTraineesData
      .map(wt => {
        const workout = workoutsMap.get(wt.workout_id);
        const trainee = traineesMap.get(wt.trainee_id);
        
        if (!workout || !trainee) return null;

        const workoutDate = new Date(workout.workout_date);
        const isFromGoogle = googleSyncedWorkoutIds.has(workout.id);
        
        // Check if there's a completed workout for this trainee on the same date
        const dateKey = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth() + 1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
        const hasCompletedWorkout = completedWorkoutsByTraineeAndDate.get(`${trainee.id}:${dateKey}`) || false;

        // For Google Calendar workouts, use event_start_time if available for accurate time
        let actualWorkoutDate = workoutDate;
        if (isFromGoogle && googleSyncEventTimes.has(workout.id)) {
          const eventStartTime = googleSyncEventTimes.get(workout.id)!;
          actualWorkoutDate = new Date(eventStartTime);
        }

        return {
          trainee,
          workout: {
            id: workout.id,
            workout_date: workout.workout_date,
            workout_type: workout.workout_type,
            is_completed: workout.is_completed,
            notes: workout.notes,
            isFromGoogle,
            hasCompletedWorkout, // Flag to indicate if there's a completed workout for this date
            eventStartTime: isFromGoogle && googleSyncEventTimes.has(workout.id) 
              ? googleSyncEventTimes.get(workout.id)! 
              : undefined // Store event_start_time for accurate time display
          },
          workoutDate: actualWorkoutDate // Use actual date/time for sorting and display
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Separate into today and tomorrow, and sort by time
    // Use the 'now' variable that was already declared at the beginning of the function
    // Group by trainee to handle multiple workouts per trainee per day
    const workoutsByTrainee = new Map<string, typeof allWorkouts>();
    allWorkouts.forEach(item => {
      const key = item.trainee.id;
      if (!workoutsByTrainee.has(key)) {
        workoutsByTrainee.set(key, []);
      }
      workoutsByTrainee.get(key)!.push(item);
    });
    
    const todayWorkouts = allWorkouts
      .filter(item => {
        const itemDate = new Date(item.workoutDate);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === today.getTime();
      })
      .map(item => {
        // For Google Calendar workouts, use eventStartTime if available for accurate time comparison
        const timeSource = item.workout.eventStartTime || item.workout.workout_date;
        const workoutDate = new Date(timeSource);
        const isTimePassed = workoutDate < now; // Check if the scheduled time has passed
        
        return {
          trainee: item.trainee,
          workout: {
            ...item.workout,
            isTimePassed // Flag to indicate if the scheduled time has passed
          },
          isFromGoogle: item.workout.isFromGoogle,
          workoutDate: item.workoutDate // Keep for sorting
        };
      })
      .sort((a, b) => {
        // Sort by workout time (ascending)
        return a.workoutDate.getTime() - b.workoutDate.getTime();
      })
      // If there are multiple workouts for the same trainee on the same day,
      // prefer the scheduled one (is_completed=false) over completed ones
      .filter((item, index, arr) => {
        // Check if there are multiple workouts for this trainee
        const sameTraineeWorkouts = arr.filter(w => w.trainee.id === item.trainee.id);
        if (sameTraineeWorkouts.length > 1) {
          // If this is a completed workout and there's a scheduled one, filter it out
          if (item.workout.is_completed) {
            const hasScheduled = sameTraineeWorkouts.some(w => !w.workout.is_completed);
            return !hasScheduled; // Keep only if there's no scheduled workout
          }
        }
        return true; // Keep all other workouts
      })
      .map(item => ({
        trainee: item.trainee,
        workout: item.workout,
        isFromGoogle: item.isFromGoogle
      }));

    const tomorrowWorkouts = allWorkouts
      .filter(item => {
        const itemDate = new Date(item.workoutDate);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === tomorrow.getTime();
      })
      .map(item => {
        // For Google Calendar workouts, use eventStartTime if available for accurate time comparison
        const timeSource = item.workout.eventStartTime || item.workout.workout_date;
        const workoutDate = new Date(timeSource);
        const isTimePassed = workoutDate < now; // Check if the scheduled time has passed
        
        return {
          trainee: item.trainee,
          workout: {
            ...item.workout,
            isTimePassed // Flag to indicate if the scheduled time has passed
          },
          isFromGoogle: item.workout.isFromGoogle,
          workoutDate: item.workoutDate // Keep for sorting
        };
      })
      .sort((a, b) => {
        // Sort by workout time (ascending)
        return a.workoutDate.getTime() - b.workoutDate.getTime();
      })
      .map(item => ({
        trainee: item.trainee,
        workout: item.workout,
        isFromGoogle: item.isFromGoogle
      }));

    return {
      data: {
        today: todayWorkouts,
        tomorrow: tomorrowWorkouts
      },
      success: true
    };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת אימונים מתוזמנים' };
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
