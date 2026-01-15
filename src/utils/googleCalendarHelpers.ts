/**
 * Google Calendar Helper Utilities
 */

/**
 * Extract trainee name from calendar event
 */
export function extractTraineeNameFromEvent(event: {
  summary?: string;
  attendees?: Array<{ email?: string; displayName?: string }>;
}): string | null {
  // Try summary first (e.g., "אימון - שם המתאמן")
  if (event.summary) {
    const match = event.summary.match(/אימון\s*[-–]\s*(.+)/i);
    if (match) return match[1].trim();
  }

  // Try attendees
  if (event.attendees && event.attendees.length > 0) {
    const attendee = event.attendees.find(a => !a.email?.includes('@'));
    if (attendee) {
      return attendee.displayName || attendee.email?.split('@')[0] || null;
    }
  }

  return event.summary || null;
}

/**
 * Format date for Google Calendar
 */
export function formatDateForGoogleCalendar(date: Date): string {
  return date.toISOString();
}

/**
 * Parse Google Calendar date
 */
export function parseGoogleCalendarDate(
  dateTime?: string,
  date?: string
): Date | null {
  if (dateTime) {
    return new Date(dateTime);
  }
  if (date) {
    return new Date(date);
  }
  return null;
}

/**
 * Check if event is upcoming
 */
export function isEventUpcoming(event: {
  start: { dateTime?: string; date?: string };
}): boolean {
  const eventDate = parseGoogleCalendarDate(event.start.dateTime, event.start.date);
  if (!eventDate) return false;
  return eventDate >= new Date();
}

/**
 * Get event duration in minutes
 */
export function getEventDuration(event: {
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}): number | null {
  const start = parseGoogleCalendarDate(event.start.dateTime, event.start.date);
  const end = parseGoogleCalendarDate(event.end.dateTime, event.end.date);
  
  if (!start || !end) return null;
  
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}
