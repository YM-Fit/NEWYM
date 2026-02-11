import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { notificationsApi } from '../../api/notificationsApi';
import toast from 'react-hot-toast';

export function useNotificationsQuery(trainerId: string | null) {
  return useQuery({
    queryKey: queryKeys.notifications.byTrainer(trainerId || ''),
    queryFn: () => notificationsApi.getByTrainer(trainerId!, 20),
    enabled: !!trainerId,
    staleTime: 30_000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trainerId: string) => notificationsApi.markAllAsRead(trainerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('כל התראות סומנו כנקראו');
    },
    onError: () => {
      toast.error('שגיאה בסימון התראות');
    },
  });
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('שגיאה במחיקת התראה');
    },
  });
}
