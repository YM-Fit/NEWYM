import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeftRight, Trash2, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { deleteFoodItem } from '../../../../api/nutritionApi';
import type { NutritionFoodItem } from '../../../../types/nutritionTypes';
import type { Meal } from '../types/mealPlanTypes';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';
import { FOOD_CATALOG } from '../../../../data/foodCatalog';
import FoodAlternativesPanel from './FoodAlternativesPanel';

export interface FoodItemRowProps {
  item: NutritionFoodItem;
  itemIndex: number;
  displayIndex: number;
  meals: Meal[];
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (
    foodItemId: string,
    updates: Partial<NutritionFoodItem>,
    displayIndex: number,
    itemIndex: number
  ) => void;
  showAlternatives: boolean;
  onToggleAlternatives: () => void;
  handleQuantityChange: (item: NutritionFoodItem, qty: number, di: number, ii: number) => void;
  handleUnitChange: (item: NutritionFoodItem, newUnit: string, di: number, ii: number) => void;
  handleSwapFood: (
    item: NutritionFoodItem,
    cat: FoodCatalogItem,
    di: number,
    ii: number
  ) => void;
}

export function FoodItemRow({
  item,
  itemIndex,
  displayIndex,
  meals,
  setMeals,
  debouncedUpdateFoodItem,
  showAlternatives,
  onToggleAlternatives,
  handleQuantityChange,
  handleUnitChange,
  handleSwapFood,
}: FoodItemRowProps) {
  const hasCatalogData = !!item.calories_per_100g;
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLDivElement>(null);

  const nameSuggestions = useMemo(() => {
    const q = (item.food_name || '').trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return FOOD_CATALOG.filter((c) => {
      const nameLower = c.name.toLowerCase();
      const brandLower = (c.brand || '').toLowerCase();
      if (nameLower.startsWith(q) || brandLower.startsWith(q)) return true;
      if (nameLower.includes(q) || brandLower.includes(q)) return true;
      const words = nameLower.split(/\s+/);
      if (words.some((w) => w.startsWith(q))) return true;
      return false;
    }).slice(0, 8);
  }, [item.food_name]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nameInputRef.current && !nameInputRef.current.contains(e.target as Node)) {
        setShowNameSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl p-4 border border-[var(--color-border)]">
      <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end">
        <div className="col-span-12 sm:col-span-3 relative" ref={nameInputRef}>
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">שם מזון</label>
          <input
            type="text"
            value={item.food_name}
            onChange={(e) => {
              debouncedUpdateFoodItem(item.id, { food_name: e.target.value }, displayIndex, itemIndex);
              setShowNameSuggestions(true);
            }}
            onFocus={() => setShowNameSuggestions(true)}
            className="glass-input w-full px-3 py-2 text-sm text-[var(--color-text-primary)]"
            placeholder="לדוגמה: ביצה"
          />
          {showNameSuggestions && nameSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto z-50 rounded-xl border border-[var(--color-border)] shadow-lg py-1" style={{ background: 'rgb(var(--color-bg-elevated))' }}>
              {nameSuggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    handleSwapFood(item, c, displayIndex, itemIndex);
                    setShowNameSuggestions(false);
                  }}
                  className="w-full text-right px-3 py-2 hover:bg-[var(--color-accent-bg)] flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-[var(--color-text-primary)] truncate">{c.name}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-primary-500" />
                    {c.calories_per_100g}
                    <Beef className="w-3 h-3 text-red-500" />
                    {c.protein_per_100g}ג
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-4 sm:col-span-1">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">כמות</label>
          <input
            type="number"
            step={item.unit === 'g' || item.unit === 'unit' ? 1 : 0.1}
            value={item.quantity}
            onChange={(e) => {
              handleQuantityChange(item, parseFloat(e.target.value) || 0, displayIndex, itemIndex);
            }}
            className="glass-input w-full px-2 py-2 text-sm text-[var(--color-text-primary)]"
          />
        </div>
        <div className="col-span-4 sm:col-span-1">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">יחידה</label>
          <select
            value={item.unit}
            onChange={(e) => {
              const newUnit = e.target.value;
              handleUnitChange(item, newUnit, displayIndex, itemIndex);
            }}
            className="glass-input w-full px-1 py-2 text-sm text-[var(--color-text-primary)]"
          >
            <option value="g">גרם</option>
            <option value="unit">יחידה</option>
            <option value="ml">מ"ל</option>
            <option value="cup">כוס</option>
            <option value="tbsp">כף</option>
            <option value="tsp">כפית</option>
          </select>
        </div>
        <div className="col-span-12 sm:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-semibold text-primary-500 mb-1">קל'</label>
            <input
              type="number"
              value={item.calories ?? ''}
              onChange={(e) => {
                debouncedUpdateFoodItem(
                  item.id,
                  { calories: e.target.value ? parseInt(e.target.value) : null },
                  displayIndex,
                  itemIndex
                );
              }}
              className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
              readOnly={hasCatalogData}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-red-500 mb-1">חלבון</label>
            <input
              type="number"
              value={item.protein ?? ''}
              onChange={(e) => {
                debouncedUpdateFoodItem(
                  item.id,
                  { protein: e.target.value ? parseInt(e.target.value) : null },
                  displayIndex,
                  itemIndex
                );
              }}
              className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
              readOnly={hasCatalogData}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-500 mb-1">פחמימה</label>
            <input
              type="number"
              value={item.carbs ?? ''}
              onChange={(e) => {
                debouncedUpdateFoodItem(
                  item.id,
                  { carbs: e.target.value ? parseInt(e.target.value) : null },
                  displayIndex,
                  itemIndex
                );
              }}
              className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
              readOnly={hasCatalogData}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-600 mb-1">שומן</label>
            <input
              type="number"
              value={item.fat ?? ''}
              onChange={(e) => {
                debouncedUpdateFoodItem(
                  item.id,
                  { fat: e.target.value ? parseInt(e.target.value) : null },
                  displayIndex,
                  itemIndex
                );
              }}
              className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
              readOnly={hasCatalogData}
            />
          </div>
        </div>
        <div className="col-span-12 sm:col-span-1 flex gap-1 justify-end sm:justify-start">
          {item.category && (
            <button
              onClick={onToggleAlternatives}
              className={`p-2 rounded-lg transition-all ${
                showAlternatives
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
              }`}
              title="הצג חלופות"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={async () => {
              if (await deleteFoodItem(item.id)) {
                const updatedMeals = [...meals];
                updatedMeals[displayIndex] = {
                  ...updatedMeals[displayIndex],
                  food_items: (updatedMeals[displayIndex].food_items || []).filter(
                    (fi) => fi.id !== item.id
                  ),
                };
                setMeals(updatedMeals);
              }
            }}
            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasCatalogData && (
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
          ערכים מחושבים אוטומטית לפי {item.quantity} {item.unit === 'g' ? 'גרם' : item.unit === 'tbsp' ? 'כף' : item.unit === 'tsp' ? 'כפית' : item.unit === 'cup' ? 'כוס' : item.unit} (בסיס: {item.calories_per_100g} קל׳ ל-100 גרם)
        </p>
      )}

      {showAlternatives && item.category && (
        <FoodAlternativesPanel
          key={`${item.id}-${item.quantity}-${item.calories}-${item.protein}`}
          foodName={item.food_name}
          category={item.category}
          caloriesPer100g={item.calories_per_100g}
          quantity={item.quantity}
          currentCalories={item.calories}
          currentProtein={item.protein}
          currentCarbs={item.carbs}
          currentFat={item.fat}
          onSwap={(catalogItem) => handleSwapFood(item, catalogItem, displayIndex, itemIndex)}
        />
      )}
    </div>
  );
}
