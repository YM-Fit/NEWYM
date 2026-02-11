import { useState, useMemo } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createFoodItem } from '../../../../api/nutritionApi';
import type { NutritionFoodItem } from '../../../../types/nutritionTypes';
import type { Meal, MealPlan } from '../types/mealPlanTypes';
import type { FoodCatalogItem } from '../../../../data/foodCatalog';
import { calculateNutrition, recalculateFromPer100g, quantityToGrams, gramsToQuantity } from '../utils/nutritionCalculator';
import FoodCatalogSelector from './FoodCatalogSelector';
import { PlanSettingsCard } from './PlanSettingsCard';
import { QuickAddFoodBar } from './QuickAddFoodBar';
import { MealsTimeline } from './MealsTimeline';
import { CalculateTdeeModal } from './modals/CalculateTdeeModal';

interface PlanEditorViewProps {
  plan: MealPlan;
  meals: Meal[];
  expandedMeals: Set<number>;
  saving: boolean;
  trainerId?: string;
  traineeId?: string;
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
  calculateTotalMacros: () => { calories: number; protein: number; carbs: number; fat: number };
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (foodItemId: string, updates: Partial<NutritionFoodItem>, displayIndex: number, itemIndex: number) => void;
}

function hasPer100g(item: NutritionFoodItem): boolean {
  return item.calories_per_100g != null && item.calories_per_100g !== undefined;
}

export function PlanEditorView({
  plan,
  meals,
  expandedMeals,
  saving,
  trainerId,
  traineeId,
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
  calculateTotalMacros,
  setMeals,
  debouncedUpdateFoodItem,
}: PlanEditorViewProps) {
  const totals = useMemo(() => calculateTotalMacros(), [calculateTotalMacros, meals]);
  const [catalogForMeal, setCatalogForMeal] = useState<{ mealId: string; displayIndex: number } | null>(null);
  const [showAlternatives, setShowAlternatives] = useState<Record<string, boolean>>({});
  const [showTdeeModal, setShowTdeeModal] = useState(false);

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

  const handleQuickAdd = async (item: FoodCatalogItem, mealId: string) => {
    const displayIndex = meals.findIndex((m) => m.id === mealId);
    if (displayIndex < 0) return;

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

    // אם יש ערכים per_100g – חשב לפי גרם מקביל (תומך ב־g, tbsp, tsp, cup, ml). יחידה (unit) לא ממירים לגרם.
    if (hasPer100g(item) && item.unit !== 'unit') {
      const gramsEquivalent = quantityToGrams(newQuantity, item.unit);
      const recalc = recalculateFromPer100g(
        item.calories_per_100g,
        item.protein_per_100g,
        item.carbs_per_100g,
        item.fat_per_100g,
        gramsEquivalent
      );
      debouncedUpdateFoodItem(item.id, {
        quantity: newQuantity,
        calories: recalc.calories,
        protein: recalc.protein,
        carbs: recalc.carbs,
        fat: recalc.fat,
      }, displayIndex, itemIndex);
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

  const handleUnitChange = (
    item: NutritionFoodItem,
    newUnit: string,
    displayIndex: number,
    itemIndex: number
  ) => {
    const oldUnit = item.unit;
    const currentQty = item.quantity;
    const gramsEq = quantityToGrams(currentQty, oldUnit);
    const newQuantity = newUnit === 'unit' ? currentQty : gramsToQuantity(gramsEq, newUnit);
    if (hasPer100g(item) && newUnit !== 'unit') {
      const gramsForNewUnit = quantityToGrams(newQuantity, newUnit);
      const recalc = recalculateFromPer100g(
        item.calories_per_100g,
        item.protein_per_100g,
        item.carbs_per_100g,
        item.fat_per_100g,
        gramsForNewUnit
      );
      debouncedUpdateFoodItem(item.id, {
        unit: newUnit,
        quantity: newQuantity,
        calories: recalc.calories,
        protein: recalc.protein,
        carbs: recalc.carbs,
        fat: recalc.fat,
      }, displayIndex, itemIndex);
    } else {
      debouncedUpdateFoodItem(item.id, { unit: newUnit, quantity: newQuantity }, displayIndex, itemIndex);
    }
  };

  const SUPPLEMENTS = [
    'מולטי ויטמין',
    'אומגה 3',
    'ויטמין D',
    'מגנזיום',
    'ברזל',
    'ויטמין B12',
    'קולגן',
    'פרוביוטיקה',
    'תוסף אחר',
  ];

  const handleAddSupplement = async (name: string) => {
    const firstMealWithId = meals.find((m) => m.id);
    if (!firstMealWithId?.id) {
      toast.error('הוסף לפחות ארוחה אחת לפני הוספת תוספים');
      return;
    }
    const displayIndex = meals.findIndex((m) => m.id === firstMealWithId.id);
    const newItem = await createFoodItem(firstMealWithId.id, {
      food_name: name,
      quantity: 1,
      unit: 'unit',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      order_index: (firstMealWithId.food_items?.length || 0),
    });
    if (newItem) {
      const updatedMeals = [...meals];
      updatedMeals[displayIndex] = {
        ...updatedMeals[displayIndex],
        food_items: [...(updatedMeals[displayIndex].food_items || []), newItem],
      };
      setMeals(updatedMeals);
      toast.success(`${name} נוסף`);
    }
  };

  const handleSwapFood = (
    item: NutritionFoodItem,
    catalogItem: FoodCatalogItem,
    displayIndex: number,
    itemIndex: number
  ) => {
    const gramsEquivalent = quantityToGrams(item.quantity, item.unit);
    const nutrition = calculateNutrition(catalogItem, gramsEquivalent);
    debouncedUpdateFoodItem(item.id, {
      food_name: catalogItem.name,
      quantity: gramsEquivalent,
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
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 overflow-x-hidden">
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

      {meals.some((m) => m.id) && (
        <QuickAddFoodBar meals={meals} onAdd={handleQuickAdd} />
      )}

      {meals.some((m) => m.id) && (
        <div className="premium-card-static p-4 rounded-2xl border border-[var(--color-border)] shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">תוספי תזונה</h3>
          <div className="flex flex-wrap gap-2">
            {SUPPLEMENTS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleAddSupplement(name)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <PlanSettingsCard
        plan={plan}
        onUpdatePlan={onUpdatePlan}
        onLoadTemplate={onLoadTemplate}
        onSaveAsTemplate={onSaveAsTemplate}
        onAddNote={onAddNote}
        trainerId={trainerId}
        traineeId={traineeId}
      />

      <MealsTimeline
        plan={plan}
        meals={meals}
        expandedMeals={expandedMeals}
        totals={totals}
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
        handleUnitChange={handleUnitChange}
        handleSwapFood={handleSwapFood}
        onCalculateTdee={() => setShowTdeeModal(true)}
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

      {showTdeeModal && traineeId && (
        <CalculateTdeeModal
          traineeId={traineeId}
          onApply={(macros) => {
            onUpdatePlan(macros);
            toast.success('המאקרו עודכן בהתאם ל-TDEE');
          }}
          onClose={() => setShowTdeeModal(false)}
        />
      )}
    </div>
  );
}

