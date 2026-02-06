import { supabase } from '../lib/supabase';
import { rateLimiter } from '../utils/rateLimiter';
import { handleApiError } from '../utils/apiErrorHandler';

export interface TrainerNotification {
  id: string;
  trainer_id: string;
  trainee_id: string | null;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export const notificationsApi = {
  async getByTrainer(trainerId: string, limit = 50) {
    rateLimiter.check('getNotifications', 100);
    const { data, error } = await supabase
      .from('trainer_notifications')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw handleApiError(error, { context: 'notificationsApi.getByTrainer' });
    return data as TrainerNotification[];
  },

  async getUnreadCount(trainerId: string) {
    rateLimiter.check('getUnreadCount', 100);
    const { count, error } = await supabase
      .from('trainer_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', trainerId)
      .eq('is_read', false);
    if (error) throw handleApiError(error, { context: 'notificationsApi.getUnreadCount' });
    return count || 0;
  },

  async markAsRead(notificationId: string) {
    rateLimiter.check('markNotificationRead', 100);
    const { error } = await supabase
      .from('trainer_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw handleApiError(error, { context: 'notificationsApi.markAsRead' });
  },

  async markAllAsRead(trainerId: string) {
    rateLimiter.check('markAllNotificationsRead', 20);
    const { error } = await supabase
      .from('trainer_notifications')
      .update({ is_read: true })
      .eq('trainer_id', trainerId)
      .eq('is_read', false);
    if (error) throw handleApiError(error, { context: 'notificationsApi.markAllAsRead' });
  },

  async delete(notificationId: string) {
    rateLimiter.check('deleteNotification', 20);
    const { error } = await supabase
      .from('trainer_notifications')
      .delete()
      .eq('id', notificationId);
    if (error) throw handleApiError(error, { context: 'notificationsApi.delete' });
  },
};
