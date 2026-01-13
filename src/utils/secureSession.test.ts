import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setSecureSession,
  getSecureSession,
  removeSecureSession,
  isSessionValid,
  refreshSessionExpiry,
} from './secureSession';

describe('secureSession', () => {
  const testKey = 'test_session';
  const testData = { userId: '123', name: 'Test User' };

  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
    vi.mocked(localStorage.removeItem).mockClear();
  });

  describe('setSecureSession', () => {
    it('should store data and expiry time', () => {
      const result = setSecureSession(testKey, testData);

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledTimes(2);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testData)
      );
    });

    it('should set custom expiry hours', () => {
      setSecureSession(testKey, testData, { expiryHours: 48 });

      expect(localStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSecureSession', () => {
    it('should return default value when no data exists', () => {
      const result = getSecureSession(testKey, { default: true });

      expect(result).toEqual({ default: true });
    });

    it('should return stored data when valid', () => {
      const futureExpiry = Date.now() + 60 * 60 * 1000;
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === testKey) return JSON.stringify(testData);
        if (key === `${testKey}_expiry`) return String(futureExpiry);
        return null;
      });

      const result = getSecureSession(testKey, null);

      expect(result).toEqual(testData);
    });

    it('should return default value when expired', () => {
      const pastExpiry = Date.now() - 60 * 60 * 1000;
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === testKey) return JSON.stringify(testData);
        if (key === `${testKey}_expiry`) return String(pastExpiry);
        return null;
      });

      const result = getSecureSession(testKey, { expired: true });

      expect(result).toEqual({ expired: true });
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('removeSecureSession', () => {
    it('should remove data and expiry', () => {
      const result = removeSecureSession(testKey);

      expect(result).toBe(true);
      expect(localStorage.removeItem).toHaveBeenCalledWith(testKey);
      expect(localStorage.removeItem).toHaveBeenCalledWith(`${testKey}_expiry`);
    });
  });

  describe('isSessionValid', () => {
    it('should return false when no session exists', () => {
      const result = isSessionValid(testKey);

      expect(result).toBe(false);
    });

    it('should return true when session is valid', () => {
      const futureExpiry = Date.now() + 60 * 60 * 1000;
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === testKey) return JSON.stringify(testData);
        if (key === `${testKey}_expiry`) return String(futureExpiry);
        return null;
      });

      const result = isSessionValid(testKey);

      expect(result).toBe(true);
    });

    it('should return false when session is expired', () => {
      const pastExpiry = Date.now() - 60 * 60 * 1000;
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === testKey) return JSON.stringify(testData);
        if (key === `${testKey}_expiry`) return String(pastExpiry);
        return null;
      });

      const result = isSessionValid(testKey);

      expect(result).toBe(false);
    });
  });

  describe('refreshSessionExpiry', () => {
    it('should return false when no session exists', () => {
      const result = refreshSessionExpiry(testKey);

      expect(result).toBe(false);
    });

    it('should update expiry when session exists', () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === testKey) return JSON.stringify(testData);
        return null;
      });

      const result = refreshSessionExpiry(testKey);

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });
});
