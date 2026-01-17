/**
 * Bundle Analyzer Utility
 * 
 * Provides utilities for analyzing bundle size and performance
 * Can be used in development to track bundle growth
 */

export interface BundleInfo {
  name: string;
  size: number;
  gzippedSize?: number;
  dependencies?: string[];
}

/**
 * Analyze bundle size (for development/debugging)
 * 
 * @returns Bundle information
 */
export function analyzeBundle(): BundleInfo[] {
  // This would typically use webpack-bundle-analyzer or similar
  // For now, return empty array - can be extended with actual analysis
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available in development mode');
  }
  return [];
}

/**
 * Get estimated bundle size for a module
 * 
 * @param moduleName - Name of the module
 * @returns Estimated size in bytes
 */
export function getModuleSize(moduleName: string): number {
  // This is a placeholder - actual implementation would measure real bundle size
  const knownSizes: Record<string, number> = {
    'react': 45000,
    'react-dom': 130000,
    '@supabase/supabase-js': 250000,
    'recharts': 350000,
    'lucide-react': 150000,
    'date-fns': 80000,
  };
  
  return knownSizes[moduleName] || 0;
}

/**
 * Check if a module should be lazy loaded based on size
 * 
 * @param moduleName - Name of the module
 * @param threshold - Size threshold in bytes (default: 100KB)
 * @returns true if module should be lazy loaded
 */
export function shouldLazyLoad(moduleName: string, threshold: number = 100000): boolean {
  const size = getModuleSize(moduleName);
  return size > threshold;
}

/**
 * Log bundle performance metrics
 */
export function logBundleMetrics(): void {
  if (process.env.NODE_ENV === 'development') {
    const metrics = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    };
    console.log('Bundle Metrics:', metrics);
  }
}
