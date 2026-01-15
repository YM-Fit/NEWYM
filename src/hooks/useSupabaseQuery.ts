import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, logSupabaseError } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

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
      
      // Log errors with context using the helper function
      if (error) {
        logSupabaseError(error, 'useSupabaseQuery', {
          cacheKey: cacheKey.substring(0, 50), // Truncate for logging
        });
      }
      
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
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
      logger.error(
        'Supabase query exception',
        {
          error: err,
          message: errorMessage,
          cacheKey: cacheKey.substring(0, 50),
        },
        'useSupabaseQuery'
      );
      
      setState({
        data: null,
        loading: false,
        error: { 
          message: errorMessage, 
          details: '', 
          hint: '', 
          code: 'UNKNOWN' 
        } as PostgrestError,
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
    { enabled: !!trainerId, cacheTime: 60000 } // Cache for 1 minute
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
    { enabled: !!traineeId, cacheTime: 60000 } // Cache for 1 minute
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
    { enabled: !!trainerId, cacheTime: 300000 } // Cache for 5 minutes (rarely changes)
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
    { enabled: !!traineeId, cacheTime: 30000 } // Cache for 30 seconds
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
    { enabled: !!traineeId, cacheTime: 30000 } // Cache for 30 seconds
  );
}
