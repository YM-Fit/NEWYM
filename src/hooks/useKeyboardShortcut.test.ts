import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from './useKeyboardShortcut';

describe('useKeyboardShortcut', () => {
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callback = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call callback on key press', () => {
    renderHook(() => useKeyboardShortcut('Enter', callback));

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call callback for different key', () => {
    renderHook(() => useKeyboardShortcut('Enter', callback));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle Ctrl+key shortcut', () => {
    renderHook(() =>
      useKeyboardShortcut('s', callback, { ctrlKey: true })
    );

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not trigger without Ctrl when Ctrl is required', () => {
    renderHook(() =>
      useKeyboardShortcut('s', callback, { ctrlKey: true })
    );

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: false,
    });
    window.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle Shift+key shortcut', () => {
    renderHook(() =>
      useKeyboardShortcut('S', callback, { shiftKey: true })
    );

    const event = new KeyboardEvent('keydown', {
      key: 'S',
      shiftKey: true,
    });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle Alt+key shortcut', () => {
    renderHook(() =>
      useKeyboardShortcut('a', callback, { altKey: true })
    );

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      altKey: true,
    });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle complex shortcuts', () => {
    renderHook(() =>
      useKeyboardShortcut('s', callback, {
        ctrlKey: true,
        shiftKey: true,
      })
    );

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
    });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should prevent default by default', () => {
    renderHook(() => useKeyboardShortcut('Enter', callback));

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should not prevent default when preventDefault is false', () => {
    renderHook(() =>
      useKeyboardShortcut('Enter', callback, { preventDefault: false })
    );

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() =>
      useKeyboardShortcut('Enter', callback)
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });

  it('should update when callback changes', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { rerender } = renderHook(
      ({ cb }) => useKeyboardShortcut('Enter', cb),
      { initialProps: { cb: callback1 } }
    );

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(event);

    expect(callback1).toHaveBeenCalledTimes(1);

    rerender({ cb: callback2 });
    window.dispatchEvent(event);

    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
