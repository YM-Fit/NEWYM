/**
 * CSRF Protection Utilities
 * Cross-Site Request Forgery protection for secure API calls
 */

/**
 * Generate a CSRF token
 * In production, this should be done server-side using a secure random generator
 * 
 * @returns CSRF token string
 */
export function generateCSRFToken(): string {
  // Generate a random token (32 bytes, hex encoded)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Fallback (less secure)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Store CSRF token in session storage
 * 
 * @param token - CSRF token to store
 */
export function storeCSRFToken(token: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    window.sessionStorage.setItem('csrf_token', token);
  } catch (err) {
    console.error('Failed to store CSRF token:', err);
  }
}

/**
 * Get CSRF token from session storage
 * 
 * @returns CSRF token or null
 */
export function getCSRFToken(): string | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  try {
    return window.sessionStorage.getItem('csrf_token');
  } catch (err) {
    console.error('Failed to get CSRF token:', err);
    return null;
  }
}

/**
 * Verify CSRF token
 * 
 * @param token - Token to verify
 * @param storedToken - Stored token to compare against
 * @returns True if tokens match
 */
export function verifyCSRFToken(token: string, storedToken: string | null): boolean {
  if (!token || !storedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== storedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Initialize CSRF protection
 * Generates and stores a CSRF token if one doesn't exist
 * 
 * @returns CSRF token
 */
export function initializeCSRF(): string {
  let token = getCSRFToken();
  
  if (!token) {
    token = generateCSRFToken();
    storeCSRFToken(token);
  }

  return token;
}

/**
 * CSRF Token Manager
 * Convenience class for managing CSRF tokens
 */
export class CSRFTokenManager {
  private static token: string | null = null;

  /**
   * Get or generate CSRF token
   */
  static getToken(): string {
    if (!this.token) {
      this.token = getCSRFToken() || generateCSRFToken();
      if (!getCSRFToken()) {
        storeCSRFToken(this.token);
      }
    }
    return this.token;
  }

  /**
   * Refresh CSRF token
   */
  static refreshToken(): string {
    this.token = generateCSRFToken();
    storeCSRFToken(this.token);
    return this.token;
  }

  /**
   * Clear CSRF token
   */
  static clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('csrf_token');
    }
  }

  /**
   * Verify CSRF token
   */
  static verify(token: string): boolean {
    const storedToken = getCSRFToken();
    return verifyCSRFToken(token, storedToken);
  }
}
