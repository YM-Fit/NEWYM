/**
 * Advanced Retry Logic with Exponential Backoff and Circuit Breaker
 * Provides robust retry mechanisms for API calls and other operations
 */

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Exponential backoff multiplier */
  multiplier?: number;
  /** Jitter factor (0-1) to add randomness to delays */
  jitter?: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Callback before each retry attempt */
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface CircuitBreakerOptions {
  /** Failure threshold before opening circuit */
  failureThreshold?: number;
  /** Time in milliseconds before attempting to close circuit */
  resetTimeout?: number;
  /** Half-open state: number of successful calls needed to close */
  successThreshold?: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests when service is down
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      successThreshold: 2,
      ...options,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        this.successes = 0;
      } else {
        throw new Error(`Circuit breaker "${this.name}" is open`);
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
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.options.successThreshold!) {
        this.state = 'closed';
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failures >= this.options.failureThreshold!) {
      this.state = 'open';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout!;
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
  }
}

/**
 * Default retryable error checker
 */
function isDefaultRetryable(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // HTTP errors that are retryable
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry on 429 (rate limit), 500-599 (server errors), 408 (timeout)
    return status === 429 || status === 408 || (status >= 500 && status < 600);
  }

  // Timeout errors
  if (error instanceof Error) {
    return (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ENOTFOUND')
    );
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number,
  jitter: number
): number {
  const exponentialDelay = Math.min(initialDelay * Math.pow(multiplier, attempt), maxDelay);
  const jitterAmount = exponentialDelay * jitter * Math.random();
  return Math.floor(exponentialDelay + jitterAmount);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    multiplier = 2,
    jitter = 0.2,
    isRetryable = isDefaultRetryable,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!isRetryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, initialDelay, maxDelay, multiplier, jitter);

      // Callback before retry
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

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
  return circuitBreaker.execute(() => retryWithBackoff(fn, retryOptions));
}

/**
 * Create a circuit breaker instance
 */
export function createCircuitBreaker(
  name: string,
  options?: CircuitBreakerOptions
): CircuitBreaker {
  return new CircuitBreaker(name, options);
}
