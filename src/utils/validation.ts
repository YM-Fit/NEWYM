/**
 * Validation Utilities
 * פונקציות ולידציה מרכזיות
 */

// Validation constants
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 20;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 5000;

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > MAX_EMAIL_LENGTH) return false;
  
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
  if (phone.length > MAX_PHONE_LENGTH) return false;
  
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
  
  if (trimmed.length < MIN_NAME_LENGTH) {
    return {
      isValid: false,
      error: `שם לקוח חייב להכיל לפחות ${MIN_NAME_LENGTH} תווים`,
    };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      isValid: false,
      error: `שם לקוח לא יכול להכיל יותר מ-${MAX_NAME_LENGTH} תווים`,
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
  maxLength: number = MAX_NOTES_LENGTH
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

/**
 * Validate trainee form data (shared validation logic for AddTraineeForm and EditTraineeForm)
 */
export interface TraineeFormData {
  full_name?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  height?: string | number;
  pair_name_1?: string;
  pair_name_2?: string;
  pair_phone_1?: string;
  pair_phone_2?: string;
  pair_email_1?: string;
  pair_email_2?: string;
  pair_birth_date_1?: string;
  pair_birth_date_2?: string;
  pair_height_1?: string | number;
  pair_height_2?: string | number;
}

export interface TraineeFormErrors {
  [key: string]: string;
}

/**
 * Validate trainee form fields
 * @param formData - Form data to validate
 * @param isPair - Whether this is a pair trainee
 * @param includeCmInHeightError - Whether to include "ס״מ" in height error message
 * @param isQuickCreate - Whether this is a quick create (only name required)
 * @returns Object with errors object and isValid boolean
 */
export function validateTraineeForm(
  formData: TraineeFormData,
  isPair: boolean,
  includeCmInHeightError: boolean = false,
  isQuickCreate: boolean = false
): { errors: TraineeFormErrors; isValid: boolean } {
  const errors: TraineeFormErrors = {};
  const heightErrorSuffix = includeCmInHeightError ? ' ס״מ' : '';

  if (isPair) {
    // Validate pair fields
    if (!formData.pair_name_1?.trim()) {
      errors.pair_name_1 = 'שם ראשון נדרש';
    }
    if (!formData.pair_name_2?.trim()) {
      errors.pair_name_2 = 'שם שני נדרש';
    }
    
    // For quick create, only names are required for pairs
    if (!isQuickCreate) {
      if (!formData.pair_phone_1?.trim()) {
        errors.pair_phone_1 = 'טלפון ראשון נדרש';
      }
      if (!formData.pair_phone_2?.trim()) {
        errors.pair_phone_2 = 'טלפון שני נדרש';
      }

      // Validate pair heights
      const height1 = typeof formData.pair_height_1 === 'string' 
        ? Number(formData.pair_height_1) 
        : formData.pair_height_1;
      if (!height1 || height1 < 1 || height1 > 250) {
        errors.pair_height_1 = `גובה תקין נדרש (1-250${heightErrorSuffix})`;
      }

      const height2 = typeof formData.pair_height_2 === 'string' 
        ? Number(formData.pair_height_2) 
        : formData.pair_height_2;
      if (!height2 || height2 < 1 || height2 > 250) {
        errors.pair_height_2 = `גובה תקין נדרש (1-250${heightErrorSuffix})`;
      }
    } else {
      // For quick create, validate heights only if provided
      const height1 = typeof formData.pair_height_1 === 'string' 
        ? Number(formData.pair_height_1) 
        : formData.pair_height_1;
      if (height1 && (height1 < 1 || height1 > 250)) {
        errors.pair_height_1 = `גובה תקין נדרש (1-250${heightErrorSuffix})`;
      }

      const height2 = typeof formData.pair_height_2 === 'string' 
        ? Number(formData.pair_height_2) 
        : formData.pair_height_2;
      if (height2 && (height2 < 1 || height2 > 250)) {
        errors.pair_height_2 = `גובה תקין נדרש (1-250${heightErrorSuffix})`;
      }
    }

    // Validate pair emails (always validate format if provided)
    if (formData.pair_email_1 && !isValidEmail(formData.pair_email_1)) {
      errors.pair_email_1 = 'כתובת אימייל לא תקינה';
    }
    if (formData.pair_email_2 && !isValidEmail(formData.pair_email_2)) {
      errors.pair_email_2 = 'כתובת אימייל לא תקינה';
    }

    // Validate pair birth dates are in the past
    if (formData.pair_birth_date_1 && new Date(formData.pair_birth_date_1) > new Date()) {
      errors.pair_birth_date_1 = 'תאריך לידה חייב להיות בעבר';
    }
    if (formData.pair_birth_date_2 && new Date(formData.pair_birth_date_2) > new Date()) {
      errors.pair_birth_date_2 = 'תאריך לידה חייב להיות בעבר';
    }
  } else {
    // Validate single trainee fields
    if (!formData.full_name?.trim()) {
      errors.full_name = 'שם מלא נדרש';
    }
    
    // For quick create, only name is required
    if (!isQuickCreate) {
      if (!formData.phone?.trim()) {
        errors.phone = 'מספר טלפון נדרש';
      }

      // Validate height
      const height = typeof formData.height === 'string' 
        ? Number(formData.height) 
        : formData.height;
      if (!height || height < 1 || height > 250) {
        errors.height = `גובה תקין נדרש (1-250${heightErrorSuffix})`;
      }
    } else {
      // For quick create, validate height only if provided
      const height = typeof formData.height === 'string' 
        ? Number(formData.height) 
        : formData.height;
      if (height && (height < 1 || height > 250)) {
        errors.height = `גובה תקין נדרש (1-250${heightErrorSuffix})`;
      }
    }

    // Validate email (always validate format if provided)
    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = 'כתובת אימייל לא תקינה';
    }

    // Validate birth date is in the past
    if (formData.birth_date && new Date(formData.birth_date) > new Date()) {
      errors.birth_date = 'תאריך לידה חייב להיות בעבר';
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
