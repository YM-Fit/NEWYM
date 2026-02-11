import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { supabase, logSupabaseError } from '../../lib/supabase';
import { handleApiError } from '../../utils/apiErrorHandler';
import { rateLimiter } from '../../utils/rateLimiter';
import { logger } from '../../utils/logger';
import toast from 'react-hot-toast';

export function useWorkoutsByTraineeQuery(traineeId: string | null) {
  return useQuery({
    queryKey: queryKeys.workouts.byTrainee(traineeId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_trainees')
        .select(`
          workouts!inner (
            id,
            workout_date,
            is_completed,
            is_self_recorded,
            synced_from_google,
            google_event_summary,
            created_at,
            workout_exercises (
              id,
              exercises (name),
              exercise_sets (
                id, weight, reps,
                superset_weight, superset_reps,
                dropset_weight, dropset_reps,
                superset_dropset_weight, superset_dropset_reps
              )
            )
          )
        `)
        .eq('trainee_id', traineeId!);

      if (error) throw handleApiError(error, { context: 'useWorkoutsByTraineeQuery' });

      const formatted = (data || [])
        .filter((wt: any) => wt.workouts)
        .map((wt: any) => {
          const w = wt.workouts;
          const exercises = w.workout_exercises || [];
          const totalVolume = exercises.reduce((sum: number, ex: any) => {
            const sets = ex.exercise_sets || [];
            return sum + sets.reduce((setSum: number, set: any) => {
              let v = (set.weight || 0) * (set.reps || 0);
              if (set.superset_weight && set.superset_reps) v += set.superset_weight * set.superset_reps;
              if (set.dropset_weight && set.dropset_reps) v += set.dropset_weight * set.dropset_reps;
              if (set.superset_dropset_weight && set.superset_dropset_reps) v += set.superset_dropset_weight * set.superset_dropset_reps;
              return setSum + v;
            }, 0);
          }, 0);
          return {
            id: w.id,
            date: w.workout_date,
            exercises: exercises.map((ex: any) => ({
              name: ex.exercises?.name || 'תרגיל',
              sets: ex.exercise_sets?.length || 0,
            })),
            totalVolume,
            duration: 0,
            isSelfRecorded: w.is_self_recorded || false,
            syncedFromGoogle: w.synced_from_google || false,
            googleEventSummary: w.google_event_summary || null,
            isCompleted: w.is_completed || false,
          };
        })
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return formatted;
    },
    enabled: !!traineeId,
    staleTime: 60_000,
  });
}

export function useWorkoutExercisesQuery(workoutId: string | null) {
  return useQuery({
    queryKey: queryKeys.workouts.exercises(workoutId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          exercise_id,
          order_index,
          exercises (id, name, muscle_group_id),
          exercise_sets (
            id, set_number, weight, reps, rpe, set_type,
            superset_exercise_id, superset_weight, superset_reps,
            dropset_weight, dropset_reps
          )
        `)
        .eq('workout_id', workoutId!)
        .order('order_index', { ascending: true });

      if (error) throw handleApiError(error, { context: 'useWorkoutExercisesQuery' });

      return (data || []).map((we: any) => ({
        tempId: we.id,
        exercise: {
          id: we.exercises.id,
          name: we.exercises.name,
          muscle_group_id: we.exercises.muscle_group_id,
        },
        sets: (we.exercise_sets || [])
          .sort((a: any, b: any) => a.set_number - b.set_number)
          .map((set: any) => ({
            id: set.id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            set_type: set.set_type as 'regular' | 'superset' | 'dropset',
            superset_exercise_id: set.superset_exercise_id,
            superset_weight: set.superset_weight,
            superset_reps: set.superset_reps,
            dropset_weight: set.dropset_weight,
            dropset_reps: set.dropset_reps,
          })),
      }));
    },
    enabled: !!workoutId,
  });
}

export function useDeleteWorkoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);
      if (error) throw handleApiError(error, { context: 'useDeleteWorkoutMutation' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast.success('האימון נמחק בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה במחיקת האימון');
    },
  });
}

export function useDuplicateWorkoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workoutId,
      traineeId,
      trainerId,
    }: {
      workoutId: string;
      traineeId: string;
      trainerId: string;
    }) => {
      const { data: workoutExercises } = await supabase
        .from('workout_exercises')
        .select(`
          exercise_id, order_index,
          exercise_sets (set_number, weight, reps, rpe, set_type)
        `)
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

      if (!workoutExercises) throw new Error('שגיאה בטעינת האימון');

      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert([{ trainer_id: trainerId, workout_date: new Date().toISOString(), workout_type: 'personal' }])
        .select()
        .single();

      if (workoutError || !newWorkout) throw new Error('שגיאה ביצירת אימון חדש');

      await supabase
        .from('workout_trainees')
        .insert([{ workout_id: newWorkout.id, trainee_id: traineeId }]);

      for (const ex of workoutExercises) {
        const { data: newWe } = await supabase
          .from('workout_exercises')
          .insert([{
            workout_id: newWorkout.id,
            trainee_id: traineeId,
            exercise_id: ex.exercise_id,
            order_index: ex.order_index,
          }])
          .select()
          .single();

        if (newWe) {
          const setsToInsert = (ex.exercise_sets || []).map((set: any) => ({
            workout_exercise_id: newWe.id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            set_type: set.set_type,
          }));
          if (setsToInsert.length > 0) {
            const { error: setsError } = await supabase.from('exercise_sets').insert(setsToInsert);
            if (setsError) {
              logSupabaseError(setsError, 'duplicateWorkout.exercise_sets', { table: 'exercise_sets' });
            }
          }
        }
      }
      return { traineeId };
    },
    onSuccess: ({ traineeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts.byTrainee(traineeId) });
      toast.success('האימון שוכפל בהצלחה!');
    },
    onError: () => {
      toast.error('שגיאה בשכפול האימון');
    },
  });
}

export function useLastWorkoutForEditQuery(traineeId: string | null, trainerId: string | null) {
  return useQuery({
    queryKey: ['lastWorkoutForEdit', traineeId, trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_trainees')
        .select(`
          workout_id,
          workouts!inner (id, workout_date, is_completed, trainer_id)
        `)
        .eq('trainee_id', traineeId!)
        .eq('workouts.is_completed', true)
        .eq('workouts.trainer_id', trainerId!)
        .order('workouts.workout_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw handleApiError(error, { context: 'useLastWorkoutForEditQuery' });
      return data;
    },
    enabled: false,
  });
}

export function useMuscleGroupsQuery(trainerId: string | null) {
  return useQuery({
    queryKey: queryKeys.muscleGroups.all(trainerId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('muscle_groups')
        .select('*, exercises(*)')
        .eq('trainer_id', trainerId!)
        .order('name');
      if (error) throw handleApiError(error, { context: 'useMuscleGroupsQuery' });
      return data;
    },
    enabled: !!trainerId,
    staleTime: 5 * 60_000,
  });
}
