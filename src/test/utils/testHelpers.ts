/**
 * Test Helpers
 * Helper functions for testing
 */

import { vi } from 'vitest';
import type { CalendarClient, ClientInteraction, ClientCalendarStats } from '../../api/crmClientsApi';
import type { GoogleCalendarEvent } from '../../api/googleCalendarApi';

/**
 * Create a mock calendar client
 */
export function createMockClient(overrides: Partial<CalendarClient> = {}): CalendarClient {
  return {
    id: 'client-1',
    trainer_id: 'trainer-1',
    google_client_identifier: 'test-client-id',
    client_name: 'Test Client',
    total_events_count: 10,
    upcoming_events_count: 2,
    completed_events_count: 8,
    last_event_date: new Date().toISOString(),
    crm_data: {},
    trainee_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock client interaction
 */
export function createMockInteraction(overrides: Partial<ClientInteraction> = {}): ClientInteraction {
  return {
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
    ...overrides,
  };
}

/**
 * Create a mock client calendar stats
 */
export function createMockClientStats(overrides: Partial<ClientCalendarStats> = {}): ClientCalendarStats {
  return {
    totalEvents: 10,
    upcomingEvents: 2,
    completedEvents: 8,
    lastEventDate: new Date().toISOString(),
    averageEventDuration: 60,
    ...overrides,
  };
}

/**
 * Create a mock Google Calendar event
 */
export function createMockCalendarEvent(overrides: Partial<GoogleCalendarEvent> = {}): GoogleCalendarEvent {
  return {
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
    ...overrides,
  };
}

/**
 * Create a mock trainer
 */
export function createMockTrainer(overrides: any = {}) {
  return {
    id: 'trainer-1',
    full_name: 'Test Trainer',
    email: 'trainer@test.com',
    ...overrides,
  };
}

/**
 * Create a mock trainee
 */
export function createMockTrainee(overrides: any = {}) {
  return {
    id: 'trainee-1',
    trainer_id: 'trainer-1',
    full_name: 'Test Trainee',
    email: 'trainee@test.com',
    phone: '0501234567',
    ...overrides,
  };
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for next tick
 */
export function waitForNextTick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Mock console methods to avoid noise in tests
 */
export function mockConsole() {
  const originalConsole = console;
  
  beforeAll(() => {
    global.console = {
      ...originalConsole,
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });
  
  afterAll(() => {
    global.console = originalConsole;
  });
}

/**
 * Create a mock API response
 */
export function createMockApiResponse<T>(data: T, success = true, error?: string) {
  if (success) {
    return { data, success: true };
  }
  return { error: error || 'Mock error', success: false };
}

/**
 * Create a mock error
 */
export function createMockError(message: string, code?: string) {
  const error = new Error(message);
  if (code) {
    (error as any).code = code;
  }
  return error;
}

/**
 * Assert that a function was called with specific arguments
 */
export function expectCalledWith(mockFn: any, ...args: any[]) {
  expect(mockFn).toHaveBeenCalledWith(...args);
}

/**
 * Assert that a function was called a specific number of times
 */
export function expectCalledTimes(mockFn: any, times: number) {
  expect(mockFn).toHaveBeenCalledTimes(times);
}

/**
 * Create a date string relative to now
 */
export function createDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}
