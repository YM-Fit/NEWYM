import { describe, it, expect } from 'vitest';
import {
  validateWeightInput,
  validateRepsInput,
  validateRPEInput,
  validateBodyFatInput,
  validateHeightInput,
  validatePhoneInput,
  validateEmailInput,
  validateRequired,
  validatePastDate,
  sanitizeString,
  clampNumber,
  validateRPE,
  validateGender,
} from './validation';

describe('validateWeightInput', () => {
  it('should accept null/undefined', () => {
    expect(validateWeightInput(null).isValid).toBe(true);
    expect(validateWeightInput(undefined).isValid).toBe(true);
  });

  it('should accept valid weights', () => {
    expect(validateWeightInput(0).isValid).toBe(true);
    expect(validateWeightInput(50).isValid).toBe(true);
    expect(validateWeightInput(100.5).isValid).toBe(true);
    expect(validateWeightInput(500).isValid).toBe(true);
  });

  it('should reject negative weights', () => {
    const result = validateWeightInput(-1);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject weights over 500', () => {
    const result = validateWeightInput(501);
    expect(result.isValid).toBe(false);
  });
});

describe('validateRepsInput', () => {
  it('should accept null/undefined', () => {
    expect(validateRepsInput(null).isValid).toBe(true);
    expect(validateRepsInput(undefined).isValid).toBe(true);
  });

  it('should accept valid reps', () => {
    expect(validateRepsInput(1).isValid).toBe(true);
    expect(validateRepsInput(10).isValid).toBe(true);
    expect(validateRepsInput(100).isValid).toBe(true);
  });

  it('should reject negative reps', () => {
    expect(validateRepsInput(-1).isValid).toBe(false);
  });

  it('should reject reps over 100', () => {
    expect(validateRepsInput(101).isValid).toBe(false);
  });

  it('should reject non-integer reps', () => {
    expect(validateRepsInput(5.5).isValid).toBe(false);
  });
});

describe('validateRPEInput', () => {
  it('should accept null/undefined', () => {
    expect(validateRPEInput(null).isValid).toBe(true);
    expect(validateRPEInput(undefined).isValid).toBe(true);
  });

  it('should accept valid RPE (1-10)', () => {
    expect(validateRPEInput(1).isValid).toBe(true);
    expect(validateRPEInput(5).isValid).toBe(true);
    expect(validateRPEInput(10).isValid).toBe(true);
  });

  it('should reject RPE below 1', () => {
    expect(validateRPEInput(0).isValid).toBe(false);
  });

  it('should reject RPE above 10', () => {
    expect(validateRPEInput(11).isValid).toBe(false);
  });
});

describe('validatePhoneInput', () => {
  it('should accept empty values', () => {
    expect(validatePhoneInput(null).isValid).toBe(true);
    expect(validatePhoneInput('').isValid).toBe(true);
  });

  it('should accept valid Israeli phone numbers', () => {
    expect(validatePhoneInput('0521234567').isValid).toBe(true);
    expect(validatePhoneInput('052-1234567').isValid).toBe(true);
    expect(validatePhoneInput('+972521234567').isValid).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhoneInput('123').isValid).toBe(false);
    expect(validatePhoneInput('abcdefghij').isValid).toBe(false);
  });
});

describe('validateEmailInput', () => {
  it('should accept empty values', () => {
    expect(validateEmailInput(null).isValid).toBe(true);
    expect(validateEmailInput('').isValid).toBe(true);
  });

  it('should accept valid emails', () => {
    expect(validateEmailInput('test@example.com').isValid).toBe(true);
    expect(validateEmailInput('user.name@domain.co.il').isValid).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmailInput('notanemail').isValid).toBe(false);
    expect(validateEmailInput('missing@domain').isValid).toBe(false);
    expect(validateEmailInput('@nodomain.com').isValid).toBe(false);
  });
});

describe('validateRequired', () => {
  it('should reject null/undefined/empty', () => {
    expect(validateRequired(null, 'field').isValid).toBe(false);
    expect(validateRequired(undefined, 'field').isValid).toBe(false);
    expect(validateRequired('', 'field').isValid).toBe(false);
    expect(validateRequired('   ', 'field').isValid).toBe(false);
  });

  it('should accept non-empty values', () => {
    expect(validateRequired('value', 'field').isValid).toBe(true);
    expect(validateRequired(0, 'field').isValid).toBe(true);
    expect(validateRequired(false, 'field').isValid).toBe(true);
  });
});

describe('validatePastDate', () => {
  it('should accept empty values', () => {
    expect(validatePastDate(null).isValid).toBe(true);
    expect(validatePastDate(undefined).isValid).toBe(true);
  });

  it('should accept past dates', () => {
    expect(validatePastDate('2020-01-01').isValid).toBe(true);
    expect(validatePastDate(new Date('2020-01-01')).isValid).toBe(true);
  });

  it('should accept today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(validatePastDate(today).isValid).toBe(true);
  });

  it('should reject future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(validatePastDate(future).isValid).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('should handle empty strings', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('should escape HTML characters', () => {
    expect(sanitizeString('<script>')).toBe('&lt;script&gt;');
    expect(sanitizeString('"test"')).toBe('&quot;test&quot;');
    expect(sanitizeString("'test'")).toBe('&#x27;test&#x27;');
  });

  it('should leave safe strings unchanged', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World');
    expect(sanitizeString('שלום עולם')).toBe('שלום עולם');
  });
});

describe('clampNumber', () => {
  it('should return value if within range', () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
  });

  it('should return min if value is below', () => {
    expect(clampNumber(-5, 0, 10)).toBe(0);
  });

  it('should return max if value is above', () => {
    expect(clampNumber(15, 0, 10)).toBe(10);
  });
});

describe('validateRPE', () => {
  it('should return null for invalid values', () => {
    expect(validateRPE(null)).toBe(null);
    expect(validateRPE(0)).toBe(null);
    expect(validateRPE(11)).toBe(null);
  });

  it('should return value for valid RPE', () => {
    expect(validateRPE(5)).toBe(5);
    expect(validateRPE(1)).toBe(1);
    expect(validateRPE(10)).toBe(10);
  });
});

describe('validateGender', () => {
  it('should return male as default', () => {
    expect(validateGender(null)).toBe('male');
    expect(validateGender(undefined)).toBe('male');
    expect(validateGender('invalid')).toBe('male');
  });

  it('should return female when specified', () => {
    expect(validateGender('female')).toBe('female');
  });
});

describe('validateBodyFatInput', () => {
  it('should accept null/undefined', () => {
    expect(validateBodyFatInput(null).isValid).toBe(true);
    expect(validateBodyFatInput(undefined).isValid).toBe(true);
  });

  it('should accept valid body fat percentages', () => {
    expect(validateBodyFatInput(10).isValid).toBe(true);
    expect(validateBodyFatInput(25.5).isValid).toBe(true);
    expect(validateBodyFatInput(50).isValid).toBe(true);
  });

  it('should reject negative values', () => {
    expect(validateBodyFatInput(-1).isValid).toBe(false);
  });

  it('should reject values over 100', () => {
    expect(validateBodyFatInput(101).isValid).toBe(false);
  });
});

describe('validateHeightInput', () => {
  it('should accept null/undefined', () => {
    expect(validateHeightInput(null).isValid).toBe(true);
    expect(validateHeightInput(undefined).isValid).toBe(true);
  });

  it('should accept valid heights', () => {
    expect(validateHeightInput(100).isValid).toBe(true);
    expect(validateHeightInput(180).isValid).toBe(true);
    expect(validateHeightInput(250).isValid).toBe(true);
  });

  it('should reject negative heights', () => {
    expect(validateHeightInput(-1).isValid).toBe(false);
  });

  it('should reject heights over 250cm', () => {
    expect(validateHeightInput(251).isValid).toBe(false);
  });
});

