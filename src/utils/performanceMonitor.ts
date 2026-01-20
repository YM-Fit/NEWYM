/**
 * Performance Monitoring Utilities
 * @deprecated This file is kept for backward compatibility.
 * Please import directly from './performance' instead.
 * 
 * This file re-exports functions from performance.ts to maintain
 * backward compatibility with existing code.
 */

// Re-export types and functions from the unified performance module
export {
  measureWebVitals,
  measureApiCall,
  getPerformanceMetrics,
} from './performance';

// Re-export PerformanceMonitor class (with adapter for backward compatibility)
import { performanceMonitor as unifiedMonitor } from './performance';
import type { PerformanceMetric as UnifiedMetric } from './performance';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface WebVitals {
  lcp?: PerformanceMetric;
  fcp?: PerformanceMetric;
  fid?: PerformanceMetric;
  cls?: PerformanceMetric;
  ttfb?: PerformanceMetric;
}

// Import measureWebVitals for the PerformanceMonitor class
import { measureWebVitals as unifiedMeasureWebVitals } from './performance';

/**
 * Performance Monitor class (backward compatibility wrapper)
 * @deprecated Use the unified performanceMonitor instance from './performance' instead
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private onReport?: (metric: PerformanceMetric) => void;

  constructor(onReport?: (metric: PerformanceMetric) => void) {
    this.onReport = onReport;
    this.start();
  }

  start(): void {
    // Use the unified measureWebVitals function
    unifiedMeasureWebVitals((metric: UnifiedMetric) => {
      const adaptedMetric: PerformanceMetric = {
        name: metric.name,
        value: metric.value,
        rating: (metric.metadata?.rating as 'good' | 'needs-improvement' | 'poor') || 'good',
        timestamp: new Date(metric.timestamp).getTime(),
      };
      this.metrics.push(adaptedMetric);
      this.onReport?.(adaptedMetric);
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
