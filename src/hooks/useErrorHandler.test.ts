import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useErrorHandler } from './useErrorHandler';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

// Mock dependencies
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle Error objects', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    try {
      await result.current.handleError(error, 'test-context');
    } catch (e) {
      // Expected to reject
    }

    expect(logger.error).toHaveBeenCalledWith(
      'Error in test-context:',
      error,
      'test-context'
    );
    expect(toast.error).toHaveBeenCalled();
  });

  it('should handle string errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = 'String error';

    try {
      await result.current.handleError(error, 'test-context');
    } catch (e) {
      // Expected to reject
    }

    expect(logger.error).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('should handle object errors with message', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = { message: 'Object error' };

    try {
      await result.current.handleError(error, 'test-context');
    } catch (e) {
      // Expected to reject
    }

    expect(logger.error).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('should not show toast when showToast is false', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    try {
      await result.current.handleError(error, 'test-context', { showToast: false });
    } catch (e) {
      // Expected to reject
    }

    expect(toast.error).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should not log when logError is false', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    try {
      await result.current.handleError(error, 'test-context', { logError: false });
    } catch (e) {
      // Expected to reject
    }

    expect(logger.error).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('should use custom message when provided', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');
    const customMessage = 'Custom error message';

    try {
      await result.current.handleError(error, 'test-context', {
        customMessage,
      });
    } catch (e) {
      // Expected to reject
    }

    expect(toast.error).toHaveBeenCalledWith(customMessage);
  });

  it('should retry on failure with backoff', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');
    const retryFn = vi.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error('Second attempt failed'))
      .mockResolvedValueOnce('Success');

    vi.useFakeTimers();

    const promise = result.current.handleError(error, 'test-context', {
      retry: retryFn,
      maxRetries: 3,
    });

    // Advance timers for backoff delays
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toBe('Success');
    expect(retryFn).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('should reject after max retries', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');
    const retryFn = vi.fn().mockRejectedValue(new Error('Always fails'));

    vi.useFakeTimers();

    const promise = result.current.handleError(error, 'test-context', {
      retry: retryFn,
      maxRetries: 2,
    });

    // Handle the promise rejection properly
    promise.catch(() => {
      // Expected rejection - ignore
    });

    // Advance timers for all retries
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    
    // Ensure all timers are processed
    await vi.runAllTimersAsync();
    
    // Wait for promise to settle
    try {
      await promise;
    } catch (e) {
      // Expected rejection
    }
    
    expect(retryFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should handle network errors with friendly message', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('network error');

    try {
      await result.current.handleError(error, 'test-context');
    } catch (e) {
      // Expected to reject
    }

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('שגיאת רשת')
    );
  });

  it('should handle unauthorized errors with friendly message', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('unauthorized');

    try {
      await result.current.handleError(error, 'test-context');
    } catch (e) {
      // Expected to reject
    }

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('התחברות מחדש')
    );
  });

  it('should handle rate limit errors with friendly message', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('rate_limit exceeded');

    try {
      await result.current.handleError(error, 'test-context');
    } catch (e) {
      // Expected to reject
    }

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('יותר מדי בקשות')
    );
  });
});
