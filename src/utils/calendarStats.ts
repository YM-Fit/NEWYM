/**
 * Calendar Statistics Utilities
 */

import type { GoogleCalendarEvent } from '../api/googleCalendarApi';

export interface ClientStats {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  lastEventDate?: Date;
  firstEventDate?: Date;
  workoutFrequency?: number; // events per week
  engagementScore: number; // 0-100
}

/**
 * Calculate client statistics from calendar events
 */
export function calculateClientStats(events: GoogleCalendarEvent[]): ClientStats {
  const now = new Date();
  const upcoming = events.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    return eventDate >= now;
  });

  const completed = events.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    return eventDate < now;
  });

  const dates = events
    .map(event => new Date(event.start.dateTime || event.start.date || ''))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const firstEventDate = dates[0];
  const lastEventDate = dates[dates.length - 1];

  // Calculate workout frequency (events per week)
  let workoutFrequency: number | undefined;
  if (firstEventDate && lastEventDate && events.length > 1) {
    const daysDiff = Math.max(1, Math.ceil(
      (lastEventDate.getTime() - firstEventDate.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const weeks = daysDiff / 7;
    if (weeks > 0) {
      workoutFrequency = events.length / weeks;
    }
  }

  // Calculate engagement score (based on consistency and recency)
  let engagementScore = 0;
  if (events.length > 0) {
    // Base score from total events (max 40 points)
    engagementScore += Math.min(40, events.length * 2);
    
    // Consistency bonus (max 30 points)
    if (workoutFrequency) {
      if (workoutFrequency >= 3) engagementScore += 30;
      else if (workoutFrequency >= 2) engagementScore += 20;
      else if (workoutFrequency >= 1) engagementScore += 10;
    }
    
    // Recency bonus (max 30 points)
    if (lastEventDate) {
      const daysSinceLast = Math.ceil(
        (now.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLast <= 7) engagementScore += 30;
      else if (daysSinceLast <= 14) engagementScore += 20;
      else if (daysSinceLast <= 30) engagementScore += 10;
    }
  }

  return {
    totalEvents: events.length,
    upcomingEvents: upcoming.length,
    completedEvents: completed.length,
    lastEventDate,
    firstEventDate,
    workoutFrequency,
    engagementScore: Math.min(100, engagementScore),
  };
}

/**
 * Get upcoming workouts count from events
 */
export function getUpcomingWorkoutsCount(events: GoogleCalendarEvent[]): number {
  const now = new Date();
  return events.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    return eventDate >= now;
  }).length;
}

/**
 * Calculate workout frequency (events per week)
 */
export function getWorkoutFrequency(events: GoogleCalendarEvent[]): number | null {
  if (events.length < 2) return null;

  const dates = events
    .map(event => new Date(event.start.dateTime || event.start.date || ''))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  const daysDiff = Math.max(1, Math.ceil(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  ));

  const weeks = daysDiff / 7;
  return weeks > 0 ? events.length / weeks : null;
}

/**
 * Calculate client engagement score (0-100)
 */
export function getClientEngagementScore(events: GoogleCalendarEvent[]): number {
  const stats = calculateClientStats(events);
  return stats.engagementScore;
}

/**
 * Get events in date range
 */
export function getEventsInRange(
  events: GoogleCalendarEvent[],
  startDate: Date,
  endDate: Date
): GoogleCalendarEvent[] {
  return events.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    return eventDate >= startDate && eventDate <= endDate;
  });
}

/**
 * Get events by month
 */
export function getEventsByMonth(
  events: GoogleCalendarEvent[],
  year: number,
  month: number
): GoogleCalendarEvent[] {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return getEventsInRange(events, start, end);
}
