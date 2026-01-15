/**
 * Error Tracking Utility
 * Centralized error tracking and monitoring
 */

import { logger } from './logger';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error context information
 */
export interface ErrorContext {
  userId?: string;
  trainerId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * Error tracking service
 * In production, integrate with services like Sentry, LogRocket, etc.
 */
class ErrorTrackingService {
  private errors: Array<{
    error: Error;
    severity: ErrorSeverity;
    context: ErrorContext;
    timestamp: Date;
  }> = [];
  private maxErrors = 100;

  /**
   * Track an error
   * @param error - Error object
   * @param severity - Error severity level
   * @param context - Additional context information
   */
  track(
    error: Error | unknown,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {}
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    const errorEntry = {
      error: errorObj,
      severity,
      context,
      timestamp: new Date(),
    };

    this.errors.push(errorEntry);
    
    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log error
    logger.error(
      `[${severity.toUpperCase()}] ${errorObj.message}`,
      errorObj,
      context.component || 'ErrorTracking'
    );

    // In production, send to error tracking service
    if (import.meta.env.PROD) {
      this.sendToTrackingService(errorEntry);
    }
  }

  /**
   * Send error to external tracking service
   * @param errorEntry - Error entry to send
   */
  private sendToTrackingService(errorEntry: {
    error: Error;
    severity: ErrorSeverity;
    context: ErrorContext;
    timestamp: Date;
  }): void {
    // Integration with Sentry, LogRocket, etc.
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(errorEntry.error, {
    //     level: errorEntry.severity,
    //     tags: errorEntry.context,
    //   });
    // }

    // For now, just log to console in production
    if (import.meta.env.DEV) {
      console.error('Error tracked:', errorEntry);
    }
  }

  /**
   * Get recent errors
   * @param limit - Maximum number of errors to return
   * @returns Array of recent errors
   */
  getRecentErrors(limit: number = 10): Array<{
    error: Error;
    severity: ErrorSeverity;
    context: ErrorContext;
    timestamp: Date;
  }> {
    return this.errors.slice(-limit);
  }

  /**
   * Clear all tracked errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   * @returns Error statistics
   */
  getStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number;
  } {
    const bySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    this.errors.forEach((entry) => {
      bySeverity[entry.severity]++;
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = this.errors.filter(
      (entry) => entry.timestamp > oneHourAgo
    ).length;

    return {
      total: this.errors.length,
      bySeverity,
      recent,
    };
  }
}

export const errorTracking = new ErrorTrackingService();

/**
 * React Error Boundary helper
 */
export function captureErrorBoundaryError(
  error: Error,
  errorInfo: React.ErrorInfo,
  context?: ErrorContext
): void {
  errorTracking.track(error, ErrorSeverity.HIGH, {
    ...context,
    metadata: {
      componentStack: errorInfo.componentStack,
    },
  });
}

/**
 * Capture API error
 */
export function captureApiError(
  error: unknown,
  endpoint: string,
  context?: ErrorContext
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  errorTracking.track(errorObj, ErrorSeverity.MEDIUM, {
    ...context,
    action: `API: ${endpoint}`,
    metadata: {
      endpoint,
    },
  });
}

/**
 * Capture validation error
 */
export function captureValidationError(
  field: string,
  value: any,
  context?: ErrorContext
): void {
  const error = new Error(`Validation failed for field: ${field}`);
  errorTracking.track(error, ErrorSeverity.LOW, {
    ...context,
    action: 'Validation',
    metadata: {
      field,
      value: String(value).substring(0, 100), // Limit value length
    },
  });
}
