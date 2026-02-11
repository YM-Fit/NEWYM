import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { mentalToolsApi, CreateMentalToolInput, UpdateMentalToolInput } from '../../api/mentalToolsApi';

export function useMentalToolsQuery(traineeId: string | null) {
  return useQuery({
    queryKey: queryKeys.mentalTools.byTrainee(traineeId || ''),
    queryFn: () => mentalToolsApi.getByTrainee(traineeId!),
    enabled: !!traineeId,
  });
}

export function useCreateMentalToolMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMentalToolInput) => mentalToolsApi.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mentalTools.byTrainee(variables.trainee_id) });
    },
  });
}

export function useUpdateMentalToolMutation(traineeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ toolId, updates }: { toolId: string; updates: UpdateMentalToolInput }) =>
      mentalToolsApi.update(toolId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mentalTools.byTrainee(traineeId) });
    },
  });
}

export function useDeleteMentalToolMutation(traineeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toolId: string) => mentalToolsApi.delete(toolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mentalTools.byTrainee(traineeId) });
    },
  });
}

export function useToggleMentalToolCompleteMutation(traineeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ toolId, isCompleted }: { toolId: string; isCompleted: boolean }) =>
      mentalToolsApi.toggleComplete(toolId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mentalTools.byTrainee(traineeId) });
    },
  });
}
