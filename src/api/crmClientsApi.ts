/**
 * CRM Clients API layer
 * 
 * @module crmClientsApi
 * @description API layer for managing CRM clients and interactions.
 * Provides functions for retrieving clients from Google Calendar,
 * managing client interactions, and linking clients to trainees.
 * 
 * @example
 * ```typescript
 * import { getClientsFromCalendar, createClientInteraction } from './api/crmClientsApi';
 * 
 * // Get all clients for a trainer
 * const result = await getClientsFromCalendar(trainerId);
 * if (result.success) {
 *   console.log(result.data);
 * }
 * 
 * // Create an interaction
 * const interaction = await createClientInteraction({
 *   trainee_id: 'trainee-123',
 *   trainer_id: 'trainer-456',
 *   interaction_type: 'call',
 *   subject: 'Follow-up call',
 * });
 * ```
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import type { ApiResponse } from './types';
import { CRM_VALIDATION } from '../constants/crmConstants';

export interface CalendarClient {
  id: string;
  trainer_id: string;
  trainee_id?: string;
  google_client_identifier: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  first_event_date?: string;
  last_event_date?: string;
  total_events_count: number;
  upcoming_events_count: number;
  completed_events_count: number;
  crm_data: Record<string, any>;
}

export interface ClientInteraction {
  id: string;
  trainee_id: string;
  trainer_id: string;
  interaction_type: 'call' | 'email' | 'sms' | 'meeting' | 'workout' | 'message' | 'note';
  interaction_date: string;
  subject?: string;
  description?: string;
  outcome?: string;
  next_action?: string;
  next_action_date?: string;
  google_event_id?: string;
}

export interface ClientCalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  lastEventDate?: string;
  firstEventDate?: string;
  workoutFrequency?: number; // events per week
}

/**
 * Get clients from Google Calendar
 * 
 * @param trainerId - The unique identifier of the trainer
 * @returns Promise resolving to an ApiResponse containing an array of CalendarClient objects
 * 
 * @throws {Error} If trainerId is missing or invalid
 * 
 * @example
 * ```typescript
 * const result = await getClientsFromCalendar('trainer-123');
 * if (result.success && result.data) {
 *   result.data.forEach(client => {
 *     console.log(client.client_name);
 *   });
 * }
 * ```
 * 
 * @remarks
 * This function retrieves all clients associated with a trainer from the Google Calendar sync.
 * Clients are ordered by last_event_date in descending order (most recent first).
 */
export async function getClientsFromCalendar(
  trainerId: string
): Promise<ApiResponse<CalendarClient[]>> {
  if (!trainerId || typeof trainerId !== 'string') {
    return { error: 'trainerId הוא חובה' };
  }

  try {
    const { data, error } = await supabase
      .from('google_calendar_clients')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('last_event_date', { ascending: false, nullsFirst: false });

    if (error) {
      logSupabaseError(error, 'getClientsFromCalendar', { table: 'google_calendar_clients', trainerId });
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת לקוחות מה-Calendar' };
  }
}

/**
 * Get client calendar statistics
 * 
 * @param clientId - The unique identifier of the client
 * @returns Promise resolving to an ApiResponse containing ClientCalendarStats
 * 
 * @example
 * ```typescript
 * const stats = await getClientCalendarStats('client-123');
 * if (stats.success && stats.data) {
 *   console.log(`Total events: ${stats.data.totalEvents}`);
 *   console.log(`Workout frequency: ${stats.data.workoutFrequency} per week`);
 * }
 * ```
 * 
 * @remarks
 * Calculates statistics including total events, upcoming events, completed events,
 * and workout frequency (events per week) based on first and last event dates.
 */
export async function getClientCalendarStats(
  clientId: string
): Promise<ApiResponse<ClientCalendarStats>> {
  try {
    const { data: client, error: clientError } = await supabase
      .from('google_calendar_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return { error: 'לקוח לא נמצא' };
    }

    // Calculate workout frequency (events per week)
    let workoutFrequency: number | undefined;
    if (client.first_event_date && client.last_event_date) {
      const firstDate = new Date(client.first_event_date);
      const lastDate = new Date(client.last_event_date);
      const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
      const weeks = daysDiff / 7;
      if (weeks > 0 && client.total_events_count > 0) {
        workoutFrequency = client.total_events_count / weeks;
      }
    }

    const stats: ClientCalendarStats = {
      totalEvents: client.total_events_count || 0,
      upcomingEvents: client.upcoming_events_count || 0,
      completedEvents: client.completed_events_count || 0,
      lastEventDate: client.last_event_date || undefined,
      firstEventDate: client.first_event_date || undefined,
      workoutFrequency,
    };

    return { data: stats, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בחישוב סטטיסטיקות לקוח' };
  }
}

/**
 * Get client upcoming events
 */
export async function getClientUpcomingEvents(
  clientId: string,
  trainerId: string
): Promise<ApiResponse<any[]>> {
  try {
    const { data: client, error: clientError } = await supabase
      .from('google_calendar_clients')
      .select('google_client_identifier')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return { error: 'לקוח לא נמצא' };
    }

    const now = new Date();
    const { data: syncs, error: syncError } = await supabase
      .from('google_calendar_sync')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('sync_status', 'synced')
      .gte('event_start_time', now.toISOString())
      .order('event_start_time', { ascending: true });

    if (syncError) {
      return { error: syncError.message };
    }

    // Filter by client identifier if we can match it
    const upcoming = syncs?.filter(sync => {
      // This is a simplified matching - in reality, we'd need to match by attendee email or event summary
      return true;
    }) || [];

    return { data: upcoming, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת אירועים קרובים' };
  }
}

/**
 * Sync client from Calendar
 */
export async function syncClientFromCalendar(
  clientId: string,
  trainerId: string
): Promise<ApiResponse> {
  try {
    // This would trigger a sync for this specific client
    // For now, we'll just return success as the periodic sync will handle it
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בסנכרון לקוח' };
  }
}

/**
 * Create a new client interaction record
 * 
 * @param interaction - Interaction data (without id and created_at)
 * @param interaction.trainee_id - The trainee ID associated with this interaction
 * @param interaction.trainer_id - The trainer ID
 * @param interaction.interaction_type - Type of interaction (call, email, sms, etc.)
 * @param interaction.interaction_date - Date of the interaction (defaults to now if not provided)
 * @param interaction.subject - Optional subject/title of the interaction
 * @param interaction.description - Optional detailed description
 * @param interaction.outcome - Optional outcome of the interaction
 * @param interaction.next_action - Optional next action required
 * @param interaction.next_action_date - Optional date for next action
 * @param interaction.google_event_id - Optional Google Calendar event ID
 * 
 * @returns Promise resolving to an ApiResponse containing the created ClientInteraction
 * 
 * @example
 * ```typescript
 * const interaction = await createClientInteraction({
 *   trainee_id: 'trainee-123',
 *   trainer_id: 'trainer-456',
 *   interaction_type: 'call',
 *   subject: 'Follow-up call',
 *   description: 'Discussed progress and goals',
 *   next_action: 'Schedule next session',
 *   next_action_date: '2025-02-01',
 * });
 * ```
 * 
 * @remarks
 * This function also automatically updates the trainee's last_contact_date
 * and next_followup_date fields based on the interaction data.
 */
export async function createClientInteraction(
  interaction: Omit<ClientInteraction, 'id' | 'created_at'>
): Promise<ApiResponse<ClientInteraction>> {
  try {
    const { data, error } = await supabase
      .from('client_interactions')
      .insert([{
        trainee_id: interaction.trainee_id,
        trainer_id: interaction.trainer_id,
        interaction_type: interaction.interaction_type,
        interaction_date: interaction.interaction_date || new Date().toISOString(),
        subject: interaction.subject,
        description: interaction.description,
        outcome: interaction.outcome,
        next_action: interaction.next_action,
        next_action_date: interaction.next_action_date,
        google_event_id: interaction.google_event_id,
      }])
      .select()
      .single();

    if (error) {
      logSupabaseError(error, 'createClientInteraction', { 
        table: 'client_interactions',
        trainee_id: interaction.trainee_id,
        interaction_type: interaction.interaction_type,
      });
      return { error: error.message };
    }

    // Update trainee's last_contact_date
    await supabase
      .from('trainees')
      .update({
        last_contact_date: interaction.interaction_date || new Date().toISOString(),
        next_followup_date: interaction.next_action_date || undefined,
      })
      .eq('id', interaction.trainee_id);

    return { data, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה ביצירת אינטראקציה' };
  }
}

/**
 * Get client interactions
 */
export async function getClientInteractions(
  traineeId: string
): Promise<ApiResponse<ClientInteraction[]>> {
  try {
    const { data, error } = await supabase
      .from('client_interactions')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('interaction_date', { ascending: false });

    if (error) {
      logSupabaseError(error, 'getClientInteractions', { 
        table: 'client_interactions',
        traineeId,
      });
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת אינטראקציות' };
  }
}

/**
 * Link a trainee to a calendar client
 * 
 * @param traineeId - The unique identifier of the trainee
 * @param clientId - The unique identifier of the calendar client
 * @param trainerId - The unique identifier of the trainer (for authorization)
 * @returns Promise resolving to an ApiResponse indicating success or failure
 * 
 * @throws {Error} If any of the required IDs are missing or invalid
 * @throws {Error} If trainee or client doesn't exist or doesn't belong to trainer
 * 
 * @example
 * ```typescript
 * const result = await linkTraineeToCalendarClient(
 *   'trainee-123',
 *   'client-456',
 *   'trainer-789'
 * );
 * if (result.success) {
 *   console.log('Trainee linked successfully');
 * }
 * ```
 * 
 * @remarks
 * This function performs a two-way link:
 * 1. Updates the trainee record with google_calendar_client_id
 * 2. Updates the client record with trainee_id
 * 
 * If the client update fails, the trainee update is automatically reverted.
 * Both records must belong to the same trainer for security.
 */
export async function linkTraineeToCalendarClient(
  traineeId: string,
  clientId: string,
  trainerId: string
): Promise<ApiResponse> {
  // Input validation
  if (!traineeId || typeof traineeId !== 'string') {
    return { error: 'traineeId הוא חובה' };
  }
  if (!clientId || typeof clientId !== 'string') {
    return { error: 'clientId הוא חובה' };
  }
  if (!trainerId || typeof trainerId !== 'string') {
    return { error: 'trainerId הוא חובה' };
  }

  try {
    // Verify trainee belongs to trainer
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .select('trainer_id, google_calendar_client_id')
      .eq('id', traineeId)
      .single();

    if (traineeError || !trainee) {
      return { error: 'מתאמן לא נמצא' };
    }

    if (trainee.trainer_id !== trainerId) {
      return { error: 'אין גישה למתאמן זה' };
    }

    // Verify client belongs to trainer
    const { data: client, error: clientError } = await supabase
      .from('google_calendar_clients')
      .select('id, trainer_id')
      .eq('id', clientId)
      .eq('trainer_id', trainerId)
      .single();

    if (clientError || !client) {
      return { error: 'כרטיס לקוח לא נמצא או אין גישה' };
    }

    // Update trainee with client link
    const { error: updateError } = await supabase
      .from('trainees')
      .update({ google_calendar_client_id: clientId })
      .eq('id', traineeId);

    if (updateError) {
      return { error: updateError.message };
    }

    // Update client with trainee link
    const { error: clientUpdateError } = await supabase
      .from('google_calendar_clients')
      .update({ trainee_id: traineeId })
      .eq('id', clientId)
      .eq('trainer_id', trainerId);

    if (clientUpdateError) {
      // Try to revert trainee update on error
      await supabase
        .from('trainees')
        .update({ google_calendar_client_id: trainee.google_calendar_client_id || null })
        .eq('id', traineeId);
      
      return { error: clientUpdateError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בקישור מתאמן ללקוח' };
  }
}
