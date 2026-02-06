import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';
import { handleApiError } from '../../utils/apiErrorHandler';
import { rateLimiter } from '../../utils/rateLimiter';
import toast from 'react-hot-toast';

export function useTraineesQuery(trainerId: string | null) {
  return useQuery({
    queryKey: queryKeys.trainees.all(trainerId || ''),
    queryFn: async () => {
      rateLimiter.check('getTrainees', 100);
      const { data, error } = await supabase
        .from('trainees')
        .select('*')
        .eq('trainer_id', trainerId!)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      if (error) throw handleApiError(error, { context: 'useTraineesQuery' });
      return data;
    },
    enabled: !!trainerId,
  });
}

export function useTraineeQuery(traineeId: string | null) {
  return useQuery({
    queryKey: queryKeys.trainees.detail(traineeId || ''),
    queryFn: async () => {
      rateLimiter.check('getTrainee', 100);
      const { data, error } = await supabase
        .from('trainees')
        .select('*, trainer:trainers(full_name)')
        .eq('id', traineeId!)
        .maybeSingle();
      if (error) throw handleApiError(error, { context: 'useTraineeQuery' });
      return data;
    },
    enabled: !!traineeId,
  });
}

export function useTrainerProfileQuery(trainerId: string | null) {
  return useQuery({
    queryKey: queryKeys.trainer.profile(trainerId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('full_name')
        .eq('id', trainerId!)
        .maybeSingle();
      if (error) throw handleApiError(error, { context: 'useTrainerProfileQuery' });
      return data;
    },
    enabled: !!trainerId,
  });
}

export function useCreateTraineeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ trainerId, traineeData }: { trainerId: string; traineeData: Record<string, unknown> }) => {
      rateLimiter.check('createTrainee', 20);
      const { data, error } = await supabase
        .from('trainees')
        .insert([{ trainer_id: trainerId, ...traineeData }])
        .select()
        .single();
      if (error) throw handleApiError(error, { context: 'useCreateTraineeMutation' });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainees.all(variables.trainerId) });
    },
    onError: () => {
      toast.error('שגיאה ביצירת מתאמן');
    },
  });
}

export function useUpdateTraineeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ traineeId, updates }: { traineeId: string; updates: Record<string, unknown> }) => {
      rateLimiter.check('updateTrainee', 50);
      const { data, error } = await supabase
        .from('trainees')
        .update(updates)
        .eq('id', traineeId)
        .select()
        .single();
      if (error) throw handleApiError(error, { context: 'useUpdateTraineeMutation' });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainees.detail(data.id) });
      if (data.trainer_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.trainees.all(data.trainer_id) });
      }
    },
  });
}

export function useDeleteTraineeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ traineeId, trainerId }: { traineeId: string; trainerId: string }) => {
      rateLimiter.check('deleteTrainee', 5);
      const { error } = await supabase
        .from('trainees')
        .update({ status: 'deleted' })
        .eq('id', traineeId);
      if (error) throw handleApiError(error, { context: 'useDeleteTraineeMutation' });
      return { traineeId, trainerId };
    },
    onSuccess: ({ trainerId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trainees.all(trainerId) });
      toast.success('המתאמן נמחק בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה במחיקת המתאמן');
    },
  });
}

export function useUnseenWeightsCountsQuery(trainerId: string | null) {
  return useQuery({
    queryKey: queryKeys.selfWeights.unseenCounts(trainerId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainee_self_weights')
        .select('trainee_id')
        .eq('is_seen_by_trainer', false);
      if (error) throw handleApiError(error, { context: 'useUnseenWeightsCountsQuery' });
      const counts = new Map<string, number>();
      data?.forEach((item) => {
        counts.set(item.trainee_id, (counts.get(item.trainee_id) || 0) + 1);
      });
      return counts;
    },
    enabled: !!trainerId,
    staleTime: 60_000,
  });
}

export function useLastWorkoutsMapQuery(traineeIds: string[]) {
  return useQuery({
    queryKey: ['lastWorkoutsMap', traineeIds.sort().join(',')],
    queryFn: async () => {
      if (traineeIds.length === 0) return new Map<string, string>();
      const { data } = await supabase
        .from('workout_trainees')
        .select('trainee_id, workouts(workout_date, is_completed)')
        .in('trainee_id', traineeIds)
        .eq('workouts.is_completed', true)
        .order('workouts(workout_date)', { ascending: false });

      const map = new Map<string, string>();
      data?.forEach((wt: any) => {
        const workoutDate = wt.workouts?.workout_date;
        if (workoutDate && (!map.has(wt.trainee_id) || workoutDate > map.get(wt.trainee_id)!)) {
          map.set(wt.trainee_id, workoutDate);
        }
      });
      return map;
    },
    enabled: traineeIds.length > 0,
    staleTime: 60_000,
  });
}
