import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Trash2, ChevronDown, Dumbbell, Wheat, Droplets, Star, Clock } from 'lucide-react';
import { searchFoods, getUnitTypes, calculateNutrition, updateFoodUsage } from '../../../api/foodApi';
import type { Food, FoodCategory, UnitType, NutritionFoodItem } from '../../../types/nutritionTypes';

interface FoodItemEditorProps {
  item: NutritionFoodItem;
  trainerId?: string;
  onUpdate: (updates: Partial<NutritionFoodItem>) => void;
  onDelete: () => void;
}

const CATEGORY_CONFIG: Record<FoodCategory, { icon: React.ElementType; color: string }> = {
  protein: { icon: Dumbbell, color: 'text-red-400' },
  carbs: { icon: Wheat, color: 'text-amber-400' },
  fat: { icon: Droplets, color: 'text-blue-400' },
};

const DEFAULT_UNITS = [
  { value: 'g', label: 'גרם', grams: 1 },
  { value: 'unit', label: 'יחידה', grams: 50 },
  { value: 'cup', label: 'כוס', grams: 240 },
  { value: 'tbsp', label: 'כף', grams: 15 },
  { value: 'tsp', label: 'כפית', grams: 5 },
  { value: 'slice', label: 'פרוסה', grams: 30 },
  { value: 'ml', label: 'מ"ל', grams: 1 },
];

export const FoodItemEditor: React.FC<FoodItemEditorProps> = ({
  item,
  trainerId,
  onUpdate,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState(item.food_name || '');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity || 100);
  const [unit, setUnit] = useState(item.unit || 'g');

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Search foods with debounce
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchFoods(query, {
        trainerId,
        limit: 8,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [trainerId]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery && !selectedFood) {
      debounceRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 200);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, selectedFood, performSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate nutrition when food or quantity changes
  const calculateAndUpdate = useCallback((food: Food, qty: number, unitValue: string) => {
    const unitConfig = DEFAULT_UNITS.find(u => u.value === unitValue) || DEFAULT_UNITS[0];
    const nutrition = calculateNutrition(food, qty, unitConfig.grams);

    onUpdate({
      food_name: food.name,
      quantity: qty,
      unit: unitValue,
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein),
      carbs: Math.round(nutrition.carbs),
      fat: Math.round(nutrition.fat),
    });
  }, [onUpdate]);

  // Handle food selection
  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setSearchQuery(food.name);
    setShowDropdown(false);
    calculateAndUpdate(food, quantity, unit);

    // Track usage
    if (trainerId) {
      updateFoodUsage(trainerId, food.id);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
    if (selectedFood) {
      calculateAndUpdate(selectedFood, newQuantity, unit);
    } else {
      onUpdate({ quantity: newQuantity });
    }
  };

  // Handle unit change
  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    if (selectedFood) {
      calculateAndUpdate(selectedFood, quantity, newUnit);
    } else {
      onUpdate({ unit: newUnit });
    }
  };

  // Handle manual input (when no food selected)
  const handleManualNameChange = (name: string) => {
    setSearchQuery(name);
    setSelectedFood(null);
    onUpdate({ food_name: name });
    setShowDropdown(true);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    onUpdate({
      food_name: '',
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
    });
    inputRef.current?.focus();
  };

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl p-4 border border-[var(--color-border)]">
      <div className="grid grid-cols-12 gap-3 items-end">
        {/* Food Name / Search */}
        <div className="col-span-5 relative">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
            שם מזון
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleManualNameChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className="glass-input w-full pr-9 pl-8 py-2 text-sm text-[var(--color-text-primary)]"
              placeholder="חפש מזון..."
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            {selectedFood && (
              <button
                onClick={handleClearSelection}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-600 rounded"
              >
                <X className="h-3 w-3 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchResults.length > 0 && !selectedFood && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700
                         rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
            >
              {isSearching ? (
                <div className="p-3 text-center text-slate-400 text-sm">
                  מחפש...
                </div>
              ) : (
                searchResults.map((food) => {
                  const { icon: CategoryIcon, color } = CATEGORY_CONFIG[food.category];
                  return (
                    <button
                      key={food.id}
                      onClick={() => handleSelectFood(food)}
                      className="w-full px-3 py-2.5 flex items-center gap-2 text-right
                                hover:bg-slate-700 transition-colors"
                    >
                      <CategoryIcon className={`h-4 w-4 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm truncate">{food.name}</div>
                        {food.brand && (
                          <div className="text-xs text-slate-500">{food.brand}</div>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {food.calories_per_100g} קל'
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Selected Food Badge */}
          {selectedFood && (
            <div className="absolute -top-1 right-0 flex items-center gap-1">
              <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_CONFIG[selectedFood.category].color} bg-slate-700/50`}>
                {selectedFood.category === 'protein' && '💪'}
                {selectedFood.category === 'carbs' && '🍚'}
                {selectedFood.category === 'fat' && '🥑'}
              </span>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">כמות</label>
          <input
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
            className="glass-input w-full px-3 py-2 text-sm text-[var(--color-text-primary)]"
          />
        </div>

        {/* Unit */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">יחידה</label>
          <select
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="glass-input w-full px-3 py-2 text-sm text-[var(--color-text-primary)]"
          >
            {DEFAULT_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {/* Nutrition Values (Auto-calculated or manual) */}
        <div className="col-span-2 flex gap-1">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-amber-400/80 mb-1">קל'</label>
            <input
              type="number"
              value={item.calories ?? ''}
              onChange={(e) => onUpdate({ calories: e.target.value ? parseInt(e.target.value) : null })}
              className={`glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)] ${
                selectedFood ? 'bg-emerald-500/10 border-emerald-500/30' : ''
              }`}
              placeholder="—"
              readOnly={!!selectedFood}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-red-400/80 mb-1">ח'</label>
            <input
              type="number"
              value={item.protein ?? ''}
              onChange={(e) => onUpdate({ protein: e.target.value ? parseInt(e.target.value) : null })}
              className={`glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)] ${
                selectedFood ? 'bg-emerald-500/10 border-emerald-500/30' : ''
              }`}
              placeholder="—"
              readOnly={!!selectedFood}
            />
          </div>
        </div>

        {/* Delete Button */}
        <div className="col-span-1">
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
            title="מחק"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Extra nutrition info when food is selected */}
      {selectedFood && item.carbs !== null && item.fat !== null && (
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-400 border-t border-slate-700/50 pt-2">
          <span className="flex items-center gap-1">
            <Wheat className="h-3 w-3 text-amber-400" />
            {item.carbs}g פחמימות
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="h-3 w-3 text-blue-400" />
            {item.fat}g שומן
          </span>
          <span className="text-emerald-400 mr-auto">
            ✓ חושב אוטומטית
          </span>
        </div>
      )}
    </div>
  );
};

export default FoodItemEditor;
