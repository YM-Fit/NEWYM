/**
 * Client-side rate limiting for login attempts
 * Prevents brute force attacks by limiting failed login attempts
 */

const STORAGE_KEY = 'login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface AttemptRecord {
  attempts: number;
  firstAttemptTime: number;
  lockedUntil: number | null;
}

function getAttemptRecord(identifier: string): AttemptRecord {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${identifier}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return {
    attempts: 0,
    firstAttemptTime: 0,
    lockedUntil: null,
  };
}

function saveAttemptRecord(identifier: string, record: AttemptRecord): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${identifier}`, JSON.stringify(record));
  } catch {
    // Ignore storage errors
  }
}

function clearAttemptRecord(identifier: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${identifier}`);
  } catch {
    // Ignore storage errors
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil: Date | null;
  lockoutMinutesRemaining: number;
}

/**
 * Check if a login attempt is allowed
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const record = getAttemptRecord(identifier);

  // Check if currently locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    const minutesRemaining = Math.ceil((record.lockedUntil - now) / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: new Date(record.lockedUntil),
      lockoutMinutesRemaining: minutesRemaining,
    };
  }

  // Reset if lockout has expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    clearAttemptRecord(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      lockedUntil: null,
      lockoutMinutesRemaining: 0,
    };
  }

  // Reset if attempt window has expired
  if (record.firstAttemptTime && now - record.firstAttemptTime > ATTEMPT_WINDOW_MS) {
    clearAttemptRecord(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      lockedUntil: null,
      lockoutMinutesRemaining: 0,
    };
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - record.attempts);

  return {
    allowed: remainingAttempts > 0,
    remainingAttempts,
    lockedUntil: null,
    lockoutMinutesRemaining: 0,
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(identifier: string): RateLimitResult {
  const now = Date.now();
  const record = getAttemptRecord(identifier);

  // Start new window if needed
  if (!record.firstAttemptTime || now - record.firstAttemptTime > ATTEMPT_WINDOW_MS) {
    record.attempts = 1;
    record.firstAttemptTime = now;
    record.lockedUntil = null;
  } else {
    record.attempts += 1;
  }

  // Lock out if max attempts reached
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  saveAttemptRecord(identifier, record);

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - record.attempts);

  if (record.lockedUntil) {
    const minutesRemaining = Math.ceil((record.lockedUntil - now) / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: new Date(record.lockedUntil),
      lockoutMinutesRemaining: minutesRemaining,
    };
  }

  return {
    allowed: remainingAttempts > 0,
    remainingAttempts,
    lockedUntil: null,
    lockoutMinutesRemaining: 0,
  };
}

/**
 * Clear rate limit on successful login
 */
export function clearRateLimit(identifier: string): void {
  clearAttemptRecord(identifier);
}

/**
 * Get formatted error message for rate limit
 */
export function getRateLimitMessage(result: RateLimitResult): string {
  if (result.lockedUntil) {
    return `יותר מדי ניסיונות כושלים. נסה שוב בעוד ${result.lockoutMinutesRemaining} דקות.`;
  }
  if (result.remainingAttempts <= 2) {
    return `נותרו ${result.remainingAttempts} ניסיונות לפני נעילה זמנית.`;
  }
  return '';
}
