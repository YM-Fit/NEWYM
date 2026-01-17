/**
 * Utility functions for Food Diary
 */

/**
 * Get week dates starting from a given date
 */
export function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    dates.push(date);
  }
  return dates;
}

/**
 * Get Hebrew day name
 */
export function getHebrewDayName(date: Date): string {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[date.getDay()];
}

/**
 * Format date as DD/MM
 */
export function formatDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Get date range for view mode
 */
export function getDateRange(
  viewMode: 'day' | 'week' | 'month',
  currentDate: Date,
  currentWeekStart: Date
): { startDate: string; endDate: string } {
  if (viewMode === 'day') {
    const dateStr = currentDate.toISOString().split('T')[0];
    return { startDate: dateStr, endDate: dateStr };
  }

  if (viewMode === 'week') {
    const weekDates = getWeekDates(currentWeekStart);
    return {
      startDate: weekDates[0].toISOString().split('T')[0],
      endDate: weekDates[6].toISOString().split('T')[0],
    };
  }

  // month view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0],
  };
}

/**
 * Calculate daily totals from meals
 */
export function calculateDailyTotals(meals: Array<{
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}>): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + (meal.calories || 0),
      protein: totals.protein + (meal.protein || 0),
      carbs: totals.carbs + (meal.carbs || 0),
      fat: totals.fat + (meal.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
