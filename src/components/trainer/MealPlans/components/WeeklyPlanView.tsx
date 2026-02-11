import { useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import type { MealPlan } from '../types/mealPlanTypes';
import type { Meal } from '../types/mealPlanTypes';
import { MEAL_NAMES } from '../constants/mealPlanConstants';

const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

interface WeeklyPlanViewProps {
  plan: MealPlan;
  meals: Meal[];
}

export function WeeklyPlanView({ plan, meals }: WeeklyPlanViewProps) {
  const totals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.total_calories || m.food_items?.reduce((s, i) => s + (i.calories || 0), 0) || 0),
        protein: acc.protein + (m.total_protein || m.food_items?.reduce((s, i) => s + (i.protein || 0), 0) || 0),
        carbs: acc.carbs + (m.total_carbs || m.food_items?.reduce((s, i) => s + (i.carbs || 0), 0) || 0),
        fat: acc.fat + (m.total_fat || m.food_items?.reduce((s, i) => s + (i.fat || 0), 0) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  const mealsByType = useMemo(() => {
    return MEAL_NAMES.map((mealType) => ({
      ...mealType,
      meals: meals
        .filter((m) => m.meal_name === mealType.value)
        .sort((a, b) => a.order_index - b.order_index),
    }));
  }, [meals]);

  return (
    <div className="space-y-6">
      <div className="premium-card-static p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary-400" />
          <h3 className="font-bold text-[var(--color-text-primary)] text-lg">תצוגת שבוע</h3>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          אותו תפריט יומי לכל 7 ימים בשבוע
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {WEEKDAY_LABELS.map((dayLabel, dayIndex) => (
          <div
            key={dayLabel}
            className="premium-card-static p-4 flex flex-col"
          >
            <div className="font-bold text-[var(--color-text-primary)] text-center mb-4 pb-3 border-b border-[var(--color-border)]">
              יום {dayLabel}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[60vh]">
              {mealsByType.map(({ value, label, icon, meals: typeMeals }) => {
                if (typeMeals.length === 0) return null;
                return (
                  <div key={value} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)]">
                      <span>{icon}</span>
                      <span>{label}</span>
                    </div>
                    {typeMeals.map((meal) => (
                      <DayMealCard key={meal.id || `${meal.meal_name}-${meal.order_index}`} meal={meal} />
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              <div className="flex justify-between">
                <span>סה״כ יומי:</span>
                <span className="font-semibold text-primary-500">{totals.calories} קל׳</span>
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-red-500">{totals.protein}ג</span>
                <span className="text-blue-500">{totals.carbs}ג</span>
                <span className="text-amber-600">{totals.fat}ג</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayMealCard({ meal }: { meal: Meal }) {
  const mealCalories = meal.food_items?.reduce((s, i) => s + (i.calories || 0), 0) || meal.total_calories || 0;

  return (
    <div className="p-3 bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)]">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-3 w-3 text-[var(--color-text-muted)]" />
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">{meal.meal_time}</span>
      </div>
      <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
        {(meal.food_items || []).slice(0, 5).map((item) => (
          <li key={item.id} className="truncate">
            {item.food_name} {item.quantity > 0 && `(${item.quantity}${item.unit || 'g'})`}
          </li>
        ))}
        {(meal.food_items?.length || 0) > 5 && (
          <li className="text-[var(--color-text-muted)]">+{(meal.food_items?.length || 0) - 5} עוד</li>
        )}
      </ul>
      {mealCalories > 0 && (
        <p className="text-[10px] text-primary-500 mt-1 font-medium">{mealCalories} קל׳</p>
      )}
    </div>
  );
}
