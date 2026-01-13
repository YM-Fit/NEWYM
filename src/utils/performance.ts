/**
 * Performance monitoring utility
 * Measures and tracks performance metrics
 */

import { logger } from './logger';

export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  
  static mark(name: string) {
    if (typeof performance !== 'undefined' && performance.mark) {
      try {
        performance.mark(`${name}-start`);
        this.marks.set(name, performance.now());
      } catch (error) {
        // Silently fail if performance API is not available
      }
    }
  }
  
  static measure(name: string): number | null {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;
        const duration = measure.duration;
        
        // Log in development
        if (import.meta.env.DEV) {
          logger.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`, undefined, 'PerformanceMonitor');
        }
        
        // Send to analytics in production for slow operations
        if (import.meta.env.PROD && duration > 1000) {
          // TODO: Send slow operations to analytics service
          // Example: analytics.track('slow_operation', { name, duration });
        }
        
        // Cleanup
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
        
        return duration;
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  
  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.mark(name);
    try {
      const result = await fn();
      this.measure(name);
      return result;
    } catch (error) {
      this.measure(name);
      throw error;
    }
  }

  static measureSync<T>(
    name: string,
    fn: () => T
  ): T {
    this.mark(name);
    try {
      const result = fn();
      this.measure(name);
      return result;
    } catch (error) {
      this.measure(name);
      throw error;
    }
  }
}
