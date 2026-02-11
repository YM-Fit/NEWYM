/**
 * Utility functions for workout plan weekly tracking
 */

/**
 * Get the start date of the week (Sunday) for a given date
 * @param date - The date to get the week start for
 * @returns Date object representing Sunday of that week
 */
export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day; // Days to subtract to get to Sunday
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Check if two dates are in different weeks
 * @param currentWeek - Current week start date
 * @param lastWeek - Previous week start date
 * @returns true if the weeks are different
 */
export function isNewWeek(currentWeek: Date, lastWeek: Date | null): boolean {
  if (!lastWeek) return true;
  return currentWeek.getTime() !== lastWeek.getTime();
}

/**
 * Calculate weekly progress percentage
 * @param executions - Array of execution records
 * @param required - Required number of executions for the week
 * @returns Progress percentage (0-100)
 */
export function calculateWeeklyProgress(
  executions: Array<{ id: string }>,
  required: number
): number {
  if (required === 0) return 100;
  const completed = executions.length;
  return Math.min(100, Math.round((completed / required) * 100));
}

/**
 * Format week range for display
 * @param weekStart - Start date of the week (Sunday)
 * @returns Formatted string like "1-7 Jan 2025"
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const month = weekStart.toLocaleDateString('he-IL', { month: 'short' });
  const year = weekStart.getFullYear();
  
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay}-${endDay} ${month} ${year}`;
  } else {
    const startMonth = weekStart.toLocaleDateString('he-IL', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('he-IL', { month: 'short' });
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  }
}

/**
 * Get the required frequency for a day
 * If times_per_week is set, use it. Otherwise, if there's only one day in the plan,
 * use days_per_week from the plan. Otherwise, default to 1.
 * @param day - The workout day
 * @param planDaysPerWeek - Days per week from the plan (if single day plan)
 * @param totalDaysInPlan - Total number of days in the plan
 * @returns Required frequency (1-7)
 */
export function getRequiredFrequency(
  day: { times_per_week?: number },
  planDaysPerWeek: number | null,
  totalDaysInPlan: number
): number {
  // If times_per_week is explicitly set, use it
  if (day.times_per_week !== undefined && day.times_per_week !== null) {
    return day.times_per_week;
  }
  
  // If there's only one day in the plan, use plan's days_per_week
  if (totalDaysInPlan === 1 && planDaysPerWeek !== null && planDaysPerWeek > 0) {
    return planDaysPerWeek;
  }
  
  // Default: once per week
  return 1;
}
