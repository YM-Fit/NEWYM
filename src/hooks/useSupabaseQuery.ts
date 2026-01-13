import { useState, useEffect, useCallback, useRef } from 'react';
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
  cacheTime?: number; // Cache time in milliseconds
}

// Simple cache for query results
const queryCache = new Map<string, { data: any; timestamp: number; cacheTime: number }>();

function getCacheKey(queryFn: () => Promise<any>, deps: React.DependencyList): string {
  return JSON.stringify({ deps });
}

export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  deps: React.DependencyList = [],
  options: UseSupabaseQueryOptions = {}
) {
  const { enabled = true, refetchOnMount = true, cacheTime = 0 } = options;
  const queryFnRef = useRef(queryFn);
  const depsRef = useRef(deps);
  const cacheKeyRef = useRef<string | null>(null);

  // Update refs when they change
  useEffect(() => {
    queryFnRef.current = queryFn;
    const hasDepsChanged = deps.length !== depsRef.current.length ||
      deps.some((dep, i) => dep !== depsRef.current[i]);
    
    if (hasDepsChanged) {
      depsRef.current = deps;
      cacheKeyRef.current = getCacheKey(queryFn, deps);
    }
  }, [queryFn, deps]);

  const [state, setState] = useState<QueryState<T>>(() => {
    // Check cache on initial render
    if (cacheTime > 0 && cacheKeyRef.current) {
      const cached = queryCache.get(cacheKeyRef.current);
      if (cached && Date.now() - cached.timestamp < cached.cacheTime) {
        return {
          data: cached.data,
          loading: false,
          error: null,
        };
      }
    }
    return {
      data: null,
      loading: true,
      error: null,
    };
  });

  const execute = useCallback(async () => {
    if (!enabled) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const cacheKey = cacheKeyRef.current || getCacheKey(queryFnRef.current, depsRef.current);
    cacheKeyRef.current = cacheKey;

    // Check cache before fetching
    if (cacheTime > 0) {
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.cacheTime) {
        setState({
          data: cached.data,
          loading: false,
          error: null,
        });
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await queryFnRef.current();
      
      // Cache successful results
      if (!error && cacheTime > 0) {
        queryCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          cacheTime,
        });
      }
      
      setState({ data, loading: false, error });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: { message: 'Unexpected error', details: '', hint: '', code: 'UNKNOWN' } as PostgrestError,
      });
    }
  }, [enabled, cacheTime]);

  useEffect(() => {
    if (refetchOnMount) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchOnMount, ...deps]);

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
