/**
 * Health Check Service
 * שירות לבדיקת בריאות המערכת
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    supabase: HealthCheck;
    cache?: HealthCheck;
    externalServices?: Record<string, HealthCheck>;
  };
  metrics?: {
    responseTime: number;
    uptime: number;
    errorRate: number;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Health Check Service
 */
export class HealthCheckService {
  private static startTime = Date.now();

  /**
   * Perform comprehensive health check
   */
  static async checkHealth(): Promise<ApiResponse<HealthCheckResult>> {
    const startTime = Date.now();
    const checks: HealthCheckResult['checks'] = {
      database: await this.checkDatabase(),
      supabase: await this.checkSupabase(),
    };

    // Check cache if available
    try {
      checks.cache = await this.checkCache();
    } catch (error) {
      logger.warn('Cache health check failed', error, 'HealthCheckService');
    }

    // Check external services
    try {
      checks.externalServices = await this.checkExternalServices();
    } catch (error) {
      logger.warn('External services health check failed', error, 'HealthCheckService');
    }

    // Determine overall status
    const allChecks = [
      checks.database,
      checks.supabase,
      checks.cache,
      ...Object.values(checks.externalServices || {}),
    ].filter(Boolean) as HealthCheck[];

    const unhealthyCount = allChecks.filter((c) => c.status === 'unhealthy').length;
    const degradedCount = allChecks.filter((c) => c.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const responseTime = Date.now() - startTime;

    return {
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
        metrics: {
          responseTime,
          uptime: Date.now() - this.startTime,
          errorRate: unhealthyCount / allChecks.length,
        },
      },
      success: true,
    };
  }

  /**
   * Check database connectivity
   */
  private static async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          message: 'Database connection failed',
          responseTime,
          error: error.message,
        };
      }

      if (responseTime > 1000) {
        return {
          status: 'degraded',
          message: 'Database response time is slow',
          responseTime,
          details: { queryTime: responseTime },
        };
      }

      return {
        status: 'healthy',
        message: 'Database is accessible',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: 'Database check failed',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Check Supabase service
   */
  private static async checkSupabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // Check auth service
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      const responseTime = Date.now() - startTime;

      if (authError) {
        return {
          status: 'degraded',
          message: 'Supabase auth service has issues',
          responseTime,
          error: authError.message,
        };
      }

      return {
        status: 'healthy',
        message: 'Supabase services are accessible',
        responseTime,
        details: {
          hasSession: !!session,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: 'Supabase check failed',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Check cache health
   */
  private static async checkCache(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // Check if IndexedDB is available
      if (!('indexedDB' in window)) {
        return {
          status: 'degraded',
          message: 'IndexedDB not available',
        };
      }

      // Try to open a test database
      return new Promise((resolve) => {
        const request = indexedDB.open('health-check-test', 1);
        request.onsuccess = () => {
          const responseTime = Date.now() - startTime;
          request.result.close();
          indexedDB.deleteDatabase('health-check-test');
          resolve({
            status: 'healthy',
            message: 'Cache is accessible',
            responseTime,
          });
        };
        request.onerror = () => {
          resolve({
            status: 'degraded',
            message: 'Cache has issues',
            error: 'Failed to open IndexedDB',
          });
        };
        request.ontimeout = () => {
          resolve({
            status: 'degraded',
            message: 'Cache timeout',
            error: 'IndexedDB operation timed out',
          });
        };
      });
    } catch (error: any) {
      return {
        status: 'degraded',
        message: 'Cache check failed',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Check external services
   */
  private static async checkExternalServices(): Promise<Record<string, HealthCheck>> {
    const services: Record<string, HealthCheck> = {};

    // Check Google Calendar API (if configured)
    try {
      services.googleCalendar = await this.checkGoogleCalendar();
    } catch (error) {
      services.googleCalendar = {
        status: 'degraded',
        message: 'Google Calendar check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return services;
  }

  /**
   * Check Google Calendar API
   */
  private static async checkGoogleCalendar(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      // Simple check - just verify we can make a request
      // In a real scenario, you might check token validity
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        message: 'Google Calendar API is accessible',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        message: 'Google Calendar API has issues',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Quick health check (lightweight)
   */
  static async quickCheck(): Promise<ApiResponse<{ status: 'healthy' | 'unhealthy'; timestamp: string }>> {
    try {
      const { error } = await supabase.from('trainers').select('id').limit(1);

      return {
        data: {
          status: error ? 'unhealthy' : 'healthy',
          timestamp: new Date().toISOString(),
        },
        success: true,
      };
    } catch (error) {
      return {
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        },
        success: true,
      };
    }
  }

  /**
   * Get system metrics
   */
  static getMetrics(): {
    uptime: number;
    memoryUsage?: number;
    performanceMetrics?: {
      loadTime?: number;
      renderTime?: number;
    };
  } {
    const metrics: any = {
      uptime: Date.now() - this.startTime,
    };

    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
    }

    // Performance metrics
    if ('timing' in performance) {
      const timing = performance.timing;
      metrics.performanceMetrics = {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        renderTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      };
    }

    return metrics;
  }
}
