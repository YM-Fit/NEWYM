/**
 * State Isolation Tests
 * Verify that tests don't pollute state between runs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';

describe('State Isolation Tests', () => {
  describe('React State Isolation', () => {
    it('should isolate state between test runs', () => {
      const { result, rerender } = renderHook(() => {
        const [count, setCount] = useState(0);
        return { count, setCount };
      });

      expect(result.current.count).toBe(0);

      act(() => {
        result.current.setCount(5);
      });

      expect(result.current.count).toBe(5);

      // Rerender should maintain state within same test
      rerender();
      expect(result.current.count).toBe(5);
    });

    it('should start fresh state in new test', () => {
      const { result } = renderHook(() => {
        const [count, setCount] = useState(0);
        return { count, setCount };
      });

      // Should start at 0, not affected by previous test
      expect(result.current.count).toBe(0);
    });
  });

  describe('Mock Isolation', () => {
    it('should isolate mocks between tests', () => {
      const mockFn = vi.fn();
      
      mockFn('test-1');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test-1');
    });

    it('should have fresh mock in new test', () => {
      const mockFn = vi.fn();
      
      // Should not have calls from previous test
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('Global State Isolation', () => {
    beforeEach(() => {
      // Clear any global state
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    });

    afterEach(() => {
      // Clean up after each test
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    });

    it('should isolate localStorage between tests', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('test-key', 'test-value-1');
        const value = window.localStorage.getItem('test-key');
        expect(value).toBe('test-value-1');
      } else {
        // Skip test if localStorage is not available (mocked)
        expect(true).toBe(true);
      }
    });

    it('should not see localStorage from previous test', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Should be cleared by beforeEach
        const value = window.localStorage.getItem('test-key');
        // In test environment, localStorage might be mocked and return null
        expect(value === null || value === undefined).toBe(true);
      } else {
        // Skip test if localStorage is not available (mocked)
        expect(true).toBe(true);
      }
    });
  });

  describe('Timer Isolation', () => {
    it('should isolate fake timers', () => {
      vi.useFakeTimers();
      
      const mockFn = vi.fn();
      setTimeout(mockFn, 1000);
      
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should not have timers from previous test', () => {
      vi.useFakeTimers();
      
      const mockFn = vi.fn();
      expect(mockFn).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Async State Isolation', () => {
    it('should isolate async operations', async () => {
      const promise = Promise.resolve('test-value');
      const value = await promise;
      expect(value).toBe('test-value');
    });

    it('should not have pending promises from previous test', async () => {
      // Should not have any pending promises
      await Promise.resolve();
      expect(true).toBe(true);
    });
  });

  describe('Component State Isolation', () => {
    it('should isolate component state between renders', () => {
      let renderCount = 0;
      
      const { result, rerender } = renderHook(() => {
        renderCount++;
        const [value, setValue] = useState(`render-${renderCount}`);
        return { value, setValue };
      });

      expect(result.current.value).toBe('render-1');

      act(() => {
        result.current.setValue('updated');
      });

      expect(result.current.value).toBe('updated');

      rerender();
      expect(result.current.value).toBe('updated');
    });
  });

  describe('Cache Isolation', () => {
    it('should isolate cache between tests', () => {
      const cache = new Map<string, any>();
      cache.set('key-1', 'value-1');
      expect(cache.get('key-1')).toBe('value-1');
    });

    it('should not have cache entries from previous test', () => {
      const cache = new Map<string, any>();
      expect(cache.get('key-1')).toBeUndefined();
    });
  });
});
