/**
 * Test Fixtures
 * Pre-configured test data fixtures for common scenarios
 */

import type { CalendarClient, ClientInteraction, ClientCalendarStats } from '../../api/crmClientsApi';
import type { GoogleCalendarEvent } from '../../api/googleCalendarApi';
import type { Trainee } from '../../types';

/**
 * Fixture: Default Trainer
 */
export const defaultTrainer = {
  id: 'trainer-1',
  full_name: 'Test Trainer',
  email: 'trainer@test.com',
  phone: '0501234567',
  is_trainee: false,
};

/**
 * Fixture: Default Trainee
 */
export const defaultTrainee: Trainee = {
  id: 'trainee-1',
  trainer_id: 'trainer-1',
  full_name: 'Test Trainee',
  email: 'trainee@test.com',
  phone: '0501234567',
  date_of_birth: '1990-01-01',
  gender: 'male',
  height: 180,
  crm_status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Fixture: Default Calendar Client
 */
export const defaultClient: CalendarClient = {
  id: 'client-1',
  trainer_id: 'trainer-1',
  google_client_identifier: 'client@example.com',
  client_name: 'Test Client',
  client_email: 'client@example.com',
  total_events_count: 10,
  upcoming_events_count: 2,
  completed_events_count: 8,
  last_event_date: new Date().toISOString(),
  crm_data: {},
  trainee_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Fixture: Default Client Interaction
 */
export const defaultInteraction: ClientInteraction = {
  id: 'interaction-1',
  trainee_id: 'trainee-1',
  trainer_id: 'trainer-1',
  interaction_type: 'call',
  interaction_date: new Date().toISOString(),
  subject: 'Test Subject',
  description: 'Test Description',
  outcome: null,
  next_action: null,
  next_action_date: null,
  google_event_id: null,
  created_at: new Date().toISOString(),
};

/**
 * Fixture: Default Client Calendar Stats
 */
export const defaultClientStats: ClientCalendarStats = {
  totalEvents: 10,
  upcomingEvents: 2,
  completedEvents: 8,
  lastEventDate: new Date().toISOString(),
  averageEventDuration: 60,
};

/**
 * Fixture: Default Google Calendar Event
 */
export const defaultCalendarEvent: GoogleCalendarEvent = {
  id: 'event-1',
  summary: 'Test Event',
  description: 'Test Description',
  start: {
    dateTime: new Date().toISOString(),
    timeZone: 'Asia/Jerusalem',
  },
  end: {
    dateTime: new Date(Date.now() + 3600000).toISOString(),
    timeZone: 'Asia/Jerusalem',
  },
  attendees: [],
};

/**
 * Fixture: Multiple Clients
 */
export function createMultipleClients(count: number): CalendarClient[] {
  return Array.from({ length: count }, (_, i) => ({
    ...defaultClient,
    id: `client-${i + 1}`,
    client_name: `Test Client ${i + 1}`,
    client_email: `client${i + 1}@example.com`,
  }));
}

/**
 * Fixture: Multiple Interactions
 */
export function createMultipleInteractions(count: number): ClientInteraction[] {
  return Array.from({ length: count }, (_, i) => ({
    ...defaultInteraction,
    id: `interaction-${i + 1}`,
    interaction_date: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

/**
 * Fixture: Multiple Trainees with different CRM statuses
 */
export function createTraineesWithStatuses(): Trainee[] {
  const statuses = ['lead', 'qualified', 'active', 'inactive', 'churned', 'on_hold'];
  return statuses.map((status, i) => ({
    ...defaultTrainee,
    id: `trainee-${i + 1}`,
    full_name: `Test Trainee ${i + 1}`,
    crm_status: status as any,
  }));
}

/**
 * Fixture: Client with Linked Trainee
 */
export const clientWithTrainee: CalendarClient = {
  ...defaultClient,
  trainee_id: 'trainee-1',
  crm_data: {
    status: 'active',
    linked_at: new Date().toISOString(),
  },
};

/**
 * Fixture: Client Needing Follow-up (last contact > 7 days ago)
 */
export const clientNeedingFollowUp: CalendarClient = {
  ...defaultClient,
  id: 'client-needs-followup',
  last_event_date: new Date(Date.now() - 10 * 86400000).toISOString(),
  crm_data: {
    last_contact_date: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
};

/**
 * Fixture: Active Client with Many Events
 */
export const activeClientWithEvents: CalendarClient = {
  ...defaultClient,
  id: 'client-active',
  total_events_count: 50,
  upcoming_events_count: 5,
  completed_events_count: 45,
  crm_data: {
    status: 'active',
    total_revenue: 5000,
  },
};
