import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';
import { retryWithBackoff, RetryOptions } from '../utils/retry';
import { errorTracking, ErrorSeverity } from '../utils/errorTracking';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  retry?: () => Promise<any>;
  retryOptions?: RetryOptions;
  customMessage?: string;
  severity?: ErrorSeverity;
}

export function useErrorHandler() {
  const handleError = useCallback(
    (error: unknown, context: string, options: ErrorHandlerOptions = {}): Promise<any> => {
      const {
        showToast = true,
        logError = true,
        retry,
        retryOptions,
        customMessage,
        severity = ErrorSeverity.MEDIUM,
      } = options;

      // Extract error message
      let errorMessage = 'שגיאה לא ידועה';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message);
      }

      // Track error
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorTracking.track(errorObj, severity, {
        component: context,
        action: 'handleError',
      });

      // Log error
      if (logError) {
        logger.error(`Error in ${context}:`, error, context);
      }

      // Show toast
      if (showToast) {
        const userMessage = customMessage || getUserFriendlyMessage(errorMessage);
        toast.error(userMessage);
      }

      // Retry logic with advanced options
      if (retry) {
        return retryWithBackoff(retry, retryOptions || {});
      }

      return Promise.reject(error);
    },
    []
  );

  return { handleError };
}

function getUserFriendlyMessage(errorMessage: string): string {
  const errorMessages: Record<string, string> = {
    'network': 'שגיאת רשת. בדוק את החיבור לאינטרנט',
    'unauthorized': 'נדרשת התחברות מחדש',
    'forbidden': 'אין לך הרשאה לבצע פעולה זו',
    'not_found': 'הפריט המבוקש לא נמצא',
    'validation': 'נתונים לא תקינים',
    'timeout': 'הבקשה ארכה זמן רב מדי',
    'rate_limit': 'יותר מדי בקשות. נסה שוב בעוד כמה רגעים',
  };

  const lowerMessage = errorMessage.toLowerCase();
  for (const [key, message] of Object.entries(errorMessages)) {
    if (lowerMessage.includes(key)) {
      return message;
    }
  }

  return 'אירעה שגיאה. נסה שוב מאוחר יותר';
}

