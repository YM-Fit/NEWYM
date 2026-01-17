/**
 * Mock Supabase Client
 * Comprehensive mock setup for Supabase in tests
 */

import { vi } from 'vitest';

/**
 * Create a mock Supabase query builder chain
 */
function createMockChain(mockData: any = null, mockError: any = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: mockData,
      error: mockError,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: mockData,
      error: mockError,
    }),
    then: vi.fn().mockResolvedValue({
      data: mockData,
      error: mockError,
    }),
  };

  // Make it a Promise-like object
  chain.then.mockResolvedValue({ data: mockData, error: mockError });

  return chain;
}

/**
 * Mock Supabase client
 */
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    setSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
  },
  from: vi.fn().mockImplementation((table: string) => {
    return createMockChain();
  }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
    unsubscribe: vi.fn().mockResolvedValue('OK'),
  }),
  removeChannel: vi.fn().mockResolvedValue('OK'),
};

/**
 * Reset all Supabase mocks
 */
export function resetSupabaseMocks() {
  vi.clearAllMocks();
  
  // Reset auth mocks
  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  
  // Reset from mock to return a default chain
  mockSupabaseClient.from.mockImplementation((table: string) => {
    return createMockChain();
  });
}

/**
 * Set mock data for a specific table query
 */
export function setMockTableData(table: string, data: any, error: any = null) {
  const chain = createMockChain(data, error);
  mockSupabaseClient.from.mockImplementation((t: string) => {
    if (t === table) {
      return chain;
    }
    return createMockChain();
  });
}

/**
 * Create a mock Supabase error
 */
export function createMockSupabaseError(message: string, code?: string, details?: string) {
  return {
    message,
    details: details || message,
    hint: null,
    code: code || 'PGRST000',
  };
}

/**
 * Create a mock Supabase response
 */
export function createMockSupabaseResponse<T>(data: T | null, error: any = null) {
  return {
    data,
    error,
    count: data ? (Array.isArray(data) ? data.length : 1) : null,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
}
