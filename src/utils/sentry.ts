/**
 * Sentry Error Tracking Configuration
 * Centralized Sentry initialization and configuration
 */

// Track if Sentry is initialized
let isSentryInitialized = false;
let Sentry: typeof import('@sentry/react') | null = null;

/**
 * Initialize Sentry error tracking
 * Should be called once at application startup
 */
export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';
  const release = import.meta.env.VITE_APP_VERSION || 'unknown';

  // Don't initialize Sentry if DSN is not provided
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] DSN not provided, error tracking disabled');
    } else {
      console.warn('[Sentry] DSN not provided, error tracking disabled');
    }
    return;
  }

  try {
    // Dynamic import to avoid loading Sentry if DSN is not provided
    if (!Sentry) {
      const sentryModule = await import('@sentry/react');
      Sentry = sentryModule;
    }

    Sentry.init({
      dsn,
      environment,
      release,
      // Disable automatic session tracking in development
      autoSessionTracking: import.meta.env.PROD,
      // Disable automatic performance monitoring in development
      enableTracing: import.meta.env.PROD,
      // Performance monitoring
      integrations: [
        ...(import.meta.env.PROD ? [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            // Session Replay can be expensive, only enable on errors
            maskAllText: false,
            blockAllMedia: false,
          }),
        ] : []),
      ],

    // Performance monitoring sample rate
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0, // 10% in production, 0% in dev to avoid unnecessary requests

    // Session Replay sample rate
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0, // 10% of sessions in prod, 0% in dev
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0, // 100% when an error occurs in prod, 0% in dev

    // Before send hook to filter or modify events
    beforeSend(event, hint) {
      // Filter out development errors
      if (import.meta.env.DEV) {
        console.log('[Sentry] Error captured:', event, hint);
        // Return null to prevent sending in development (unless explicitly testing)
        return import.meta.env.VITE_SENTRY_ENABLED === 'true' ? event : null;
      }

      // Filter out StackBlitz/WebContainer related errors
      const errorMessage = event.exception?.values?.[0]?.value || '';
      const errorUrl = event.request?.url || '';
      if (
        errorMessage.includes('chmln') ||
        errorMessage.includes('messo') ||
        errorMessage.includes('staticblitz') ||
        errorMessage.includes('webcontainer') ||
        errorMessage.includes('Cannot read properties of undefined') ||
        errorUrl.includes('/api/supabase/functions/') ||
        errorUrl.includes('staticblitz.com') ||
        errorUrl.includes('webcontainer')
      ) {
        return null; // Don't send StackBlitz errors
      }

      // Filter out expected errors (like 404s, validation errors)
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Don't send validation errors or expected errors
          if (
            error.message.includes('Validation') ||
            error.message.includes('404') ||
            error.message.includes('Not found') ||
            error.message.includes('ERR_BLOCKED_BY_CLIENT') ||
            error.message.includes('ERR_ABORTED')
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
      'ERR_BLOCKED_BY_CLIENT',
      'ERR_ABORTED',
      // Chrome extensions
      'chrome-extension://',
      'moz-extension://',
      // StackBlitz/WebContainer errors
      'chmln',
      'messo',
      'staticblitz',
      'webcontainer',
      'Cannot read properties of undefined',
      // Supabase function deployment errors (from StackBlitz)
      '/api/supabase/functions/',
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
    isSentryInitialized = true;
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
    isSentryInitialized = false;
  }
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.captureException(error, {
      tags: context,
      level: 'error',
    });
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to capture exception:', e);
    }
  }
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: any = 'info'): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.captureMessage(message, level);
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to capture message:', e);
    }
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, metadata?: Record<string, any>): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.setUser({
      id: userId,
      email,
      ...metadata,
    });
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to set user context:', e);
    }
  }
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.setUser(null);
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to clear user context:', e);
    }
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      data,
      level: 'info',
    });
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to add breadcrumb:', e);
    }
  }
}

/**
 * Set additional context (tags, extra data)
 */
export function setContext(key: string, context: Record<string, any>): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.setContext(key, context);
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to set context:', e);
    }
  }
}

/**
 * Set tag for filtering errors
 */
export function setTag(key: string, value: string): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.setTag(key, value);
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to set tag:', e);
    }
  }
}

/**
 * Configure scope for error tracking
 * Note: configureScope is deprecated in newer Sentry versions, using withScope instead
 */
export function configureScope(callback: (scope: any) => void): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.withScope(callback);
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to configure scope:', e);
    }
  }
}

/**
 * Capture unhandled promise rejection
 */
export function captureUnhandledRejection(reason: any): void {
  if (!isSentryInitialized || !Sentry) return;
  try {
    Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
      level: 'error',
      tags: {
        type: 'unhandledRejection',
      },
    });
  } catch (e) {
    // Silently fail if Sentry is not available
    if (import.meta.env.DEV) {
      console.warn('[Sentry] Failed to capture unhandled rejection:', e);
    }
  }
}
