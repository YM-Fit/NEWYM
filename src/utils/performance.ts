/**
 * Performance Monitoring System
 * Tracks Real User Monitoring (RUM), API response times, and Web Vitals
 */

import { logger } from './logger';
import { addBreadcrumb } from './sentry';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface WebVitals {
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  fid?: number; // First Input Delay
  lcp?: number; // Largest Contentful Paint
  ttfb?: number; // Time to First Byte
}

export interface APIPerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode?: number;
  success: boolean;
  timestamp: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIPerformanceMetric[] = [];
  private maxMetrics = 1000;
  private webVitals: WebVitals = {};

  constructor() {
    this.initWebVitals();
    this.initPerformanceObserver();
  }

  /**
   * Initialize Web Vitals tracking
   */
  private initWebVitals(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // Track Largest Contentful Paint (LCP)
    this.trackLCP();

    // Track First Input Delay (FID)
    this.trackFID();

    // Track Cumulative Layout Shift (CLS)
    this.trackCLS();

    // Track First Contentful Paint (FCP) and Time to First Byte (TTFB)
    this.trackPaintMetrics();
  }

  /**
   * Track Largest Contentful Paint
   */
  private trackLCP(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            this.webVitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
            this.recordMetric('LCP', this.webVitals.lcp, 'ms');
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }

  /**
   * Track First Input Delay
   */
  private trackFID(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              const fid = entry.processingStart - entry.startTime;
              this.webVitals.fid = fid;
              this.recordMetric('FID', fid, 'ms');
            }
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }

  /**
   * Track Cumulative Layout Shift
   */
  private trackCLS(): void {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.webVitals.cls = clsValue;
            }
          });
          this.recordMetric('CLS', clsValue, 'score');
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }

  /**
   * Track paint metrics (FCP, TTFB)
   */
  private trackPaintMetrics(): void {
    if (typeof window.performance === 'undefined') {
      return;
    }

    window.addEventListener('load', () => {
      const perfData = window.performance.getEntriesByType('paint') as PerformancePaintTiming[];
      perfData.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.webVitals.fcp = entry.startTime;
          this.recordMetric('FCP', entry.startTime, 'ms');
        }
      });

      // TTFB (Time to First Byte)
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        this.webVitals.ttfb = ttfb;
        this.recordMetric('TTFB', ttfb, 'ms');
      }
    });
  }

  /**
   * Initialize Performance Observer for general performance tracking
   */
  private initPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    // Monitor long tasks (blocking main thread)
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            // Tasks longer than 50ms are considered long tasks
            this.recordMetric('long-task', entry.duration, 'ms', {
              name: entry.name,
              startTime: entry.startTime,
            });
          }
        });
      });
      observer.observe({ entryTypes: ['measure', 'longtask'] });
    } catch (e) {
      // Not supported
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log significant performance issues
    if (value > this.getThreshold(name)) {
      logger.warn(`Performance issue detected: ${name} = ${value}${unit}`, metadata, 'Performance');
      
      // Add to Sentry breadcrumb
      addBreadcrumb(`Performance: ${name}`, 'performance', {
        value,
        unit,
        ...metadata,
      });
    }
  }

  /**
   * Track API call performance
   */
  recordAPICall(metric: APIPerformanceMetric): void {
    this.apiMetrics.push(metric);

    // Keep only last N metrics
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics);
    }

    // Log slow API calls
    if (metric.duration > 1000) {
      logger.warn(
        `Slow API call: ${metric.method} ${metric.endpoint} took ${metric.duration}ms`,
        metric,
        'API'
      );
    }

    // Add to Sentry breadcrumb
    addBreadcrumb(`API: ${metric.method} ${metric.endpoint}`, 'http', {
      duration: metric.duration,
      statusCode: metric.statusCode,
      success: metric.success,
    });
  }

  /**
   * Get performance threshold for a metric
   */
  private getThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      LCP: 2500, // Good LCP is < 2.5s
      FID: 100, // Good FID is < 100ms
      CLS: 0.1, // Good CLS is < 0.1
      FCP: 1800, // Good FCP is < 1.8s
      TTFB: 800, // Good TTFB is < 800ms
      'long-task': 50, // Long tasks should be < 50ms
    };

    return thresholds[metricName] || 1000;
  }

  /**
   * Get Web Vitals metrics
   */
  getWebVitals(): WebVitals {
    return { ...this.webVitals };
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    webVitals: WebVitals;
    averageAPIDuration: number;
    totalAPICalls: number;
    successfulAPICalls: number;
    slowAPICalls: number;
  } {
    const successfulAPICalls = this.apiMetrics.filter((m) => m.success).length;
    const slowAPICalls = this.apiMetrics.filter((m) => m.duration > 1000).length;
    const totalDuration = this.apiMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageAPIDuration =
      this.apiMetrics.length > 0 ? totalDuration / this.apiMetrics.length : 0;

    return {
      webVitals: this.getWebVitals(),
      averageAPIDuration,
      totalAPICalls: this.apiMetrics.length,
      successfulAPICalls,
      slowAPICalls,
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 50): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get recent API metrics
   */
  getRecentAPIMetrics(limit: number = 50): APIPerformanceMetric[] {
    return this.apiMetrics.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.apiMetrics = [];
    this.webVitals = {};
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Wrapper for API calls to track performance
 */
export async function trackAPICall<T>(
  endpoint: string,
  method: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let statusCode: number | undefined;
  let success = false;

  try {
    const result = await apiCall();
    success = true;

    // Try to extract status code if result has it
    if (result && typeof result === 'object' && 'status' in result) {
      statusCode = (result as { status: number }).status;
    }

    return result;
  } catch (error) {
    // Try to extract status code from error
    if (error && typeof error === 'object' && 'status' in error) {
      statusCode = (error as { status: number }).status;
    }

    throw error;
  } finally {
    const duration = Date.now() - startTime;
    performanceMonitor.recordAPICall({
      endpoint,
      method,
      duration,
      statusCode,
      success,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track Web Vitals using the Performance Monitor
 */
export function trackWebVitals(onPerfEntry?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  // Use Performance Monitor which already tracks all Web Vitals
  // Just trigger callbacks when metrics are recorded
  const originalRecord = performanceMonitor.recordMetric.bind(performanceMonitor);
  
  performanceMonitor.recordMetric = function(name, value, unit, metadata) {
    originalRecord(name, value, unit, metadata);
    
    if (onPerfEntry && ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].includes(name)) {
      onPerfEntry({
        name,
        value,
        unit,
        timestamp: new Date().toISOString(),
        metadata,
      });
    }
  };
}

/**
 * Track bundle performance metrics
 */
export function trackBundlePerformance(): void {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  try {
    // Measure bundle load time
    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const bundleLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      performanceMonitor.recordMetric('bundle-load-time', bundleLoadTime, 'ms', {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
      });

      // Track resource loading
      const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalResourceSize = 0;
      let totalResourceTime = 0;

      resources.forEach((resource) => {
        if (resource.transferSize) {
          totalResourceSize += resource.transferSize;
        }
        totalResourceTime += resource.duration;
      });

      if (resources.length > 0) {
        performanceMonitor.recordMetric('resource-load', totalResourceTime, 'ms', {
          count: resources.length,
          totalSize: totalResourceSize,
          averageSize: totalResourceSize / resources.length,
        });

        // Log large resources
        resources.forEach((resource) => {
          if (resource.transferSize && resource.transferSize > 500000) { // > 500KB
            performanceMonitor.recordMetric('large-resource', resource.transferSize, 'bytes', {
              name: resource.name,
              duration: resource.duration,
            });
          }
        });
      }
    }
  } catch (error) {
    logger.warn('Error tracking bundle performance', error, 'Performance');
  }
}
