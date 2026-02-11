/**
 * Trainee Session Utilities
 * Functions for managing and displaying trainee session counts (card/ticket)
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';

/**
 * Batch helper to split large arrays into chunks for Supabase queries
 * Supabase has URL length limits, so we need to batch large ID arrays
 */
const BATCH_SIZE = 100; // Maximum IDs per query to avoid URL length limits

async function batchQuery<T>(
  queryFn: (ids: string[]) => Promise<{ data: T[] | null; error: any }>,
  ids: string[]
): Promise<{ data: T[]; error: any }> {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  // If the array is small enough, query directly
  if (ids.length <= BATCH_SIZE) {
    const result = await queryFn(ids);
    return { data: result.data || [], error: result.error };
  }

  // Split into batches and query in parallel
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    batches.push(ids.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(batch => queryFn(batch))
  );

  // Combine results
  const allData: T[] = [];
  let error: any = null;

  for (const result of results) {
    if (result.error) {
      error = result.error;
      logger.error('Error in batch query', result.error, 'traineeSessionUtils');
    } else if (result.data) {
      allData.push(...result.data);
    }
  }

  return { data: allData, error };
}

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
  historicalPosition?: number;  // Position in all-time history (1, 2, 3... since first workout)
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
      const { data: links } = await batchQuery(
        async (ids) => supabase
          .from('workout_trainees')
          .select('workout_id')
          .eq('trainee_id', traineeId)
          .in('workout_id', ids),
        workoutIds
      );
      
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
      
      // Batch query for workout links - split by workout IDs if too many
      const { data: links } = await batchQuery(
        async (ids) => supabase
          .from('workout_trainees')
          .select('trainee_id, workout_id')
          .in('trainee_id', traineeIds)
          .in('workout_id', ids),
        workoutIds
      );

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
 * This shows the monthly position of the workout (e.g., "אריאל 3/8" - 3rd workout out of 8 this month)
 * For card_ticket: when this workout uses the last session, shows "שם 10/10 סיום חבילה"
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

  // Check if this is the last session of a card (package completion)
  const isLastSessionOfCard =
    sessionInfo?.countingMethod === 'card_ticket' &&
    sessionInfo?.hasActiveCard &&
    sessionInfo.cardSessionsUsed + positionInfo.position === sessionInfo.cardSessionsTotal;

  if (isLastSessionOfCard) {
    const sessionText = `${sessionInfo.cardSessionsTotal}/${sessionInfo.cardSessionsTotal} סיום חבילה`;
    return {
      displayName: `${traineeName} ${sessionText}`,
      sessionText,
      hasSessionInfo: true,
    };
  }

  // Show monthly position/total format (e.g., "3/8")
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
        (t as any).full_name.toLowerCase().includes(eventName.toLowerCase()) ||
        eventName.toLowerCase().includes((t as any).full_name.toLowerCase())
      );
      if (partialMatch) {
        traineeNameToId.set(eventName, (partialMatch as any).id);
      }
    });
    
    // Get all workouts for this month AND all historical workouts (for historical numbering)
    const [monthWorkoutsResult, allWorkoutsResult] = await Promise.all([
      // Workouts for this month
      supabase
        .from('workouts')
        .select('id, workout_date, google_event_id')
        .eq('trainer_id', trainerId)
        .gte('workout_date', startOfMonth.toISOString())
        .lte('workout_date', endOfMonth.toISOString())
        .order('workout_date', { ascending: true }),
      // All historical workouts (for calculating historical position)
      supabase
        .from('workouts')
        .select('id, workout_date')
        .eq('trainer_id', trainerId)
        .lte('workout_date', endOfMonth.toISOString())
        .order('workout_date', { ascending: true })
    ]);

    const workouts = monthWorkoutsResult.data;
    const allWorkouts = allWorkoutsResult.data || [];

    if (monthWorkoutsResult.error || !workouts) {
      logger.error('Error fetching workouts for monthly positions', monthWorkoutsResult.error, 'traineeSessionUtils');
      return calculateEventPositions(events) as Map<string, MonthlyPositionInfo>;
    }

    if (workouts.length === 0) {
      // No workouts in DB, use events as is
      return calculateEventPositions(events) as Map<string, MonthlyPositionInfo>;
    }

    // Get workout-trainee links for both month and all historical
    const workoutIds = workouts.map(w => (w as any).id);
    const allWorkoutIds = allWorkouts.map(w => (w as any).id);
    const traineeIds = [...new Set(Array.from(traineeNameToId.values()))];
    
    // Get links for both month workouts and all historical workouts
    const [monthLinksResult, allLinksResult] = await Promise.all([
      batchQuery(
        async (ids) => supabase
          .from('workout_trainees')
          .select('workout_id, trainee_id')
          .in('workout_id', ids),
        workoutIds
      ),
      allWorkoutIds.length > 0
        ? batchQuery(
            async (ids) => supabase
              .from('workout_trainees')
              .select('workout_id, trainee_id')
              .in('workout_id', ids),
            allWorkoutIds
          )
        : Promise.resolve({ data: [], error: null })
    ]);

    const links = monthLinksResult.data;
    const allLinks = allLinksResult.data || [];

    if (monthLinksResult.error) {
      logger.error('Error fetching workout links for monthly positions', monthLinksResult.error, 'traineeSessionUtils');
    }

    // Build historical dates per trainee (for calculating historical position)
    const allWorkoutDateMap = new Map(allWorkouts.map(w => [(w as any).id, (w as any).workout_date]));
    const traineeHistoricalDates = new Map<string, string[]>();
    allLinks.forEach(link => {
      if (!traineeHistoricalDates.has(link.trainee_id)) {
        traineeHistoricalDates.set(link.trainee_id, []);
      }
      const date = allWorkoutDateMap.get(link.workout_id);
      if (date) {
        traineeHistoricalDates.get(link.trainee_id)!.push(date);
      }
    });
    // Sort historical dates for each trainee
    traineeHistoricalDates.forEach((dates) => {
      dates.sort();
    });

    // Create a map of trainee ID to their workouts in this month (sorted by date)
    const traineeWorkouts = new Map<string, Array<{ workoutId: string; date: Date; dateStr: string; googleEventId: string | null }>>();

    workouts.forEach(workout => {
      const traineeLink = (links || []).find(l => l.workout_id === (workout as any).id);
      if (traineeLink) {
        const existing = traineeWorkouts.get(traineeLink.trainee_id) || [];
        existing.push({
          workoutId: (workout as any).id,
          date: new Date((workout as any).workout_date),
          dateStr: (workout as any).workout_date, // Keep original string for comparison
          googleEventId: (workout as any).google_event_id,
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
      if (!traineeIdToName.has((t as any).id)) {
        traineeIdToName.set((t as any).id, (t as any).full_name);
      }
    });
    
    // First, calculate the count of displayed events per trainee
    // This is the most accurate count after deletions (events are already filtered)
    const displayedEventsByTrainee = new Map<string, Array<{ id: string; startDate: Date }>>();
    events.forEach(event => {
      const existing = displayedEventsByTrainee.get(event.traineeName) || [];
      existing.push({ id: event.id, startDate: event.startDate });
      displayedEventsByTrainee.set(event.traineeName, existing);
    });

    // Sort displayed events by date for each trainee
    displayedEventsByTrainee.forEach((eventList) => {
      eventList.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    });

    // Helper function to calculate historical position for an event
    // Normalizes dates for comparison to avoid format issues
    const calculateHistoricalPosition = (traineeId: string, workoutDateStr: string): number => {
      const historicalDates = traineeHistoricalDates.get(traineeId) || [];
      if (historicalDates.length === 0) return 0;

      // Normalize the workout date for comparison (convert to timestamp)
      const workoutTime = new Date(workoutDateStr).getTime();

      // Count how many workouts happened on or before this date
      return historicalDates.filter(d => new Date(d).getTime() <= workoutTime).length;
    };

    // Build a map of google_event_id to workout info for direct lookup
    const googleEventIdToWorkout = new Map<string, { traineeId: string; dateStr: string }>();
    workouts.forEach(workout => {
      const googleEventId = (workout as any).google_event_id;
      if (googleEventId) {
        const traineeLink = (links || []).find(l => l.workout_id === (workout as any).id);
        if (traineeLink) {
          googleEventIdToWorkout.set(googleEventId, {
            traineeId: traineeLink.trainee_id,
            dateStr: (workout as any).workout_date,
          });
        }
      }
    });

    // Now process each event and find its position
    events.forEach(event => {
      const displayedEventsForTrainee = displayedEventsByTrainee.get(event.traineeName) || [];
      const displayedTotal = displayedEventsForTrainee.length;

      // First try to find trainee by google event ID (most reliable)
      let traineeId = googleEventIdToWorkout.get(event.id)?.traineeId || null;
      let matchedWorkoutDateStr = googleEventIdToWorkout.get(event.id)?.dateStr || null;

      // Fallback to name matching if no google event ID match
      if (!traineeId) {
        traineeId = traineeNameToId.get(event.traineeName) || null;
      }

      if (!traineeId) {
        // No trainee match at all, use displayed events for position
        const position = displayedEventsForTrainee.findIndex(e => e.id === event.id) + 1;

        result.set(event.id, {
          position,
          totalInMonth: displayedTotal,
          traineeName: event.traineeName,
          monthlyTotalFromDb: displayedTotal,
        });
        return;
      }

      const traineeWorkoutList = traineeWorkouts.get(traineeId) || [];
      // Use database count for accurate monthly total
      const monthlyTotal = traineeWorkoutList.length > 0 ? traineeWorkoutList.length : Math.max(displayedTotal, 1);

      // Find position by matching google event ID or date in database
      let position = -1;

      // First try to match by Google event ID in database workouts
      if (!matchedWorkoutDateStr) {
        const matchByGoogleId = traineeWorkoutList.findIndex(w => w.googleEventId === event.id);
        if (matchByGoogleId >= 0) {
          position = matchByGoogleId + 1;
          matchedWorkoutDateStr = traineeWorkoutList[matchByGoogleId].dateStr;
        }
      } else {
        // Already have the date from googleEventIdToWorkout lookup
        position = traineeWorkoutList.findIndex(w => w.dateStr === matchedWorkoutDateStr) + 1;
      }

      // If still no match, try matching by date
      if (position <= 0) {
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
          matchedWorkoutDateStr = traineeWorkoutList[closestIndex].dateStr;
        }
      }

      // If no DB match found, use position from displayed events
      // This handles new events not yet in DB or recently deleted events
      if (position < 0) {
        const displayedPosition = displayedEventsForTrainee.findIndex(e => e.id === event.id) + 1;
        position = displayedPosition > 0 ? displayedPosition : 1;
      }

      // Calculate historical position (all-time position since first workout)
      // Use matched workout date string, or convert event date to ISO string as fallback
      const historicalPosition = calculateHistoricalPosition(
        traineeId,
        matchedWorkoutDateStr || event.startDate.toISOString()
      );

      result.set(event.id, {
        position,
        totalInMonth: monthlyTotal,
        traineeName: event.traineeName,
        monthlyTotalFromDb: traineeWorkoutList.length,
        historicalPosition: historicalPosition > 0 ? historicalPosition : undefined,
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
 * @param workoutId Optional workout ID for accurate position calculation
 * @returns Formatted title: "אימון - [name] [number]"
 */
export async function generateGoogleCalendarEventTitle(
  traineeId: string,
  trainerId: string,
  eventDate: Date,
  workoutId?: string
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

    // Invalidate cache before calculating to ensure fresh data
    // This is important when workouts are deleted to get accurate numbering
    sessionInfoCache.invalidate(traineeId);
    
    // Get fresh session info (don't use cache to ensure accuracy)
    const sessionInfo = await getTraineeSessionInfo(traineeId, trainerId);

    // If no session info, return just the name
    if (!sessionInfo) {
      return `אימון - ${(trainee as any).full_name}`;
    }

    // Determine the display format based on counting method
    let sessionText = '';
    
    // Prefer card/ticket format if available
    if (sessionInfo.countingMethod === 'card_ticket' && sessionInfo.hasActiveCard) {
      // Calculate position in card sequence (which session this workout uses)
      const { data: allWorkouts } = await supabase
        .from('workouts')
        .select('id, workout_date')
        .eq('trainer_id', trainerId)
        .lte('workout_date', eventDate.toISOString())
        .order('workout_date', { ascending: true });
      const workoutIds = (allWorkouts || []).map(w => (w as any).id);
      let position = 1;
      if (workoutIds.length > 0) {
        const { data: links } = await batchQuery(
          async (ids) => supabase
            .from('workout_trainees')
            .select('workout_id')
            .eq('trainee_id', traineeId)
            .in('workout_id', ids),
          workoutIds
        );
        const traineeWorkoutIds = new Set((links || []).map(l => l.workout_id));
        const traineeWorkouts = (allWorkouts || []).filter(w => traineeWorkoutIds.has((w as any).id));
        // Sort by (workout_date, id) for stable numbering when multiple workouts share the same date
        traineeWorkouts.sort((a, b) => {
          const cmp = (a as any).workout_date.localeCompare((b as any).workout_date);
          return cmp !== 0 ? cmp : (a as any).id.localeCompare((b as any).id);
        });
        if (workoutId) {
          const idx = traineeWorkouts.findIndex(w => (w as any).id === workoutId);
          position = idx >= 0 ? idx + 1 : traineeWorkouts.length + 1;
        } else {
          const eventDateMs = eventDate.getTime();
          const match = traineeWorkouts.find(w => Math.abs(new Date((w as any).workout_date).getTime() - eventDateMs) < 3600000);
          position = match ? traineeWorkouts.indexOf(match) + 1 : traineeWorkouts.filter(w => new Date((w as any).workout_date).getTime() < eventDateMs).length + 1;
        }
      }
      const isLastSession = position === sessionInfo.cardSessionsTotal;
      sessionText = isLastSession
        ? `${sessionInfo.cardSessionsTotal}/${sessionInfo.cardSessionsTotal} סיום חבילה`
        : `${sessionInfo.cardSessionsRemaining}/${sessionInfo.cardSessionsTotal}`;
    } else {
      // Calculate monthly position for this specific workout
      const eventMonth = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
      const startOfMonth = new Date(eventMonth.getFullYear(), eventMonth.getMonth(), 1);
      const endOfMonth = new Date(eventMonth.getFullYear(), eventMonth.getMonth() + 1, 0, 23, 59, 59);

      // Get all workouts for this trainer in this month
      // Include both completed and scheduled workouts for accurate numbering
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, workout_date')
        .eq('trainer_id', trainerId)
        .gte('workout_date', startOfMonth.toISOString())
        .lte('workout_date', endOfMonth.toISOString())
        .order('workout_date', { ascending: true });
      
      // Clear any stale cache to ensure fresh data
      sessionInfoCache.invalidate(traineeId);

      if (!workoutsError && workouts && workouts.length > 0) {
        // Get workout links to find which workouts belong to this trainee
        const workoutIds = workouts.map(w => (w as any).id);
        const { data: links } = await batchQuery(
          async (ids) => supabase
            .from('workout_trainees')
            .select('workout_id')
            .eq('trainee_id', traineeId)
            .in('workout_id', ids),
          workoutIds
        );

        const traineeWorkoutIds = new Set((links || []).map(l => l.workout_id));
        const traineeWorkouts = workouts.filter(w => traineeWorkoutIds.has((w as any).id));

        // Sort by (workout_date, id) for stable numbering when multiple workouts share the same date
        traineeWorkouts.sort((a, b) => {
          const cmp = (a as any).workout_date.localeCompare((b as any).workout_date);
          return cmp !== 0 ? cmp : (a as any).id.localeCompare((b as any).id);
        });

        let position = 1;
        let totalInMonth = traineeWorkouts.length;

        // If we have workoutId, find its exact position (existing workout)
        if (workoutId) {
          const workoutIndex = traineeWorkouts.findIndex(w => (w as any).id === workoutId);
          if (workoutIndex >= 0) {
            position = workoutIndex + 1;
          } else {
            // Workout not found in list - might have been deleted or not yet synced
            // Calculate position based on date
            const eventDateMs = eventDate.getTime();
            const workoutsBefore = traineeWorkouts.filter(w => 
              new Date((w as any).workout_date).getTime() < eventDateMs
            ).length;
            position = workoutsBefore + 1;
            totalInMonth = traineeWorkouts.length; // Don't add to total if workout doesn't exist
          }
        } else {
          // No workoutId means this is a NEW workout being created
          const eventDateMs = eventDate.getTime();
          let foundMatch = false;
          
          // Check if event matches any existing workout
          for (let i = 0; i < traineeWorkouts.length; i++) {
            const workoutDateMs = new Date((traineeWorkouts[i] as any).workout_date).getTime();
            // If dates are within 1 hour of each other, consider it a match (existing workout)
            if (Math.abs(workoutDateMs - eventDateMs) < 3600000) {
              position = i + 1;
              foundMatch = true;
              break;
            }
          }
          
          // If no exact match, this is a new workout - calculate its future position
          if (!foundMatch) {
            // Count how many workouts are before this date
            const workoutsBefore = traineeWorkouts.filter(w => 
              new Date((w as any).workout_date).getTime() < eventDateMs
            ).length;
            
            position = workoutsBefore + 1;
            totalInMonth = traineeWorkouts.length + 1; // Account for the new workout
          }
        }

        sessionText = totalInMonth > 1 
          ? `${position}/${totalInMonth}`
          : `${position}`;
      } else if (!workoutId) {
        // No existing workouts for this trainee in the month, but this is a new workout
        sessionText = '1';
      }
    }

    // Return formatted title
    if (sessionText) {
      return `אימון - ${(trainee as any).full_name} ${sessionText}`;
    } else {
      return `אימון - ${(trainee as any).full_name}`;
    }
  } catch (err) {
    logger.error('Error generating calendar event title', err, 'generateGoogleCalendarEventTitle');
    return 'אימון';
  }
}
