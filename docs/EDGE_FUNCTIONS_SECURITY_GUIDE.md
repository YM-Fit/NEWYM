# Edge Functions Security Guide

## Overview

This guide explains how to implement server-side security (CSRF protection and rate limiting) in Supabase Edge Functions.

## Files Created

### Shared Utilities

1. **`supabase/functions/_shared/csrf.ts`**
   - CSRF token verification
   - Origin validation
   - Middleware function

2. **`supabase/functions/_shared/rateLimiter.ts`**
   - Database-backed rate limiting
   - Distributed rate limiting support
   - Middleware function

3. **`supabase/functions/_shared/middleware.ts`**
   - Combined middleware (CSRF + Rate Limiting)
   - Single function for all security checks

### Database Tables

1. **`rate_limit_tracking`**
   - Stores rate limit counters
   - Supports distributed rate limiting
   - Auto-cleanup function

## Usage

### Basic Usage

```typescript
// supabase/functions/your-function/index.ts

import { applySecurityMiddleware } from "./_shared/middleware.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") || "" },
      },
    }
  );

  // Apply security middleware
  const middlewareResult = await applySecurityMiddleware(req, supabase, {
    allowedOrigins: Deno.env.get("ALLOWED_ORIGINS")?.split(",").map(o => o.trim()) || [],
    rateLimitConfig: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
    skipCSRF: false, // Enable CSRF for state-changing operations
  });

  if (!middlewareResult.allowed) {
    return new Response(
      JSON.stringify({ error: middlewareResult.error }),
      {
        status: middlewareResult.status || 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Continue with function logic...
});
```

### Custom Rate Limits

Different endpoints may need different rate limits:

```typescript
// High-frequency endpoint (read-only)
const middlewareResult = await applySecurityMiddleware(req, supabase, {
  rateLimitConfig: { maxRequests: 200, windowMs: 60000 }, // 200/min
  skipCSRF: true, // Skip CSRF for GET requests
});

// State-changing endpoint (write operations)
const middlewareResult = await applySecurityMiddleware(req, supabase, {
  rateLimitConfig: { maxRequests: 50, windowMs: 60000 }, // 50/min
  skipCSRF: false, // Require CSRF
});
```

### Selective Middleware

Skip certain middleware when appropriate:

```typescript
// GET requests - skip CSRF
const middlewareResult = await applySecurityMiddleware(req, supabase, {
  skipCSRF: req.method === "GET",
  skipRateLimit: false,
});

// Public endpoints - skip both (not recommended for production)
const middlewareResult = await applySecurityMiddleware(req, supabase, {
  skipCSRF: true,
  skipRateLimit: true,
});
```

## Implementation Details

### CSRF Protection

1. **Token Generation**: Client generates token and stores in sessionStorage
2. **Token Transmission**: Token sent in `x-csrf-token` header
3. **Token Verification**: Server validates token format and presence
4. **State-Changing Operations**: CSRF required for POST/PUT/DELETE

**Note**: Current implementation uses basic token validation. For production, consider:
- Server-side token storage (session-based)
- Token expiration
- Double submit cookie pattern

### Rate Limiting

1. **Database Storage**: Rate limit counters stored in `rate_limit_tracking` table
2. **Distributed Support**: Works across multiple Edge Function instances
3. **Automatic Cleanup**: Expired entries cleaned up periodically
4. **Graceful Degradation**: Allows requests if rate limiting fails

**Rate Limit Key Format**:
- User-based: `user:{user_id}` or `user:{token_prefix}`
- IP-based: `ip:{ip_address}`
- Custom: `{type}:{identifier}`

## Configuration

### Environment Variables

```bash
# Allowed origins for CORS
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# Supabase configuration (auto-provided)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Setup

The `rate_limit_tracking` table is automatically created via migration. To manually create:

```sql
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_time BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_tracking_reset_time 
ON rate_limit_tracking(reset_time);
```

## Testing

### Test CSRF Protection

```bash
# Should fail without CSRF token
curl -X POST https://your-project.supabase.co/functions/v1/save-workout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Should succeed with CSRF token
curl -X POST https://your-project.supabase.co/functions/v1/save-workout \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Test Rate Limiting

```bash
# Make multiple requests rapidly
for i in {1..110}; do
  curl -X POST https://your-project.supabase.co/functions/v1/save-workout \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-csrf-token: $CSRF_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
done

# After limit (100 requests), should receive 429 status
```

## Monitoring

### Check Rate Limit Status

```sql
-- View current rate limits
SELECT key, count, reset_time, updated_at
FROM rate_limit_tracking
WHERE reset_time > EXTRACT(EPOCH FROM NOW()) * 1000
ORDER BY count DESC;
```

### Clean Up Expired Entries

```sql
-- Manual cleanup
SELECT cleanup_expired_rate_limits();

-- Or automatic via cron
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT cleanup_expired_rate_limits()$$
);
```

## Best Practices

1. **Always Use Middleware**: Apply security middleware to all Edge Functions
2. **Configure Appropriately**: Adjust rate limits based on endpoint usage
3. **Monitor Performance**: Track rate limit hits and adjust limits
4. **Error Handling**: Graceful degradation if middleware fails
5. **Testing**: Test CSRF and rate limiting in staging environment

## Troubleshooting

### Middleware Import Fails

**Issue**: Cannot import `./_shared/middleware.ts`

**Solution**: Ensure `_shared` directory exists in `supabase/functions/`

### Rate Limiting Not Working

**Issue**: Rate limits not being enforced

**Solution**: 
1. Verify `rate_limit_tracking` table exists
2. Check database permissions
3. Review middleware error logs

### CSRF Always Fails

**Issue**: All requests fail CSRF verification

**Solution**:
1. Verify client sends `x-csrf-token` header
2. Check token format (should be 32-256 characters)
3. Review CSRF middleware logic

## References

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
