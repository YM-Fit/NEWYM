/**
 * Health Check System
 * Monitors system health including database, external services, and cache
 */

import { supabase } from '../lib/supabase';
import { logger } from './logger';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  latency?: number;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  overall: HealthStatus;
  timestamp: string;
  checks: HealthCheckResult[];
}

/**
 * Health check for database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const { data, error } = await supabase.from('trainers').select('id').limit(1).maybeSingle();

    const latency = Date.now() - startTime;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine - means DB is accessible
      return {
        name: 'database',
        status: 'unhealthy',
        message: `Database query failed: ${error.message}`,
        latency,
      };
    }

    return {
      name: 'database',
      status: latency > 5000 ? 'degraded' : 'healthy',
      message: 'Database is accessible',
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      name: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown database error',
      latency,
    };
  }
}

/**
 * Health check for Supabase Auth service
 */
async function checkAuthService(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    // Simple auth check - verify auth is accessible
    const { data: session } = await supabase.auth.getSession();
    const latency = Date.now() - startTime;

    return {
      name: 'auth',
      status: latency > 3000 ? 'degraded' : 'healthy',
      message: 'Auth service is accessible',
      latency,
      metadata: {
        hasSession: !!session?.session,
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      name: 'auth',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown auth error',
      latency,
    };
  }
}

/**
 * Health check for Google Calendar API (if configured)
 */
async function checkGoogleCalendar(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    // Check if Google Calendar integration is configured
    // This is a lightweight check - just verify configuration exists
    const googleCalendarConfigured = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleCalendarConfigured) {
      return {
        name: 'google-calendar',
        status: 'degraded',
        message: 'Google Calendar not configured',
        latency: Date.now() - startTime,
      };
    }

    // Could add actual API call here, but keeping it lightweight for now
    return {
      name: 'google-calendar',
      status: 'healthy',
      message: 'Google Calendar configured',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      name: 'google-calendar',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency,
    };
  }
}

/**
 * Health check for browser/local storage
 */
async function checkStorage(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    // Test localStorage
    const testKey = '__health_check__';
    const testValue = 'test';
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    if (retrieved !== testValue) {
      return {
        name: 'storage',
        status: 'unhealthy',
        message: 'Local storage not working correctly',
        latency: Date.now() - startTime,
      };
    }

    return {
      name: 'storage',
      status: 'healthy',
      message: 'Local storage is accessible',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      name: 'storage',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Storage check failed',
      latency,
    };
  }
}

/**
 * Health check for network connectivity
 */
async function checkNetwork(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    // Simple network check - try to fetch a small resource
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      return {
        name: 'network',
        status: latency > 3000 ? 'degraded' : 'healthy',
        message: 'Network connectivity OK',
        latency,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      name: 'network',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Network check failed',
      latency,
    };
  }
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<SystemHealth> {
  const checks: HealthCheckResult[] = [];

  // Run all checks in parallel
  const [database, auth, googleCalendar, storage, network] = await Promise.allSettled([
    checkDatabase(),
    checkAuthService(),
    checkGoogleCalendar(),
    checkStorage(),
    checkNetwork(),
  ]);

  // Collect results
  if (database.status === 'fulfilled') checks.push(database.value);
  if (auth.status === 'fulfilled') checks.push(auth.value);
  if (googleCalendar.status === 'fulfilled') checks.push(googleCalendar.value);
  if (storage.status === 'fulfilled') checks.push(storage.value);
  if (network.status === 'fulfilled') checks.push(network.value);

  // Determine overall health
  const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length;
  const degradedCount = checks.filter((c) => c.status === 'degraded').length;

  let overall: HealthStatus = 'healthy';
  if (unhealthyCount > 0) {
    overall = 'unhealthy';
  } else if (degradedCount > 0) {
    overall = 'degraded';
  }

  const result: SystemHealth = {
    overall,
    timestamp: new Date().toISOString(),
    checks,
  };

  // Log health status
  if (overall !== 'healthy') {
    logger.warn('System health check completed with issues', result, 'HealthCheck');
  } else {
    logger.info('System health check completed successfully', result, 'HealthCheck');
  }

  return result;
}

/**
 * Get health status summary
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const health = await runHealthChecks();
  return health.overall;
}
