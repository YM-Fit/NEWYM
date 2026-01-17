/**
 * Arrow Key Navigation Hook
 * Enables arrow key navigation for a list of focusable elements
 */

import { useEffect, useRef, RefObject } from 'react';

interface UseArrowKeyNavigationOptions {
  /**
   * Whether navigation is enabled
   */
  enabled?: boolean;
  /**
   * Orientation: 'horizontal' | 'vertical' | 'both'
   */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /**
   * Whether to loop when reaching the end
   */
  loop?: boolean;
  /**
   * Whether to prevent default behavior
   */
  preventDefault?: boolean;
  /**
   * Custom selector for focusable items (default: 'button, a, [tabindex]:not([tabindex="-1"])')
   */
  itemSelector?: string;
}

/**
 * Hook to enable arrow key navigation in a container
 * @param containerRef - Ref to the container element
 * @param options - Options for arrow key navigation
 */
export function useArrowKeyNavigation(
  containerRef: RefObject<HTMLElement>,
  options: UseArrowKeyNavigationOptions = {}
): void {
  const {
    enabled = true,
    orientation = 'horizontal',
    loop = true,
    preventDefault = true,
    itemSelector = 'button, a, [tabindex]:not([tabindex="-1"])',
  } = options;

  const currentIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return;
    }

    const container = containerRef.current;

    const getFocusableItems = (): HTMLElement[] => {
      return Array.from(container.querySelectorAll<HTMLElement>(itemSelector)).filter((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          !el.hasAttribute('aria-hidden') &&
          !el.hasAttribute('disabled')
        );
      });
    };

    const getCurrentIndex = (): number => {
      const items = getFocusableItems();
      const activeElement = document.activeElement as HTMLElement;
      return items.findIndex((item) => item === activeElement || item.contains(activeElement));
    };

    const focusItem = (index: number) => {
      const items = getFocusableItems();
      if (items.length === 0) {
        return;
      }

      let targetIndex = index;

      if (loop) {
        if (targetIndex < 0) {
          targetIndex = items.length - 1;
        } else if (targetIndex >= items.length) {
          targetIndex = 0;
        }
      } else {
        targetIndex = Math.max(0, Math.min(targetIndex, items.length - 1));
      }

      if (targetIndex >= 0 && targetIndex < items.length) {
        items[targetIndex].focus();
        currentIndexRef.current = targetIndex;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = getFocusableItems();
      if (items.length === 0) {
        return;
      }

      const currentIndex = getCurrentIndex();
      if (currentIndex === -1) {
        // If no item is focused, start from first
        currentIndexRef.current = 0;
      } else {
        currentIndexRef.current = currentIndex;
      }

      let handled = false;
      let newIndex = currentIndexRef.current;

      // Handle arrow keys based on orientation
      if (orientation === 'horizontal' || orientation === 'both') {
        if (e.key === 'ArrowRight') {
          newIndex = currentIndexRef.current + 1;
          handled = true;
        } else if (e.key === 'ArrowLeft') {
          newIndex = currentIndexRef.current - 1;
          handled = true;
        }
      }

      if (orientation === 'vertical' || orientation === 'both') {
        if (e.key === 'ArrowDown') {
          newIndex = currentIndexRef.current + 1;
          handled = true;
        } else if (e.key === 'ArrowUp') {
          newIndex = currentIndexRef.current - 1;
          handled = true;
        }
      }

      if (handled) {
        if (preventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }

        focusItem(newIndex);
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, containerRef, orientation, loop, preventDefault, itemSelector]);
}
