import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';
import { logger } from '../utils/logger';

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        data: { name: 'Test' },
        localStorageKey: 'test-key',
      })
    );

    expect(result.current.lastSaved).toBe(null);
    expect(result.current.isDirty).toBe(false);
  });

  it('should detect dirty state when data changes', () => {
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          localStorageKey: 'test-key',
        }),
      { initialProps: { data: { name: 'Test' } } }
    );

    expect(result.current.isDirty).toBe(false);

    rerender({ data: { name: 'Updated' } });

    expect(result.current.isDirty).toBe(true);
  });

  it('should auto-save after interval when dirty', async () => {
    vi.useFakeTimers();
    const testData = { name: 'Test' };
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          localStorageKey: 'test-key',
          interval: 1000,
        }),
      { initialProps: { data: testData } }
    );

    // Wait for initial render - isDirty should be false initially
    await waitFor(() => {
      expect(result.current.isDirty).toBe(false);
    }, { timeout: 100 });

    // Change data
    rerender({ data: { name: 'Updated' } });
    
    // Wait for dirty state to be detected
    await waitFor(() => {
      expect(result.current.isDirty).toBe(true);
    }, { timeout: 100 });

    // Advance timers to trigger auto-save interval
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Wait for auto-save to complete
    await waitFor(() => {
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSaved).not.toBe(null);
    }, { timeout: 100 });

    const saved = localStorage.getItem('test-key');
    expect(saved).toBe(JSON.stringify({ name: 'Updated' }));
    
    vi.useRealTimers();
  });

  it('should not auto-save when disabled', async () => {
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          localStorageKey: 'test-key',
          enabled: false,
          interval: 1000,
        }),
      { initialProps: { data: { name: 'Test' } } }
    );

    rerender({ data: { name: 'Updated' } });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.lastSaved).toBe(null);
    expect(localStorage.getItem('test-key')).toBe(null);
  });

  it('should manually save when manualSave is called', async () => {
    const testData = { name: 'Test' };
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          localStorageKey: 'test-key',
        }),
      { initialProps: { data: testData } }
    );

    rerender({ data: { name: 'Updated' } });
    
    await waitFor(() => {
      expect(result.current.isDirty).toBe(true);
    }, { timeout: 100 });

    act(() => {
      result.current.manualSave();
    });

    // manualSave is synchronous, so state should update immediately
    await waitFor(() => {
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSaved).not.toBe(null);
    }, { timeout: 100 });

    const saved = localStorage.getItem('test-key');
    expect(saved).toBe(JSON.stringify({ name: 'Updated' }));
  });

  it('should load saved data', () => {
    const savedData = { name: 'Saved' };
    // Set item before rendering hook
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(savedData));

    const { result } = renderHook(() =>
      useAutoSave({
        data: { name: 'Test' },
        localStorageKey: 'test-key',
      })
    );

    const loaded = result.current.loadSaved();
    expect(loaded).toEqual(savedData);
    
    localStorage.getItem = originalGetItem;
  });

  it('should return null when no saved data exists', () => {
    localStorage.removeItem('test-key');
    
    const { result } = renderHook(() =>
      useAutoSave({
        data: { name: 'Test' },
        localStorageKey: 'test-key',
      })
    );

    const loaded = result.current.loadSaved();
    expect(loaded).toBe(null);
  });

  it('should clear saved data', () => {
    localStorage.setItem('test-key', JSON.stringify({ name: 'Saved' }));

    const { result } = renderHook(() =>
      useAutoSave({
        data: { name: 'Test' },
        localStorageKey: 'test-key',
      })
    );

    act(() => {
      result.current.clearSaved();
    });

    expect(localStorage.getItem('test-key')).toBe(null);
    expect(result.current.lastSaved).toBe(null);
    expect(result.current.isDirty).toBe(false);
  });

  it('should handle localStorage errors gracefully', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        data: { name: 'Test' },
        localStorageKey: 'test-key',
      })
    );

    // Mock localStorage.setItem to throw
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    act(() => {
      result.current.manualSave();
    });

    expect(logger.error).toHaveBeenCalled();

    localStorage.setItem = originalSetItem;
  });

  it('should handle JSON parse errors in loadSaved', () => {
    // Mock localStorage.getItem to return invalid JSON
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = vi.fn().mockReturnValue('invalid json');

    const { result } = renderHook(() =>
      useAutoSave({
        data: { name: 'Test' },
        localStorageKey: 'test-key',
      })
    );

    const loaded = result.current.loadSaved();
    expect(loaded).toBe(null);
    expect(logger.error).toHaveBeenCalled();

    localStorage.getItem = originalGetItem;
  });

  it('should handle localStorage errors gracefully in loadSaved', () => {
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() =>
      useAutoSave({
        data: { name: 'Test' },
        localStorageKey: 'test-key',
      })
    );

    const loaded = result.current.loadSaved();
    expect(loaded).toBe(null);
    expect(logger.error).toHaveBeenCalled();

    localStorage.getItem = originalGetItem;
  });
});
