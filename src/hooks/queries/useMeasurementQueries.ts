import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { measurementsApi, type CreateMeasurementInput } from '../../api/measurementsApi';
import { supabase } from '../../lib/supabase';
import { handleApiError } from '../../utils/apiErrorHandler';
import toast from 'react-hot-toast';

export function useMeasurementsQuery(traineeId: string | null, limit?: number) {
  return useQuery({
    queryKey: [...queryKeys.measurements.byTrainee(traineeId || ''), limit],
    queryFn: () => measurementsApi.getByTrainee(traineeId!, limit),
    enabled: !!traineeId,
    staleTime: 60_000,
  });
}

export function useSelfWeightsQuery(traineeId: string | null) {
  return useQuery({
    queryKey: queryKeys.selfWeights.byTrainee(traineeId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainee_self_weights')
        .select('*')
        .eq('trainee_id', traineeId!)
        .order('weight_date', { ascending: false });
      if (error) throw handleApiError(error, { context: 'useSelfWeightsQuery' });
      return data;
    },
    enabled: !!traineeId,
    staleTime: 60_000,
  });
}

export function useCreateMeasurementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeasurementInput) => measurementsApi.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.measurements.byTrainee(variables.trainee_id) });
    },
  });
}

export function useUpdateMeasurementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ measurementId, updates, traineeId }: {
      measurementId: string;
      updates: Partial<CreateMeasurementInput>;
      traineeId: string;
    }) => measurementsApi.update(measurementId, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.measurements.byTrainee(variables.traineeId) });
    },
  });
}

export function useDeleteMeasurementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ measurementId }: { measurementId: string; traineeId: string }) =>
      measurementsApi.delete(measurementId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.measurements.byTrainee(variables.traineeId) });
    },
  });
}

export function useSaveScaleMeasurementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      traineeId,
      traineeName,
      reading,
      customDate,
    }: {
      traineeId: string;
      traineeName: string;
      reading: {
        id: string;
        weight_kg: number | null;
        body_fat_percent: number | null;
        fat_free_mass_kg: number | null;
        water_percent: number | null;
        bmi: number | null;
        notes?: string | null;
        created_at: string;
      };
      customDate?: string;
    }) => {
      const measurementDate = customDate || new Date(reading.created_at).toISOString().split('T')[0];

      const { error: measurementError } = await supabase
        .from('measurements')
        .insert({
          trainee_id: traineeId,
          measurement_date: measurementDate,
          weight: reading.weight_kg,
          body_fat_percentage: reading.body_fat_percent,
          muscle_mass: reading.fat_free_mass_kg,
          water_percentage: reading.water_percent,
          bmi: reading.bmi,
          source: 'tanita',
          notes: reading.notes || '',
        });
      if (measurementError) throw measurementError;

      if (reading.notes) {
        await supabase
          .from('scale_readings')
          .update({ notes: reading.notes })
          .eq('id', reading.id);
      }

      await supabase
        .from('trainees')
        .update({
          last_known_weight: reading.weight_kg,
          last_known_body_fat: reading.body_fat_percent,
        })
        .eq('id', traineeId);

      return { traineeId, traineeName };
    },
    onSuccess: ({ traineeId, traineeName }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.measurements.byTrainee(traineeId) });
      toast.success(`המדידה נשמרה עבור ${traineeName}`);
    },
    onError: () => {
      toast.error('שגיאה בשמירת המדידה');
    },
  });
}

export function useMarkSelfWeightsSeenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ traineeId, trainerId }: { traineeId: string; trainerId: string }) => {
      const { error } = await supabase
        .from('trainee_self_weights')
        .update({ is_seen_by_trainer: true })
        .eq('trainee_id', traineeId)
        .eq('is_seen_by_trainer', false);
      if (error) throw error;
      return { traineeId, trainerId };
    },
    onSuccess: ({ traineeId, trainerId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.selfWeights.byTrainee(traineeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.selfWeights.unseenCounts(trainerId) });
    },
  });
}
