/**
 * Utility functions for debugging Supabase connection issues
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';

/**
 * Check if Supabase is properly configured and accessible
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  details?: any;
}> {
  try {
    // Try a simple query to check connection
    const { data, error } = await supabase
      .from('trainers')
      .select('id')
      .limit(1);

    if (error) {
      return {
        connected: false,
        error: error.message,
        details: {
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      };
    }

    return {
      connected: true,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return {
      connected: false,
      error: errorMessage,
      details: err,
    };
  }
}

/**
 * Verify Supabase environment variables are set
 */
export function checkSupabaseEnv(): {
  valid: boolean;
  missing: string[];
} {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing: string[] = [];

  required.forEach((key) => {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Log Supabase configuration (without sensitive data)
 */
export function logSupabaseConfig() {
  const envCheck = checkSupabaseEnv();
  
  if (!envCheck.valid) {
    logger.error(
      'Supabase environment variables missing',
      { missing: envCheck.missing },
      'SupabaseDebug'
    );
    return;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const keyPrefix = import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) || '';

  logger.info(
    'Supabase configuration',
    {
      url,
      keyPrefix: `${keyPrefix}...`,
      keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0,
    },
    'SupabaseDebug'
  );
}

/**
 * Run a comprehensive Supabase health check
 */
export async function runSupabaseHealthCheck(): Promise<void> {
  logger.info('Running Supabase health check...', undefined, 'SupabaseDebug');

  // Check environment variables
  const envCheck = checkSupabaseEnv();
  if (!envCheck.valid) {
    logger.error(
      'Supabase health check failed: Missing environment variables',
      { missing: envCheck.missing },
      'SupabaseDebug'
    );
    return;
  }

  // Log configuration
  logSupabaseConfig();

  // Check connection
  const connectionCheck = await checkSupabaseConnection();
  if (!connectionCheck.connected) {
    logger.error(
      'Supabase health check failed: Connection error',
      connectionCheck,
      'SupabaseDebug'
    );
    return;
  }

  logger.info('Supabase health check passed', undefined, 'SupabaseDebug');
}

// Auto-run health check in development
if (import.meta.env.DEV) {
  // Run after a short delay to allow app to initialize
  setTimeout(() => {
    runSupabaseHealthCheck().catch((err) => {
      logger.error('Health check error', err, 'SupabaseDebug');
    });
  }, 1000);
}
