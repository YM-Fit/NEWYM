/**
 * Performance Monitoring Utilities
 * Tracks Web Vitals and performance metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface WebVitals {
  lcp?: PerformanceMetric; // Largest Contentful Paint
  fcp?: PerformanceMetric; // First Contentful Paint
  fid?: PerformanceMetric; // First Input Delay
  cls?: PerformanceMetric; // Cumulative Layout Shift
  ttfb?: PerformanceMetric; // Time to First Byte
}

/**
 * Get performance rating based on Web Vitals thresholds
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, { good: number; poor: number }> = {
    lcp: { good: 2500, poor: 4000 }, // milliseconds
    fcp: { good: 1800, poor: 3000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    ttfb: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[name.toLowerCase()];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Measure and report Web Vitals
 */
export function measureWebVitals(onReport?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  // Measure LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      if (lastEntry) {
        const value = lastEntry.renderTime || lastEntry.loadTime || 0;
        if (typeof value === 'number' && !isNaN(value)) {
          const metric: PerformanceMetric = {
            name: 'LCP',
            value,
            rating: getRating('lcp', value),
            timestamp: Date.now(),
          };
          
          onReport?.(metric);
          logPerformanceMetric(metric);
        }
      }
    });

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    // LCP not supported
  }

  // Measure FCP (First Contentful Paint)
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0] as any;
      
      if (firstEntry) {
        const value = firstEntry.renderTime || firstEntry.loadTime || 0;
        if (typeof value === 'number' && !isNaN(value)) {
          const metric: PerformanceMetric = {
            name: 'FCP',
            value,
            rating: getRating('fcp', value),
            timestamp: Date.now(),
          };
          
          onReport?.(metric);
          logPerformanceMetric(metric);
        }
      }
    });

    fcpObserver.observe({ entryTypes: ['paint'] });
  } catch (e) {
    // FCP not supported
  }

  // Measure CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput && entry.value) {
          clsValue += typeof entry.value === 'number' ? entry.value : 0;
        }
      }

      if (typeof clsValue === 'number' && !isNaN(clsValue)) {
        const metric: PerformanceMetric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating('cls', clsValue),
          timestamp: Date.now(),
        };
        
        onReport?.(metric);
        logPerformanceMetric(metric);
      }
    });

    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    // CLS not supported
  }

  // Measure FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0] as any;
      
      if (firstEntry) {
        const value = firstEntry.processingStart && firstEntry.startTime
          ? firstEntry.processingStart - firstEntry.startTime
          : 0;
        if (typeof value === 'number' && !isNaN(value)) {
          const metric: PerformanceMetric = {
            name: 'FID',
            value,
            rating: getRating('fid', value),
            timestamp: Date.now(),
          };
          
          onReport?.(metric);
          logPerformanceMetric(metric);
        }
      }
    });

    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    // FID not supported
  }

  // Measure TTFB (Time to First Byte)
  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry && navigationEntry.responseStart && navigationEntry.requestStart) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      if (typeof ttfb === 'number' && !isNaN(ttfb)) {
        const metric: PerformanceMetric = {
          name: 'TTFB',
          value: ttfb,
          rating: getRating('ttfb', ttfb),
          timestamp: Date.now(),
        };
        
        onReport?.(metric);
        logPerformanceMetric(metric);
      }
    }
  } catch (e) {
    // TTFB measurement failed
  }
}

/**
 * Log performance metric
 */
function logPerformanceMetric(metric: PerformanceMetric): void {
  if (process.env.NODE_ENV === 'development') {
    const value = typeof metric.value === 'number' && !isNaN(metric.value)
      ? metric.value.toFixed(2)
      : 'N/A';
    console.log(`[Performance] ${metric.name}: ${value}ms (${metric.rating || 'N/A'})`);
  }

  // In production, send to analytics/monitoring service
  // Example: sendToAnalytics(metric);
}

/**
 * Measure API response time
 */
export function measureApiCall<T>(
  apiCall: () => Promise<T>,
  endpoint: string
): Promise<T> {
  const startTime = performance.now();
  
  return apiCall()
    .then((result) => {
      const duration = performance.now() - startTime;
      logPerformanceMetric({
        name: `API:${endpoint}`,
        value: duration,
        rating: duration < 100 ? 'good' : duration < 500 ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
      });
      return result;
    })
    .catch((error) => {
      const duration = performance.now() - startTime;
      logPerformanceMetric({
        name: `API:${endpoint}:error`,
        value: duration,
        rating: 'poor',
        timestamp: Date.now(),
      });
      throw error;
    });
}

/**
 * Get all performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const metrics: PerformanceMetric[] = [];

  // Navigation timing
  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const domContentLoadedValue = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      if (typeof domContentLoadedValue === 'number' && !isNaN(domContentLoadedValue)) {
        metrics.push({
          name: 'DOMContentLoaded',
          value: domContentLoadedValue,
          rating: 'good',
          timestamp: Date.now(),
        });
      }

      const loadValue = navigation.loadEventEnd - navigation.loadEventStart;
      if (typeof loadValue === 'number' && !isNaN(loadValue)) {
        metrics.push({
          name: 'Load',
          value: loadValue,
          rating: 'good',
          timestamp: Date.now(),
        });
      }
    }
  } catch (e) {
    // Navigation timing not supported
  }

  return metrics;
}

/**
 * Performance Monitor class
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private onReport?: (metric: PerformanceMetric) => void;

  constructor(onReport?: (metric: PerformanceMetric) => void) {
    this.onReport = onReport;
    this.start();
  }

  start(): void {
    measureWebVitals((metric) => {
      this.metrics.push(metric);
      this.onReport?.(metric);
    });
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageMetric(name: string): number | null {
    const matchingMetrics = this.metrics.filter(m => m.name === name);
    if (matchingMetrics.length === 0) return null;

    const sum = matchingMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / matchingMetrics.length;
  }

  clear(): void {
    this.metrics = [];
  }
}
