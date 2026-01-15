/**
 * Rate Limiter Utility
 * הגבלת קצב קריאות API למניעת abuse
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly defaultWindowMs: number;
  private readonly defaultMaxRequests: number;

  constructor(defaultWindowMs: number = 60000, defaultMaxRequests: number = 100) {
    this.defaultWindowMs = defaultWindowMs;
    this.defaultMaxRequests = defaultMaxRequests;
  }

  /**
   * Check if request is allowed
   * @param key - Unique identifier for the rate limit (e.g., user ID, IP)
   * @param maxRequests - Maximum requests allowed in the window
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed boolean and remaining requests
   */
  check(
    key: string,
    maxRequests: number = this.defaultMaxRequests,
    windowMs: number = this.defaultWindowMs
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      this.limits.set(key, {
        count: 1,
        resetTime,
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for a key
   * @param key - Key to reset
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Create singleton instance
export const rateLimiter = new RateLimiter();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Rate limit decorator for API functions
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 * @param getKey - Function to get rate limit key from arguments
 */
export function rateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRequests: number = 100,
  windowMs: number = 60000,
  getKey: (...args: Parameters<T>) => string = () => 'default'
): T {
  return (async (...args: Parameters<T>) => {
    const key = getKey(...args);
    const result = rateLimiter.check(key, maxRequests, windowMs);

    if (!result.allowed) {
      throw new Error(
        `Rate limit exceeded. Try again after ${new Date(result.resetTime).toLocaleTimeString()}`
      );
    }

    return fn(...args);
  }) as T;
}
