import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { logger } from '../utils/logger';
import type { PostgrestError } from '@supabase/supabase-js';
import { initializeCSRF } from '../utils/csrf';

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

// Initialize CSRF token
const csrfToken = initializeCSRF();

// Create Supabase client with enhanced configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-client-info': 'newym-app',
      'x-csrf-token': csrfToken, // Add CSRF token to all requests
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

// Error deduplication: track recent errors to avoid spam
const errorLogCache = new Map<string, number>();
const ERROR_CACHE_TIME = 5000; // Don't log same error within 5 seconds

function getErrorCacheKey(error: PostgrestError, context: string): string {
  return `${context}:${error.code || 'NO_CODE'}:${error.message.substring(0, 50)}`;
}

/**
 * Helper function to log Supabase errors with context
 * Use this when handling Supabase query results
 */
export function logSupabaseError(
  error: PostgrestError | null,
  context: string,
  additionalInfo?: Record<string, any>
) {
  if (!error) return;
  
  // Deduplicate error logs to prevent spam
  const errorKey = getErrorCacheKey(error, context);
  const now = Date.now();
  const lastLogged = errorLogCache.get(errorKey);
  
  if (lastLogged && now - lastLogged < ERROR_CACHE_TIME) {
    // Same error logged recently, skip to avoid spam
    return;
  }
  
  errorLogCache.set(errorKey, now);
  // Clean old entries periodically
  if (errorLogCache.size > 100) {
    const cutoff = now - ERROR_CACHE_TIME;
    for (const [key, timestamp] of errorLogCache.entries()) {
      if (timestamp < cutoff) {
        errorLogCache.delete(key);
      }
    }
  }
  
  // Extract table name from context if available
  const tableMatch = context.match(/from\(['"]([\w_]+)['"]/);
  const tableName = tableMatch ? tableMatch[1] : additionalInfo?.table || 'unknown';
  
  // Skip logging for common expected errors that don't need attention
  const commonIgnoredErrors = [
    'PGRST116', // Resource not found (404) - common when checking existence
    '23505', // Unique violation - might be expected in upserts
  ];
  
  if (error.code && commonIgnoredErrors.includes(error.code)) {
    // Still log but with lower priority
    logger.debug(
      `⚠️ Supabase request warning: ${context}`,
      {
        table: tableName,
        errorCode: error.code,
        errorMessage: error.message,
        note: 'This is a common/expected error',
      },
      'SupabaseClient'
    );
    return;
  }
  
  logger.error(
    `❌ Supabase request failed: ${context}`,
    {
      table: tableName,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      ...additionalInfo,
      // Full error object for debugging
      fullError: {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
    },
    'SupabaseClient'
  );
  
  // Also log a more readable version to console
  console.group(`🔴 Supabase Error in: ${context}`);
  console.error('📊 Table:', tableName);
  console.error('🔢 Error Code:', error.code || 'N/A');
  console.error('💬 Message:', error.message);
  if (error.details) console.error('📋 Details:', error.details);
  if (error.hint) console.error('💡 Hint:', error.hint);
  if (additionalInfo && Object.keys(additionalInfo).length > 0) {
    console.error('🔍 Additional Context:', additionalInfo);
  }
  console.groupEnd();
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
