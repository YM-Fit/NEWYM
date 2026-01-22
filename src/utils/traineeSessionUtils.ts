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
 * This shows the sequential position of the workout in the month (e.g., "אריאל 3/8")
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

  // Show position/total format for monthly workout count (e.g., "3/8")
  const totalInMonth = positionInfo.totalInMonth;
  const sessionText = totalInMonth > 1 
    ? `${positionInfo.position}/${totalInMonth}`
    : `${positionInfo.position}`;
  
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
 * Extended position info that includes monthly totals from database
 */
export interface MonthlyPositionInfo extends EventPositionInfo {
  monthlyTotalFromDb: number;  // Total workouts this month from database
}

/**
 * Calculate event positions based on database records for the displayed month
 * This ensures accurate numbering regardless of which view (week/day/month) is displayed
 * 
 * @param trainerId The trainer ID
 * @param displayedMonth The month being displayed in the calendar
 * @param events Array of displayed events with Google event IDs
 * @returns Map of eventId -> MonthlyPositionInfo
 */
export async function calculateMonthlyPositionsFromDb(
  trainerId: string,
  displayedMonth: Date,
  events: Array<{
    id: string;  // Google Calendar event ID
    traineeName: string;
    startDate: Date;
  }>
): Promise<Map<string, MonthlyPositionInfo>> {
  const result = new Map<string, MonthlyPositionInfo>();
  
  if (events.length === 0) return result;
  
  try {
    const startOfMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const endOfMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0, 23, 59, 59);
    
    // Get trainee names from events
    const traineeNames = [...new Set(events.map(e => e.traineeName))];
    
    // Get trainee IDs by names
    const { data: trainees, error: traineesError } = await supabase
      .from('trainees')
      .select('id, full_name')
      .eq('trainer_id', trainerId);
    
    if (traineesError || !trainees) {
      logger.error('Error fetching trainees for monthly positions', traineesError, 'traineeSessionUtils');
      // Fallback to basic calculation
      return calculateEventPositions(events) as Map<string, MonthlyPositionInfo>;
    }
    
    // Map trainee names to IDs (with fuzzy matching for partial names)
    const traineeNameToId = new Map<string, string>();
    traineeNames.forEach(eventName => {
      // First try exact match
      const exactMatch = trainees.find(t => t.full_name === eventName);
      if (exactMatch) {
        traineeNameToId.set(eventName, exactMatch.id);
        return;
      }
      
      // Try partial match (event name is part of trainee name or vice versa)
      const partialMatch = trainees.find(t => 
        t.full_name.toLowerCase().includes(eventName.toLowerCase()) ||
        eventName.toLowerCase().includes(t.full_name.toLowerCase())
      );
      if (partialMatch) {
        traineeNameToId.set(eventName, partialMatch.id);
      }
    });
    
    // Get all workouts for this month
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('id, workout_date, google_event_id')
      .eq('trainer_id', trainerId)
      .gte('workout_date', startOfMonth.toISOString())
      .lte('workout_date', endOfMonth.toISOString())
      .order('workout_date', { ascending: true });
    
    if (workoutsError || !workouts) {
      logger.error('Error fetching workouts for monthly positions', workoutsError, 'traineeSessionUtils');
      return calculateEventPositions(events) as Map<string, MonthlyPositionInfo>;
    }
    
    if (workouts.length === 0) {
      // No workouts in DB, use events as is
      return calculateEventPositions(events) as Map<string, MonthlyPositionInfo>;
    }
    
    // Get workout-trainee links
    const workoutIds = workouts.map(w => w.id);
    const traineeIds = [...new Set(Array.from(traineeNameToId.values()))];
    
    const { data: links, error: linksError } = await supabase
      .from('workout_trainees')
      .select('workout_id, trainee_id')
      .in('workout_id', workoutIds);
    
    if (linksError) {
      logger.error('Error fetching workout links for monthly positions', linksError, 'traineeSessionUtils');
    }
    
    // Create a map of trainee ID to their workouts (sorted by date)
    const traineeWorkouts = new Map<string, Array<{ workoutId: string; date: Date; googleEventId: string | null }>>();
    
    workouts.forEach(workout => {
      const traineeLink = (links || []).find(l => l.workout_id === workout.id);
      if (traineeLink) {
        const existing = traineeWorkouts.get(traineeLink.trainee_id) || [];
        existing.push({
          workoutId: workout.id,
          date: new Date(workout.workout_date),
          googleEventId: workout.google_event_id,
        });
        traineeWorkouts.set(traineeLink.trainee_id, existing);
      }
    });
    
    // Sort each trainee's workouts by date
    traineeWorkouts.forEach((workoutList) => {
      workoutList.sort((a, b) => a.date.getTime() - b.date.getTime());
    });
    
    // Create a map of trainee ID to name (reverse lookup)
    const traineeIdToName = new Map<string, string>();
    traineeNameToId.forEach((id, name) => {
      traineeIdToName.set(id, name);
    });
    
    // Also add from trainees data for complete mapping
    trainees.forEach(t => {
      if (!traineeIdToName.has(t.id)) {
        traineeIdToName.set(t.id, t.full_name);
      }
    });
    
    // Now process each event and find its position
    events.forEach(event => {
      const traineeId = traineeNameToId.get(event.traineeName);
      
      if (!traineeId) {
        // No trainee match, use fallback position calculation
        const sameNameEvents = events.filter(e => e.traineeName === event.traineeName);
        sameNameEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const position = sameNameEvents.findIndex(e => e.id === event.id) + 1;
        
        result.set(event.id, {
          position,
          totalInMonth: sameNameEvents.length,
          traineeName: event.traineeName,
          monthlyTotalFromDb: sameNameEvents.length,
        });
        return;
      }
      
      const traineeWorkoutList = traineeWorkouts.get(traineeId) || [];
      const monthlyTotal = traineeWorkoutList.length;
      
      // Find position by matching google event ID or date
      let position = -1;
      
      // First try to match by Google event ID
      const matchByGoogleId = traineeWorkoutList.findIndex(w => w.googleEventId === event.id);
      if (matchByGoogleId >= 0) {
        position = matchByGoogleId + 1;
      } else {
        // Match by date (find closest date match)
        const eventTime = event.startDate.getTime();
        let closestIndex = -1;
        let closestDiff = Infinity;
        
        traineeWorkoutList.forEach((w, index) => {
          const diff = Math.abs(w.date.getTime() - eventTime);
          // Allow 1 hour tolerance for time differences
          if (diff < closestDiff && diff < 3600000) {
            closestDiff = diff;
            closestIndex = index;
          }
        });
        
        if (closestIndex >= 0) {
          position = closestIndex + 1;
        } else {
          // If no match found, calculate position based on where this date would fit
          const insertIndex = traineeWorkoutList.findIndex(w => w.date.getTime() > eventTime);
          position = insertIndex >= 0 ? insertIndex + 1 : monthlyTotal + 1;
        }
      }
      
      result.set(event.id, {
        position: position > 0 ? position : 1,
        totalInMonth: monthlyTotal,
        traineeName: event.traineeName,
        monthlyTotalFromDb: monthlyTotal,
      });
    });
    
    return result;
  } catch (err) {
    logger.error('Error in calculateMonthlyPositionsFromDb', err, 'traineeSessionUtils');
    return calculateEventPositions(events) as Map<string, MonthlyPositionInfo>;
  }
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

/**
 * Generate Google Calendar event title with trainee name and session info
 * This is used when creating or updating calendar events
 * 
 * @param traineeId The trainee's ID
 * @param trainerId The trainer's ID
 * @param eventDate The date of the event (used to calculate monthly position)
 * @returns Formatted title: "אימון - [name] [number]"
 */
export async function generateGoogleCalendarEventTitle(
  traineeId: string,
  trainerId: string,
  eventDate: Date
): Promise<string> {
  try {
    // Get trainee basic info
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .select('full_name')
      .eq('id', traineeId)
      .eq('trainer_id', trainerId)
      .single();

    if (traineeError || !trainee) {
      logger.error('Error fetching trainee for calendar title', traineeError, 'generateGoogleCalendarEventTitle');
      return 'אימון';
    }

    // Try to get cached session info first
    let sessionInfo = sessionInfoCache.get(traineeId);
    
    // If not cached, fetch it
    if (!sessionInfo) {
      sessionInfo = await getTraineeSessionInfo(traineeId, trainerId);
      if (sessionInfo) {
        sessionInfoCache.set(traineeId, sessionInfo);
      }
    }

    // If no session info, return just the name
    if (!sessionInfo) {
      return `אימון - ${trainee.full_name}`;
    }

    // Determine the display format based on counting method
    let sessionText = '';
    
    // Prefer card/ticket format if available
    if (sessionInfo.countingMethod === 'card_ticket' && sessionInfo.hasActiveCard) {
      // Show card sessions: remaining/total
      sessionText = `${sessionInfo.cardSessionsRemaining}/${sessionInfo.cardSessionsTotal}`;
    } else {
      // Calculate monthly position for this specific event date
      const eventMonth = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
      const startOfMonth = new Date(eventMonth.getFullYear(), eventMonth.getMonth(), 1);
      const endOfMonth = new Date(eventMonth.getFullYear(), eventMonth.getMonth() + 1, 0, 23, 59, 59);

      // Get all workouts for this trainee in this month
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, workout_date')
        .eq('trainer_id', trainerId)
        .gte('workout_date', startOfMonth.toISOString())
        .lte('workout_date', endOfMonth.toISOString())
        .order('workout_date', { ascending: true });

      if (!workoutsError && workouts && workouts.length > 0) {
        // Get workout links to find which workouts belong to this trainee
        const workoutIds = workouts.map(w => w.id);
        const { data: links } = await supabase
          .from('workout_trainees')
          .select('workout_id')
          .eq('trainee_id', traineeId)
          .in('workout_id', workoutIds);

        const traineeWorkoutIds = new Set((links || []).map(l => l.workout_id));
        const traineeWorkouts = workouts.filter(w => traineeWorkoutIds.has(w.id));

        if (traineeWorkouts.length > 0) {
          // Find position of this event date
          const eventDateStr = eventDate.toISOString().split('T')[0];
          let position = 1;
          
          for (let i = 0; i < traineeWorkouts.length; i++) {
            const workoutDateStr = new Date(traineeWorkouts[i].workout_date).toISOString().split('T')[0];
            if (workoutDateStr === eventDateStr) {
              position = i + 1;
              break;
            }
            if (new Date(traineeWorkouts[i].workout_date) < eventDate) {
              position = i + 2; // This event comes after this workout
            }
          }

          const totalInMonth = traineeWorkouts.length;
          sessionText = totalInMonth > 1 
            ? `${position}/${totalInMonth}`
            : `${position}`;
        }
      }
    }

    // Return formatted title
    if (sessionText) {
      return `אימון - ${trainee.full_name} ${sessionText}`;
    } else {
      return `אימון - ${trainee.full_name}`;
    }
  } catch (err) {
    logger.error('Error generating calendar event title', err, 'generateGoogleCalendarEventTitle');
    return 'אימון';
  }
}
