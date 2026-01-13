import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  retry?: () => Promise<any>;
  maxRetries?: number;
  customMessage?: string;
}

export function useErrorHandler() {
  const handleError = useCallback((
    error: unknown,
    context: string,
    options: ErrorHandlerOptions = {}
  ): Promise<any> => {
    const {
      showToast = true,
      logError = true,
      retry,
      maxRetries = 3,
      customMessage,
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

    // Log error
    if (logError) {
      logger.error(`Error in ${context}:`, error, context);
    }

    // Show toast
    if (showToast) {
      const userMessage = customMessage || getUserFriendlyMessage(errorMessage);
      toast.error(userMessage);
    }

    // Retry logic
    if (retry && maxRetries > 0) {
      return retryWithBackoff(retry, maxRetries);
    }

    return Promise.reject(error);
  }, []);

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

async function retryWithBackoff(
  fn: () => Promise<any>,
  maxRetries: number,
  delay = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
