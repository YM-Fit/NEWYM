/**
 * Server-Side CSRF Protection for Edge Functions
 */

/**
 * Verify CSRF token from request headers
 */
export function verifyCSRFToken(req: Request): boolean {
  // Get CSRF token from header
  const csrfToken = req.headers.get('x-csrf-token');

  if (!csrfToken) {
    // Allow GET and OPTIONS requests without CSRF token
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
      return true;
    }
    return false;
  }

  // Basic validation: token should be non-empty and reasonable length
  if (csrfToken.length < 32 || csrfToken.length > 256) {
    return false;
  }

  // In production, verify token against session storage or database
  // For now, basic format validation
  const tokenPattern = /^[a-zA-Z0-9]{32,256}$/;
  if (!tokenPattern.test(csrfToken)) {
    return false;
  }

  return true;
}

/**
 * CSRF middleware for Edge Functions
 * Returns error response if CSRF verification fails
 */
export function csrfMiddleware(req: Request): { allowed: boolean; error?: string } {
  // Allow GET, OPTIONS, HEAD without CSRF token
  if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
    return { allowed: true };
  }

  // Verify CSRF token for state-changing operations
  const isValid = verifyCSRFToken(req);

  if (!isValid) {
    return {
      allowed: false,
      error: 'CSRF token verification failed. Please refresh the page and try again.',
    };
  }

  return { allowed: true };
}

/**
 * Extract origin from request for validation
 */
export function validateOrigin(req: Request, allowedOrigins: string[]): boolean {
  const origin = req.headers.get('origin');
  
  if (!origin) {
    return false;
  }

  // Check if origin is in allowed list
  return allowedOrigins.includes(origin);
}
