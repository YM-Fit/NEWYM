import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOptimisticUpdate } from './useOptimisticUpdate';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useOptimisticUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const updateFn = vi.fn().mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useOptimisticUpdate(updateFn));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.execute).toBe('function');
  });

  it('should execute update function', async () => {
    const updateFn = vi.fn().mockResolvedValue({ id: 1, name: 'Updated' });
    const { result } = renderHook(() => useOptimisticUpdate(updateFn));

    const promise = result.current.execute({ id: 1, name: 'Updated' });

    // isLoading should be set synchronously in execute function
    // But React state updates are async, so we need to wait
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    }, { timeout: 100 });

    const data = await promise;

    // isLoading should be false after promise resolves (in finally block)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(data).toEqual({ id: 1, name: 'Updated' });
    expect(updateFn).toHaveBeenCalledWith({ id: 1, name: 'Updated' });
  });

  it('should call onSuccess callback', async () => {
    const updateFn = vi.fn().mockResolvedValue({ id: 1 });
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, { onSuccess })
    );

    await result.current.execute({ id: 1 });

    expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
  });

  it('should show success message', async () => {
    const updateFn = vi.fn().mockResolvedValue({ id: 1 });
    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, { successMessage: 'Saved successfully' })
    );

    await result.current.execute({ id: 1 });

    expect(toast.success).toHaveBeenCalledWith('Saved successfully');
  });

  it('should handle errors', async () => {
    const updateFn = vi.fn().mockRejectedValue(new Error('Update failed'));
    const { result } = renderHook(() => useOptimisticUpdate(updateFn));

    try {
      await result.current.execute({ id: 1 });
    } catch (e) {
      // Expected
    }

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Update failed');
  });

  it('should call onError callback', async () => {
    const updateFn = vi.fn().mockRejectedValue(new Error('Update failed'));
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, { onError })
    );

    try {
      await result.current.execute({ id: 1 });
    } catch (e) {
      // Expected
    }

    expect(onError).toHaveBeenCalled();
  });

  it('should show error message', async () => {
    const updateFn = vi.fn().mockRejectedValue(new Error('Update failed'));
    const { result } = renderHook(() =>
      useOptimisticUpdate(updateFn, { errorMessage: 'Custom error' })
    );

    try {
      await result.current.execute({ id: 1 });
    } catch (e) {
      // Expected
    }

    expect(toast.error).toHaveBeenCalledWith('Custom error');
  });

  it('should show default error message when no custom message', async () => {
    const updateFn = vi.fn().mockRejectedValue(new Error('Update failed'));
    const { result } = renderHook(() => useOptimisticUpdate(updateFn));

    try {
      await result.current.execute({ id: 1 });
    } catch (e) {
      // Expected
    }

    expect(toast.error).toHaveBeenCalled();
  });

  it('should use actualData when provided', async () => {
    const updateFn = vi.fn().mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useOptimisticUpdate(updateFn));

    await result.current.execute({ id: 1, name: 'Optimistic' }, { id: 1, name: 'Actual' });

    expect(updateFn).toHaveBeenCalledWith({ id: 1, name: 'Actual' });
  });
});
