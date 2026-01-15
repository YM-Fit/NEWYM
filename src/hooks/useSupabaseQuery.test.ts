import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { PostgrestError } from '@supabase/supabase-js';

describe('useSupabaseQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with loading state', () => {
    const queryFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should load data successfully', async () => {
    const testData = { id: '1', name: 'Test' };
    const queryFn = vi.fn().mockResolvedValue({ data: testData, error: null });
    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(testData);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors', async () => {
    const testError: PostgrestError = {
      message: 'Query failed',
      details: '',
      hint: '',
      code: 'PGRST116',
    };
    const queryFn = vi.fn().mockResolvedValue({ data: null, error: testError });
    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.data).toBe(null);
  });

  it('should not execute when enabled is false', async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() =>
      useSupabaseQuery(queryFn, [], { enabled: false })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should refetch when refetch is called', async () => {
    const testData = { id: '1' };
    const queryFn = vi.fn().mockResolvedValue({ data: testData, error: null });
    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = queryFn.mock.calls.length;

    await result.current.refetch();

    expect(queryFn.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('should cache results when cacheTime is set', async () => {
    vi.useFakeTimers();
    const testData = { id: '1' };
    const queryFn = vi.fn().mockResolvedValue({ data: testData, error: null });
    
    const { result, rerender } = renderHook(() =>
      useSupabaseQuery(queryFn, ['key1'], { cacheTime: 1000 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Rerender with same deps - should use cache
    rerender();
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still be called only once due to cache
    expect(queryFn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
