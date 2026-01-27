/**
 * API configuration
 */

export const API_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  ALLOWED_ORIGINS: import.meta.env.VITE_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
} as const;

if (!API_CONFIG.SUPABASE_URL || !API_CONFIG.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Get CORS headers based on request origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && API_CONFIG.ALLOWED_ORIGINS.includes(origin)
    ? origin
    : API_CONFIG.ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Note: handleApiError has been moved to '../utils/apiErrorHandler'
// All imports have been updated to use the direct import
