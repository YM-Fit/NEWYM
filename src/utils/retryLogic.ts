/**
 * Retry Logic Utility
 * מערכת retry מתקדמת עם exponential backoff, strategies, ו-circuit breaker
 */

import { logger } from './logger';

export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  IMMEDIATE = 'immediate',
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  strategy?: RetryStrategy;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onFailure?: (error: any, attempts: number) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenAttempts?: number;
}

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, reject requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * Circuit Breaker class
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;

  constructor(
    private options: CircuitBreakerOptions = {},
    private name: string = 'CircuitBreaker'
  ) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      halfOpenAttempts: options.halfOpenAttempts || 3,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout!) {
        // Try to recover
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
        logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`, undefined, 'CircuitBreaker');
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.options.halfOpenAttempts!) {
        // Service recovered
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.halfOpenAttempts = 0;
        logger.info(`Circuit breaker ${this.name} recovered, entering CLOSED state`, undefined, 'CircuitBreaker');
      }
    } else {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during half-open, go back to open
      this.state = CircuitState.OPEN;
      this.halfOpenAttempts = 0;
      logger.warn(`Circuit breaker ${this.name} failed during HALF_OPEN, entering OPEN state`, undefined, 'CircuitBreaker');
    } else if (this.failures >= this.options.failureThreshold!) {
      // Too many failures, open circuit
      this.state = CircuitState.OPEN;
      logger.warn(`Circuit breaker ${this.name} opened after ${this.failures} failures`, undefined, 'CircuitBreaker');
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Calculate delay based on strategy
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  strategy: RetryStrategy
): number {
  switch (strategy) {
    case RetryStrategy.EXPONENTIAL_BACKOFF:
      return Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
    
    case RetryStrategy.LINEAR_BACKOFF:
      return Math.min(initialDelay * attempt, maxDelay);
    
    case RetryStrategy.FIXED_DELAY:
      return initialDelay;
    
    case RetryStrategy.IMMEDIATE:
      return 0;
    
    default:
      return initialDelay;
  }
}

/**
 * Retry a function with the specified options
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    strategy = RetryStrategy.EXPONENTIAL_BACKOFF,
    shouldRetry = () => true,
    onRetry,
    onFailure,
  } = options;

  let lastError: any;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        if (onFailure) {
          onFailure(error, attempts);
        }
        throw error;
      }

      // If this was the last attempt, don't wait
      if (attempts >= maxAttempts) {
        if (onFailure) {
          onFailure(error, attempts);
        }
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempts, initialDelay, maxDelay, strategy);

      if (onRetry) {
        onRetry(attempts, error);
      }

      logger.warn(
        `Retry attempt ${attempts}/${maxAttempts} after ${delay}ms`,
        error,
        'RetryLogic'
      );

      // Wait before retrying
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Retry with circuit breaker
 */
export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitBreaker: CircuitBreaker,
  retryOptions: RetryOptions = {}
): Promise<T> {
  return circuitBreaker.execute(() => retry(fn, retryOptions));
}

/**
 * Default retry options for API calls
 */
export const defaultApiRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
  shouldRetry: (error: any) => {
    // Retry on network errors or 5xx errors
    if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
      return true;
    }
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    // Don't retry on 4xx errors (client errors)
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    return true;
  },
};

/**
 * Create a circuit breaker for a specific service
 */
export function createServiceCircuitBreaker(
  serviceName: string,
  options?: CircuitBreakerOptions
): CircuitBreaker {
  return new CircuitBreaker(options, serviceName);
}
