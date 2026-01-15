import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  getRateLimitMessage,
} from './rateLimit';

describe('rateLimit', () => {
  const testIdentifier = 'test@example.com';

  beforeEach(() => {
    // Clear localStorage mock between tests
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
    vi.mocked(localStorage.removeItem).mockClear();
  });

  describe('checkRateLimit', () => {
    it('should allow access when no previous attempts', () => {
      const result = checkRateLimit(testIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
      expect(result.lockedUntil).toBe(null);
    });

    it('should allow access when attempts are below limit', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          attempts: 2,
          firstAttemptTime: Date.now(),
          lockedUntil: null,
        })
      );

      const result = checkRateLimit(testIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3);
    });

    it('should deny access when locked', () => {
      const lockUntil = Date.now() + 15 * 60 * 1000;
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          attempts: 5,
          firstAttemptTime: Date.now() - 60000,
          lockedUntil: lockUntil,
        })
      );

      const result = checkRateLimit(testIdentifier);
      expect(result.allowed).toBe(false);
      expect(result.lockedUntil).toBeDefined();
      expect(result.lockoutMinutesRemaining).toBeGreaterThan(0);
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment attempts', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const result = recordFailedAttempt(testIdentifier);
      expect(result.remainingAttempts).toBe(4);

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should lock after max attempts', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          attempts: 4,
          firstAttemptTime: Date.now(),
          lockedUntil: null,
        })
      );

      const result = recordFailedAttempt(testIdentifier);
      expect(result.allowed).toBe(false);
      expect(result.lockedUntil).toBeDefined();
    });
  });

  describe('clearRateLimit', () => {
    it('should remove rate limit data', () => {
      clearRateLimit(testIdentifier);
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('getRateLimitMessage', () => {
    it('should return empty string when no warning needed', () => {
      const result = {
        allowed: true,
        remainingAttempts: 5,
        lockedUntil: null,
        lockoutMinutesRemaining: 0,
      };
      expect(getRateLimitMessage(result)).toBe('');
    });

    it('should return warning when few attempts remaining', () => {
      const result = {
        allowed: true,
        remainingAttempts: 2,
        lockedUntil: null,
        lockoutMinutesRemaining: 0,
      };
      const message = getRateLimitMessage(result);
      expect(message).toContain('2');
    });

    it('should return lockout message when locked', () => {
      const result = {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
        lockoutMinutesRemaining: 10,
      };
      const message = getRateLimitMessage(result);
      expect(message).toContain('10');
    });

    it('should handle edge case with 1 remaining attempt', () => {
      const result = {
        allowed: true,
        remainingAttempts: 1,
        lockedUntil: null,
        lockoutMinutesRemaining: 0,
      };
      const message = getRateLimitMessage(result);
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle zero lockout minutes', () => {
      const result = {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: new Date(Date.now() + 30 * 1000),
        lockoutMinutesRemaining: 0,
      };
      const message = getRateLimitMessage(result);
      expect(message).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle reset after lockout period', () => {
      const lockUntil = Date.now() - 1000; // Past lockout
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          attempts: 5,
          firstAttemptTime: Date.now() - 20 * 60 * 1000,
          lockedUntil: lockUntil,
        })
      );

      const result = checkRateLimit(testIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
    });

    it('should handle window reset after 15 minutes', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({
          attempts: 3,
          firstAttemptTime: Date.now() - 16 * 60 * 1000, // 16 minutes ago
          lockedUntil: null,
        })
      );

      const result = checkRateLimit(testIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
    });
  });
});
