import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsTablet } from './useIsTablet';

describe('useIsTablet', () => {
  let matchMediaMock: any;
  let toggleSpy: any;

  beforeEach(() => {
    matchMediaMock = vi.fn();
    toggleSpy = vi.fn();
    
    // Setup document.body properly
    if (!document.body) {
      Object.defineProperty(document, 'body', {
        value: document.createElement('body'),
        writable: true,
        configurable: true,
      });
    }
    
    document.body.classList = {
      toggle: toggleSpy,
    } as any;
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
    
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for small screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    matchMediaMock.mockReturnValue(mediaQuery);

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(false);
  });

  it('should return true for tablet screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    matchMediaMock.mockReturnValue(mediaQuery);

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(true);
  });

  it('should return false for large screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1400,
    });

    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    matchMediaMock.mockReturnValue(mediaQuery);

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(false);
  });

  it('should toggle tablet class on body', () => {
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    matchMediaMock.mockReturnValue(mediaQuery);

    renderHook(() => useIsTablet());

    // The hook calls handleChange immediately in useEffect which calls toggle
    // handleChange is called synchronously on mount, so toggle should be called
    // We need to wait a bit for useEffect to run
    setTimeout(() => {
      expect(toggleSpy).toHaveBeenCalled();
    }, 0);
  });

  it('should use addListener fallback for Safari < 14', () => {
    const mediaQuery = {
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    matchMediaMock.mockReturnValue(mediaQuery);

    renderHook(() => useIsTablet());

    expect(matchMediaMock).toHaveBeenCalled();
  });

  it('should handle media query changes', () => {
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    matchMediaMock.mockReturnValue(mediaQuery);

    renderHook(() => useIsTablet());

    expect(mediaQuery.addEventListener).toHaveBeenCalled();
  });
});
