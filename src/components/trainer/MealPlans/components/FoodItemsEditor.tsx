import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { createFoodItem } from '../../../../api/nutritionApi';
import type { NutritionFoodItem } from '../../../../types/nutritionTypes';
import type { Meal } from '../types/mealPlanTypes';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';
import { FoodItemRow } from './FoodItemRow';

export interface FoodItemsEditorProps {
  meal: Meal;
  displayIndex: number;
  meals: Meal[];
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
}

export function FoodItemsEditor({
  meal,
  displayIndex,
  meals,
  setMeals,
  debouncedUpdateFoodItem,
  setCatalogForMeal,
  showAlternatives,
  setShowAlternatives,
  handleQuantityChange,
  handleUnitChange,
  handleSwapFood,
}: FoodItemsEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">
          פריטי מזון
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!meal.id) {
                toast.error('שמור את הארוחה קודם לפני הוספת פריטי מזון');
                return;
              }
              setCatalogForMeal({ mealId: meal.id, displayIndex });
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-xs font-semibold hover:bg-primary-500/30 transition-all"
          >
            <Search className="h-3 w-3" />
            בחר מהקטלוג
          </button>
          <button
            onClick={async () => {
              if (!meal.id) {
                toast.error('שמור את הארוחה קודם לפני הוספת פריטי מזון');
                return;
              }
              const newItem = await createFoodItem(meal.id, {
                food_name: '',
                quantity: 100,
                unit: 'g',
                calories: null,
                protein: null,
                carbs: null,
                fat: null,
                order_index: meal.food_items?.length || 0,
              });
              if (newItem) {
                const updatedMeals = [...meals];
                updatedMeals[displayIndex] = {
                  ...updatedMeals[displayIndex],
                  food_items: [...(updatedMeals[displayIndex].food_items || []), newItem],
                };
                setMeals(updatedMeals);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] rounded-lg text-xs font-semibold hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] transition-all"
          >
            <Plus className="h-3 w-3" />
            הוסף ידני
          </button>
        </div>
      </div>

      {meal.food_items && meal.food_items.length > 0 ? (
        <div className="space-y-3">
          {meal.food_items.map((item, itemIndex) => (
            <FoodItemRow
              key={item.id}
              item={item}
              itemIndex={itemIndex}
              displayIndex={displayIndex}
              meals={meals}
              setMeals={setMeals}
              debouncedUpdateFoodItem={debouncedUpdateFoodItem}
              showAlternatives={showAlternatives[item.id] || false}
              onToggleAlternatives={() => {
                setShowAlternatives((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
              }}
              handleQuantityChange={handleQuantityChange}
              handleUnitChange={handleUnitChange}
              handleSwapFood={handleSwapFood}
            />
          ))}

          <div className="p-3 bg-primary-500/10 rounded-lg border border-primary-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)] font-semibold">סיכום הארוחה:</span>
              <div className="flex gap-4">
                <span className="text-primary-500 font-semibold">
                  {meal.food_items.reduce((sum, i) => sum + (i.calories || 0), 0)} קל'
                </span>
                <span className="text-red-500 font-semibold">
                  {meal.food_items.reduce((sum, i) => sum + (i.protein || 0), 0)}ג חלבון
                </span>
                <span className="text-blue-500 font-semibold">
                  {meal.food_items.reduce((sum, i) => sum + (i.carbs || 0), 0)}ג פחמימות
                </span>
                <span className="text-amber-600 font-semibold">
                  {meal.food_items.reduce((sum, i) => sum + (i.fat || 0), 0)}ג שומן
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-[var(--color-bg-surface)] rounded-xl border border-dashed border-[var(--color-border)]">
          <Search className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" />
          <p className="text-[var(--color-text-muted)] text-sm">אין פריטי מזון.</p>
          <p className="text-[var(--color-text-muted)] text-xs mt-1">
            השתמש ב"בחר מהקטלוג" להוספה מהירה עם ערכים תזונתיים
          </p>
        </div>
      )}
    </div>
  );
}
