import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
}

import { useEffect, useCallback, useRef } from 'react';

export function useKeyboardShortcut(
  key: string,
  callback: (e?: KeyboardEvent) => void,
  deps: React.DependencyList = [],
  options: KeyboardShortcutOptions = {}
) {
  const callbackRef = useRef(callback);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const {
        ctrlKey = false,
        shiftKey = false,
        altKey = false,
        preventDefault = true,
      } = options;

      if (
        event.key === key &&
        event.ctrlKey === ctrlKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey
      ) {
        if (preventDefault) {
          event.preventDefault();
        }
        callbackRef.current(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, ...deps]);
}
