/**
 * Shared Middleware Functions for Edge Functions
 * Combines CSRF protection and rate limiting
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { csrfMiddleware, validateOrigin } from "./csrf.ts";
import { rateLimitMiddleware } from "./rateLimiter.ts";

interface MiddlewareResult {
  allowed: boolean;
  error?: string;
  status?: number;
}

/**
 * Combined middleware for CSRF + Rate Limiting
 */
export async function applySecurityMiddleware(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  options?: {
    skipRateLimit?: boolean;
    skipCSRF?: boolean;
    allowedOrigins?: string[];
    rateLimitConfig?: {
      maxRequests: number;
      windowMs: number;
    };
  }
): Promise<MiddlewareResult> {
  const {
    skipRateLimit = false,
    skipCSRF = false,
    allowedOrigins,
    rateLimitConfig = { maxRequests: 100, windowMs: 60000 },
  } = options || {};

  // Validate origin if provided
  if (allowedOrigins && allowedOrigins.length > 0) {
    const originValid = validateOrigin(req, allowedOrigins);
    if (!originValid) {
      return {
        allowed: false,
        error: "Origin not allowed",
        status: 403,
      };
    }
  }

  // CSRF Protection
  if (!skipCSRF) {
    const csrfResult = csrfMiddleware(req);
    if (!csrfResult.allowed) {
      return {
        allowed: false,
        error: csrfResult.error || "CSRF verification failed",
        status: 403,
      };
    }
  }

  // Rate Limiting
  if (!skipRateLimit) {
    const rateLimitResult = await rateLimitMiddleware(
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )(req, supabase);

    if (!rateLimitResult.allowed) {
      const remaining = rateLimitResult.result?.remaining || 0;
      const resetTime = rateLimitResult.result?.resetTime || Date.now() + rateLimitConfig.windowMs;
      return {
        allowed: false,
        error: `Rate limit exceeded. Try again after ${new Date(resetTime).toISOString()}`,
        status: 429,
      };
    }
  }

  return { allowed: true };
}
