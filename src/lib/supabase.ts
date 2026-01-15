import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { logger } from '../utils/logger';
import type { PostgrestError } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Missing Supabase environment variables');
  logger.error(
    'Supabase initialization failed',
    {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
    },
    'SupabaseClient'
  );
  throw error;
}

// Create Supabase client with enhanced configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-client-info': 'newym-app',
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper function to log Supabase errors with context
 * Use this when handling Supabase query results
 */
export function logSupabaseError(
  error: PostgrestError | null,
  context: string,
  additionalInfo?: Record<string, any>
) {
  if (error) {
    logger.error(
      `Supabase request failed: ${context}`,
      {
        ...additionalInfo,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      },
      'SupabaseClient'
    );
  }
}

/**
 * Helper function to handle Supabase responses with automatic error logging
 */
export async function handleSupabaseResponse<T>(
  promise: Promise<{ data: T | null; error: PostgrestError | null }>,
  context: string,
  additionalInfo?: Record<string, any>
): Promise<{ data: T | null; error: PostgrestError | null }> {
  try {
    const result = await promise;
    if (result.error) {
      logSupabaseError(result.error, context, additionalInfo);
    }
    return result;
  } catch (error) {
    logger.error(
      `Supabase request exception: ${context}`,
      {
        ...additionalInfo,
        error,
      },
      'SupabaseClient'
    );
    throw error;
  }
}
