/**
 * Chart Helpers
 * פונקציות עזר ליצירת גרפים
 */

/**
 * Format number for display
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('he-IL');
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return `₪${formatNumber(Math.round(amount))}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get color for status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'emerald',
    pending: 'yellow',
    overdue: 'red',
    paid: 'emerald',
    failed: 'red',
    sent: 'emerald',
    churned: 'red',
    inactive: 'yellow',
    lead: 'blue',
    qualified: 'purple',
  };

  return colors[status] || 'gray';
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Generate gradient colors
 */
export function generateGradientColors(baseColor: string, steps: number): string[] {
  // Simplified gradient generation
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const opacity = 0.2 + (i / steps) * 0.8;
    colors.push(`${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
  }
  return colors;
}

/**
 * Format date for charts
 */
export function formatChartDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
}

/**
 * Format month for charts
 */
export function formatChartMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' });
}
