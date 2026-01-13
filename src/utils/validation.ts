/**
 * Validation utilities for form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================
// Value Validation (returns validated value)
// ============================================

export function validateRPE(rpe: number | null | undefined): number | null {
  if (!rpe) return null;
  if (rpe >= 1 && rpe <= 10) return rpe;
  return null;
}

export function validateSource(source: string | null | undefined): 'tanita' | 'manual' {
  if (source === 'tanita') return 'tanita';
  return 'manual';
}

export function validateGender(gender: string | null | undefined): 'male' | 'female' {
  if (gender === 'female') return 'female';
  return 'male';
}

export function validateSetType(setType: string | null | undefined): 'regular' | 'superset' | 'dropset' {
  if (setType === 'superset') return 'superset';
  if (setType === 'dropset') return 'dropset';
  return 'regular';
}

export function validateWorkoutType(workoutType: string | null | undefined): 'personal' | 'pair' {
  if (workoutType === 'pair') return 'pair';
  return 'personal';
}

export function validateResistanceLevel(level: number | null | undefined): number | null {
  if (!level) return null;
  if (level >= 1 && level <= 5) return level;
  return null;
}

export function validateEquipmentCategory(category: string | null | undefined): string | null {
  const validCategories = [
    'resistance_band',
    'leg_band',
    'bar',
    'pulley_attachment',
    'suspension',
    'balance',
    'ball',
    'other'
  ];

  if (category && validCategories.includes(category)) return category;
  return null;
}

export function validatePairMember(pairMember: string | null | undefined): 'member_1' | 'member_2' | null {
  if (pairMember === 'member_1') return 'member_1';
  if (pairMember === 'member_2') return 'member_2';
  return null;
}

// ============================================
// Input Validation (returns validation result)
// ============================================

// Weight validation (0-500 kg)
export function validateWeightInput(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Allow empty
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'משקל חייב להיות מספר' };
  }
  if (value < 0) {
    return { isValid: false, error: 'משקל לא יכול להיות שלילי' };
  }
  if (value > 500) {
    return { isValid: false, error: 'משקל לא יכול להיות יותר מ-500 ק"ג' };
  }
  return { isValid: true };
}

// Reps validation (0-100)
export function validateRepsInput(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Allow empty
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'חזרות חייב להיות מספר' };
  }
  if (value < 0) {
    return { isValid: false, error: 'חזרות לא יכול להיות שלילי' };
  }
  if (value > 100) {
    return { isValid: false, error: 'חזרות לא יכול להיות יותר מ-100' };
  }
  if (!Number.isInteger(value)) {
    return { isValid: false, error: 'חזרות חייב להיות מספר שלם' };
  }
  return { isValid: true };
}

// RPE validation (1-10)
export function validateRPEInput(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Allow empty
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'RPE חייב להיות מספר' };
  }
  if (value < 1) {
    return { isValid: false, error: 'RPE חייב להיות לפחות 1' };
  }
  if (value > 10) {
    return { isValid: false, error: 'RPE לא יכול להיות יותר מ-10' };
  }
  return { isValid: true };
}

// Body fat percentage validation (0-70%)
export function validateBodyFatInput(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Allow empty
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'אחוז שומן חייב להיות מספר' };
  }
  if (value < 0) {
    return { isValid: false, error: 'אחוז שומן לא יכול להיות שלילי' };
  }
  if (value > 70) {
    return { isValid: false, error: 'אחוז שומן לא יכול להיות יותר מ-70%' };
  }
  return { isValid: true };
}

// Height validation (50-250 cm)
export function validateHeightInput(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Allow empty
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'גובה חייב להיות מספר' };
  }
  if (value < 50) {
    return { isValid: false, error: 'גובה חייב להיות לפחות 50 ס"מ' };
  }
  if (value > 250) {
    return { isValid: false, error: 'גובה לא יכול להיות יותר מ-250 ס"מ' };
  }
  return { isValid: true };
}

// Phone validation (Israeli format)
export function validatePhoneInput(value: string | null | undefined): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Allow empty
  }
  // Israeli phone: 05X-XXXXXXX or 05XXXXXXXX or +972...
  const phoneRegex = /^(\+972|0)(5[0-9]|[2-4]|[7-9])[-]?[0-9]{7}$/;
  const cleanPhone = value.replace(/\s/g, '');
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'מספר טלפון לא תקין' };
  }
  return { isValid: true };
}

// Email validation
export function validateEmailInput(value: string | null | undefined): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Allow empty
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, error: 'כתובת אימייל לא תקינה' };
  }
  return { isValid: true };
}

// Required field validation
export function validateRequired(value: unknown, fieldName: string): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} הוא שדה חובה` };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { isValid: false, error: `${fieldName} הוא שדה חובה` };
  }
  return { isValid: true };
}

// Measurement validation (0-200 cm for body measurements)
export function validateMeasurementInput(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Allow empty
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'מדידה חייבת להיות מספר' };
  }
  if (value < 0) {
    return { isValid: false, error: 'מדידה לא יכולה להיות שלילית' };
  }
  if (value > 200) {
    return { isValid: false, error: 'מדידה לא יכולה להיות יותר מ-200 ס"מ' };
  }
  return { isValid: true };
}

// Date validation (not in future for measurements/workouts)
export function validatePastDate(value: string | Date | null | undefined): ValidationResult {
  if (!value) {
    return { isValid: true }; // Allow empty
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'תאריך לא תקין' };
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) {
    return { isValid: false, error: 'תאריך לא יכול להיות בעתיד' };
  }
  return { isValid: true };
}

// ============================================
// Utility Functions
// ============================================

// Sanitize string input (basic XSS prevention)
export function sanitizeString(value: string): string {
  if (!value) return '';
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Clamp number to range
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Validate workout set
export interface SetValidation {
  weight: ValidationResult;
  reps: ValidationResult;
  rpe: ValidationResult;
  isValid: boolean;
}

export function validateSet(weight: number, reps: number, rpe?: number | null): SetValidation {
  const weightResult = validateWeightInput(weight);
  const repsResult = validateRepsInput(reps);
  const rpeResult = validateRPEInput(rpe);

  return {
    weight: weightResult,
    reps: repsResult,
    rpe: rpeResult,
    isValid: weightResult.isValid && repsResult.isValid && rpeResult.isValid,
  };
}
