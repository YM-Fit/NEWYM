/**
 * React Hook for Health Checks
 * Provides health status monitoring for the application
 */

import { useState, useEffect, useCallback } from 'react';
import { runHealthChecks, getHealthStatus, SystemHealth, HealthStatus } from '../utils/healthCheck';
import { logger } from '../utils/logger';

interface UseHealthCheckOptions {
  /** Interval in milliseconds for automatic health checks */
  interval?: number;
  /** Enable automatic health checks */
  autoCheck?: boolean;
  /** Callback when health status changes */
  onStatusChange?: (status: HealthStatus) => void;
}

export interface UseHealthCheckResult {
  /** Current health status */
  health: SystemHealth | null;
  /** Overall health status */
  status: HealthStatus | null;
  /** Whether health check is in progress */
  isLoading: boolean;
  /** Last error from health check */
  error: Error | null;
  /** Manually trigger health check */
  checkHealth: () => Promise<void>;
}

/**
 * Hook for monitoring system health
 */
export function useHealthCheck(options: UseHealthCheckOptions = {}): UseHealthCheckResult {
  const { interval = 60000, autoCheck = false, onStatusChange } = options;

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const healthResult = await runHealthChecks();
      setHealth(healthResult);
      
      const previousStatus = status;
      setStatus(healthResult.overall);

      // Notify if status changed
      if (onStatusChange && previousStatus !== healthResult.overall) {
        onStatusChange(healthResult.overall);
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      logger.error('Health check failed', errorObj, 'HealthCheck');
    } finally {
      setIsLoading(false);
    }
  }, [status, onStatusChange]);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up interval if auto-check is enabled
    if (autoCheck && interval > 0) {
      const intervalId = setInterval(() => {
        checkHealth();
      }, interval);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [autoCheck, interval, checkHealth]);

  return {
    health,
    status,
    isLoading,
    error,
    checkHealth,
  };
}
