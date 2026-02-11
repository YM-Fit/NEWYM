import { Plus, AlertCircle } from 'lucide-react';
import type { MealPlan, Meal } from '../types/mealPlanTypes';
import type { NutritionFoodItem } from '../../../../types/nutritionTypes';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';
import { MEAL_NAMES } from '../constants/mealPlanConstants';
import { MealCard } from './MealCard';
import { GoalsSummaryCard } from './GoalsSummaryCard';

const DEFAULT_MEAL_TIMES: Record<string, string> = {
  breakfast: '08:00',
  morning_snack: '10:00',
  lunch: '13:00',
  afternoon_snack: '16:00',
  dinner: '19:00',
  evening_snack: '21:00',
};

export interface MealsTimelineProps {
  plan: MealPlan;
  meals: Meal[];
  expandedMeals: Set<number>;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  onAddMeal: () => void;
  onUpdateMeal: (index: number, field: keyof Meal, value: unknown) => void;
  onDeleteMeal: (index: number) => void;
  onToggleMeal: (index: number) => void;
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (
    foodItemId: string,
    updates: Partial<NutritionFoodItem>,
    displayIndex: number,
    itemIndex: number
  ) => void;
  setCatalogForMeal: (v: { mealId: string; displayIndex: number } | null) => void;
  showAlternatives: Record<string, boolean>;
  setShowAlternatives: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleQuantityChange: (item: NutritionFoodItem, qty: number, di: number, ii: number) => void;
  handleUnitChange: (item: NutritionFoodItem, newUnit: string, di: number, ii: number) => void;
  handleSwapFood: (
    item: NutritionFoodItem,
    cat: FoodCatalogItem,
    di: number,
    ii: number
  ) => void;
  onCalculateTdee?: () => void;
}

export function MealsTimeline({
  plan,
  meals,
  expandedMeals,
  totals,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onToggleMeal,
  setMeals,
  debouncedUpdateFoodItem,
  setCatalogForMeal,
  showAlternatives,
  setShowAlternatives,
  handleQuantityChange,
  handleUnitChange,
  handleSwapFood,
  onCalculateTdee,
}: MealsTimelineProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="font-bold text-[var(--color-text-primary)] text-xl">ארוחות יומיות</h3>
        <button
          onClick={onAddMeal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500/20 text-primary-400 rounded-xl text-sm font-semibold hover:bg-primary-500/30 transition-all duration-300 hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          הוסף ארוחה
        </button>
      </div>

      {meals.length === 0 ? (
        <div className="premium-card-static p-12 text-center">
          <AlertCircle className="h-14 w-14 mx-auto mb-4 text-[var(--color-text-muted)]" />
          <p className="font-medium text-[var(--color-text-secondary)]">אין ארוחות בתפריט זה</p>
          <p className="text-sm mt-2 text-[var(--color-text-muted)]">
            לחץ על "הוסף ארוחה" כדי להתחיל
          </p>
        </div>
      ) : (
        MEAL_NAMES.map((mealType) => {
          const mealsForType = meals.filter((m) => m.meal_name === mealType.value);
          if (mealsForType.length === 0) return null;

          const mealTotals = mealsForType.reduce(
            (acc, m) => ({
              calories:
                acc.calories +
                (m.total_calories ||
                  m.food_items?.reduce((s, i) => s + (i.calories || 0), 0) ||
                  0),
              protein:
                acc.protein +
                (m.total_protein ||
                  m.food_items?.reduce((s, i) => s + (i.protein || 0), 0) ||
                  0),
              carbs:
                acc.carbs +
                (m.total_carbs || m.food_items?.reduce((s, i) => s + (i.carbs || 0), 0) || 0),
              fat:
                acc.fat +
                (m.total_fat || m.food_items?.reduce((s, i) => s + (i.fat || 0), 0) || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          return (
            <div key={mealType.value} className="premium-card-static overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-sm">
              <MealTypeHeader
                mealType={mealType}
                mealsCount={mealsForType.length}
                mealTotals={mealTotals}
                onAddMeal={onAddMeal}
                onUpdateMeal={onUpdateMeal}
                mealsLength={meals.length}
              />
              <div className="divide-y divide-[var(--color-border)]">
                {mealsForType
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((meal) => {
                    const mealIndex = meals.findIndex(
                      (m) =>
                        (m.id && meal.id && m.id === meal.id) ||
                        (!m.id &&
                          !meal.id &&
                          m.meal_name === meal.meal_name &&
                          m.order_index === meal.order_index &&
                          m.meal_time === meal.meal_time)
                    );
                    const displayIndex =
                      mealIndex >= 0 ? mealIndex : meals.findIndex((m) => m.meal_name === meal.meal_name);

                    return (
                      <MealCard
                        key={meal.id || `${meal.meal_name}-${meal.order_index}-${meal.meal_time}`}
                        meal={meal}
                        displayIndex={displayIndex}
                        expanded={expandedMeals.has(displayIndex)}
                        meals={meals}
                        onToggleMeal={onToggleMeal}
                        onUpdateMeal={onUpdateMeal}
                        onDeleteMeal={onDeleteMeal}
                        setMeals={setMeals}
                        debouncedUpdateFoodItem={debouncedUpdateFoodItem}
                        setCatalogForMeal={setCatalogForMeal}
                        showAlternatives={showAlternatives}
                        setShowAlternatives={setShowAlternatives}
                        handleQuantityChange={handleQuantityChange}
                        handleUnitChange={handleUnitChange}
                        handleSwapFood={handleSwapFood}
                      />
                    );
                  })}
              </div>
            </div>
          );
        })
      )}

      {meals.length > 0 && (
        <GoalsSummaryCard
          plan={plan}
          totals={totals}
          onCalculateTdee={onCalculateTdee}
        />
      )}
    </div>
  );
}

function MealTypeHeader({
  mealType,
  mealsCount,
  mealTotals,
  onAddMeal,
  onUpdateMeal,
  mealsLength,
}: {
  mealType: { value: string; label: string; icon: string };
  mealsCount: number;
  mealTotals: { calories: number; protein: number; carbs: number; fat: number };
  onAddMeal: () => void;
  onUpdateMeal: (index: number, field: keyof Meal, value: unknown) => void;
  mealsLength: number;
}) {
  return (
    <div className="p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-primary-500/10 to-primary-600/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{mealType.icon}</span>
          <div>
            <h4 className="font-bold text-[var(--color-text-primary)] text-xl">{mealType.label}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">
              {mealsCount} {mealsCount === 1 ? 'מזון' : 'מזונות'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {mealTotals.calories > 0 && (
            <div className="flex gap-2 text-sm">
              <span className="text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
                <span className="text-primary-500 font-semibold">{mealTotals.calories}</span>{' '}
                <span className="text-[var(--color-text-muted)]">קל'</span>
              </span>
              {mealTotals.protein > 0 && (
                <span className="text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
                  <span className="text-red-500 font-semibold">{mealTotals.protein}ג</span>{' '}
                  <span className="text-[var(--color-text-muted)]">חלבון</span>
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => {
              onAddMeal();
              setTimeout(() => {
                onUpdateMeal(mealsLength, 'meal_name', mealType.value);
                onUpdateMeal(mealsLength, 'meal_time', DEFAULT_MEAL_TIMES[mealType.value] || '12:00');
              }, 100);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-primary-500/20 text-primary-400 rounded-xl text-sm font-semibold hover:bg-primary-500/30 transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            הוסף מזון
          </button>
        </div>
      </div>
    </div>
  );
}
