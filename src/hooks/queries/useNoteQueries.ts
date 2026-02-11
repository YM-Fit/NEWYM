import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { notesApi, CreateNoteInput, UpdateNoteInput } from '../../api/notesApi';

export function useNotesQuery(traineeId: string | null) {
  return useQuery({
    queryKey: queryKeys.notes.byTrainee(traineeId || ''),
    queryFn: () => notesApi.getByTrainee(traineeId!),
    enabled: !!traineeId,
  });
}

export function useCreateNoteMutation(traineeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => notesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.byTrainee(traineeId) });
    },
  });
}

export function useUpdateNoteMutation(traineeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, updates }: { noteId: string; updates: UpdateNoteInput }) =>
      notesApi.update(noteId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.byTrainee(traineeId) });
    },
  });
}

export function useDeleteNoteMutation(traineeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => notesApi.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.byTrainee(traineeId) });
    },
  });
}
