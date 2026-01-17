/**
 * Tests for error tracking utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  errorTracking,
  ErrorSeverity,
  captureErrorBoundaryError,
  captureApiError,
  captureValidationError,
} from './errorTracking';

describe('errorTracking', () => {
  beforeEach(() => {
    errorTracking.clear();
  });

  describe('track', () => {
    it('should track an error successfully', () => {
      const error = new Error('Test error');

      errorTracking.track(error, ErrorSeverity.MEDIUM, {
        component: 'TestComponent',
      });

      const recentErrors = errorTracking.getRecentErrors(1);
      expect(recentErrors.length).toBe(1);
      expect(recentErrors[0].error.message).toBe('Test error');
      expect(recentErrors[0].severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should handle non-Error objects', () => {
      errorTracking.track('String error', ErrorSeverity.LOW);

      const recentErrors = errorTracking.getRecentErrors(1);
      expect(recentErrors.length).toBe(1);
      expect(recentErrors[0].error).toBeInstanceOf(Error);
    });

    it('should track errors with different severity levels', () => {
      const error1 = new Error('Low severity');
      const error2 = new Error('High severity');

      errorTracking.track(error1, ErrorSeverity.LOW);
      errorTracking.track(error2, ErrorSeverity.HIGH);

      const stats = errorTracking.getStatistics();
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1);
    });

    it('should track errors with context', () => {
      const error = new Error('Error with context');

      errorTracking.track(error, ErrorSeverity.MEDIUM, {
        userId: 'user-1',
        trainerId: 'trainer-1',
        component: 'TestComponent',
        action: 'test-action',
        metadata: { key: 'value' },
      });

      const recentErrors = errorTracking.getRecentErrors(1);
      expect(recentErrors[0].context.userId).toBe('user-1');
      expect(recentErrors[0].context.component).toBe('TestComponent');
    });

    it('should limit maximum errors stored', () => {
      // Track more than maxErrors
      for (let i = 0; i < 150; i++) {
        errorTracking.track(new Error(`Error ${i}`), ErrorSeverity.LOW);
      }

      const stats = errorTracking.getStatistics();
      expect(stats.total).toBeLessThanOrEqual(100);
    });
  });

  describe('getRecentErrors', () => {
    it('should return recent errors', () => {
      errorTracking.track(new Error('Error 1'), ErrorSeverity.LOW);
      errorTracking.track(new Error('Error 2'), ErrorSeverity.MEDIUM);
      errorTracking.track(new Error('Error 3'), ErrorSeverity.HIGH);

      const recent = errorTracking.getRecentErrors(2);
      expect(recent.length).toBe(2);
      expect(recent[0].error.message).toBe('Error 3');
      expect(recent[1].error.message).toBe('Error 2');
    });

    it('should limit results to specified limit', () => {
      for (let i = 0; i < 10; i++) {
        errorTracking.track(new Error(`Error ${i}`), ErrorSeverity.LOW);
      }

      const recent = errorTracking.getRecentErrors(5);
      expect(recent.length).toBe(5);
    });

    it('should return empty array when no errors', () => {
      const recent = errorTracking.getRecentErrors(10);
      expect(recent.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all tracked errors', () => {
      errorTracking.track(new Error('Error 1'), ErrorSeverity.LOW);
      errorTracking.track(new Error('Error 2'), ErrorSeverity.MEDIUM);

      errorTracking.clear();

      const stats = errorTracking.getStatistics();
      expect(stats.total).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      errorTracking.track(new Error('Error 1'), ErrorSeverity.LOW);
      errorTracking.track(new Error('Error 2'), ErrorSeverity.LOW);
      errorTracking.track(new Error('Error 3'), ErrorSeverity.MEDIUM);
      errorTracking.track(new Error('Error 4'), ErrorSeverity.HIGH);
      errorTracking.track(new Error('Error 5'), ErrorSeverity.CRITICAL);

      const stats = errorTracking.getStatistics();

      expect(stats.total).toBe(5);
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(2);
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.CRITICAL]).toBe(1);
      expect(stats.recent).toBeGreaterThanOrEqual(0);
    });

    it('should return zero statistics when empty', () => {
      const stats = errorTracking.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(0);
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(0);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(0);
      expect(stats.bySeverity[ErrorSeverity.CRITICAL]).toBe(0);
    });
  });

  describe('captureErrorBoundaryError', () => {
    it('should capture error boundary errors', () => {
      const error = new Error('React error');
      const errorInfo = {
        componentStack: 'Component stack trace',
      } as React.ErrorInfo;

      captureErrorBoundaryError(error, errorInfo, {
        component: 'TestComponent',
      });

      const recentErrors = errorTracking.getRecentErrors(1);
      expect(recentErrors.length).toBe(1);
      expect(recentErrors[0].severity).toBe(ErrorSeverity.HIGH);
      expect(recentErrors[0].context.metadata?.componentStack).toBe('Component stack trace');
    });
  });

  describe('captureApiError', () => {
    it('should capture API errors', () => {
      const error = new Error('API error');

      captureApiError(error, '/api/test', {
        userId: 'user-1',
      });

      const recentErrors = errorTracking.getRecentErrors(1);
      expect(recentErrors.length).toBe(1);
      expect(recentErrors[0].severity).toBe(ErrorSeverity.MEDIUM);
      expect(recentErrors[0].context.action).toBe('API: /api/test');
      expect(recentErrors[0].context.metadata?.endpoint).toBe('/api/test');
    });

    it('should handle non-Error objects', () => {
      captureApiError('String error', '/api/test');

      const recentErrors = errorTracking.getRecentErrors(1);
      expect(recentErrors.length).toBe(1);
      expect(recentErrors[0].error).toBeInstanceOf(Error);
    });
  });

  describe('captureValidationError', () => {
    it('should capture validation errors', () => {
      captureValidationError('email', 'invalid@', {
        component: 'Form',
      });

      const recentErrors = errorTracking.getRecentErrors(1);
      expect(recentErrors.length).toBe(1);
      expect(recentErrors[0].severity).toBe(ErrorSeverity.LOW);
      expect(recentErrors[0].context.action).toBe('Validation');
      expect(recentErrors[0].context.metadata?.field).toBe('email');
    });

    it('should limit value length in metadata', () => {
      const longValue = 'a'.repeat(200);
      captureValidationError('field', longValue);

      const recentErrors = errorTracking.getRecentErrors(1);
      expect(recentErrors[0].context.metadata?.value.length).toBeLessThanOrEqual(100);
    });
  });
});
