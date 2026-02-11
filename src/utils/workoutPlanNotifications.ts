import { supabase } from '../lib/supabase';
import { logger } from './logger';

export interface PlanChangeNotification {
  trainerId: string;
  traineeId: string;
  changeType: 'exercise_edited' | 'exercise_added' | 'exercise_removed';
  exerciseName: string;
  planId: string;
  exerciseId?: string;
}

/**
 * Notify trainer of workout plan changes made by trainee
 */
export async function notifyTrainerOfPlanChange({
  trainerId,
  traineeId,
  changeType,
  exerciseName,
  planId,
  exerciseId,
}: PlanChangeNotification): Promise<void> {
  try {
    // Get trainee name for notification
    const { data: traineeData } = await supabase
      .from('trainees')
      .select('full_name')
      .eq('id', traineeId)
      .single();

    const traineeName = traineeData?.full_name || 'מתאמן';

    // Create notification message based on change type
    let title = '';
    let message = '';

    switch (changeType) {
      case 'exercise_edited':
        title = 'עדכון תרגיל בתוכנית אימון';
        message = `${traineeName} עדכן את התרגיל "${exerciseName}" בתוכנית האימון שלו`;
        break;
      case 'exercise_added':
        title = 'הוספת תרגיל לתוכנית אימון';
        message = `${traineeName} הוסיף את התרגיל "${exerciseName}" לתוכנית האימון שלו`;
        break;
      case 'exercise_removed':
        title = 'הסרת תרגיל מתוכנית אימון';
        message = `${traineeName} הסיר את התרגיל "${exerciseName}" מתוכנית האימון שלו`;
        break;
    }

    // Create notification
    const { error } = await supabase
      .from('trainer_notifications')
      .insert({
        trainer_id: trainerId,
        trainee_id: traineeId,
        notification_type: `workout_plan_${changeType}`,
        title,
        message,
        is_read: false,
      });

    if (error) {
      logger.error('Error creating workout plan notification', error, 'workoutPlanNotifications');
      throw error;
    }

    logger.info('Workout plan notification created', { trainerId, traineeId, changeType }, 'workoutPlanNotifications');
  } catch (error) {
    logger.error('Failed to notify trainer of plan change', error, 'workoutPlanNotifications');
    // Don't throw - we don't want to fail the operation if notification fails
  }
}

/**
 * Create a workout plan change notification
 */
export async function createPlanChangeNotification(
  trainerId: string,
  traineeId: string,
  changeType: 'exercise_edited' | 'exercise_added' | 'exercise_removed',
  exerciseName: string,
  planId: string,
  exerciseId?: string
): Promise<void> {
  return notifyTrainerOfPlanChange({
    trainerId,
    traineeId,
    changeType,
    exerciseName,
    planId,
    exerciseId,
  });
}
