/**
 * Shared utility for handling API errors consistently
 * Reduces code duplication across API files
 */

import { extractErrorMessage, getUserFriendlyError } from './errorHandler';
import { logSupabaseError } from '../lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Error types that can occur in API calls
 */
export type ApiError = 
  | Error
  | PostgrestError
  | { message: string; error?: string }
  | string
  | unknown;

/**
 * Options for error handling
 */
export interface ApiErrorHandlerOptions {
  /** Default error message if extraction fails */
  defaultMessage: string;
  /** Context for logging (e.g., function name) */
  context: string;
  /** Additional info for logging */
  additionalInfo?: Record<string, unknown>;
  /** Whether to log Supabase errors */
  logSupabaseError?: boolean;
}

/**
 * Extract error message from various error types
 * Centralized error message extraction to reduce duplication
 */
export function extractApiErrorMessage(error: ApiError): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  // Handle PostgrestError
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as { message: unknown; error?: unknown };
    if (typeof err.message === 'string') {
      return err.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
  }

  return 'שגיאה לא ידועה';
}

/**
 * Handle API errors consistently across all API functions
 * This reduces code duplication in catch blocks
 * 
 * Supports two usage patterns:
 * 1. With options object (returns string): handleApiError(error, { defaultMessage, context })
 * 2. Simple usage (returns Error): handleApiError(error, defaultMessage)
 * 
 * @param error - The error that occurred
 * @param optionsOrMessage - Either an options object or a default message string
 * @param context - Optional context (only used when second param is string)
 * @returns Error message string (when options provided) or Error object (when string provided)
 * 
 * @example
 * ```typescript
 * // Usage with options (returns string)
 * try {
 *   // API call
 * } catch (err) {
 *   const errorMessage = handleApiError(err, {
 *     defaultMessage: 'שגיאה בטעינת לקוחות',
 *     context: 'getClients',
 *   });
 *   return { error: errorMessage };
 * }
 * 
 * // Simple usage (returns Error)
 * try {
 *   // API call
 * } catch (err) {
 *   throw handleApiError(err, 'שגיאה בטעינת לקוחות');
 * }
 * ```
 */
export function handleApiError(
  error: ApiError,
  optionsOrMessage: ApiErrorHandlerOptions | string,
  context?: string
): string | Error {
  // Handle simple string usage (backward compatibility)
  if (typeof optionsOrMessage === 'string') {
    const defaultMessage = optionsOrMessage;
    const errorMessage = extractApiErrorMessage(error);
    
    // Log Supabase errors if needed
    if (error && typeof error === 'object' && 'code' in error) {
      logSupabaseError(error as PostgrestError, context || 'unknown', {});
    }
    
    // Return Error object for backward compatibility
    const apiError = new Error(errorMessage || defaultMessage);
    if (error instanceof Error) {
      apiError.cause = error;
    }
    return apiError;
  }

  // Handle options object usage
  const { defaultMessage, context: ctx, additionalInfo, logSupabaseError: shouldLog = true } = optionsOrMessage;

  // Log Supabase errors if needed
  if (shouldLog && error && typeof error === 'object' && 'code' in error) {
    logSupabaseError(error as PostgrestError, ctx, additionalInfo);
  }

  // Extract error message
  const errorMessage = extractApiErrorMessage(error);
  
  // Return user-friendly message or default
  return errorMessage || defaultMessage;
}

/**
 * Type guard to check if error is a PostgrestError
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Type guard to check if error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}
