import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatWeight,
  formatPercentage,
  formatNumber,
  formatCurrency,
  getRelativeTime,
  truncateText,
  capitalizeFirst,
} from './formatUtils';

describe('formatUtils', () => {
  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format date string', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should use custom options', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, { year: 'numeric', month: 'long' });
      expect(result).toContain('2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('15');
      expect(result).toContain('14:30');
    });

    it('should format date string with time', () => {
      const result = formatDateTime('2024-01-15T14:30:00');
      expect(result).toContain('14:30');
    });
  });

  describe('formatTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(30)).toBe('0:30');
    });

    it('should format seconds to HH:MM:SS when hours > 0', () => {
      expect(formatTime(3665)).toBe('1:01:05');
      expect(formatTime(7200)).toBe('2:00:00');
    });

    it('should handle zero seconds', () => {
      expect(formatTime(0)).toBe('0:00');
    });
  });

  describe('formatWeight', () => {
    it('should format weight with one decimal', () => {
      expect(formatWeight(75.5)).toBe('75.5 ק"ג');
      expect(formatWeight(100)).toBe('100.0 ק"ג');
      expect(formatWeight(50.123)).toBe('50.1 ק"ג');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(75.5)).toBe('75.5%');
      expect(formatPercentage(100)).toBe('100.0%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(75.567, 2)).toBe('75.57%');
      expect(formatPercentage(100, 0)).toBe('100%');
    });
  });

  describe('formatNumber', () => {
    it('should format number with Hebrew locale', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with shekel symbol', () => {
      expect(formatCurrency(1000)).toBe('₪1,000');
      expect(formatCurrency(1234.56)).toBe('₪1,234.56');
    });
  });

  describe('getRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "לפני רגע" for recent times', () => {
      const date = new Date('2024-01-15T11:59:30');
      expect(getRelativeTime(date)).toBe('לפני רגע');
    });

    it('should return minutes for recent times', () => {
      const date = new Date('2024-01-15T11:55:00');
      expect(getRelativeTime(date)).toBe('לפני 5 דקות');
    });

    it('should return hours for times within 24 hours', () => {
      const date = new Date('2024-01-15T10:00:00');
      expect(getRelativeTime(date)).toBe('לפני 2 שעות');
    });

    it('should return days for times within a week', () => {
      const date = new Date('2024-01-13T12:00:00');
      expect(getRelativeTime(date)).toBe('לפני 2 ימים');
    });

    it('should return weeks for times within a month', () => {
      const date = new Date('2024-01-01T12:00:00');
      expect(getRelativeTime(date)).toBe('לפני 2 שבועות');
    });

    it('should return months for times within a year', () => {
      const date = new Date('2023-11-15T12:00:00');
      expect(getRelativeTime(date)).toBe('לפני 2 חודשים');
    });

    it('should return years for older times', () => {
      const date = new Date('2022-01-15T12:00:00');
      expect(getRelativeTime(date)).toBe('לפני 2 שנים');
    });
  });

  describe('truncateText', () => {
    it('should return original text if shorter than maxLength', () => {
      expect(truncateText('Short', 10)).toBe('Short');
    });

    it('should truncate text longer than maxLength', () => {
      expect(truncateText('This is a long text', 10)).toBe('This is...');
    });

    it('should handle exact length', () => {
      expect(truncateText('1234567890', 10)).toBe('1234567890');
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('world')).toBe('World');
    });

    it('should handle already capitalized', () => {
      expect(capitalizeFirst('Hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });
  });
});
