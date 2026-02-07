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
        pair_member,
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
          superset_rpe,
          superset_equipment_id,
          superset_dropset_weight,
          superset_dropset_reps,
          dropset_weight,
          dropset_reps,
          equipment_id,
          equipment:equipment_id (
            id,
            name,
            emoji
          ),
          superset_exercise:superset_exercise_id (
            id,
            name
          ),
          superset_equipment:superset_equipment_id (
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
      .single() as { data: { trainer_id: string; workout_trainees: { trainee_id: string }[] } | null };

    const trainerId = workoutInfo?.trainer_id;
    const traineeId = workoutInfo?.workout_trainees?.[0]?.trainee_id;

    // Check if there's a Google Calendar sync record
    const { data: syncRecord } = await supabase
      .from('google_calendar_sync')
      .select('google_event_id')
      .eq('workout_id', workoutId)
      .maybeSingle() as { data: { google_event_id: string } | null };

    // Delete the Google Calendar event if it exists
    // IMPORTANT: Delete from Google Calendar BEFORE deleting from database
    // to ensure consistency and prevent orphaned sync records
    if (syncRecord?.google_event_id && trainerId) {
      try {
        const { deleteGoogleCalendarEvent } = await import('./googleCalendarApi');
        const deleteResult = await deleteGoogleCalendarEvent(trainerId, syncRecord.google_event_id);
        
        if (deleteResult.error) {
          // Log error but continue - workout will still be deleted
          const { logger } = await import('../utils/logger');
          logger.warn('Failed to delete Google Calendar event during workout deletion', 
            { error: deleteResult.error, eventId: syncRecord.google_event_id, workoutId }, 
            'deleteWorkout');
        } else {
          // Small delay to ensure Google Calendar API has processed the deletion
          // This helps prevent race conditions
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (calendarErr) {
        const { logger } = await import('../utils/logger');
        logger.error('Error deleting Google Calendar event', calendarErr, 'deleteWorkout');
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
    interface WorkoutData {
      id: string;
      trainer_id: string;
      workout_date: string;
      notes: string | null;
      workout_trainees: { trainee_id: string; trainees: { full_name: string; email: string | null } }[];
    }
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
      .single() as { data: WorkoutData | null; error: { message: string } | null };

    if (workoutError || !workout) {
      return { error: 'אימון לא נמצא' };
    }

    // Check if already synced
    const { data: existingSync } = await supabase
      .from('google_calendar_sync')
      .select('google_event_id')
      .eq('workout_id', workoutId)
      .maybeSingle() as { data: { google_event_id: string } | null };

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
      }
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
      } as never);

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
    // Use event_start_time from google_calendar_sync for accurate filtering
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

    // CRITICAL FIX: Get ALL Google Calendar sync records FIRST to determine which workouts use event_start_time
    // Then get workouts and filter them based on sync status
    
    // Get ALL Google Calendar sync records for these trainees (not filtered by date yet)
    interface SyncRecord {
      workout_id: string | null;
      trainee_id: string;
      sync_direction: string;
      event_start_time: string | null;
      event_end_time: string | null;
      google_event_id: string;
      sync_status: string;
    }
    const { data: allGoogleSyncData, error: allGoogleSyncError } = await supabase
      .from('google_calendar_sync')
      .select(`
        workout_id,
        trainee_id,
        sync_direction,
        event_start_time,
        event_end_time,
        google_event_id,
        sync_status
      `)
      .eq('trainer_id', trainerId)
      .in('trainee_id', traineeIds)
      .eq('sync_status', 'synced') as { data: SyncRecord[] | null; error: { message: string } | null };

    // Build maps: which workouts are synced FROM Google and their event_start_time
    const workoutIdsFromGoogle = new Set<string>();
    const eventStartTimesByWorkoutId = new Map<string, string>();
    const syncRecordsByWorkoutId = new Map<string, SyncRecord>();

    if (!allGoogleSyncError && allGoogleSyncData) {
      allGoogleSyncData.forEach(sync => {
        if (sync.workout_id) {
          // Workouts synced FROM Google (either 'from_google' or 'bidirectional')
          if (sync.sync_direction === 'from_google' || sync.sync_direction === 'bidirectional') {
            workoutIdsFromGoogle.add(sync.workout_id);
            if (sync.event_start_time) {
              eventStartTimesByWorkoutId.set(sync.workout_id, sync.event_start_time);
            }
            syncRecordsByWorkoutId.set(sync.workout_id, sync);
          } else {
            // For 'to_google' only, still store the record but don't mark as from Google
            syncRecordsByWorkoutId.set(sync.workout_id, sync);
          }
        }
      });
    }

    // Get ALL workouts that might be in the date range (by workout_date)
    // We'll filter them later based on sync status
    interface WorkoutRecord {
      id: string;
      workout_date: string;
      workout_type: string | null;
      is_completed: boolean | null;
      notes: string | null;
      created_at: string;
      trainer_id: string;
    }
    const { data: workoutsDataAll, error: workoutsErrorAll } = await supabase
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
      .order('workout_date', { ascending: true }) as { data: WorkoutRecord[] | null; error: { message: string } | null };

    if (workoutsErrorAll) {
      console.warn('Error loading workouts:', workoutsErrorAll);
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    if (!workoutsDataAll || workoutsDataAll.length === 0) {
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    // Filter workouts based on sync status:
    // - If synced FROM Google: use event_start_time (must be in date range)
    // - If NOT synced FROM Google: use workout_date (must be in date range)
    const uniqueWorkoutsData = workoutsDataAll.filter(workout => {
      const isFromGoogle = workoutIdsFromGoogle.has(workout.id);
      
      if (isFromGoogle) {
        // For workouts synced FROM Google, check event_start_time
        const eventStartTime = eventStartTimesByWorkoutId.get(workout.id);
        if (!eventStartTime) {
          return false; // No event_start_time means invalid sync record
        }
        
        const eventDate = new Date(eventStartTime);
        // Check if event_start_time is in today or tomorrow range
        return eventDate >= today && eventDate < dayAfterTomorrow;
      } else {
        // For workouts NOT synced FROM Google, check workout_date
        const workoutDate = new Date(workout.workout_date);
        return workoutDate >= today && workoutDate < dayAfterTomorrow;
      }
    });

    if (uniqueWorkoutsData.length === 0) {
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    const workoutIds = uniqueWorkoutsData.map(w => w.id);

    // Get workout_trainees for these workouts, filtered by our trainee IDs
    interface WorkoutTraineeRecord {
      trainee_id: string;
      workout_id: string;
    }
    const { data: workoutTraineesData, error: wtError } = await supabase
      .from('workout_trainees')
      .select('trainee_id, workout_id')
      .in('workout_id', workoutIds)
      .in('trainee_id', traineeIds) as { data: WorkoutTraineeRecord[] | null; error: { message: string } | null };

    if (wtError) {
      console.warn('Error loading workout_trainees:', wtError);
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
      console.warn('Error loading trainees:', traineesError);
      return { data: { today: [], tomorrow: [] }, success: true };
    }

    // Use the sync records we already fetched (allGoogleSyncData)
    // Build maps from sync data for quick lookup
    const googleSyncEventTimes = new Map<string, string>(); // Map workout_id -> event_start_time
    const googleEventIds = new Map<string, string>(); // Map workout_id -> google_event_id
    const googleSyncedWorkoutIds = new Set<string>(); // Set of workout IDs synced from Google
    const syncByWorkoutId = new Map<string, {
      workout_id: string | null;
      trainee_id: string | null;
      sync_direction: string;
      event_start_time: string;
      event_end_time: string | null;
      google_event_id: string;
      sync_status: string;
    }>(); // Map workout_id -> sync record

    // Populate maps from allGoogleSyncData (already fetched above)
    if (!allGoogleSyncError && allGoogleSyncData) {
      allGoogleSyncData.forEach(sync => {
        if (sync.workout_id) {
          syncByWorkoutId.set(sync.workout_id, sync);
          
          if (sync.sync_direction === 'from_google' || sync.sync_direction === 'bidirectional') {
            googleSyncedWorkoutIds.add(sync.workout_id);
            if (sync.event_start_time) {
              googleSyncEventTimes.set(sync.workout_id, sync.event_start_time);
            }
          }
          
          if (sync.google_event_id) {
            googleEventIds.set(sync.workout_id, sync.google_event_id);
          }
        }
      });
    }

    // Create maps for quick lookup
    const traineesMap = new Map((traineesData || []).map(t => [t.id, t]));
    const workoutsMap = new Map(uniqueWorkoutsData.map(w => [w.id, w]));

    // Create a map of completed workouts by trainee and date (YYYY-MM-DD)
    // Format: "traineeId:YYYY-MM-DD" -> true
    const completedWorkoutsByTraineeAndDate = new Map<string, boolean>();
    // Filter uniqueWorkoutsData to get only completed workouts
    const completedWorkoutsData = uniqueWorkoutsData.filter(w => w.is_completed);
    if (completedWorkoutsData && completedWorkoutsData.length > 0) {
      const completedWorkoutIds = completedWorkoutsData.map(w => w.id);
      const { data: completedWorkoutTrainees } = await supabase
        .from('workout_trainees')
        .select('trainee_id, workout_id')
        .in('workout_id', completedWorkoutIds)
        .in('trainee_id', traineeIds) as { data: WorkoutTraineeRecord[] | null };

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
    // CRITICAL: Filter out workouts synced FROM Google that are not in the date range
    const allWorkouts = workoutTraineesData
      .map(wt => {
        const workout = workoutsMap.get(wt.workout_id);
        const trainee = traineesMap.get(wt.trainee_id);
        
        if (!workout || !trainee) return null;

        const syncRecord = syncByWorkoutId.get(wt.workout_id);
        const isFromGoogle = googleSyncedWorkoutIds.has(wt.workout_id);
        
        // CRITICAL: For workouts synced FROM Google, use event_start_time
        // For other workouts (manual or synced TO Google), use workout_date
        let actualWorkoutDate: Date;
        let eventStartTime: string | undefined;
        
        if (isFromGoogle) {
          // For workouts synced FROM Google, we MUST use event_start_time
          // If there's no event_start_time, this is an error - skip it
          if (!syncRecord?.event_start_time) {
            console.warn(`Workout ${wt.workout_id} is marked as from Google but has no event_start_time`);
            return null;
          }
          
          // Use event_start_time from Google Calendar for accurate time
          eventStartTime = syncRecord.event_start_time;
          actualWorkoutDate = new Date(eventStartTime);
          
          // CRITICAL: If workout is synced FROM Google but event_start_time is not in date range, exclude it
          // (This handles cases where workout_date is in range but event was moved to different day)
          const eventDate = actualWorkoutDate;
          const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
          const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const tomorrowDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
          
          // If event_start_time is not today or tomorrow, exclude this workout
          if (eventDateStr !== todayDateStr && eventDateStr !== tomorrowDateStr) {
            return null;
          }
        } else {
          // Use workout_date for manually created workouts or workouts synced TO Google
          // workout_date is already filtered by date range in the query above
          // BUT: if there's a sync record with event_start_time, check if it's in range
          // (This handles cases where workout was synced TO Google but then changed in Google Calendar)
          if (syncRecord?.event_start_time) {
            const syncEventDate = new Date(syncRecord.event_start_time);
            const syncEventDateStr = `${syncEventDate.getFullYear()}-${String(syncEventDate.getMonth() + 1).padStart(2, '0')}-${String(syncEventDate.getDate()).padStart(2, '0')}`;
            const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const tomorrowDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
            
            // If sync_direction is 'bidirectional' and event_start_time is not in range, exclude it
            if (syncRecord.sync_direction === 'bidirectional' && syncEventDateStr !== todayDateStr && syncEventDateStr !== tomorrowDateStr) {
              return null;
            }
          }
          
          actualWorkoutDate = new Date(workout.workout_date);
          eventStartTime = undefined;
        }
        
        // Check if there's a completed workout for this trainee on the same date
        const dateKey = `${actualWorkoutDate.getFullYear()}-${String(actualWorkoutDate.getMonth() + 1).padStart(2, '0')}-${String(actualWorkoutDate.getDate()).padStart(2, '0')}`;
        const hasCompletedWorkout = completedWorkoutsByTraineeAndDate.get(`${trainee.id}:${dateKey}`) || false;

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
            eventStartTime: eventStartTime, // Use event_start_time if synced FROM Google, otherwise undefined
            googleEventId: isFromGoogle && googleEventIds.has(workout.id)
              ? googleEventIds.get(workout.id)!
              : undefined // Store google_event_id for deletion
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
        // CRITICAL: For workouts synced FROM Google, use eventStartTime (which is event_start_time)
        // For other workouts, use workoutDate (which is workout_date)
        // Compare dates by converting to date strings (YYYY-MM-DD) to avoid timezone issues
        const itemDate = new Date(item.workoutDate);
        const itemDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
        const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const isToday = itemDateStr === todayDateStr;
        return isToday;
      })
      .map(item => {
        // Use eventStartTime from sync record (always available for Google Calendar workouts)
        const workoutDate = new Date(item.workout.eventStartTime || item.workout.workout_date);
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
        // Compare dates by converting to date strings (YYYY-MM-DD) to avoid timezone issues
        // workoutDate is a Date object, so we need to compare the date part only
        const itemDate = new Date(item.workoutDate);
        const itemDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
        const tomorrowDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        return itemDateStr === tomorrowDateStr;
      })
      .map(item => {
        // Use eventStartTime from sync record (always available for Google Calendar workouts)
        const workoutDate = new Date(item.workout.eventStartTime || item.workout.workout_date);
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
