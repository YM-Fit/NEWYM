import { supabase } from '../lib/supabase';
import { handleApiError } from './config';

export interface TrainerTraineeMessage {
  id: string;
  trainee_id: string;
  trainer_id: string;
  sender_type: 'trainer' | 'trainee';
  message_text: string;
  is_read: boolean;
  read_at: string | null;
  related_workout_id: string | null;
  related_measurement_id: string | null;
  created_at: string;
}

export interface CreateMessageInput {
  trainee_id: string;
  trainer_id: string;
  sender_type: 'trainer' | 'trainee';
  message_text: string;
  related_workout_id?: string | null;
  related_measurement_id?: string | null;
}

export const messagesApi = {
  async getMessages(traineeId: string, trainerId: string): Promise<TrainerTraineeMessage[]> {
    try {
      const { data, error } = await supabase
        .from('trainer_trainee_messages')
        .select('*')
        .eq('trainee_id', traineeId)
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleApiError(error, 'שגיאה בטעינת הודעות');
    }
  },

  async sendMessage(input: CreateMessageInput): Promise<TrainerTraineeMessage> {
    try {
      const { data, error } = await supabase
        .from('trainer_trainee_messages')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בשליחת הודעה');
    }
  },

  async markAsRead(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trainer_trainee_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בסימון הודעה כנקראה');
    }
  },

  async getUnreadCount(traineeId: string, trainerId: string, userType: 'trainer' | 'trainee'): Promise<number> {
    try {
      const senderType = userType === 'trainer' ? 'trainee' : 'trainer';
      
      const { count, error } = await supabase
        .from('trainer_trainee_messages')
        .select('*', { count: 'exact', head: true })
        .eq('trainee_id', traineeId)
        .eq('trainer_id', trainerId)
        .eq('sender_type', senderType)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw handleApiError(error, 'שגיאה בספירת הודעות לא נקראות');
    }
  },
};
