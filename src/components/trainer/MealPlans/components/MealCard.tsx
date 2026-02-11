import { Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { Meal } from '../types/mealPlanTypes';
import type { NutritionFoodItem } from '../../../../types/nutritionTypes';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';
import { MEAL_NAMES } from '../constants/mealPlanConstants';
import { FoodItemsEditor } from './FoodItemsEditor';

export interface MealCardProps {
  meal: Meal;
  displayIndex: number;
  expanded: boolean;
  meals: Meal[];
  onToggleMeal: (index: number) => void;
  onUpdateMeal: (index: number, field: keyof Meal, value: unknown) => void;
  onDeleteMeal: (index: number) => void;
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
  handleSwapFood: (
    item: NutritionFoodItem,
    cat: FoodCatalogItem,
    di: number,
    ii: number
  ) => void;
}

export function MealCard({
  meal,
  displayIndex,
  expanded,
  meals,
  onToggleMeal,
  onUpdateMeal,
  onDeleteMeal,
  setMeals,
  debouncedUpdateFoodItem,
  setCatalogForMeal,
  showAlternatives,
  setShowAlternatives,
  handleQuantityChange,
  handleSwapFood,
}: MealCardProps) {
  const mealCalories =
    meal.food_items?.reduce((s, i) => s + (i.calories || 0), 0) || meal.total_calories || 0;
  const mealProtein =
    meal.food_items?.reduce((s, i) => s + (i.protein || 0), 0) || meal.total_protein || 0;

  return (
    <div className="p-5 hover:bg-[var(--color-accent-bg)] transition-all duration-300">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => onToggleMeal(displayIndex)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="p-2 bg-primary-500/20 rounded-xl">
            <Clock className="h-4 w-4 text-primary-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-[var(--color-text-primary)]">{meal.meal_time}</span>
              {meal.food_items && meal.food_items.length > 0 && (
                <span className="text-[var(--color-text-muted)] text-sm">
                  {meal.food_items.length} פריטים
                </span>
              )}
              {meal.description && !meal.food_items?.length && (
                <span className="text-[var(--color-text-muted)] text-sm line-clamp-1">
                  {meal.description}
                </span>
              )}
            </div>
            {(mealCalories > 0 || mealProtein > 0) && (
              <div className="flex gap-2 text-xs">
                {mealCalories > 0 && (
                  <span className="text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-primary)] font-medium">{mealCalories}</span>{' '}
                    קל'
                  </span>
                )}
                {mealProtein > 0 && (
                  <span className="text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-primary)] font-medium">{mealProtein}ג</span>{' '}
                    חלבון
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMeal(displayIndex);
            }}
            className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[var(--color-text-muted)]" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-6 space-y-5 pr-10">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                שעה
              </label>
              <input
                type="time"
                value={meal.meal_time}
                onChange={(e) => onUpdateMeal(displayIndex, 'meal_time', e.target.value)}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                סוג ארוחה
              </label>
              <select
                value={meal.meal_name}
                onChange={(e) => onUpdateMeal(displayIndex, 'meal_name', e.target.value)}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              >
                {MEAL_NAMES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.icon} {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FoodItemsEditor
            meal={meal}
            displayIndex={displayIndex}
            meals={meals}
            setMeals={setMeals}
            debouncedUpdateFoodItem={debouncedUpdateFoodItem}
            setCatalogForMeal={setCatalogForMeal}
            showAlternatives={showAlternatives}
            setShowAlternatives={setShowAlternatives}
            handleQuantityChange={handleQuantityChange}
            handleSwapFood={handleSwapFood}
          />

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              הערות (אופציונלי)
            </label>
            <textarea
              value={meal.description}
              onChange={(e) => onUpdateMeal(displayIndex, 'description', e.target.value)}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              rows={2}
              placeholder="הערות כלליות על הארוחה..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              הערות נוספות
            </label>
            <input
              type="text"
              value={meal.notes}
              onChange={(e) => onUpdateMeal(displayIndex, 'notes', e.target.value)}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              placeholder="הערות נוספות..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
