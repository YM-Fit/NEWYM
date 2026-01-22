/**
 * Trainee Session Utilities
 * Functions for managing and displaying trainee session counts (card/ticket)
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';

export interface TraineeSessionInfo {
  traineeId: string;
  traineeName: string;
  countingMethod: 'card_ticket' | 'subscription' | 'monthly_count' | null;
  // Card-specific data
  hasActiveCard: boolean;
  cardSessionsTotal: number;
  cardSessionsUsed: number;
  cardSessionsRemaining: number;
  // Monthly data
  workoutsThisMonth: number;
}

export interface SessionDisplayInfo {
  displayName: string;  // e.g., "אריאל 7/10" or "אריאל 3"
  sessionText: string;  // e.g., "7/10" or "3"
  hasSessionInfo: boolean;
}

export interface EventPositionInfo {
  position: number;        // Sequential position (1, 2, 3...) within month
  totalInMonth: number;    // Total workouts this month for the trainee
  traineeName: string;
}

/**
 * Get trainee session info from database
 */
export async function getTraineeSessionInfo(
  traineeId: string,
  trainerId: string
): Promise<TraineeSessionInfo | null> {
  try {
    // Get trainee data
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .select('id, full_name, counting_method, card_sessions_total, card_sessions_used')
      .eq('id', traineeId)
      .eq('trainer_id', trainerId)
      .single();

    if (traineeError || !trainee) {
      logger.error('Error fetching trainee for session info', traineeError, 'traineeSessionUtils');
      return null;
    }

    // Get active card if exists
    const { data: activeCard, error: cardError } = await supabase
      .from('trainee_cards')
      .select('sessions_purchased, sessions_used, is_active')
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .maybeSingle();

    if (cardError) {
      logger.error('Error fetching trainee card', cardError, 'traineeSessionUtils');
    }

    // Get workouts this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('id')
      .eq('trainer_id', trainerId)
      .gte('workout_date', startOfMonth.toISOString())
      .lte('workout_date', endOfMonth.toISOString());

    let workoutsThisMonth = 0;
    if (!workoutsError && workouts && workouts.length > 0) {
      const workoutIds = workouts.map(w => w.id);
      const { data: links } = await supabase
        .from('workout_trainees')
        .select('workout_id')
        .eq('trainee_id', traineeId)
        .in('workout_id', workoutIds);
      
      workoutsThisMonth = links?.length || 0;
    }

    const cardSessionsTotal = activeCard?.sessions_purchased || trainee.card_sessions_total || 0;
    const cardSessionsUsed = activeCard?.sessions_used || trainee.card_sessions_used || 0;

    return {
      traineeId: trainee.id,
      traineeName: trainee.full_name,
      countingMethod: trainee.counting_method,
      hasActiveCard: !!activeCard,
      cardSessionsTotal,
      cardSessionsUsed,
      cardSessionsRemaining: Math.max(0, cardSessionsTotal - cardSessionsUsed),
      workoutsThisMonth,
    };
  } catch (err) {
    logger.error('Error in getTraineeSessionInfo', err, 'traineeSessionUtils');
    return null;
  }
}

/**
 * Get session info for multiple trainees at once (batch operation)
 */
export async function getTraineesSessionInfo(
  traineeIds: string[],
  trainerId: string
): Promise<Map<string, TraineeSessionInfo>> {
  const result = new Map<string, TraineeSessionInfo>();
  
  if (traineeIds.length === 0) return result;

  try {
    // Get all trainees data
    const { data: trainees, error: traineesError } = await supabase
      .from('trainees')
      .select('id, full_name, counting_method, card_sessions_total, card_sessions_used')
      .eq('trainer_id', trainerId)
      .in('id', traineeIds);

    if (traineesError || !trainees) {
      logger.error('Error fetching trainees for session info', traineesError, 'traineeSessionUtils');
      return result;
    }

    // Get all active cards
    const { data: activeCards, error: cardsError } = await supabase
      .from('trainee_cards')
      .select('trainee_id, sessions_purchased, sessions_used')
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .in('trainee_id', traineeIds);

    if (cardsError) {
      logger.error('Error fetching trainee cards', cardsError, 'traineeSessionUtils');
    }

    // Create a map of cards by trainee_id
    const cardsMap = new Map<string, { sessions_purchased: number; sessions_used: number }>();
    (activeCards || []).forEach(card => {
      cardsMap.set(card.trainee_id, {
        sessions_purchased: card.sessions_purchased,
        sessions_used: card.sessions_used,
      });
    });

    // Get workouts this month for all trainees
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const { data: workouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('trainer_id', trainerId)
      .gte('workout_date', startOfMonth.toISOString())
      .lte('workout_date', endOfMonth.toISOString());

    const workoutCountMap = new Map<string, number>();
    if (workouts && workouts.length > 0) {
      const workoutIds = workouts.map(w => w.id);
      const { data: links } = await supabase
        .from('workout_trainees')
        .select('trainee_id, workout_id')
        .in('trainee_id', traineeIds)
        .in('workout_id', workoutIds);

      (links || []).forEach(link => {
        workoutCountMap.set(link.trainee_id, (workoutCountMap.get(link.trainee_id) || 0) + 1);
      });
    }

    // Build result
    trainees.forEach(trainee => {
      const card = cardsMap.get(trainee.id);
      const cardSessionsTotal = card?.sessions_purchased || trainee.card_sessions_total || 0;
      const cardSessionsUsed = card?.sessions_used || trainee.card_sessions_used || 0;

      result.set(trainee.id, {
        traineeId: trainee.id,
        traineeName: trainee.full_name,
        countingMethod: trainee.counting_method,
        hasActiveCard: !!card,
        cardSessionsTotal,
        cardSessionsUsed,
        cardSessionsRemaining: Math.max(0, cardSessionsTotal - cardSessionsUsed),
        workoutsThisMonth: workoutCountMap.get(trainee.id) || 0,
      });
    });

    return result;
  } catch (err) {
    logger.error('Error in getTraineesSessionInfo', err, 'traineeSessionUtils');
    return result;
  }
}

/**
 * Format trainee name with session info for display
 * This is used for card tickets - shows remaining/total
 */
export function formatTraineeNameWithSession(
  traineeName: string,
  sessionInfo: TraineeSessionInfo | null
): SessionDisplayInfo {
  if (!sessionInfo) {
    return {
      displayName: traineeName,
      sessionText: '',
      hasSessionInfo: false,
    };
  }

  // Only show session info for card_ticket counting method
  if (sessionInfo.countingMethod === 'card_ticket' && sessionInfo.hasActiveCard) {
    const sessionText = `${sessionInfo.cardSessionsRemaining}/${sessionInfo.cardSessionsTotal}`;
    return {
      displayName: `${traineeName} ${sessionText}`,
      sessionText,
      hasSessionInfo: true,
    };
  }

  return {
    displayName: traineeName,
    sessionText: '',
    hasSessionInfo: false,
  };
}

/**
 * Format trainee name with event position for display
 * This shows the sequential position of the workout in the month (1, 2, 3...)
 */
export function formatTraineeNameWithPosition(
  traineeName: string,
  positionInfo: EventPositionInfo | null,
  sessionInfo: TraineeSessionInfo | null
): SessionDisplayInfo {
  if (!positionInfo) {
    // Fallback to session info format if no position
    return formatTraineeNameWithSession(traineeName, sessionInfo);
  }

  // Show position number for all counting methods
  const sessionText = `${positionInfo.position}`;
  return {
    displayName: `${traineeName} ${sessionText}`,
    sessionText,
    hasSessionInfo: true,
  };
}

/**
 * Calculate event positions for all events in a given list
 * Groups events by trainee name and assigns sequential positions based on date
 * 
 * @param events Array of events with trainee name and date info
 * @returns Map of eventId -> EventPositionInfo
 */
export function calculateEventPositions(
  events: Array<{
    id: string;
    traineeName: string;
    startDate: Date;
  }>
): Map<string, EventPositionInfo> {
  const result = new Map<string, EventPositionInfo>();
  
  // Group events by trainee name
  const eventsByTrainee = new Map<string, Array<{ id: string; startDate: Date }>>();
  
  events.forEach(event => {
    const existing = eventsByTrainee.get(event.traineeName) || [];
    existing.push({ id: event.id, startDate: event.startDate });
    eventsByTrainee.set(event.traineeName, existing);
  });
  
  // For each trainee, sort by date and assign positions
  eventsByTrainee.forEach((traineeEvents, traineeName) => {
    // Sort by date ascending
    traineeEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    const totalInMonth = traineeEvents.length;
    
    // Assign position (1, 2, 3...)
    traineeEvents.forEach((event, index) => {
      result.set(event.id, {
        position: index + 1,
        totalInMonth,
        traineeName,
      });
    });
  });
  
  return result;
}

/**
 * Generate event summary with session info for Google Calendar
 */
export function generateEventSummaryWithSession(
  traineeName: string,
  sessionInfo: TraineeSessionInfo | null
): string {
  const formatted = formatTraineeNameWithSession(traineeName, sessionInfo);
  return `אימון - ${formatted.displayName}`;
}

/**
 * Cache for session info to avoid repeated database calls
 */
class SessionInfoCache {
  private cache = new Map<string, { data: TraineeSessionInfo; timestamp: number }>();
  private readonly CACHE_DURATION_MS = 30000; // 30 seconds

  get(traineeId: string): TraineeSessionInfo | null {
    const cached = this.cache.get(traineeId);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_DURATION_MS) {
      this.cache.delete(traineeId);
      return null;
    }
    
    return cached.data;
  }

  set(traineeId: string, data: TraineeSessionInfo): void {
    this.cache.set(traineeId, { data, timestamp: Date.now() });
  }

  setMultiple(data: Map<string, TraineeSessionInfo>): void {
    const timestamp = Date.now();
    data.forEach((info, traineeId) => {
      this.cache.set(traineeId, { data: info, timestamp });
    });
  }

  invalidate(traineeId?: string): void {
    if (traineeId) {
      this.cache.delete(traineeId);
    } else {
      this.cache.clear();
    }
  }
}

export const sessionInfoCache = new SessionInfoCache();
