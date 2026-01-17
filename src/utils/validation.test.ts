/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  validateClientName,
  validateTextLength,
  isValidDate,
  validateFutureDate,
  isValidUUID,
  validateRequired,
  validateNumberRange,
} from './validation';

describe('isValidEmail', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.il')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('should handle null/undefined', () => {
    expect(isValidEmail(null as any)).toBe(false);
    expect(isValidEmail(undefined as any)).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('should accept valid phone numbers', () => {
    expect(isValidPhone('0501234567')).toBe(true);
    expect(isValidPhone('050-123-4567')).toBe(true);
    expect(isValidPhone('+972501234567')).toBe(true);
    expect(isValidPhone('+1-555-123-4567')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });

  it('should handle null/undefined', () => {
    expect(isValidPhone(null as any)).toBe(false);
    expect(isValidPhone(undefined as any)).toBe(false);
  });
});

describe('validateClientName', () => {
  it('should accept valid client names', () => {
    const result = validateClientName('John Doe');
    expect(result.isValid).toBe(true);
  });

  it('should reject empty names', () => {
    const result = validateClientName('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject names that are too short', () => {
    const result = validateClientName('A');
    expect(result.isValid).toBe(false);
  });

  it('should handle null/undefined', () => {
    const result1 = validateClientName(null as any);
    expect(result1.isValid).toBe(false);

    const result2 = validateClientName(undefined as any);
    expect(result2.isValid).toBe(false);
  });
});

describe('validateTextLength', () => {
  it('should accept text within range', () => {
    const result = validateTextLength('Test text', 1, 100);
    expect(result.isValid).toBe(true);
  });

  it('should reject text that is too short', () => {
    const result = validateTextLength('', 1, 100);
    expect(result.isValid).toBe(false);
  });

  it('should reject text that is too long', () => {
    const longText = 'a'.repeat(101);
    const result = validateTextLength(longText, 1, 100);
    expect(result.isValid).toBe(false);
  });
});

describe('isValidDate', () => {
  it('should accept valid date strings', () => {
    expect(isValidDate('2024-01-01')).toBe(true);
    expect(isValidDate('2024-12-31')).toBe(true);
  });

  it('should reject invalid date strings', () => {
    expect(isValidDate('invalid')).toBe(false);
    expect(isValidDate('2024-13-01')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('validateFutureDate', () => {
  it('should accept future dates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const result = validateFutureDate(futureDate.toISOString().split('T')[0]);
    expect(result.isValid).toBe(true);
  });

  it('should reject past dates', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const result = validateFutureDate(pastDate.toISOString().split('T')[0]);
    expect(result.isValid).toBe(false);
  });

  it('should reject invalid date strings', () => {
    const result = validateFutureDate('invalid');
    expect(result.isValid).toBe(false);
  });
});

describe('isValidUUID', () => {
  it('should accept valid UUIDs', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('should reject invalid UUIDs', () => {
    expect(isValidUUID('invalid')).toBe(false);
    expect(isValidUUID('123')).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });
});

describe('validateRequired', () => {
  it('should accept non-empty values', () => {
    const result = validateRequired('value');
    expect(result.isValid).toBe(true);
  });

  it('should accept numbers', () => {
    const result = validateRequired(0);
    expect(result.isValid).toBe(true);
  });

  it('should reject null/undefined/empty', () => {
    expect(validateRequired(null).isValid).toBe(false);
    expect(validateRequired(undefined).isValid).toBe(false);
    expect(validateRequired('').isValid).toBe(false);
  });

  it('should use custom field name in error', () => {
    const result = validateRequired(null, 'שם');
    expect(result.error).toContain('שם');
  });
});

describe('validateNumberRange', () => {
  it('should accept numbers within range', () => {
    const result = validateNumberRange(50, 0, 100);
    expect(result.isValid).toBe(true);
  });

  it('should accept numbers at boundaries', () => {
    expect(validateNumberRange(0, 0, 100).isValid).toBe(true);
    expect(validateNumberRange(100, 0, 100).isValid).toBe(true);
  });

  it('should reject numbers below minimum', () => {
    const result = validateNumberRange(-1, 0, 100);
    expect(result.isValid).toBe(false);
  });

  it('should reject numbers above maximum', () => {
    const result = validateNumberRange(101, 0, 100);
    expect(result.isValid).toBe(false);
  });

  it('should use custom field name in error', () => {
    const result = validateNumberRange(101, 0, 100, 'גיל');
    expect(result.error).toContain('גיל');
  });
});
