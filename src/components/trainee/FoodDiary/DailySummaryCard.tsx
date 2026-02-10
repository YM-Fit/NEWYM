/**
 * Daily Summary Card Component
 * Displays daily nutrition totals and water intake
 */

import { Flame, Beef, Wheat, Droplet, Droplets } from 'lucide-react';
import type { MealPlan } from '../../../types/nutritionTypes';

const WATER_GOAL = 2000;

interface DailySummaryCardProps {
  dateStr: string;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealPlan: MealPlan | null;
  waterAmount: number;
}

export function DailySummaryCard({
  dateStr,
  totals,
  mealPlan,
  waterAmount,
}: DailySummaryCardProps) {
  const waterGoal = mealPlan?.daily_water_ml || WATER_GOAL;

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-3 text-center">
          <Flame className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{totals.calories}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">קלוריות</p>
          {mealPlan?.daily_calories && (
            <p className={`text-xs mt-1 ${totals.calories <= mealPlan.daily_calories ? 'text-primary-500' : 'text-red-500'}`}>
              מתוך {mealPlan.daily_calories}
            </p>
          )}
        </div>
        <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-center">
          <Beef className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{totals.protein}ג'</p>
          <p className="text-xs text-[var(--color-text-secondary)]">חלבון</p>
          {mealPlan?.protein_grams && (
            <p className={`text-xs mt-1 ${totals.protein >= mealPlan.protein_grams ? 'text-primary-500' : 'text-orange-500'}`}>
              מתוך {mealPlan.protein_grams}ג'
            </p>
          )}
        </div>
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-3 text-center">
          <Wheat className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{totals.carbs}ג'</p>
          <p className="text-xs text-[var(--color-text-secondary)]">פחמימות</p>
          {mealPlan?.carbs_grams && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">מתוך {mealPlan.carbs_grams}ג'</p>
          )}
        </div>
        <div className="bg-blue-500/15 border border-blue-500/30 rounded-lg p-3 text-center">
          <Droplet className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{totals.fat}ג'</p>
          <p className="text-xs text-[var(--color-text-secondary)]">שומן</p>
          {mealPlan?.fat_grams && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">מתוך {mealPlan.fat_grams}ג'</p>
          )}
        </div>
      </div>
      {mealPlan && (
        <div className="bg-blue-500/15 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-blue-600">מים</span>
            </div>
            <span className="text-lg font-bold text-blue-600">
              {waterAmount} / {waterGoal} מ"ל
            </span>
          </div>
          <div className="h-2 bg-blue-500/20 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${Math.min((waterAmount / waterGoal) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
