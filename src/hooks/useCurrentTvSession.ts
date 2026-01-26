import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getWorkoutDetails } from '../api/workoutApi';
import { logger } from '../utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TvTrainee {
  id: string;
  full_name: string;
}

interface TvWorkoutExerciseSet {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  set_type: string | null;
}

interface TvWorkoutExercise {
  id: string;
  name: string;
  muscle_group_id: string | null;
  sets: TvWorkoutExerciseSet[];
}

export interface TvWorkout {
  id: string;
  workout_date: string;
  is_completed: boolean;
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

  const pollIntervalMs = options.pollIntervalMs ?? 5000;

  const workoutChannelRef = useRef<RealtimeChannel | null>(null);

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
        setLoading(prev => (session ? prev : true));
        setError(null);

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
              trainees!inner(id, full_name)
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
          const { data: recentWorkouts, error: recentError } = await supabase
            .from('workouts')
            .select(`
              id,
              workout_date,
              workout_trainees!inner(
                trainee_id,
                trainees!inner(id, full_name)
              )
            `)
            .eq('trainer_id', user.id)
            .eq('is_completed', false)
            .order('workout_date', { ascending: false })
            .limit(1);

          if (!recentError && recentWorkouts && recentWorkouts.length > 0) {
            const workout = recentWorkouts[0];
            const traineeLink = (workout.workout_trainees as any[])[0];
            const traineeData = traineeLink?.trainees;
            
            if (traineeData) {
              const workoutDetails = await getWorkoutDetails(workout.id);
              
              if ('data' in workoutDetails && workoutDetails.data) {
                const exercises: TvWorkoutExercise[] = (workoutDetails.data as any[]).map(ex => ({
                  id: ex.id,
                  name: ex.exercises?.name ?? 'תרגיל',
                  muscle_group_id: ex.exercises?.muscle_group_id ?? null,
                  sets: (ex.exercise_sets ?? []).map((set: any) => ({
                    id: set.id,
                    set_number: set.set_number,
                    weight: set.weight,
                    reps: set.reps,
                    rpe: set.rpe,
                    set_type: set.set_type,
                  })),
                }));

                const nextSession: TvSessionState = {
                  trainee: {
                    id: traineeData.id,
                    full_name: traineeData.full_name,
                  },
                  workout: {
                    id: workout.id,
                    workout_date: workout.workout_date,
                    is_completed: false,
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
          
          if (!session) {
            pushLog({
              level: 'info',
              message: 'לא נמצאו אירועי יומן מסונכרנים פעילים כרגע',
            });
          }
          setSession(null);
          setLastUpdated(nowIso);
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
          setSession(null);
          setLastUpdated(nowIso);
          return;
        }

        const trainee = activeRecord.trainees as { id: string; full_name: string } | null;

        // 3. Load workout details - try linked workout first, then find active workout for trainee
        let workout: TvWorkout | null = null;
        let workoutId: string | null = activeRecord.workout_id as string | null;

        // If no workout_id in calendar sync, try to find active workout for this trainee
        // Also check for completed workouts from today (in case workout was just saved)
        if (!workoutId && trainee) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
          
          // First try to find active (incomplete) workout
          const { data: activeWorkouts, error: workoutSearchError } = await supabase
            .from('workouts')
            .select(`
              id,
              workout_date,
              workout_trainees!inner(trainee_id)
            `)
            .eq('trainer_id', user.id)
            .eq('workout_trainees.trainee_id', trainee.id)
            .eq('is_completed', false)
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
              const { data: todayWorkouts, error: todayError } = await supabase
                .from('workouts')
                .select(`
                  id,
                  workout_date,
                  workout_trainees!inner(trainee_id)
                `)
                .eq('trainer_id', user.id)
                .eq('workout_trainees.trainee_id', trainee.id)
                .gte('workout_date', todayStart)
                .lte('workout_date', todayEnd)
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
                // Still create workout object even if empty - realtime will update it when exercises are added
                workout = {
                  id: workoutId,
                  workout_date: activeRecord.event_start_time,
                  is_completed: false,
                  exercises: [],
                };
              } else {
                const exercises: TvWorkoutExercise[] = exercisesData.map(ex => ({
                  id: ex.id,
                  name: ex.exercises?.name ?? 'תרגיל',
                  muscle_group_id: ex.exercises?.muscle_group_id ?? null,
                  sets: (ex.exercise_sets ?? []).map((set: any) => ({
                    id: set.id,
                    set_number: set.set_number,
                    weight: set.weight,
                    reps: set.reps,
                    rpe: set.rpe,
                    set_type: set.set_type,
                  })),
                }));

                workout = {
                  id: workoutId,
                  workout_date: activeRecord.event_start_time,
                  is_completed: false,
                  exercises,
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
          }
        }

        const calendarEvent: TvCalendarEvent = {
          id: activeRecord.id,
          summary: (activeRecord as any).event_summary ?? null,
          event_start_time: activeRecord.event_start_time,
          event_end_time: activeRecord.event_end_time,
        };

        const nextSession: TvSessionState = {
          trainee: trainee
            ? {
                id: trainee.id,
                full_name: trainee.full_name,
              }
            : null,
          workout,
          calendarEvent,
        };

        setSession(nextSession);
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
        if (!session) {
          setError('שגיאה בלתי צפויה בטעינת מצב הטלוויזיה');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchCurrentSession();

    // Polling interval - more frequent polling for TV display to ensure real-time updates
    // Poll every 5 seconds to ensure immediate updates even if realtime fails
    intervalId = window.setInterval(fetchCurrentSession, Math.max(pollIntervalMs || 5000, 5000));

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [user, userType, pollIntervalMs, session]);

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
            sets: (ex.exercise_sets ?? []).map((set: any) => ({
              id: set.id,
              set_number: set.set_number,
              weight: set.weight,
              reps: set.reps,
              rpe: set.rpe,
              set_type: set.set_type,
            })),
          }));

          setSession(prev =>
            prev && prev.workout && prev.workout.id === activeWorkoutId
              ? {
                  ...prev,
                  workout: {
                    ...prev.workout,
                    exercises,
                  },
                }
              : prev
          );

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
          pushLog({
            level: 'info',
            message: `עדכון תרגיל: ${payload.eventType}`,
            details: { exercise_id: payload.new?.id || payload.old?.id },
          });
          refreshWorkoutData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          pushLog({
            level: 'info',
            message: `מחובר לעדכונים בזמן אמת עבור אימון ${activeWorkoutId}`,
          });
        } else if (status === 'CHANNEL_ERROR') {
          pushLog({
            level: 'error',
            message: 'שגיאה בחיבור לעדכונים בזמן אמת',
          });
        } else if (status === 'TIMED_OUT') {
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

