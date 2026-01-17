/**
 * Sentry Error Tracking Configuration
 * Centralized Sentry initialization and configuration
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking
 * Should be called once at application startup
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';
  const release = import.meta.env.VITE_APP_VERSION || 'unknown';

  // Only initialize Sentry in production or if DSN is provided
  if (!dsn && import.meta.env.PROD) {
    console.warn('[Sentry] DSN not provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Session Replay can be expensive, only enable on errors
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance monitoring sample rate
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in production, 100% in dev

    // Session Replay sample rate
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% when an error occurs

    // Before send hook to filter or modify events
    beforeSend(event, hint) {
      // Filter out development errors
      if (import.meta.env.DEV) {
        console.log('[Sentry] Error captured:', event, hint);
        // Return null to prevent sending in development (unless explicitly testing)
        return import.meta.env.VITE_SENTRY_ENABLED === 'true' ? event : null;
      }

      // Filter out expected errors (like 404s, validation errors)
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Don't send validation errors or expected errors
          if (
            error.message.includes('Validation') ||
            error.message.includes('404') ||
            error.message.includes('Not found')
          ) {
            return null;
          }
        }
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'atomicFindClose',
      'fb_xd_fragment',
      'bmi_SafeAddOnload',
      'EBCallBackMessageReceived',
      'conduitPage',
      // Network errors that are expected
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      // Chrome extensions
      'chrome-extension://',
      'moz-extension://',
    ],

    // Don't send personal data
    beforeBreadcrumb(breadcrumb) {
      // Remove sensitive data from breadcrumbs
      if (breadcrumb.category === 'console') {
        // Don't log console messages in production
        return null;
      }
      return breadcrumb;
    },
  });
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  Sentry.captureException(error, {
    tags: context,
    level: 'error',
  });
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, metadata?: Record<string, any>): void {
  Sentry.setUser({
    id: userId,
    email,
    ...metadata,
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    data,
    level: 'info',
  });
}

/**
 * Set additional context (tags, extra data)
 */
export function setContext(key: string, context: Record<string, any>): void {
  Sentry.setContext(key, context);
}

/**
 * Set tag for filtering errors
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Configure scope for error tracking
 * Note: configureScope is deprecated in newer Sentry versions, using withScope instead
 */
export function configureScope(callback: (scope: Sentry.Scope) => void): void {
  Sentry.withScope(callback);
}

/**
 * Capture unhandled promise rejection
 */
export function captureUnhandledRejection(reason: any): void {
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    level: 'error',
    tags: {
      type: 'unhandledRejection',
    },
  });
}
