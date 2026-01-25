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

// Detect WebContainer/StackBlitz environments where WebSockets may not work
function isWebContainerEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  const userAgent = navigator.userAgent || '';
  
  return (
    hostname.includes('stackblitz') ||
    hostname.includes('webcontainer') ||
    hostname.includes('stackblitz.io') ||
    userAgent.includes('webcontainer') ||
    // Check for WebContainer runtime in error stack traces
    (typeof Error !== 'undefined' && new Error().stack?.includes('webcontainer'))
  );
}

const isWebContainer = isWebContainerEnvironment();

// Suppress WebSocket connection errors in WebContainer environments
if (isWebContainer && typeof window !== 'undefined') {
  // Suppress console.error for WebSocket connection failures
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    const fullMessage = args.map(arg => String(arg)).join(' ');
    // Suppress WebSocket connection errors to Supabase Realtime
    if (
      (message.includes('WebSocket connection') || fullMessage.includes('WebSocket connection')) &&
      (message.includes('supabase.co/realtime') || fullMessage.includes('supabase.co/realtime') || fullMessage.includes('realtime/v1/websocket'))
    ) {
      // Silently ignore WebSocket errors in WebContainer
      return;
    }
    originalError.apply(console, args);
  };
  
  // Suppress console.warn for WebSocket warnings
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    const fullMessage = args.map(arg => String(arg)).join(' ');
    if (
      (message.includes('WebSocket') || fullMessage.includes('WebSocket')) &&
      (message.includes('supabase') || fullMessage.includes('supabase') || fullMessage.includes('realtime'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
  
  // Suppress unhandled promise rejections related to WebSockets
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || '';
    if (
      reason.includes('WebSocket') &&
      (reason.includes('supabase.co/realtime') || reason.includes('realtime/v1/websocket'))
    ) {
      event.preventDefault();
    }
  });
  
  // Suppress global error events for WebSocket failures
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    const source = event.filename || '';
    if (
      message.includes('WebSocket') &&
      (message.includes('supabase.co/realtime') || message.includes('realtime/v1/websocket') || source.includes('supabase'))
    ) {
      event.preventDefault();
    }
  }, true);
}

// Initialize CSRF token
const csrfToken = initializeCSRF();

// Create Supabase client with enhanced configuration
// Disable Realtime in WebContainer environments where WebSockets don't work
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
  // Disable Realtime in WebContainer environments to prevent WebSocket errors
  realtime: isWebContainer
    ? undefined
    : {
        params: {
          eventsPerSecond: 10,
        },
      },
});

// Log if Realtime is disabled
if (isWebContainer) {
  logger.info(
    'Supabase Realtime disabled in WebContainer environment',
    {
      reason: 'WebSocket connections are not supported in WebContainer/StackBlitz',
      note: 'Real-time features will not be available',
    },
    'SupabaseClient'
  );
}

/**
 * Check if Realtime is available in the current environment
 * Returns false in WebContainer/StackBlitz environments where WebSockets don't work
 */
export function isRealtimeAvailable(): boolean {
  return !isWebContainer;
}

// Error deduplication: track recent errors to avoid spam
const errorLogCache = new Map<string, number>();
const ERROR_CACHE_TIME = 5000; // Don't log same error within 5 seconds

function getErrorCacheKey(error: PostgrestError, context: string): string {
  // Include error ID if present (Supabase sometimes includes error IDs in the format: project:session:timestamp:sequence)
  const errorIdMatch = error.message?.match(/([a-f0-9]{32}:[a-zA-Z0-9]+:\d+:\d+)/);
  const errorId = errorIdMatch ? errorIdMatch[1] : '';
  return `${context}:${error.code || 'NO_CODE'}:${errorId || error.message?.substring(0, 50) || 'UNKNOWN'}`;
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
    'PGRST301', // JWT expired - handled by auto refresh
    'PGRST301', // JWT missing - handled by auth flow
  ];
  
  if (error.code && commonIgnoredErrors.includes(error.code)) {
    // Still log but with lower priority - don't spam console
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
  
  // Extract error ID if present in the error message
  const errorIdMatch = error.message?.match(/([a-f0-9]{32}:[a-zA-Z0-9]+:\d+:\d+)/);
  const errorId = errorIdMatch ? errorIdMatch[1] : null;
  
  logger.error(
    `❌ Supabase request failed: ${context}`,
    {
      table: tableName,
      errorCode: error.code,
      errorMessage: error.message,
      errorId: errorId, // Include extracted error ID for tracking
      errorDetails: error.details,
      errorHint: error.hint,
      ...additionalInfo,
      // Full error object for debugging
      fullError: {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        errorId: errorId,
      },
    },
    'SupabaseClient'
  );
  
  // Only log to console in development, and only for non-ignored errors
  // In production or for ignored errors, we rely on logger only
  // Also suppress console errors from WebContainer/StackBlitz preview scripts
  const isWebContainerError = error.message?.includes('webcontainer') || 
                              error.message?.includes('preview-script') ||
                              context.includes('webcontainer');
  
  if (import.meta.env.DEV && 
      !commonIgnoredErrors.includes(error.code || '') && 
      !isWebContainerError) {
    // Extract error ID if present
    const errorIdMatch = error.message?.match(/([a-f0-9]{32}:[a-zA-Z0-9]+:\d+:\d+)/);
    const errorId = errorIdMatch ? errorIdMatch[1] : null;
    
    // Use console.group only if it's a real error we care about
    console.group(`🔴 Supabase Error in: ${context}`);
    console.error('📊 Table:', tableName);
    console.error('🔢 Error Code:', error.code || 'N/A');
    if (errorId) console.error('🆔 Error ID:', errorId);
    console.error('💬 Message:', error.message);
    if (error.details) console.error('📋 Details:', error.details);
    if (error.hint) console.error('💡 Hint:', error.hint);
    if (additionalInfo && Object.keys(additionalInfo).length > 0) {
      console.error('🔍 Additional Context:', additionalInfo);
    }
    console.groupEnd();
  }
}

/**
 * Helper function to extract error ID from error message
 */
export function extractErrorId(error: PostgrestError | Error | string | null | unknown): string | null {
  if (!error) return null;
  
  let errorMessage = '';
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as { message: unknown }).message);
  }
  
  if (!errorMessage) return null;
  
  const errorIdMatch = errorMessage.match(/([a-f0-9]{32}:[a-zA-Z0-9]+:\d+:\d+)/);
  return errorIdMatch ? errorIdMatch[1] : null;
}

/**
 * Helper function to check if an error matches a specific error ID
 */
export function isErrorId(error: PostgrestError | Error | string | null | unknown, errorId: string): boolean {
  const extractedId = extractErrorId(error);
  return extractedId === errorId;
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
      
      // Check for specific error ID and log it
      const errorId = extractErrorId(result.error);
      if (errorId) {
        logger.warn(
          `Supabase error with ID detected: ${errorId}`,
          {
            errorId,
            context,
            ...additionalInfo,
          },
          'SupabaseClient'
        );
      }
    }
    return result;
  } catch (error) {
    const errorId = extractErrorId(error);
    logger.error(
      `Supabase request exception: ${context}`,
      {
        ...additionalInfo,
        error,
        errorId,
      },
      'SupabaseClient'
    );
    throw error;
  }
}
