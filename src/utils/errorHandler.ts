/**
 * Centralized error handling utilities
 */

import toast from 'react-hot-toast';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: string;
}

/**
 * Map common error codes to user-friendly Hebrew messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  'UNAUTHORIZED': 'נדרשת התחברות מחדש',
  'FORBIDDEN': 'אין לך הרשאה לבצע פעולה זו',
  'NOT_FOUND': 'הפריט המבוקש לא נמצא',
  'VALIDATION_ERROR': 'נתונים לא תקינים',
  'NETWORK_ERROR': 'שגיאת רשת. בדוק את החיבור לאינטרנט',
  'TIMEOUT': 'הבקשה ארכה זמן רב מדי',
  'RATE_LIMIT': 'יותר מדי בקשות. נסה שוב בעוד כמה רגעים',
};

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    if (err.error && typeof err.error === 'string') {
      return err.error;
    }
  }

  return 'שגיאה לא ידועה';
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  const message = extractErrorMessage(error);
  
  // Check if it's a known error code
  for (const [code, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(code) || message.toUpperCase().includes(code)) {
      return friendlyMessage;
    }
  }

  // Return original message if no mapping found
  return message;
}

/**
 * Show error toast with consistent styling
 */
export function showErrorToast(error: unknown, customMessage?: string): void {
  const message = customMessage || getUserFriendlyError(error);
  toast.error(message, {
    duration: 4000,
    position: 'top-center',
  });
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string): void {
  toast.success(message, {
    duration: 3000,
    position: 'top-center',
  });
}

/**
 * Show warning toast
 */
export function showWarningToast(message: string): void {
  toast(message, {
    icon: '⚠️',
    duration: 4000,
    position: 'top-center',
  });
}
