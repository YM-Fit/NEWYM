import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: PostgrestError | null;
}

interface UseSupabaseQueryOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
}

export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  deps: React.DependencyList = [],
  options: UseSupabaseQueryOptions = {}
) {
  const { enabled = true, refetchOnMount = true } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const execute = useCallback(async () => {
    if (!enabled) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await queryFn();
      setState({ data, loading: false, error });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: { message: 'Unexpected error', details: '', hint: '', code: 'UNKNOWN' } as PostgrestError,
      });
    }
  }, [queryFn, enabled]);

  useEffect(() => {
    if (refetchOnMount) {
      execute();
    }
  }, [...deps, refetchOnMount]);

  return {
    ...state,
    refetch: execute,
  };
}

export function useTrainees(trainerId: string | null) {
  return useSupabaseQuery(
    async () => {
      if (!trainerId) return { data: [], error: null };

      return supabase
        .from('trainees')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('full_name');
    },
    [trainerId],
    { enabled: !!trainerId }
  );
}

export function useTrainee(traineeId: string | null) {
  return useSupabaseQuery(
    async () => {
      if (!traineeId) return { data: null, error: null };

      return supabase
        .from('trainees')
        .select('*')
        .eq('id', traineeId)
        .single();
    },
    [traineeId],
    { enabled: !!traineeId }
  );
}

export function useMuscleGroups(trainerId: string | null) {
  return useSupabaseQuery(
    async () => {
      if (!trainerId) return { data: [], error: null };

      return supabase
        .from('muscle_groups')
        .select('*, exercises(*)')
        .eq('trainer_id', trainerId)
        .order('name');
    },
    [trainerId],
    { enabled: !!trainerId }
  );
}

export function useMeasurements(traineeId: string | null, limit?: number) {
  return useSupabaseQuery(
    async () => {
      if (!traineeId) return { data: [], error: null };

      let query = supabase
        .from('measurements')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('measurement_date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      return query;
    },
    [traineeId, limit],
    { enabled: !!traineeId }
  );
}

export function useWorkouts(traineeId: string | null, limit?: number) {
  return useSupabaseQuery(
    async () => {
      if (!traineeId) return { data: [], error: null };

      let query = supabase
        .from('workout_trainees')
        .select(`
          workout_id,
          workouts (
            id,
            workout_date,
            workout_type,
            notes,
            is_completed,
            workout_exercises (
              id,
              exercise_id,
              exercises (name),
              exercise_sets (*)
            )
          )
        `)
        .eq('trainee_id', traineeId)
        .order('workout_id', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      return query;
    },
    [traineeId, limit],
    { enabled: !!traineeId }
  );
}
