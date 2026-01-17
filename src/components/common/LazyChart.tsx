/**
 * Lazy Chart Component
 * Wrapper for lazy loading recharts components
 */

import { lazy, Suspense, ComponentType } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// Lazy load recharts components
const RechartsComponents = lazy(() => import('recharts'));

interface LazyChartProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Lazy Chart wrapper that loads recharts only when needed
 * This reduces initial bundle size significantly
 */
export function LazyChart({ children, fallback }: LazyChartProps) {
  return (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      {children}
    </Suspense>
  );
}

/**
 * Lazy load specific recharts components
 * Usage: const LazyLineChart = lazyLoadChart('LineChart');
 */
export function lazyLoadChart(componentName: string): ComponentType<any> {
  return lazy(async () => {
    const recharts = await import('recharts');
    return { default: (recharts as any)[componentName] };
  });
}

/**
 * Pre-configured lazy chart components
 */
export const LazyLineChart = lazy(async () => {
  const { LineChart } = await import('recharts');
  return { default: LineChart };
});

export const LazyBarChart = lazy(async () => {
  const { BarChart } = await import('recharts');
  return { default: BarChart };
});

export const LazyPieChart = lazy(async () => {
  const { PieChart } = await import('recharts');
  return { default: PieChart };
});

export const LazyAreaChart = lazy(async () => {
  const { AreaChart } = await import('recharts');
  return { default: AreaChart };
});
