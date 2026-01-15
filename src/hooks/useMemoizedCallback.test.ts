import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMemoizedCallback } from './useMemoizedCallback';

describe('useMemoizedCallback', () => {
  it('should return memoized callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useMemoizedCallback(callback, [1, 2, 3])
    );

    expect(typeof result.current).toBe('function');
    result.current('test');
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should update callback when dependencies change', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ callback, deps }) => useMemoizedCallback(callback, deps),
      { initialProps: { callback: callback1, deps: [1] } }
    );

    result.current();
    expect(callback1).toHaveBeenCalledTimes(1);

    rerender({ callback: callback2, deps: [2] });
    result.current();
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should not update callback when dependencies are the same', () => {
    const callback = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback, deps }) => useMemoizedCallback(callback, deps),
      { initialProps: { callback, deps: [1, 2] } }
    );

    const firstCallback = result.current;

    rerender({ callback, deps: [1, 2] });

    expect(result.current).toBe(firstCallback); // Should be the same reference
  });

  it('should handle empty dependencies', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useMemoizedCallback(callback, [])
    );

    result.current();
    expect(callback).toHaveBeenCalled();
  });

  it('should handle function arguments correctly', () => {
    const callback = vi.fn((a: number, b: string) => a + b.length);
    const { result } = renderHook(() =>
      useMemoizedCallback(callback, [1])
    );

    const resultValue = result.current(5, 'test');
    expect(callback).toHaveBeenCalledWith(5, 'test');
    expect(resultValue).toBe(9);
  });

  it('should handle different dependency lengths', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback, deps }) => useMemoizedCallback(callback, deps),
      { initialProps: { callback: callback1, deps: [1] } }
    );

    const firstCallback = result.current;
    result.current();
    expect(callback1).toHaveBeenCalledTimes(1);

    rerender({ callback: callback2, deps: [1, 2] });
    
    // The callback ref should be updated, but useCallback returns same wrapper
    // So we verify by checking that the new callback is called
    result.current();
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledTimes(1); // Should not be called again
  });
});
