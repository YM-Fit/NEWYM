import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAsync } from './useAsync';

describe('useAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state when immediate is true', () => {
    const asyncFn = vi.fn().mockResolvedValue('test data');
    const { result } = renderHook(() => useAsync(asyncFn, [], { immediate: true }));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should not execute immediately when immediate is false', () => {
    const asyncFn = vi.fn().mockResolvedValue('test data');
    const { result } = renderHook(() => useAsync(asyncFn, [], { immediate: false }));

    expect(result.current.loading).toBe(false);
    expect(asyncFn).not.toHaveBeenCalled();
  });

  it('should load data successfully', async () => {
    const testData = { id: 1, name: 'Test' };
    const asyncFn = vi.fn().mockResolvedValue(testData);
    const { result } = renderHook(() => useAsync(asyncFn, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(testData);
    expect(result.current.error).toBe(null);
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it('should handle errors correctly', async () => {
    const testError = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(testError);
    const { result } = renderHook(() => useAsync(asyncFn, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(testError);
  });

  it('should call onSuccess callback when data is loaded', async () => {
    const testData = { id: 1 };
    const asyncFn = vi.fn().mockResolvedValue(testData);
    const onSuccess = vi.fn();
    
    const { result } = renderHook(() =>
      useAsync(asyncFn, [], { onSuccess })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledWith(testData);
  });

  it('should call onError callback when error occurs', async () => {
    const testError = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(testError);
    const onError = vi.fn();
    
    const { result } = renderHook(() =>
      useAsync(asyncFn, [], { onError })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('should execute manually when execute is called', async () => {
    const testData = { id: 1 };
    const asyncFn = vi.fn().mockResolvedValue(testData);
    const { result } = renderHook(() =>
      useAsync(asyncFn, [], { immediate: false })
    );

    expect(asyncFn).not.toHaveBeenCalled();

    result.current.execute();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(testData);
  });

  it('should reset state when reset is called', async () => {
    const testData = { id: 1 };
    const asyncFn = vi.fn().mockResolvedValue(testData);
    const { result } = renderHook(() => useAsync(asyncFn, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(testData);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle non-Error objects', async () => {
    const asyncFn = vi.fn().mockRejectedValue('String error');
    const { result } = renderHook(() => useAsync(asyncFn, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('שגיאה בלתי צפויה');
  });

  it('should re-execute when dependencies change', async () => {
    const asyncFn = vi.fn().mockResolvedValue('data');
    const { rerender } = renderHook(
      ({ deps }) => useAsync(asyncFn, deps),
      { initialProps: { deps: [1] } }
    );

    await waitFor(() => {
      expect(asyncFn).toHaveBeenCalledTimes(1);
    });

    rerender({ deps: [2] });

    await waitFor(() => {
      expect(asyncFn).toHaveBeenCalledTimes(2);
    });
  });
});
