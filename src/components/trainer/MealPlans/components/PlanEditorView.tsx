import { useState, useMemo } from 'react';
import { Plus, Save, Trash2, Clock, ChevronDown, ChevronUp, Download, Upload, FileText, AlertCircle, Flame, Beef, Wheat, Droplet, Droplets, Search, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createFoodItem, deleteFoodItem } from '../../../../api/nutritionApi';
import type { NutritionFoodItem } from '../../../../types/nutritionTypes';
import type { Meal, MealPlan } from '../types/mealPlanTypes';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';
import { MEAL_NAMES } from '../constants/mealPlanConstants';
import { calculateNutrition, recalculateFromPer100g } from '../utils/nutritionCalculator';
import { validateCalories, validateMacro, validateWater } from '../../../../utils/nutritionValidation';
import FoodCatalogSelector from './FoodCatalogSelector';
import FoodAlternativesPanel from './FoodAlternativesPanel';

interface PlanEditorViewProps {
  plan: MealPlan;
  meals: Meal[];
  expandedMeals: Set<number>;
  saving: boolean;
  onUpdatePlan: (updates: Partial<MealPlan>) => void;
  onAddMeal: () => void;
  onUpdateMeal: (index: number, field: keyof Meal, value: any) => void;
  onDeleteMeal: (index: number) => void;
  onToggleMeal: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onSave: () => void;
  onSaveAsTemplate: () => void;
  onLoadTemplate: () => void;
  onAddNote: () => void;
  getMealLabel: (value: string) => string;
  calculateTotalMacros: () => { calories: number; protein: number; carbs: number; fat: number };
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (foodItemId: string, updates: Partial<NutritionFoodItem>, displayIndex: number, itemIndex: number) => void;
}

export function PlanEditorView({
  plan,
  meals,
  expandedMeals,
  saving,
  onUpdatePlan,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onToggleMeal,
  onDragStart,
  onDragOver,
  onDragEnd,
  onSave,
  onSaveAsTemplate,
  onLoadTemplate,
  onAddNote,
  getMealLabel,
  calculateTotalMacros,
  setMeals,
  debouncedUpdateFoodItem,
}: PlanEditorViewProps) {
  const totals = useMemo(() => calculateTotalMacros(), [calculateTotalMacros, meals]);
  const [catalogForMeal, setCatalogForMeal] = useState<{ mealId: string; displayIndex: number } | null>(null);
  const [showAlternatives, setShowAlternatives] = useState<Record<string, boolean>>({});

  // חישוב אזהרות
  const warnings = useMemo(() => {
    return {
      exceedsDailyGoal: 
        plan.daily_calories && totals.calories > plan.daily_calories * 1.1,
      inconsistentValues:
        plan.daily_calories && 
        Math.abs(totals.calories - plan.daily_calories) > plan.daily_calories * 0.2,
      missingData: totals.calories === 0 && meals.length > 0,
      exceedsProtein: 
        plan.protein_grams && totals.protein > plan.protein_grams * 1.1,
      exceedsCarbs: 
        plan.carbs_grams && totals.carbs > plan.carbs_grams * 1.1,
      exceedsFat: 
        plan.fat_grams && totals.fat > plan.fat_grams * 1.1,
    };
  }, [totals, plan, meals]);

  const handleCatalogSelect = async (item: FoodCatalogItem) => {
    if (!catalogForMeal) return;
    const { mealId, displayIndex } = catalogForMeal;

    const nutrition = calculateNutrition(item, 100);
    const newItem = await createFoodItem(mealId, {
      food_name: item.name,
      quantity: 100,
      unit: 'g',
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      order_index: (meals[displayIndex].food_items?.length || 0),
      category: item.category,
      calories_per_100g: item.calories_per_100g,
      protein_per_100g: item.protein_per_100g,
      carbs_per_100g: item.carbs_per_100g,
      fat_per_100g: item.fat_per_100g,
    });

    if (newItem) {
      const updatedMeals = [...meals];
      updatedMeals[displayIndex] = {
        ...updatedMeals[displayIndex],
        food_items: [...(updatedMeals[displayIndex].food_items || []), newItem],
      };
      setMeals(updatedMeals);
      toast.success(`${item.name} נוסף`);
    }
    setCatalogForMeal(null);
  };

  const handleQuantityChange = (
    item: NutritionFoodItem,
    newQuantity: number,
    displayIndex: number,
    itemIndex: number
  ) => {
    // בדיקה שהכמות החדשה תקינה
    if (newQuantity <= 0 || isNaN(newQuantity)) {
      return;
    }

    // אם יש ערכים per_100g ויחידה היא גרם, חשב לפי 100ג
    if (item.calories_per_100g !== null && item.calories_per_100g !== undefined && item.unit === 'g') {
      const recalc = recalculateFromPer100g(
        item.calories_per_100g,
        item.protein_per_100g,
        item.carbs_per_100g,
        item.fat_per_100g,
        newQuantity
      );
      debouncedUpdateFoodItem(item.id, {
        quantity: newQuantity,
        calories: recalc.calories,
        protein: recalc.protein,
        carbs: recalc.carbs,
        fat: recalc.fat,
      }, displayIndex, itemIndex);
    } 
    // אם יש ערכים per_100g אבל יחידה אחרת, חשב פרופורציונלית מהערכים הקיימים
    // (כי per_100g מיועד לגרמים בלבד)
    else if (item.calories_per_100g !== null && item.calories_per_100g !== undefined && item.unit !== 'g') {
      // חשב פרופורציונלית מהערכים הקיימים
      if (item.quantity > 0) {
        const ratio = newQuantity / item.quantity;
        debouncedUpdateFoodItem(item.id, {
          quantity: newQuantity,
          calories: item.calories !== null ? Math.round(item.calories * ratio) : null,
          protein: item.protein !== null ? Math.round(item.protein * ratio) : null,
          carbs: item.carbs !== null ? Math.round(item.carbs * ratio) : null,
          fat: item.fat !== null ? Math.round(item.fat * ratio) : null,
        }, displayIndex, itemIndex);
      } else {
        // אם אין כמות קיימת, עדכן רק את הכמות
        debouncedUpdateFoodItem(item.id, { quantity: newQuantity }, displayIndex, itemIndex);
      }
    }
    // אם אין per_100g אבל יש ערכים תזונתיים קיימים וכמות קיימת, חשב פרופורציונלית
    else if (item.quantity > 0 && (item.calories !== null || item.protein !== null || item.carbs !== null || item.fat !== null)) {
      const ratio = newQuantity / item.quantity;
      debouncedUpdateFoodItem(item.id, {
        quantity: newQuantity,
        calories: item.calories !== null ? Math.round(item.calories * ratio) : null,
        protein: item.protein !== null ? Math.round(item.protein * ratio) : null,
        carbs: item.carbs !== null ? Math.round(item.carbs * ratio) : null,
        fat: item.fat !== null ? Math.round(item.fat * ratio) : null,
      }, displayIndex, itemIndex);
    } 
    // אחרת, עדכן רק את הכמות
    else {
      debouncedUpdateFoodItem(item.id, { quantity: newQuantity }, displayIndex, itemIndex);
    }
  };

  const handleSwapFood = (
    item: NutritionFoodItem,
    catalogItem: FoodCatalogItem,
    displayIndex: number,
    itemIndex: number
  ) => {
    const quantity = item.unit === 'g' ? item.quantity : 100;
    const nutrition = calculateNutrition(catalogItem, quantity);
    debouncedUpdateFoodItem(item.id, {
      food_name: catalogItem.name,
      quantity,
      unit: 'g',
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      category: catalogItem.category,
      calories_per_100g: catalogItem.calories_per_100g,
      protein_per_100g: catalogItem.protein_per_100g,
      carbs_per_100g: catalogItem.carbs_per_100g,
      fat_per_100g: catalogItem.fat_per_100g,
    }, displayIndex, itemIndex);
    toast.success(`הוחלף ל-${catalogItem.name}`);
  };

  return (
    <div className="space-y-8">
      {/* אזהרות */}
      {(warnings.exceedsDailyGoal || warnings.inconsistentValues || warnings.missingData || 
        warnings.exceedsProtein || warnings.exceedsCarbs || warnings.exceedsFat) && (
        <div className="premium-card-static p-4 bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-yellow-400">אזהרות</h4>
              <ul className="space-y-1 text-sm text-yellow-300">
                {warnings.exceedsDailyGoal && (
                  <li>• סיכום הקלוריות חורג מיעד יומי ב-{Math.round(((totals.calories / (plan.daily_calories || 1)) - 1) * 100)}%</li>
                )}
                {warnings.inconsistentValues && (
                  <li>• יש חוסר עקביות בין ערכי התפריט לערכי הארוחות</li>
                )}
                {warnings.missingData && (
                  <li>• יש ארוחות ללא נתונים תזונתיים</li>
                )}
                {warnings.exceedsProtein && (
                  <li>• סיכום החלבון חורג מיעד יומי</li>
                )}
                {warnings.exceedsCarbs && (
                  <li>• סיכום הפחמימות חורג מיעד יומי</li>
                )}
                {warnings.exceedsFat && (
                  <li>• סיכום השומן חורג מיעד יומי</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <PlanSettingsCard
        plan={plan}
        onUpdatePlan={onUpdatePlan}
        onLoadTemplate={onLoadTemplate}
        onSaveAsTemplate={onSaveAsTemplate}
        onAddNote={onAddNote}
      />

      <MealsSection
        plan={plan}
        meals={meals}
        expandedMeals={expandedMeals}
        onAddMeal={onAddMeal}
        onUpdateMeal={onUpdateMeal}
        onDeleteMeal={onDeleteMeal}
        onToggleMeal={onToggleMeal}
        setMeals={setMeals}
        debouncedUpdateFoodItem={debouncedUpdateFoodItem}
        setCatalogForMeal={setCatalogForMeal}
        showAlternatives={showAlternatives}
        setShowAlternatives={setShowAlternatives}
        handleQuantityChange={handleQuantityChange}
        handleSwapFood={handleSwapFood}
        totals={totals}
      />

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 disabled:opacity-50 text-white px-10 py-4 rounded-2xl flex items-center gap-3 font-semibold transition-all duration-300 shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/30 hover:scale-[1.02]"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              שומר...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              שמור תפריט
            </>
          )}
        </button>
      </div>

      {catalogForMeal && (
        <FoodCatalogSelector
          onSelect={handleCatalogSelect}
          onClose={() => setCatalogForMeal(null)}
        />
      )}
    </div>
  );
}

function PlanSettingsCard({
  plan,
  onUpdatePlan,
  onLoadTemplate,
  onSaveAsTemplate,
  onAddNote,
}: {
  plan: MealPlan;
  onUpdatePlan: (updates: Partial<MealPlan>) => void;
  onLoadTemplate: () => void;
  onSaveAsTemplate: () => void;
  onAddNote: () => void;
}) {
  return (
    <div className="premium-card-static p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-[var(--color-text-primary)] text-xl">הגדרות תפריט</h3>
        <div className="flex gap-3">
          <button
            onClick={onLoadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-all duration-300 hover:scale-105"
          >
            <Download className="h-4 w-4" />
            טען תבנית
          </button>
          <button
            onClick={onSaveAsTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] rounded-xl text-sm font-semibold hover:bg-[var(--color-bg-elevated)] transition-all duration-300 border border-[var(--color-border)]"
          >
            <Upload className="h-4 w-4" />
            שמור כתבנית
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">שם התפריט</label>
          <input
            type="text"
            value={plan.name || ''}
            onChange={(e) => onUpdatePlan({ name: e.target.value })}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">תיאור</label>
          <input
            type="text"
            value={plan.description || ''}
            onChange={(e) => onUpdatePlan({ description: e.target.value })}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            placeholder="לדוגמה: תפריט הורדה במשקל"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Flame className="h-4 w-4 inline ml-1 text-amber-400" />
            קלוריות יומיות
          </label>
          <input
            type="number"
            value={plan.daily_calories || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ daily_calories: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateCalories(num);
              if (validation.isValid) {
                onUpdatePlan({ daily_calories: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="20000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Beef className="h-4 w-4 inline ml-1 text-red-400" />
            חלבון (גרם)
          </label>
          <input
            type="number"
            value={plan.protein_grams || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ protein_grams: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateMacro(num, 'חלבון');
              if (validation.isValid) {
                onUpdatePlan({ protein_grams: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="2000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Wheat className="h-4 w-4 inline ml-1 text-blue-400" />
            פחמימות (גרם)
          </label>
          <input
            type="number"
            value={plan.carbs_grams || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ carbs_grams: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateMacro(num, 'פחמימות');
              if (validation.isValid) {
                onUpdatePlan({ carbs_grams: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="2000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Droplet className="h-4 w-4 inline ml-1 text-amber-400" />
            שומן (גרם)
          </label>
          <input
            type="number"
            value={plan.fat_grams || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ fat_grams: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateMacro(num, 'שומן');
              if (validation.isValid) {
                onUpdatePlan({ fat_grams: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="2000"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
            <Droplets className="h-4 w-4 inline ml-1 text-blue-400" />
            מים (מ״ל)
          </label>
          <input
            type="number"
            value={plan.daily_water_ml || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onUpdatePlan({ daily_water_ml: null });
                return;
              }
              const num = parseInt(value);
              if (isNaN(num)) return;
              const validation = validateWater(num);
              if (validation.isValid) {
                onUpdatePlan({ daily_water_ml: num });
              } else {
                toast.error(validation.error || 'ערך לא תקין');
              }
            }}
            className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            min="0"
            max="10000"
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">הערות כלליות</label>
          <button
            onClick={onAddNote}
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors duration-300"
          >
            <FileText className="h-4 w-4" />
            הוסף מתבנית
          </button>
        </div>
        <textarea
          value={plan.notes || ''}
          onChange={(e) => onUpdatePlan({ notes: e.target.value })}
          className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
          rows={3}
          placeholder="הערות כלליות לתפריט..."
        />
      </div>
    </div>
  );
}

function MealsSection({
  plan,
  meals,
  expandedMeals,
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
  handleSwapFood,
  totals,
}: {
  plan: MealPlan;
  meals: Meal[];
  expandedMeals: Set<number>;
  onAddMeal: () => void;
  onUpdateMeal: (index: number, field: keyof Meal, value: any) => void;
  onDeleteMeal: (index: number) => void;
  onToggleMeal: (index: number) => void;
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (foodItemId: string, updates: Partial<NutritionFoodItem>, displayIndex: number, itemIndex: number) => void;
  setCatalogForMeal: (v: { mealId: string; displayIndex: number } | null) => void;
  showAlternatives: Record<string, boolean>;
  setShowAlternatives: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleQuantityChange: (item: NutritionFoodItem, qty: number, di: number, ii: number) => void;
  handleSwapFood: (item: NutritionFoodItem, cat: FoodCatalogItem, di: number, ii: number) => void;
  totals: { calories: number; protein: number; carbs: number; fat: number };
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          <p className="text-sm mt-2 text-[var(--color-text-muted)]">לחץ על "הוסף ארוחה" כדי להתחיל</p>
        </div>
      ) : (
        MEAL_NAMES.map((mealType) => {
          const mealsForType = meals.filter(m => m.meal_name === mealType.value);
          if (mealsForType.length === 0) return null;

          const mealTotals = mealsForType.reduce(
            (acc, m) => ({
              calories: acc.calories + (m.total_calories || m.food_items?.reduce((s, i) => s + (i.calories || 0), 0) || 0),
              protein: acc.protein + (m.total_protein || m.food_items?.reduce((s, i) => s + (i.protein || 0), 0) || 0),
              carbs: acc.carbs + (m.total_carbs || m.food_items?.reduce((s, i) => s + (i.carbs || 0), 0) || 0),
              fat: acc.fat + (m.total_fat || m.food_items?.reduce((s, i) => s + (i.fat || 0), 0) || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          return (
            <div key={mealType.value} className="premium-card-static overflow-hidden">
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
                    const mealIndex = meals.findIndex(m =>
                      (m.id && meal.id && m.id === meal.id) ||
                      (!m.id && !meal.id && m.meal_name === meal.meal_name && m.order_index === meal.order_index && m.meal_time === meal.meal_time)
                    );
                    const displayIndex = mealIndex >= 0 ? mealIndex : meals.findIndex(m => m.meal_name === meal.meal_name);

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
                        handleSwapFood={handleSwapFood}
                      />
                    );
                  })}
              </div>
            </div>
          );
        })
      )}

      {meals.length > 0 && totals.calories > 0 && (
        <div className="premium-card-static p-5 bg-gradient-to-r from-primary-500/10 to-primary-600/10">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-[var(--color-text-primary)]">סיכום יומי כולל:</span>
            <div className="flex gap-6 text-sm">
              <span className="text-[var(--color-text-secondary)]"><span className="text-primary-500 font-semibold">{totals.calories}</span> <span className="text-[var(--color-text-muted)]">קלוריות</span></span>
              <span className="text-[var(--color-text-secondary)]"><span className="text-red-500 font-semibold">{totals.protein}ג</span> <span className="text-[var(--color-text-muted)]">חלבון</span></span>
              <span className="text-[var(--color-text-secondary)]"><span className="text-blue-500 font-semibold">{totals.carbs}ג</span> <span className="text-[var(--color-text-muted)]">פחמימות</span></span>
              <span className="text-[var(--color-text-secondary)]"><span className="text-amber-600 font-semibold">{totals.fat}ג</span> <span className="text-[var(--color-text-muted)]">שומן</span></span>
            </div>
          </div>
          
          {/* Progress Indicators */}
          {plan.daily_calories && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--color-text-muted)]">קלוריות</span>
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {totals.calories} / {plan.daily_calories}
                  </span>
                </div>
                <div className="w-full bg-[var(--color-bg-surface)] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      totals.calories > plan.daily_calories * 1.1
                        ? 'bg-red-500'
                        : totals.calories > plan.daily_calories
                        ? 'bg-yellow-500'
                        : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min((totals.calories / plan.daily_calories) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              {plan.protein_grams && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--color-text-muted)]">חלבון</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {totals.protein}ג / {plan.protein_grams}ג
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-surface)] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        totals.protein > plan.protein_grams * 1.1
                          ? 'bg-red-500'
                          : totals.protein > plan.protein_grams
                          ? 'bg-yellow-500'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min((totals.protein / plan.protein_grams) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {plan.carbs_grams && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--color-text-muted)]">פחמימות</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {totals.carbs}ג / {plan.carbs_grams}ג
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-surface)] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        totals.carbs > plan.carbs_grams * 1.1
                          ? 'bg-red-500'
                          : totals.carbs > plan.carbs_grams
                          ? 'bg-yellow-500'
                          : 'bg-blue-400'
                      }`}
                      style={{ width: `${Math.min((totals.carbs / plan.carbs_grams) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {plan.fat_grams && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--color-text-muted)]">שומן</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {totals.fat}ג / {plan.fat_grams}ג
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-surface)] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        totals.fat > plan.fat_grams * 1.1
                          ? 'bg-red-500'
                          : totals.fat > plan.fat_grams
                          ? 'bg-yellow-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min((totals.fat / plan.fat_grams) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
  onUpdateMeal: (index: number, field: keyof Meal, value: any) => void;
  mealsLength: number;
}) {
  const defaultTimes: Record<string, string> = {
    breakfast: '08:00',
    morning_snack: '10:00',
    lunch: '13:00',
    afternoon_snack: '16:00',
    dinner: '19:00',
    evening_snack: '21:00',
  };

  return (
    <div className="p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-primary-500/10 to-primary-600/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{mealType.icon}</span>
          <div>
            <h4 className="font-bold text-[var(--color-text-primary)] text-xl">{mealType.label}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">{mealsCount} {mealsCount === 1 ? 'מזון' : 'מזונות'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {mealTotals.calories > 0 && (
            <div className="flex gap-2 text-sm">
              <span className="text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
                <span className="text-primary-500 font-semibold">{mealTotals.calories}</span> <span className="text-[var(--color-text-muted)]">קל'</span>
              </span>
              {mealTotals.protein > 0 && (
                <span className="text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
                  <span className="text-red-500 font-semibold">{mealTotals.protein}ג</span> <span className="text-[var(--color-text-muted)]">חלבון</span>
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => {
              onAddMeal();
              setTimeout(() => {
                onUpdateMeal(mealsLength, 'meal_name', mealType.value);
                onUpdateMeal(mealsLength, 'meal_time', defaultTimes[mealType.value] || '12:00');
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

function MealCard({
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
}: {
  meal: Meal;
  displayIndex: number;
  expanded: boolean;
  meals: Meal[];
  onToggleMeal: (index: number) => void;
  onUpdateMeal: (index: number, field: keyof Meal, value: any) => void;
  onDeleteMeal: (index: number) => void;
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (foodItemId: string, updates: Partial<NutritionFoodItem>, displayIndex: number, itemIndex: number) => void;
  setCatalogForMeal: (v: { mealId: string; displayIndex: number } | null) => void;
  showAlternatives: Record<string, boolean>;
  setShowAlternatives: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleQuantityChange: (item: NutritionFoodItem, qty: number, di: number, ii: number) => void;
  handleSwapFood: (item: NutritionFoodItem, cat: FoodCatalogItem, di: number, ii: number) => void;
}) {
  const mealCalories = meal.food_items?.reduce((s, i) => s + (i.calories || 0), 0) || meal.total_calories || 0;
  const mealProtein = meal.food_items?.reduce((s, i) => s + (i.protein || 0), 0) || meal.total_protein || 0;

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
                <span className="text-[var(--color-text-muted)] text-sm line-clamp-1">{meal.description}</span>
              )}
            </div>
            {(mealCalories > 0 || mealProtein > 0) && (
              <div className="flex gap-2 text-xs">
                {mealCalories > 0 && (
                  <span className="text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-primary)] font-medium">{mealCalories}</span> קל'
                  </span>
                )}
                {mealProtein > 0 && (
                  <span className="text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                    <span className="text-[var(--color-text-primary)] font-medium">{mealProtein}ג</span> חלבון
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
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">שעה</label>
              <input
                type="time"
                value={meal.meal_time}
                onChange={(e) => onUpdateMeal(displayIndex, 'meal_time', e.target.value)}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">סוג ארוחה</label>
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
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">הערות (אופציונלי)</label>
            <textarea
              value={meal.description}
              onChange={(e) => onUpdateMeal(displayIndex, 'description', e.target.value)}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              rows={2}
              placeholder="הערות כלליות על הארוחה..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">הערות נוספות</label>
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

function FoodItemsEditor({
  meal,
  displayIndex,
  meals,
  setMeals,
  debouncedUpdateFoodItem,
  setCatalogForMeal,
  showAlternatives,
  setShowAlternatives,
  handleQuantityChange,
  handleSwapFood,
}: {
  meal: Meal;
  displayIndex: number;
  meals: Meal[];
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (foodItemId: string, updates: Partial<NutritionFoodItem>, displayIndex: number, itemIndex: number) => void;
  setCatalogForMeal: (v: { mealId: string; displayIndex: number } | null) => void;
  showAlternatives: Record<string, boolean>;
  setShowAlternatives: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleQuantityChange: (item: NutritionFoodItem, qty: number, di: number, ii: number) => void;
  handleSwapFood: (item: NutritionFoodItem, cat: FoodCatalogItem, di: number, ii: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">פריטי מזון</label>
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
                order_index: (meal.food_items?.length || 0),
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
                setShowAlternatives(prev => ({ ...prev, [item.id]: !prev[item.id] }));
              }}
              handleQuantityChange={handleQuantityChange}
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
          <p className="text-[var(--color-text-muted)] text-xs mt-1">השתמש ב"בחר מהקטלוג" להוספה מהירה עם ערכים תזונתיים</p>
        </div>
      )}
    </div>
  );
}

function FoodItemRow({
  item,
  itemIndex,
  displayIndex,
  meals,
  setMeals,
  debouncedUpdateFoodItem,
  showAlternatives,
  onToggleAlternatives,
  handleQuantityChange,
  handleSwapFood,
}: {
  item: NutritionFoodItem;
  itemIndex: number;
  displayIndex: number;
  meals: Meal[];
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (foodItemId: string, updates: Partial<NutritionFoodItem>, displayIndex: number, itemIndex: number) => void;
  showAlternatives: boolean;
  onToggleAlternatives: () => void;
  handleQuantityChange: (item: NutritionFoodItem, qty: number, di: number, ii: number) => void;
  handleSwapFood: (item: NutritionFoodItem, cat: FoodCatalogItem, di: number, ii: number) => void;
}) {
  const hasCatalogData = !!item.calories_per_100g;

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-xl p-4 border border-[var(--color-border)]">
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-3">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">שם מזון</label>
          <input
            type="text"
            value={item.food_name}
            onChange={(e) => {
              debouncedUpdateFoodItem(item.id, { food_name: e.target.value }, displayIndex, itemIndex);
            }}
            className="glass-input w-full px-3 py-2 text-sm text-[var(--color-text-primary)]"
            placeholder="לדוגמה: ביצה"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">כמות</label>
          <input
            type="number"
            step="1"
            value={item.quantity}
            onChange={(e) => {
              handleQuantityChange(item, parseFloat(e.target.value) || 0, displayIndex, itemIndex);
            }}
            className="glass-input w-full px-2 py-2 text-sm text-[var(--color-text-primary)]"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">יחידה</label>
          <select
            value={item.unit}
            onChange={(e) => {
              debouncedUpdateFoodItem(item.id, { unit: e.target.value }, displayIndex, itemIndex);
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
        <div className="col-span-6 grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs font-semibold text-primary-500 mb-1">קל'</label>
            <input
              type="number"
              value={item.calories ?? ''}
              onChange={(e) => {
                debouncedUpdateFoodItem(item.id, { calories: e.target.value ? parseInt(e.target.value) : null }, displayIndex, itemIndex);
              }}
              className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
              readOnly={hasCatalogData && item.unit === 'g'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-red-500 mb-1">חלבון</label>
            <input
              type="number"
              value={item.protein ?? ''}
              onChange={(e) => {
                debouncedUpdateFoodItem(item.id, { protein: e.target.value ? parseInt(e.target.value) : null }, displayIndex, itemIndex);
              }}
              className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
              readOnly={hasCatalogData && item.unit === 'g'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-500 mb-1">פחמימה</label>
            <input
              type="number"
              value={item.carbs ?? ''}
              onChange={(e) => {
                debouncedUpdateFoodItem(item.id, { carbs: e.target.value ? parseInt(e.target.value) : null }, displayIndex, itemIndex);
              }}
              className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
              readOnly={hasCatalogData && item.unit === 'g'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-600 mb-1">שומן</label>
            <input
              type="number"
              value={item.fat ?? ''}
              onChange={(e) => {
                debouncedUpdateFoodItem(item.id, { fat: e.target.value ? parseInt(e.target.value) : null }, displayIndex, itemIndex);
              }}
              className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
              readOnly={hasCatalogData && item.unit === 'g'}
            />
          </div>
        </div>
        <div className="col-span-1 flex gap-1">
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
                  food_items: (updatedMeals[displayIndex].food_items || []).filter(fi => fi.id !== item.id),
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

      {hasCatalogData && item.unit === 'g' && (
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
          ערכים מחושבים אוטומטית לפי {item.quantity} גרם (בסיס: {item.calories_per_100g} קל' ל-100 גרם)
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
