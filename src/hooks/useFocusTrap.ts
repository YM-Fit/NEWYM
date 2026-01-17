/**
 * Focus Trap Hook
 * Traps focus within a container (e.g., modal, dropdown)
 */

import { useEffect, useRef, RefObject } from 'react';

interface UseFocusTrapOptions {
  /**
   * Whether the trap is active
   */
  enabled?: boolean;
  /**
   * Element to return focus to when trap is disabled
   */
  returnFocusOnDeactivate?: boolean;
  /**
   * Initial element to focus when trap is activated
   */
  initialFocus?: RefObject<HTMLElement> | HTMLElement | null;
}

/**
 * Hook to trap focus within a container
 * @param containerRef - Ref to the container element
 * @param options - Options for the focus trap
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  options: UseFocusTrapOptions = {}
): void {
  const {
    enabled = true,
    returnFocusOnDeactivate = true,
    initialFocus,
  } = options;

  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return;
    }

    const container = containerRef.current;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
        (el) => {
          // Filter out hidden elements
          const style = window.getComputedStyle(el);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            !el.hasAttribute('aria-hidden')
          );
        }
      );
    };

    // Focus initial element or first focusable element
    const focusInitial = () => {
      if (initialFocus) {
        const element = 'current' in initialFocus ? initialFocus.current : initialFocus;
        if (element) {
          element.focus();
          return;
        }
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    // Handle Tab key to trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const isShiftTab = e.shiftKey;

      // If only one element, prevent tabbing
      if (focusableElements.length === 1) {
        e.preventDefault();
        firstElement.focus();
        return;
      }

      // If focus is on the first element and Shift+Tab, move to last
      if (document.activeElement === firstElement && isShiftTab) {
        e.preventDefault();
        lastElement.focus();
        return;
      }

      // If focus is on the last element and Tab (no shift), move to first
      if (document.activeElement === lastElement && !isShiftTab) {
        e.preventDefault();
        firstElement.focus();
        return;
      }
    };

    // Focus initial element
    focusInitial();

    // Add event listener
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Return focus to previous element
      if (returnFocusOnDeactivate && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [enabled, containerRef, returnFocusOnDeactivate, initialFocus]);
}
