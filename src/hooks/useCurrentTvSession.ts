import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getWorkoutDetails } from '../api/workoutApi';
import { logger } from '../utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TvTrainee {
  id: string;
  full_name: string;
  isPair?: boolean;
  pairName1?: string | null;
  pairName2?: string | null;
}

interface TvWorkoutExerciseSet {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  set_type: string | null;
  failure: boolean | null;
  superset_exercise_id?: string | null;
  superset_weight?: number | null;
  superset_reps?: number | null;
  superset_exercise?: {
    id: string;
    name: string;
  } | null;
  dropset_weight?: number | null;
  dropset_reps?: number | null;
  equipment_id?: string | null;
  equipment?: {
    id: string;
    name: string;
    emoji: string | null;
  } | null;
}

interface TvWorkoutExercise {
  id: string;
  name: string;
  muscle_group_id: string | null;
  sets: TvWorkoutExerciseSet[];
  pair_member?: 'member_1' | 'member_2' | null;
}

export interface TvWorkout {
  id: string;
  workout_date: string;
  is_completed: boolean;
  workout_type?: 'personal' | 'pair' | null;
  is_prepared?: boolean;
  exercises: TvWorkoutExercise[];
}

export interface TvCalendarEvent {
  id: string;
  summary: string | null;
  event_start_time: string;
  event_end_time: string | null;
}

export interface TvSessionState {
  trainee: TvTrainee | null;
  workout: TvWorkout | null;
  calendarEvent: TvCalendarEvent | null;
}

export interface TvStatusLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

interface UseCurrentTvSessionOptions {
  pollIntervalMs?: number;
}

interface UseCurrentTvSessionResult {
  loading: boolean;
  error: string | null;
  session: TvSessionState | null;
  logs: TvStatusLog[];
  lastUpdated: string | null;
}

/**
 * Hook that finds the current trainee/workout based on Google Calendar sync
 * and keeps it updated for the Studio TV mode.
 *
 * Implementation notes:
 * - Uses the google_calendar_sync table as a fast cache of events
 * - Selects the latest event where event_start_time <= now
 * - Filters client-side by event_end_time (if available)
 * - Loads workout details via existing workoutApi.getWorkoutDetails
 */
export function useCurrentTvSession(
  options: UseCurrentTvSessionOptions = {}
): UseCurrentTvSessionResult {
  const { user, userType } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<TvSessionState | null>(null);
  const [logs, setLogs] = useState<TvStatusLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const pollIntervalMs = options.pollIntervalMs ?? 3000; // 3 seconds for better performance (reduced from 1.5s)

  const workoutChannelRef = useRef<RealtimeChannel | null>(null);
  const sessionRef = useRef<TvSessionState | null>(null);

  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const pushLog = (entry: Omit<TvStatusLog, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString();
    const id = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

    setLogs(prev => {
      const next = [
        {
          id,
          timestamp,
          ...entry,
        },
        ...prev,
      ];

      // Keep only the last 20 log entries
      return next.slice(0, 20);
    });
  };

  useEffect(() => {
    if (!user || userType !== 'trainer') {
      setLoading(false);
      setError('מצב טלוויזיה זמין רק למאמנים מחוברים');
      return;
    }

    let isMounted = true;
    let intervalId: number | null = null;

    const fetchCurrentSession = async () => {
      if (!isMounted) return;

      const now = new Date();
      const nowIso = now.toISOString();

      try {
        // Use ref to get current session value without causing re-renders
        const currentSession = sessionRef.current;
        
        // Don't set loading to true if we already have a session - prevents flickering
        if (!currentSession) {
          setLoading(true);
        }
        // Don't clear error if we have a session - keep existing state
        if (!currentSession) {
          setError(null);
        }

        // 1. Find candidate calendar events for this trainer
        const { data: syncRecords, error: syncError } = await supabase
          .from('google_calendar_sync')
          .select(
            `
              id,
              trainee_id,
              workout_id,
              event_start_time,
              event_end_time,
              event_summary,
              sync_status,
              trainees!inner(id, full_name, is_pair, pair_name_1, pair_name_2)
            `
          )
          .eq('trainer_id', user.id)
          .eq('sync_status', 'synced')
          .lte('event_start_time', nowIso)
          .order('event_start_time', { ascending: false })
          .limit(10);

        if (syncError) {
          logger.error('Error loading google_calendar_sync for TV mode', syncError, 'useCurrentTvSession');
          pushLog({
            level: 'error',
            message: 'שגיאה בטעינת אירועי היומן מהשרת',
            details: { code: syncError.code, message: syncError.message },
          });
          if (!session) {
            setError('שגיאה בטעינת אירועי היומן');
          }
          return;
        }

        // If no calendar events, try to find active workout for any trainee of this trainer
        if (!syncRecords || syncRecords.length === 0) {
          // Try to find the most recent active workout for any trainee
          // Include prepared workouts even if completed (they should still show on TV)
          const { data: recentWorkouts, error: recentError } = await supabase
            .from('workouts')
            .select(`
              id,
              workout_date,
              is_prepared,
              workout_trainees!inner(
                trainee_id,
                trainees!inner(id, full_name, is_pair, pair_name_1, pair_name_2)
              )
            `)
            .eq('trainer_id', user.id)
            .or('is_completed.eq.false,is_prepared.eq.true') // Include incomplete workouts OR prepared workouts
            .order('workout_date', { ascending: false })
            .limit(1);

          if (!recentError && recentWorkouts && recentWorkouts.length > 0) {
            const workout = recentWorkouts[0];
            const traineeLink = (workout.workout_trainees as any[])[0];
            const traineeData = traineeLink?.trainees;
            
            if (traineeData) {
              // Get workout metadata (including is_prepared)
              const { data: workoutMeta } = await supabase
                .from('workouts')
                .select('id, workout_date, is_completed, is_prepared, workout_type')
                .eq('id', workout.id)
                .single();

              const workoutDetails = await getWorkoutDetails(workout.id);
              
              if ('data' in workoutDetails && workoutDetails.data) {
                const exercises: TvWorkoutExercise[] = (workoutDetails.data as any[]).map(ex => ({
                  id: ex.id,
                  name: ex.exercises?.name ?? 'תרגיל',
                  muscle_group_id: ex.exercises?.muscle_group_id ?? null,
                  pair_member: ex.pair_member || null,
                  sets: (ex.exercise_sets ?? []).map((set: any) => ({
                    id: set.id,
                    set_number: set.set_number,
                    weight: set.weight,
                    reps: set.reps,
                    rpe: set.rpe,
                    set_type: set.set_type,
                    failure: set.failure || false,
                    superset_exercise_id: set.superset_exercise_id || null,
                    superset_weight: set.superset_weight || null,
                    superset_reps: set.superset_reps || null,
                    superset_exercise: set.superset_exercise || null,
                    dropset_weight: set.dropset_weight || null,
                    dropset_reps: set.dropset_reps || null,
                    equipment_id: set.equipment_id || null,
                    equipment: set.equipment || null,
                  })),
                }));

                const nextSession: TvSessionState = {
                  trainee: {
                    id: traineeData.id,
                    full_name: traineeData.full_name,
                    isPair: traineeData.is_pair || false,
                    pairName1: traineeData.pair_name_1 || null,
                    pairName2: traineeData.pair_name_2 || null,
                  },
                  workout: {
                    id: workout.id,
                    workout_date: workoutMeta?.workout_date || workout.workout_date,
                    is_completed: workoutMeta?.is_completed ?? false,
                    is_prepared: workoutMeta?.is_prepared ?? false, // Use ?? instead of || to handle false values correctly
                    workout_type: workoutMeta?.workout_type || null,
                    exercises,
                  },
                  calendarEvent: null,
                };

                setSession(nextSession);
                setLastUpdated(nowIso);
                pushLog({
                  level: 'info',
                  message: `נמצא אימון פעיל עבור ${traineeData.full_name} (ללא אירוע יומן)`,
                  details: { workoutId: workout.id },
                });
                return;
              }
            }
          }
          
          // Never clear session if we have one - keep existing session
          // This prevents clearing the screen when polling finds no new calendar events
          // but there's already an active workout session
          const currentSession = sessionRef.current;
          if (!currentSession) {
            pushLog({
              level: 'info',
              message: 'לא נמצאו אירועי יומן מסונכרנים פעילים כרגע',
            });
            setSession(null);
            setLastUpdated(nowIso);
            setLoading(false);
          } else {
            // Keep existing session - don't clear it just because no calendar events found
            // The session might be from a direct workout lookup
            pushLog({
              level: 'info',
              message: 'לא נמצאו אירועי יומן חדשים, שומרים על האימון הפעיל',
            });
            // Update lastUpdated but keep session
            setLastUpdated(nowIso);
            setLoading(false);
          }
          return;
        }

        // 2. Choose the first record whose end time is in the future (or null)
        const activeRecord =
          syncRecords.find(record => {
            if (!record.event_end_time) {
              // No explicit end - assume 1 hour duration
              const start = new Date(record.event_start_time);
              const assumedEnd = new Date(start.getTime() + 60 * 60 * 1000);
              return assumedEnd >= now;
            }
            return new Date(record.event_end_time) >= now;
          }) ?? syncRecords[0];

        if (!activeRecord) {
          // Only clear session if we don't have one - keep existing session
          const currentSession = sessionRef.current;
          if (!currentSession) {
            setSession(null);
            setLastUpdated(nowIso);
            setLoading(false);
          } else {
            // Keep existing session - don't clear it
            pushLog({
              level: 'info',
              message: 'לא נמצא אירוע פעיל חדש, שומרים על האימון הפעיל',
            });
            setLastUpdated(nowIso);
          }
          return;
        }

        const trainee = activeRecord.trainees as { id: string; full_name: string; is_pair?: boolean; pair_name_1?: string | null; pair_name_2?: string | null } | null;

        // 3. Load workout details - try linked workout first, then find active workout for trainee
        // BUT: If there's a prepared workout for this trainee, prioritize it over calendar events
        let workout: TvWorkout | null = null;
        let workoutId: string | null = activeRecord.workout_id as string | null;
        
        // Check if there's a prepared workout for this trainee (prioritize over calendar events)
        if (trainee) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
          
          const { data: preparedWorkouts } = await supabase
            .from('workouts')
            .select(`
              id,
              is_prepared,
              workout_trainees!inner(trainee_id)
            `)
            .eq('trainer_id', user.id)
            .eq('is_prepared', true)
            .eq('workout_trainees.trainee_id', trainee.id)
            .gte('workout_date', todayStart)
            .lte('workout_date', todayEnd)
            .order('workout_date', { ascending: false })
            .limit(1);
          
          if (preparedWorkouts && preparedWorkouts.length > 0) {
            workoutId = preparedWorkouts[0].id;
            pushLog({
              level: 'info',
              message: `נמצא אימון שהוכן מראש עבור ${trainee.full_name} - מעדיף על פני אירוע יומן`,
              details: { workoutId: preparedWorkouts[0].id },
            });
          }
        }

        // If no workout_id in calendar sync, try to find active workout for this trainee
        // Also check for completed workouts from today (in case workout was just saved)
        if (!workoutId && trainee) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
          
          // First try to find active (incomplete) workout OR prepared workout
          // Prepared workouts should show on TV even if completed
          const { data: activeWorkouts, error: workoutSearchError } = await supabase
            .from('workouts')
            .select(`
              id,
              workout_date,
              is_prepared,
              workout_trainees!inner(trainee_id)
            `)
            .eq('trainer_id', user.id)
            .eq('workout_trainees.trainee_id', trainee.id)
            .or('is_completed.eq.false,is_prepared.eq.true') // Include incomplete workouts OR prepared workouts
            .order('workout_date', { ascending: false })
            .limit(1);

          if (!workoutSearchError && activeWorkouts && activeWorkouts.length > 0) {
            workoutId = activeWorkouts[0].id;
            pushLog({
              level: 'info',
              message: `נמצא אימון פעיל עבור ${trainee.full_name} (לא קשור ליומן)`,
              details: { workoutId },
            });
            } else {
              // If no active workout, try to find the most recent workout from today (even if completed)
              // This handles the case where workout was just saved
              // Also include prepared workouts (they should show on TV)
              const { data: todayWorkouts, error: todayError } = await supabase
                .from('workouts')
                .select(`
                  id,
                  workout_date,
                  is_prepared,
                  workout_trainees!inner(trainee_id)
                `)
                .eq('trainer_id', user.id)
                .eq('workout_trainees.trainee_id', trainee.id)
                .gte('workout_date', todayStart)
                .lte('workout_date', todayEnd)
                .or('is_completed.eq.false,is_prepared.eq.true') // Include incomplete workouts OR prepared workouts
                .order('workout_date', { ascending: false })
                .limit(1);

              if (!todayError && todayWorkouts && todayWorkouts.length > 0) {
                workoutId = todayWorkouts[0].id;
                pushLog({
                  level: 'info',
                  message: `נמצא אימון מהיום עבור ${trainee.full_name}`,
                  details: { workoutId },
                });
              } else if (todayError) {
                pushLog({
                  level: 'warning',
                  message: 'שגיאה בחיפוש אימונים מהיום',
                  details: { error: todayError.message },
                });
              }
            }
        }

        if (workoutId) {
          try {
            // Get workout metadata (including is_prepared) first
            let workoutMeta: { id: string; workout_date: string; is_completed: boolean; is_prepared: boolean; workout_type: string | null } | null = null;
            const { data: workoutMetaData, error: workoutMetaError } = await supabase
              .from('workouts')
              .select('id, workout_date, is_completed, is_prepared, workout_type')
              .eq('id', workoutId)
              .single();

            workoutMeta = workoutMetaData;

            // If workoutMeta failed to load, try to get is_prepared directly
            if (workoutMetaError || !workoutMeta) {
              const { data: directMeta } = await supabase
                .from('workouts')
                .select('is_prepared')
                .eq('id', workoutId)
                .single();
              if (directMeta) {
                workoutMeta = { ...(workoutMeta || {}), is_prepared: directMeta.is_prepared } as any;
              }
            }

            const workoutDetails = await getWorkoutDetails(workoutId);

            if ('error' in workoutDetails && workoutDetails.error) {
              pushLog({
                level: 'warning',
                message: 'אירוע פעיל נמצא, אך לא ניתן לטעון את פרטי האימון',
                details: { workoutId, error: workoutDetails.error },
              });
            } else if ('data' in workoutDetails && workoutDetails.data) {
              const exercisesData = workoutDetails.data as any[];
              
              // Check if workout has any exercises
              if (exercisesData.length === 0) {
                pushLog({
                  level: 'info',
                  message: `אימון ${workoutId} נמצא אך עדיין אין בו תרגילים - ממתין לתרגילים`,
                  details: { workoutId },
                });
                // If we have existing session with exercises for this workout, keep them
                // Otherwise create empty array - realtime will update it when exercises are added
                const currentSession = sessionRef.current;
                const existingExercises = currentSession?.workout?.id === workoutId && currentSession.workout.exercises?.length > 0
                  ? currentSession.workout.exercises
                  : [];
                
                workout = {
                  id: workoutId,
                  workout_date: workoutMeta?.workout_date || activeRecord?.event_start_time || new Date().toISOString(),
                  is_completed: workoutMeta?.is_completed ?? false,
                  is_prepared: workoutMeta?.is_prepared ?? false, // Use ?? instead of || to handle false values correctly
                  workout_type: workoutMeta?.workout_type || null,
                  exercises: existingExercises, // Keep existing exercises if available
                };
              } else {
                const exercises: TvWorkoutExercise[] = exercisesData.map(ex => ({
                  id: ex.id,
                  name: ex.exercises?.name ?? 'תרגיל',
                  muscle_group_id: ex.exercises?.muscle_group_id ?? null,
                  pair_member: ex.pair_member || null,
                  sets: (ex.exercise_sets ?? []).map((set: any) => ({
                    id: set.id,
                    set_number: set.set_number,
                    weight: set.weight,
                    reps: set.reps,
                    rpe: set.rpe,
                    set_type: set.set_type,
                    failure: set.failure || false,
                    superset_exercise_id: set.superset_exercise_id || null,
                    superset_weight: set.superset_weight || null,
                    superset_reps: set.superset_reps || null,
                    superset_exercise: set.superset_exercise || null,
                    dropset_weight: set.dropset_weight || null,
                    dropset_reps: set.dropset_reps || null,
                    equipment_id: set.equipment_id || null,
                    equipment: set.equipment || null,
                  })),
                }));

                // If we have existing session with same workout, merge exercises
                // IMPORTANT: Only keep exercises that exist in the DB response
                // This ensures deleted exercises are removed
                const currentSession = sessionRef.current;
                const existingExercises = currentSession?.workout?.id === workoutId && currentSession.workout.exercises?.length > 0
                  ? currentSession.workout.exercises
                  : [];

                // Merge exercises: use DB data as source of truth, but preserve any local state (like UI state)
                // Only keep exercises that exist in the DB
                // CRITICAL: Always use DB exercises as the definitive list - never keep exercises that aren't in DB
                const dbExerciseIds = new Set(exercises.map(ex => ex.id));
                
                let finalExercises = exercises;
                if (existingExercises.length > 0) {
                  // Merge: use DB data as base, but preserve any local state from existing exercises
                  finalExercises = exercises.map(dbEx => {
                    // Find matching existing exercise to preserve local state
                    const existingEx = existingExercises.find(ex => ex.id === dbEx.id);
                    // If found, merge them (DB data takes precedence, but preserve local state like UI state)
                    return existingEx ? { ...existingEx, ...dbEx } : dbEx;
                  });
                  // Note: exercises not in DB are automatically excluded since we only iterate over DB exercises
                  
                  // Defensive check: ensure we only have exercises that exist in DB
                  finalExercises = finalExercises.filter(ex => dbExerciseIds.has(ex.id));
                }

                // Ensure count always matches DB count (safety check)
                if (finalExercises.length !== exercises.length) {
                  console.warn('[TV-POLLING] Exercise count mismatch, using DB data directly', {
                    dbCount: exercises.length,
                    finalCount: finalExercises.length,
                    dbIds: Array.from(dbExerciseIds),
                    finalIds: finalExercises.map(ex => ex.id),
                  });
                  // If counts don't match, use DB data directly (safest option)
                  finalExercises = exercises;
                }

                workout = {
                  id: workoutId,
                  workout_date: workoutMeta?.workout_date || activeRecord?.event_start_time || new Date().toISOString(),
                  is_completed: workoutMeta?.is_completed ?? false,
                  is_prepared: workoutMeta?.is_prepared ?? false, // Use ?? instead of || to handle false values correctly
                  workout_type: workoutMeta?.workout_type || null,
                  exercises: finalExercises,
                };
                
                pushLog({
                  level: 'info',
                  message: `נטענו ${exercises.length} תרגילים עבור אימון ${workoutId}`,
                  details: { workoutId, exerciseCount: exercises.length },
                });
              }
            }
          } catch (err) {
            logger.error('Error loading workout details in TV session', err, 'useCurrentTvSession');
            pushLog({
              level: 'error',
              message: 'שגיאה בטעינת פרטי האימון',
              details: { workoutId, error: err instanceof Error ? err.message : String(err) },
            });
            // If we have existing session with this workout, keep it
            const currentSession = sessionRef.current;
            if (currentSession?.workout?.id === workoutId) {
              pushLog({
                level: 'info',
                message: 'שומרים על האימון הקיים למרות השגיאה',
              });
              setLastUpdated(nowIso);
              return;
            }
            // Otherwise, workout will be null and we'll handle it below
          }
        }

        const calendarEvent: TvCalendarEvent = {
          id: activeRecord.id,
          summary: (activeRecord as any).event_summary ?? null,
          event_start_time: activeRecord.event_start_time,
          event_end_time: activeRecord.event_end_time,
        };

        // If no workout found, keep existing session if we have one
        if (!workout) {
          const currentSession = sessionRef.current;
          if (currentSession) {
            // Keep existing session - don't clear it
            pushLog({
              level: 'info',
              message: 'לא נמצא אימון, שומרים על האימון הפעיל הקיים',
            });
            setLastUpdated(nowIso);
            return;
          }
          // No session and no workout - clear
          setSession(null);
          setLastUpdated(nowIso);
          setLoading(false);
          return;
        }

        const nextSession: TvSessionState = {
          trainee: trainee
            ? {
                id: trainee.id,
                full_name: trainee.full_name,
                isPair: trainee.is_pair || false,
                pairName1: trainee.pair_name_1 || null,
                pairName2: trainee.pair_name_2 || null,
              }
            : null,
          workout,
          calendarEvent,
        };

        // Only update session if it's different or if we don't have one
        // This prevents unnecessary re-renders and flickering
        setSession(prev => {
          // If we have an existing session with the same workout ID, merge exercises
          if (prev && prev.workout && nextSession.workout && prev.workout.id === nextSession.workout.id) {
            // Merge exercises: use DB data as source of truth, but preserve local state (like UI state)
            const existingExercises = prev.workout.exercises || [];
            const newExercises = nextSession.workout.exercises || [];
            
            // Use new exercises (from DB) as the source of truth
            // Only keep exercises that still exist in the DB
            // CRITICAL: Always use DB exercises as the definitive list - never keep exercises that aren't in DB
            const dbExerciseIds = new Set(newExercises.map(ex => ex.id));
            
            if (newExercises.length > 0) {
              // Merge: use DB data as base, but preserve any local state from existing exercises
              const mergedExercises = newExercises.map(newEx => {
                // Find matching existing exercise to preserve local state
                const existingEx = existingExercises.find(ex => ex.id === newEx.id);
                // If found, merge them (DB data takes precedence, but preserve local state like UI state)
                return existingEx ? { ...existingEx, ...newEx } : newEx;
              });
              
              // Defensive check: ensure we only have exercises that exist in DB
              // This prevents any edge cases where an exercise might slip through
              const finalExercises = mergedExercises.filter(ex => dbExerciseIds.has(ex.id));
              
              // Ensure count matches DB count (this is a safety check)
              if (finalExercises.length !== newExercises.length) {
                console.warn('[TV-MERGE] Exercise count mismatch, using DB data directly', {
                  dbCount: newExercises.length,
                  mergedCount: finalExercises.length,
                  dbIds: Array.from(dbExerciseIds),
                  mergedIds: finalExercises.map(ex => ex.id),
                });
                // If counts don't match, use DB data directly (safest option)
                return {
                  ...nextSession,
                  workout: {
                    ...nextSession.workout,
                    exercises: newExercises, // Use DB data directly if there's a mismatch
                  },
                };
              }
              
              return {
                ...nextSession,
                workout: {
                  ...nextSession.workout,
                  exercises: finalExercises, // Only exercises that exist in DB
                },
              };
            }
            
            // No new exercises from DB - clear exercises if DB says there are none
            // (This handles the case where all exercises were deleted)
            return {
              ...nextSession,
              workout: {
                ...nextSession.workout,
                exercises: [], // DB has no exercises, so clear them
              },
            };
          }
          
          // New session or different workout - use as is
          return nextSession;
        });
        setLastUpdated(nowIso);

        pushLog({
          level: 'info',
          message: trainee
            ? `זוהה אימון פעיל עבור ${trainee.full_name}`
            : 'זוהה אירוע יומן פעיל ללא שיוך למתאמן',
          details: {
            event_start_time: activeRecord.event_start_time,
            event_end_time: activeRecord.event_end_time,
            trainee_id: activeRecord.trainee_id,
            workout_id: activeRecord.workout_id,
          },
        });
      } catch (err) {
        logger.error('Unexpected error in useCurrentTvSession', err, 'useCurrentTvSession');
        pushLog({
          level: 'error',
          message: 'שגיאה בלתי צפויה בטעינת מצב הטלוויזיה',
        });
        const currentSession = sessionRef.current;
        if (!currentSession) {
          setError('שגיאה בלתי צפויה בטעינת מצב הטלוויזיה');
        }
      } finally {
        if (isMounted) {
          // Only set loading to false if we don't have a session
          // This prevents flickering when we have an active session
          const currentSession = sessionRef.current;
          if (!currentSession) {
            setLoading(false);
          } else {
            // If we have a session, only set loading to false if it was true
            setLoading(prev => prev ? false : prev);
          }
        }
      }
    };

    // Initial fetch
    fetchCurrentSession();

    // Polling interval - more frequent polling for TV display to ensure real-time updates
    // Poll every 1.5 seconds for faster updates
    intervalId = window.setInterval(fetchCurrentSession, pollIntervalMs);

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [user, userType, pollIntervalMs]); // Removed session from dependencies to prevent re-runs

  // Realtime subscription for workout changes of the active session
  useEffect(() => {
    // Clean up any existing channel first
    if (workoutChannelRef.current) {
      supabase.removeChannel(workoutChannelRef.current);
      workoutChannelRef.current = null;
    }

    const activeWorkoutId = session?.workout?.id;
    if (!user || !activeWorkoutId) {
      return;
    }

    const refreshWorkoutData = async () => {
      pushLog({
        level: 'info',
        message: 'התקבל עדכון אימון בזמן אמת – טוען מחדש את פרטי האימון',
      });

      try {
        const details = await getWorkoutDetails(activeWorkoutId);
        if ('error' in details && details.error) {
          pushLog({
            level: 'error',
            message: 'שגיאה בטעינת פרטי האימון בעדכון בזמן אמת',
            details: { workoutId: activeWorkoutId, error: details.error },
          });
          return;
        }

        if ('data' in details && details.data) {
          const exercisesData = details.data as any[];
          const exercises: TvWorkoutExercise[] = exercisesData.map(ex => ({
            id: ex.id,
            name: ex.exercises?.name ?? 'תרגיל',
            muscle_group_id: ex.exercises?.muscle_group_id ?? null,
            pair_member: ex.pair_member || null,
            sets: (ex.exercise_sets ?? []).map((set: any) => ({
              id: set.id,
              set_number: set.set_number,
              weight: set.weight,
              reps: set.reps,
              rpe: set.rpe,
              set_type: set.set_type,
              failure: set.failure || false,
              superset_exercise_id: set.superset_exercise_id || null,
              superset_weight: set.superset_weight || null,
              superset_reps: set.superset_reps || null,
              superset_exercise: set.superset_exercise || null,
              dropset_weight: set.dropset_weight || null,
              dropset_reps: set.dropset_reps || null,
              equipment_id: set.equipment_id || null,
              equipment: set.equipment || null,
            })),
          }));

          setSession(prev => {
            // Only update if we have a valid session and workout
            if (!prev || !prev.workout || prev.workout.id !== activeWorkoutId) {
              return prev;
            }
            
            // If we're getting empty exercises, it means all exercises were deleted
            // Update the workout to have no exercises
            if (exercises.length === 0) {
              return {
                ...prev,
                workout: {
                  ...prev.workout,
                  exercises: [], // Clear all exercises when empty array is received
                },
              };
            }
            
            // Merge exercises: use DB data as source of truth, but preserve local state (like UI state)
            // Only keep exercises that exist in the DB
            // CRITICAL: Always use DB exercises as the definitive list - never keep exercises that aren't in DB
            const existingExercises = prev.workout.exercises || [];
            const dbExerciseIds = new Set(exercises.map(ex => ex.id));
            
            // Use DB exercises as base, but preserve any local state from existing exercises
            let mergedExercises = exercises.map(dbEx => {
              // Find matching existing exercise to preserve local state
              const existingEx = existingExercises.find(ex => ex.id === dbEx.id);
              // If found, merge them (DB data takes precedence, but preserve local state like UI state)
              return existingEx ? { ...existingEx, ...dbEx } : dbEx;
            });
            // Note: exercises not in DB are automatically excluded since we only iterate over DB exercises
            
            // Defensive check: ensure we only have exercises that exist in DB
            mergedExercises = mergedExercises.filter(ex => dbExerciseIds.has(ex.id));
            
            // Ensure count always matches DB count (safety check)
            if (mergedExercises.length !== exercises.length) {
              console.warn('[TV-REALTIME] Exercise count mismatch, using DB data directly', {
                dbCount: exercises.length,
                mergedCount: mergedExercises.length,
                dbIds: Array.from(dbExerciseIds),
                mergedIds: mergedExercises.map(ex => ex.id),
              });
              // If counts don't match, use DB data directly (safest option)
              mergedExercises = exercises;
            }
            
            return {
              ...prev,
              workout: {
                ...prev.workout,
                exercises: mergedExercises, // Only exercises that exist in DB
              },
            };
          });

          pushLog({
            level: 'info',
            message: `עודכן אימון עם ${exercises.length} תרגילים`,
            details: { workoutId: activeWorkoutId, exerciseCount: exercises.length },
          });
        }
      } catch (err) {
        logger.error('Error refreshing workout data in realtime', err, 'useCurrentTvSession');
        pushLog({
          level: 'error',
          message: 'שגיאה בעדכון פרטי האימון בזמן אמת',
          details: { workoutId: activeWorkoutId, error: err instanceof Error ? err.message : String(err) },
        });
      }
    };

    const channel = supabase
      .channel(`studio-tv-workout-${activeWorkoutId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exercise_sets',
          filter: `workout_exercise_id.in.(select id from workout_exercises where workout_id='${activeWorkoutId}')`,
        },
        (payload) => {
          pushLog({
            level: 'info',
            message: `עדכון סט: ${payload.eventType}`,
            details: { set_id: payload.new?.id || payload.old?.id },
          });
          refreshWorkoutData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_exercises',
          filter: `workout_id=eq.${activeWorkoutId}`,
        },
        (payload) => {
          console.log('[TV-REALTIME] Received workout_exercises event', {
            eventType: payload.eventType,
            old: payload.old,
            new: payload.new,
          });

          pushLog({
            level: 'info',
            message: `עדכון תרגיל: ${payload.eventType}`,
            details: { exercise_id: payload.new?.id || payload.old?.id },
          });

          // If exercise was deleted, remove it from session immediately
          if (payload.eventType === 'DELETE' && payload.old?.id) {
            console.log('[TV-REALTIME] Exercise deleted, removing from state', {
              deletedExerciseId: payload.old.id,
            });

            setSession(prev => {
              if (!prev || !prev.workout || prev.workout.id !== activeWorkoutId) {
                return prev;
              }

              const updatedExercises = (prev.workout.exercises || []).filter(
                ex => ex.id !== payload.old.id
              );

              console.log('[TV-REALTIME] Updated exercises after deletion', {
                beforeCount: prev.workout.exercises?.length || 0,
                afterCount: updatedExercises.length,
              });

              return {
                ...prev,
                workout: {
                  ...prev.workout,
                  exercises: updatedExercises,
                },
              };
            });
          }

          // Refresh workout data for all other events (INSERT, UPDATE)
          refreshWorkoutData();
        }
      )
      .subscribe((status) => {
        console.log('[TV-REALTIME] Subscription status changed', {
          status,
          workoutId: activeWorkoutId,
        });

        if (status === 'SUBSCRIBED') {
          console.log('[TV-REALTIME] Successfully subscribed to realtime updates!');
          pushLog({
            level: 'info',
            message: `מחובר לעדכונים בזמן אמת עבור אימון ${activeWorkoutId}`,
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[TV-REALTIME] Channel error - realtime not working!');
          pushLog({
            level: 'error',
            message: 'שגיאה בחיבור לעדכונים בזמן אמת',
          });
        } else if (status === 'TIMED_OUT') {
          console.warn('[TV-REALTIME] Connection timed out');
          pushLog({
            level: 'warning',
            message: 'חיבור לעדכונים בזמן אמת פג תוקף - מנסה להתחבר מחדש',
          });
        }
      });

    workoutChannelRef.current = channel;

    return () => {
      if (workoutChannelRef.current) {
        supabase.removeChannel(workoutChannelRef.current);
        workoutChannelRef.current = null;
      }
    };
  }, [user, session?.workout?.id]);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [logs]
  );

  return {
    loading,
    error,
    session,
    logs: sortedLogs,
    lastUpdated,
  };
}

