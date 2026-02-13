/**
 * Request cache utility for deduplicating and caching API requests
 */

interface CachedRequest<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

export class RequestCache {
  private cache = new Map<string, CachedRequest<any>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) { // 1 minute default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate a better cache key from request details
   */
  private generateKey(method: string, url: string, body?: any): string {
    const bodyHash = body ? JSON.stringify(body).slice(0, 100) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * Get cached data or execute request function
   */
  async get<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.cache.get(key);
    const cacheTTL = ttl ?? this.defaultTTL;

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      return cached.data;
    }

    // If there's an ongoing request, return its promise
    if (cached?.promise) {
      return cached.promise;
    }

    // Execute request and cache result
    const promise = requestFn();
    
    // Store promise immediately to deduplicate concurrent requests
    this.cache.set(key, {
      data: cached?.data, // Keep old data while loading
      timestamp: cached?.timestamp || 0,
      promise,
    });

    try {
      const data = await promise;
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } catch (error) {
      // Remove failed request from cache
      this.cache.delete(key);
      throw error;
    }
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(ttl?: number): void {
    const cacheTTL = ttl ?? this.defaultTTL;
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= cacheTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const requestCache = new RequestCache(60000); // 1 minute default TTL

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.cleanup();
  }, 5 * 60 * 1000);
}
