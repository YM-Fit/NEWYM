/**
 * Validation Utilities
 * פונקציות ולידציה מרכזיות
 */

import { CRM_VALIDATION } from '../constants/crmConstants';

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > CRM_VALIDATION.MAX_EMAIL_LENGTH) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number format (basic validation)
 * @param phone - Phone number to validate
 * @returns Boolean indicating if phone is valid
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  if (phone.length > CRM_VALIDATION.MAX_PHONE_LENGTH) return false;
  
  // Remove common phone formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Check if it contains only digits (and optionally starts with +)
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validate client name
 * @param name - Client name to validate
 * @returns Object with isValid boolean and error message
 */
export function validateClientName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'שם לקוח הוא חובה' };
  }

  const trimmed = name.trim();
  
  if (trimmed.length < CRM_VALIDATION.MIN_CLIENT_NAME_LENGTH) {
    return {
      isValid: false,
      error: `שם לקוח חייב להכיל לפחות ${CRM_VALIDATION.MIN_CLIENT_NAME_LENGTH} תווים`,
    };
  }

  if (trimmed.length > CRM_VALIDATION.MAX_CLIENT_NAME_LENGTH) {
    return {
      isValid: false,
      error: `שם לקוח לא יכול להכיל יותר מ-${CRM_VALIDATION.MAX_CLIENT_NAME_LENGTH} תווים`,
    };
  }

  return { isValid: true };
}

/**
 * Validate notes/description length
 * @param text - Text to validate
 * @param maxLength - Maximum allowed length (default: MAX_NOTES_LENGTH)
 * @returns Object with isValid boolean and error message
 */
export function validateTextLength(
  text: string,
  maxLength: number = CRM_VALIDATION.MAX_NOTES_LENGTH
): { isValid: boolean; error?: string } {
  if (!text || typeof text !== 'string') {
    return { isValid: true }; // Empty text is valid
  }

  if (text.length > maxLength) {
    return {
      isValid: false,
      error: `הטקסט לא יכול להכיל יותר מ-${maxLength} תווים`,
    };
  }

  return { isValid: true };
}

/**
 * Validate date string
 * @param dateString - Date string to validate
 * @returns Boolean indicating if date is valid
 */
export function isValidDate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate date is in the future
 * @param dateString - Date string to validate
 * @returns Object with isValid boolean and error message
 */
export function validateFutureDate(dateString: string): { isValid: boolean; error?: string } {
  if (!isValidDate(dateString)) {
    return { isValid: false, error: 'תאריך לא תקין' };
  }

  const date = new Date(dateString);
  const now = new Date();
  
  if (date <= now) {
    return { isValid: false, error: 'התאריך חייב להיות בעתיד' };
  }

  return { isValid: true };
}

/**
 * Validate UUID format
 * @param uuid - UUID string to validate
 * @returns Boolean indicating if UUID is valid
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate required field
 * @param value - Value to validate
 * @param fieldName - Name of the field (for error message)
 * @returns Object with isValid boolean and error message
 */
export function validateRequired(
  value: any,
  fieldName: string = 'שדה'
): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} הוא חובה` };
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} הוא חובה` };
  }

  return { isValid: true };
}

/**
 * Validate number range
 * @param value - Number to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @param fieldName - Name of the field (for error message)
 * @returns Object with isValid boolean and error message
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = 'מספר'
): { isValid: boolean; error?: string } {
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} חייב להיות מספר` };
  }

  if (value < min) {
    return { isValid: false, error: `${fieldName} חייב להיות לפחות ${min}` };
  }

  if (value > max) {
    return { isValid: false, error: `${fieldName} לא יכול להיות יותר מ-${max}` };
  }

  return { isValid: true };
}
