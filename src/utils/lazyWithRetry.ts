import { ComponentType, lazy, LazyExoticComponent } from 'react';
import { retryWithBackoff } from './retry';

/**
 * Creates a lazy-loaded component with retry logic for failed imports
 * This is useful in environments where network requests may fail (e.g., StackBlitz)
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
): LazyExoticComponent<T> {
  return lazy(() =>
    retryWithBackoff(
      async () => {
        try {
          const module = await importFn();
          // Ensure we have a default export
          if (!module || !module.default) {
            throw new Error('Module does not have a default export');
          }
          return module;
        } catch (error) {
          // Re-throw to let retry logic handle it
          throw error;
        }
      },
      {
        maxRetries: retries,
        initialDelay: 500,
        maxDelay: 2000,
        multiplier: 1.5,
        isRetryable: (error) => {
          // Retry on network errors, fetch errors, or module loading errors
          if (error instanceof TypeError) {
            const message = error.message.toLowerCase();
            return (
              message.includes('fetch') ||
              message.includes('network') ||
              message.includes('failed to fetch') ||
              message.includes('dynamically imported module') ||
              message.includes('loading chunk') ||
              message.includes('chunk load')
            );
          }
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return (
              message.includes('fetch') ||
              message.includes('network') ||
              message.includes('failed to fetch') ||
              message.includes('dynamically imported module') ||
              message.includes('loading chunk') ||
              message.includes('chunk load') ||
              message.includes('timeout')
            );
          }
          return false;
        },
        onRetry: (attempt, error) => {
          console.warn(
            `[LazyLoad] Retrying component import (attempt ${attempt}/${retries + 1}):`,
            error instanceof Error ? error.message : String(error)
          );
        },
      }
    ).catch((error) => {
      // Final error handling - log and rethrow
      console.error('[LazyLoad] Failed to load component after retries:', error);
      throw error;
    })
  );
}
