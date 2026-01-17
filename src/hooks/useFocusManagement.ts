/**
 * Focus Management Hook
 * Utilities for managing focus in components
 */

import { useEffect, useRef, RefObject } from 'react';

interface UseFocusManagementOptions {
  /**
   * Whether to restore focus when component unmounts
   */
  restoreFocusOnUnmount?: boolean;
  /**
   * Initial element to focus
   */
  initialFocus?: RefObject<HTMLElement> | HTMLElement | null;
  /**
   * Whether to focus on mount
   */
  focusOnMount?: boolean;
}

/**
 * Hook to manage focus in a component
 * @param options - Options for focus management
 */
export function useFocusManagement(
  options: UseFocusManagementOptions = {}
): {
  focusFirst: () => void;
  focusLast: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
  restoreFocus: () => void;
} {
  const {
    restoreFocusOnUnmount = false,
    initialFocus,
    focusOnMount = false,
  } = options;

  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Store previous active element
  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement;
  }, []);

  // Focus initial element on mount
  useEffect(() => {
    if (focusOnMount) {
      if (initialFocus) {
        const element = 'current' in initialFocus ? initialFocus.current : initialFocus;
        if (element) {
          element.focus();
        }
      }
    }
  }, [focusOnMount, initialFocus]);

  // Restore focus on unmount
  useEffect(() => {
    if (!restoreFocusOnUnmount) {
      return;
    }

    return () => {
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [restoreFocusOnUnmount]);

  const getFocusableElements = (container?: HTMLElement): HTMLElement[] => {
    const target = container || containerRef.current || document.body;
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(target.querySelectorAll<HTMLElement>(focusableSelectors)).filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !el.hasAttribute('aria-hidden')
      );
    });
  };

  const focusFirst = () => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  };

  const focusLast = () => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  };

  const focusNext = () => {
    const elements = getFocusableElements();
    const currentIndex = elements.findIndex(
      (el) => el === document.activeElement || el.contains(document.activeElement as Node)
    );

    if (currentIndex >= 0 && currentIndex < elements.length - 1) {
      elements[currentIndex + 1].focus();
    } else if (elements.length > 0) {
      elements[0].focus();
    }
  };

  const focusPrevious = () => {
    const elements = getFocusableElements();
    const currentIndex = elements.findIndex(
      (el) => el === document.activeElement || el.contains(document.activeElement as Node)
    );

    if (currentIndex > 0) {
      elements[currentIndex - 1].focus();
    } else if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  };

  const restoreFocus = () => {
    if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
    }
  };

  return {
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    restoreFocus,
  };
}

/**
 * Hook to set a container ref for focus management
 */
export function useFocusContainer(): RefObject<HTMLElement> {
  return useRef<HTMLElement>(null);
}
