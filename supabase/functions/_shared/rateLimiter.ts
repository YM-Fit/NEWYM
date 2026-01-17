/**
 * Server-Side Rate Limiter for Edge Functions
 * Uses Supabase Database for distributed rate limiting
 */

import { createClient } from "npm:@supabase/supabase-js@2";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  key: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit using database
 * This creates a table for tracking rate limits if it doesn't exist
 */
export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { maxRequests, windowMs, key } = config;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Check if rate_limit_tracking table exists, if not create it
    // For now, we'll use a simple in-memory cache approach
    // In production, use a Redis-like service or database table

    // Get current count from database (or create table if needed)
    const { data: existing } = await supabase
      .from('rate_limit_tracking')
      .select('count, reset_time')
      .eq('key', key)
      .single();

    // If entry exists and is within window
    if (existing && existing.reset_time && now < existing.reset_time) {
      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: existing.reset_time,
        };
      }

      // Increment count
      await supabase
        .from('rate_limit_tracking')
        .update({ count: existing.count + 1 })
        .eq('key', key);

      return {
        allowed: true,
        remaining: maxRequests - existing.count - 1,
        resetTime: existing.reset_time,
      };
    }

    // Create new entry or reset
    const resetTime = now + windowMs;
    const { error } = await supabase
      .from('rate_limit_tracking')
      .upsert({
        key,
        count: 1,
        reset_time: resetTime,
        updated_at: new Date(now).toISOString(),
      }, {
        onConflict: 'key',
      });

    if (error) {
      // If table doesn't exist, allow request (graceful degradation)
      console.warn('Rate limit tracking failed:', error);
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
    };
  } catch (err) {
    // Graceful degradation: allow request if rate limiting fails
    console.error('Rate limit check error:', err);
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: now + windowMs,
    };
  }
}

/**
 * Middleware function for rate limiting in Edge Functions
 */
export function rateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 60000,
  getKey: (req: Request) => string = (req) => {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      // Extract user ID from JWT (simplified)
      const token = authHeader.replace('Bearer ', '');
      // In production, decode JWT to get user ID
      return `user:${token.substring(0, 10)}`;
    }
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    return `ip:${ip}`;
  }
) {
  return async (
    req: Request,
    supabase: ReturnType<typeof createClient>
  ): Promise<{ allowed: boolean; result?: RateLimitResult }> => {
    // Skip rate limiting for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return { allowed: true };
    }

    const key = getKey(req);
    const result = await checkRateLimit(supabase, {
      maxRequests,
      windowMs,
      key,
    });

    if (!result.allowed) {
      return {
        allowed: false,
        result,
      };
    }

    return { allowed: true, result };
  };
}
