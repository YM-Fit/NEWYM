import { useEffect, useState } from 'react';

/**
 * Detects whether the viewport is in tablet range and
 * optionally toggles a global `tablet` class on the document body.
 *
 * Tablet detection:
 *  - Width: 768px - 1366px (includes larger tablets like iPad Pro)
 *  - OR touch device with width >= 768px (to catch touch-enabled tablets)
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // Tablet range: 768px to 1366px, or touch device with width >= 768px
    return (width >= 768 && width <= 1366) || (isTouchDevice && width >= 768);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkIsTablet = () => {
      const width = window.innerWidth;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return (width >= 768 && width <= 1366) || (isTouchDevice && width >= 768);
    };

    const mediaQuery = window.matchMedia('(min-width: 768px) and (max-width: 1366px)');

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in event ? event.matches : event.matches;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const width = window.innerWidth;
      // Check if it's a tablet: media query matches OR touch device with width >= 768px
      const isTabletValue = matches || (isTouchDevice && width >= 768);
      setIsTablet(isTabletValue);
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('tablet', isTabletValue);
      }
    };

    // Initial sync
    handleChange(mediaQuery);

    // Subscribe to changes
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange as (e: MediaQueryListEvent) => void);
    } else {
      // Safari < 14 fallback
      // eslint-disable-next-line deprecation/deprecation
      mediaQuery.addListener(handleChange as (e: MediaQueryListEvent) => void);
    }

    // Also listen to resize events to catch orientation changes
    const handleResize = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const width = window.innerWidth;
      const isTabletValue = (width >= 768 && width <= 1366) || (isTouchDevice && width >= 768);
      setIsTablet(isTabletValue);
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('tablet', isTabletValue);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange as (e: MediaQueryListEvent) => void);
      } else {
        // eslint-disable-next-line deprecation/deprecation
        mediaQuery.removeListener(handleChange as (e: MediaQueryListEvent) => void);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isTablet;
}

