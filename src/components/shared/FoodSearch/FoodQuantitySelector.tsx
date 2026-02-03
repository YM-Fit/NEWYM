import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Minus, Plus, Flame, Dumbbell, Wheat, Droplets, RefreshCw } from 'lucide-react';
import { getUnitTypes, getFoodUnitConversions, calculateNutrition, convertToGrams, findAlternatives } from '../../../api/foodApi';
import type { Food, UnitType, FoodUnitConversion, NutritionCalculation, FoodAlternative, FoodCategory } from '../../../types/nutritionTypes';

interface FoodQuantitySelectorProps {
  food: Food;
  onConfirm: (data: {
    food: Food;
    quantity: number;
    unit: UnitType;
    grams: number;
    nutrition: NutritionCalculation;
  }) => void;
  onCancel: () => void;
  onSelectAlternative?: (food: Food) => void;
  initialQuantity?: number;
  initialUnitId?: string;
}

const CATEGORY_CONFIG: Record<FoodCategory, { label: string; color: string; bgColor: string }> = {
  protein: { label: 'חלבון', color: 'text-red-500', bgColor: 'bg-red-500/10' },
  carbs: { label: 'פחמימה', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  fat: { label: 'שומן', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
};

// Common unit presets by food type
const QUICK_QUANTITIES: Record<string, number[]> = {
  default: [50, 100, 150, 200],
  unit: [1, 2, 3, 4],
  cup: [0.25, 0.5, 0.75, 1],
  tbsp: [1, 2, 3, 4],
  tsp: [1, 2, 3, 4],
};

export const FoodQuantitySelector: React.FC<FoodQuantitySelectorProps> = ({
  food,
  onConfirm,
  onCancel,
  onSelectAlternative,
  initialQuantity = 100,
  initialUnitId,
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [foodConversions, setFoodConversions] = useState<FoodUnitConversion[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitType | null>(null);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [alternatives, setAlternatives] = useState<FoodAlternative[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load unit types and food-specific conversions
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [units, conversions] = await Promise.all([
          getUnitTypes(),
          getFoodUnitConversions(food.id),
        ]);

        setUnitTypes(units);
        setFoodConversions(conversions);

        // Set default unit
        if (initialUnitId) {
          const initialUnit = units.find((u) => u.id === initialUnitId);
          if (initialUnit) setSelectedUnit(initialUnit);
        } else {
          // Use food's default unit or grams
          const gramUnit = units.find((u) => u.name_en === 'gram');
          setSelectedUnit(gramUnit || units[0]);
        }
      } catch (error) {
        console.error('Error loading unit data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [food.id, initialUnitId]);

  // Load alternatives
  useEffect(() => {
    const loadAlternatives = async () => {
      const alts = await findAlternatives(food, 'similar', 3);
      setAlternatives(alts);
    };
    loadAlternatives();
  }, [food]);

  // Calculate nutrition based on quantity and unit
  const calculatedNutrition = useMemo((): NutritionCalculation => {
    if (!selectedUnit) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    const conversion = foodConversions.find(
      (c) => c.unit_type_id === selectedUnit.id
    );

    const gramsPerUnit = conversion?.grams_per_unit || selectedUnit.base_grams || 1;
    return calculateNutrition(food, quantity, gramsPerUnit);
  }, [food, quantity, selectedUnit, foodConversions]);

  // Calculate total grams
  const totalGrams = useMemo(() => {
    if (!selectedUnit) return quantity;

    const conversion = foodConversions.find(
      (c) => c.unit_type_id === selectedUnit.id
    );

    return convertToGrams(quantity, selectedUnit, conversion);
  }, [quantity, selectedUnit, foodConversions]);

  // Get available units for this food
  const availableUnits = useMemo(() => {
    // Always include gram
    const gramUnit = unitTypes.find((u) => u.name_en === 'gram');
    const units: UnitType[] = gramUnit ? [gramUnit] : [];

    // Add food-specific conversions
    foodConversions.forEach((conv) => {
      const unit = unitTypes.find((u) => u.id === conv.unit_type_id);
      if (unit && !units.find((u) => u.id === unit.id)) {
        units.push(unit);
      }
    });

    // Add common volume units
    const commonUnits = ['cup', 'tablespoon', 'teaspoon'];
    commonUnits.forEach((name) => {
      const unit = unitTypes.find((u) => u.name_en === name);
      if (unit && !units.find((u) => u.id === unit.id)) {
        units.push(unit);
      }
    });

    return units;
  }, [unitTypes, foodConversions]);

  // Get quick quantity presets based on selected unit
  const quickQuantities = useMemo(() => {
    if (!selectedUnit) return QUICK_QUANTITIES.default;

    if (selectedUnit.name_en === 'gram') return QUICK_QUANTITIES.default;
    if (selectedUnit.unit_category === 'piece') return QUICK_QUANTITIES.unit;
    if (selectedUnit.name_en === 'cup') return QUICK_QUANTITIES.cup;
    if (selectedUnit.name_en === 'tablespoon') return QUICK_QUANTITIES.tbsp;
    if (selectedUnit.name_en === 'teaspoon') return QUICK_QUANTITIES.tsp;

    return QUICK_QUANTITIES.default;
  }, [selectedUnit]);

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(0, newQuantity));
  };

  const handleConfirm = () => {
    if (!selectedUnit) return;

    onConfirm({
      food,
      quantity,
      unit: selectedUnit,
      grams: totalGrams,
      nutrition: calculatedNutrition,
    });
  };

  const categoryConfig = CATEGORY_CONFIG[food.category];

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/2" />
          <div className="h-12 bg-slate-700 rounded" />
          <div className="h-24 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${categoryConfig.bgColor}`}>
              <span className={`text-lg ${categoryConfig.color}`}>
                {food.category === 'protein' && '💪'}
                {food.category === 'carbs' && '🍚'}
                {food.category === 'fat' && '🥑'}
              </span>
            </div>
            <div>
              <h3 className="text-white font-semibold">{food.name}</h3>
              {food.brand && (
                <p className="text-sm text-slate-500">{food.brand}</p>
              )}
            </div>
          </div>
          <span className={`px-2 py-1 rounded-lg text-xs ${categoryConfig.bgColor} ${categoryConfig.color}`}>
            {categoryConfig.label}
          </span>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="p-4 space-y-4">
        {/* Quantity Input */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleQuantityChange(quantity - (selectedUnit?.unit_category === 'piece' ? 1 : 10))}
            className="p-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
          >
            <Minus className="h-5 w-5" />
          </button>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
              className="flex-1 text-center text-2xl font-bold text-white bg-slate-700/50
                         border border-slate-600 rounded-xl py-2 focus:outline-none
                         focus:ring-2 focus:ring-emerald-500/50"
              min="0"
              step={selectedUnit?.unit_category === 'piece' ? 1 : 10}
            />

            {/* Unit Selector */}
            <div className="relative">
              <button
                onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-xl
                           text-white hover:bg-slate-600 transition-colors min-w-[100px]"
              >
                <span>{selectedUnit?.name_he || 'גרם'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {isUnitDropdownOpen && (
                <div className="absolute z-10 top-full mt-1 right-0 w-48 bg-slate-700
                               rounded-xl shadow-xl border border-slate-600 overflow-hidden">
                  {availableUnits.map((unit) => {
                    const conversion = foodConversions.find(
                      (c) => c.unit_type_id === unit.id
                    );

                    return (
                      <button
                        key={unit.id}
                        onClick={() => {
                          setSelectedUnit(unit);
                          setIsUnitDropdownOpen(false);
                          // Reset quantity for new unit type
                          if (unit.unit_category === 'piece') {
                            setQuantity(1);
                          } else if (unit.name_en === 'gram') {
                            setQuantity(100);
                          }
                        }}
                        className={`w-full px-4 py-2 text-right hover:bg-slate-600 transition-colors
                                   ${selectedUnit?.id === unit.id ? 'bg-slate-600 text-emerald-400' : 'text-white'}`}
                      >
                        <span>{unit.name_he}</span>
                        {conversion && (
                          <span className="text-xs text-slate-400 mr-2">
                            ({conversion.grams_per_unit}g)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleQuantityChange(quantity + (selectedUnit?.unit_category === 'piece' ? 1 : 10))}
            className="p-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Quantity Buttons */}
        <div className="flex gap-2 justify-center">
          {quickQuantities.map((q) => (
            <button
              key={q}
              onClick={() => setQuantity(q)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors
                         ${quantity === q
                           ? 'bg-emerald-500 text-white'
                           : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Grams Display */}
        {selectedUnit?.name_en !== 'gram' && (
          <div className="text-center text-sm text-slate-400">
            = {Math.round(totalGrams)} גרם
          </div>
        )}

        {/* Nutrition Display */}
        <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="text-xs text-slate-500 text-center mb-2">ערכים תזונתיים</div>

          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                <Flame className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold text-white">
                {Math.round(calculatedNutrition.calories)}
              </div>
              <div className="text-xs text-slate-500">קלוריות</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold text-white">
                {calculatedNutrition.protein}g
              </div>
              <div className="text-xs text-slate-500">חלבון</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                <Wheat className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold text-white">
                {calculatedNutrition.carbs}g
              </div>
              <div className="text-xs text-slate-500">פחמימות</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <Droplets className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold text-white">
                {calculatedNutrition.fat}g
              </div>
              <div className="text-xs text-slate-500">שומן</div>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center border-t border-slate-600 pt-2 mt-2">
            ל-100g: {food.calories_per_100g} קל' | {food.protein_per_100g}g ח' |{' '}
            {food.carbs_per_100g}g פ' | {food.fat_per_100g}g ש'
          </div>
        </div>

        {/* Alternatives */}
        {alternatives.length > 0 && onSelectAlternative && (
          <div>
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>חלופות ({alternatives.length})</span>
            </button>

            {showAlternatives && (
              <div className="mt-2 space-y-2">
                {alternatives.map((alt) => (
                  <button
                    key={alt.food.id}
                    onClick={() => onSelectAlternative(alt.food)}
                    className="w-full p-3 bg-slate-700/50 rounded-lg text-right
                              hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white">{alt.food.name}</span>
                      <span className="text-xs text-slate-400">
                        {alt.food.calories_per_100g} קל'
                      </span>
                    </div>
                    <div className="text-xs text-emerald-400 mt-1">{alt.reason}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-700 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl
                     hover:bg-slate-600 transition-colors"
        >
          ביטול
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500
                     text-white rounded-xl hover:from-emerald-600 hover:to-teal-600
                     transition-all font-medium"
        >
          הוסף לארוחה
        </button>
      </div>
    </div>
  );
};

export default FoodQuantitySelector;
