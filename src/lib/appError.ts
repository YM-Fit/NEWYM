import type { PostgrestError } from '@supabase/supabase-js';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export class AppError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly severity: ErrorSeverity;
  readonly context?: Record<string, unknown>;

  constructor(options: {
    message: string;
    userMessage: string;
    code?: string;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code || 'UNKNOWN';
    this.userMessage = options.userMessage;
    this.severity = options.severity || 'medium';
    this.context = options.context;
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  static fromPostgrestError(error: PostgrestError, context?: string): AppError {
    const userMessage = postgrestErrorToHebrew(error);
    return new AppError({
      message: error.message,
      userMessage,
      code: error.code || 'POSTGREST_ERROR',
      severity: getPostgrestSeverity(error),
      context: {
        postgrestCode: error.code,
        details: error.details,
        hint: error.hint,
        source: context,
      },
      cause: error,
    });
  }

  static fromNetworkError(error: unknown, context?: string): AppError {
    const message = error instanceof Error ? error.message : String(error);
    return new AppError({
      message,
      userMessage: 'שגיאת תקשורת. בדוק את החיבור לאינטרנט ונסה שוב.',
      code: 'NETWORK_ERROR',
      severity: 'high',
      context: { source: context },
      cause: error,
    });
  }

  static fromUnknown(error: unknown, context?: string): AppError {
    if (error instanceof AppError) return error;

    if (isPostgrestError(error)) {
      return AppError.fromPostgrestError(error, context);
    }

    const message = error instanceof Error ? error.message : String(error);
    return new AppError({
      message,
      userMessage: 'אירעה שגיאה. נסה שוב.',
      code: 'UNKNOWN',
      severity: 'medium',
      context: { source: context },
      cause: error,
    });
  }
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    ('code' in error || 'details' in error || 'hint' in error)
  );
}

function postgrestErrorToHebrew(error: PostgrestError): string {
  switch (error.code) {
    case '23505':
      return 'רשומה כזו כבר קיימת.';
    case '23503':
      return 'לא ניתן לבצע את הפעולה - קיים קשר לנתונים אחרים.';
    case '42501':
      return 'אין לך הרשאה לבצע פעולה זו.';
    case 'PGRST116':
      return 'הנתונים המבוקשים לא נמצאו.';
    case 'PGRST301':
      return 'תוקף ההתחברות פג. אנא התחבר מחדש.';
    case '42P01':
      return 'שגיאה פנימית - טבלה לא קיימת.';
    default:
      return 'אירעה שגיאה בשרת. נסה שוב.';
  }
}

function getPostgrestSeverity(error: PostgrestError): ErrorSeverity {
  switch (error.code) {
    case 'PGRST301':
      return 'high';
    case '42501':
      return 'high';
    case '23505':
      return 'low';
    case 'PGRST116':
      return 'low';
    default:
      return 'medium';
  }
}
