import { useEffect, useState } from 'react';

/**
 * Detects whether the viewport is in tablet range and
 * optionally toggles a global `tablet` class on the document body.
 *
 * Tablet range is aligned with existing CSS utilities:
 *  - @media (min-width: 768px) and (max-width: 1024px)
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768 && window.innerWidth <= 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 768px) and (max-width: 1024px)');

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in event ? event.matches : event.matches;
      setIsTablet(matches);
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('tablet', matches);
      }
    };

    // Initial sync
    handleChange(mediaQuery);

    // Subscribe to changes
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange as (e: MediaQueryListEvent) => void);
      return () => mediaQuery.removeEventListener('change', handleChange as (e: MediaQueryListEvent) => void);
    } else {
      // Safari < 14 fallback
      // eslint-disable-next-line deprecation/deprecation
      mediaQuery.addListener(handleChange as (e: MediaQueryListEvent) => void);
      return () => {
        // eslint-disable-next-line deprecation/deprecation
        mediaQuery.removeListener(handleChange as (e: MediaQueryListEvent) => void);
      };
    }
  }, []);

  return isTablet;
}

