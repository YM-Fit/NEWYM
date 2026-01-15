/**
 * CRM Clients API layer
 */

import { supabase } from '../lib/supabase';
import type { ApiResponse } from './types';

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
 */
export async function getClientsFromCalendar(
  trainerId: string
): Promise<ApiResponse<CalendarClient[]>> {
  try {
    const { data, error } = await supabase
      .from('google_calendar_clients')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('last_event_date', { ascending: false, nullsFirst: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת לקוחות מה-Calendar' };
  }
}

/**
 * Get client calendar statistics
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
 * Create client interaction
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
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת אינטראקציות' };
  }
}

/**
 * Link trainee to calendar client
 */
export async function linkTraineeToCalendarClient(
  traineeId: string,
  clientId: string,
  trainerId: string
): Promise<ApiResponse> {
  try {
    // Verify trainee belongs to trainer
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .select('trainer_id')
      .eq('id', traineeId)
      .single();

    if (traineeError || !trainee || trainee.trainer_id !== trainerId) {
      return { error: 'אין גישה למתאמן זה' };
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
      return { error: clientUpdateError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בקישור מתאמן ללקוח' };
  }
}
