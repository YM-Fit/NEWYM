import { Plus, Save, Trash2, Clock, ChevronDown, ChevronUp, Download, Upload, FileText, AlertCircle, Flame, Beef, Wheat, Droplet, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { createFoodItem, deleteFoodItem } from '../../../../api/nutritionApi';
import type { NutritionFoodItem } from '../../../../types/nutritionTypes';
import type { Meal, MealPlan } from '../types/mealPlanTypes';
import { MEAL_NAMES } from '../constants/mealPlanConstants';

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
  const totals = calculateTotalMacros();

  return (
    <div className="space-y-8">
      {/* Plan Settings Card */}
      <div className="premium-card-static p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-[var(--color-text-primary)] text-xl">הגדרות תפריט</h3>
          <div className="flex gap-3">
            <button
              onClick={onLoadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-500/30 transition-all duration-300 hover:scale-105"
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
              onChange={(e) => onUpdatePlan({ daily_calories: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
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
              onChange={(e) => onUpdatePlan({ protein_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              <Wheat className="h-4 w-4 inline ml-1 text-amber-500" />
              פחמימות (גרם)
            </label>
            <input
              type="number"
              value={plan.carbs_grams || ''}
              onChange={(e) => onUpdatePlan({ carbs_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              <Droplet className="h-4 w-4 inline ml-1 text-yellow-400" />
              שומן (גרם)
            </label>
            <input
              type="number"
              value={plan.fat_grams || ''}
              onChange={(e) => onUpdatePlan({ fat_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
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
              onChange={(e) => onUpdatePlan({ daily_water_ml: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">הערות כלליות</label>
            <button
              onClick={onAddNote}
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors duration-300"
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

      {/* Meals organized by meal type */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[var(--color-text-primary)] text-xl">ארוחות יומיות</h3>
          <button
            onClick={onAddMeal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all duration-300 hover:scale-105"
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
          // Group meals by meal type
          MEAL_NAMES.map((mealType) => {
            const mealsForType = meals.filter(m => m.meal_name === mealType.value);
            if (mealsForType.length === 0) return null;

            const mealTotals = mealsForType.reduce(
              (acc, m) => ({
                calories: acc.calories + (m.total_calories || 0),
                protein: acc.protein + (m.total_protein || 0),
                carbs: acc.carbs + (m.total_carbs || 0),
                fat: acc.fat + (m.total_fat || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            return (
              <div
                key={mealType.value}
                className="premium-card-static overflow-hidden"
              >
                <div className="p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{mealType.icon}</span>
                      <div>
                        <h4 className="font-bold text-[var(--color-text-primary)] text-xl">{mealType.label}</h4>
                        <p className="text-sm text-[var(--color-text-muted)]">{mealsForType.length} {mealsForType.length === 1 ? 'מזון' : 'מזונות'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {mealTotals.calories > 0 && (
                        <div className="flex gap-2 text-sm">
                          {mealTotals.calories > 0 && (
                            <span className="text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
                              <span className="text-emerald-400 font-semibold">{mealTotals.calories}</span> <span className="text-[var(--color-text-muted)]">קל'</span>
                            </span>
                          )}
                          {mealTotals.protein > 0 && (
                            <span className="text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
                              <span className="text-emerald-400 font-semibold">{mealTotals.protein}ג</span> <span className="text-[var(--color-text-muted)]">חלבון</span>
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          const defaultTimes: Record<string, string> = {
                            breakfast: '08:00',
                            morning_snack: '10:00',
                            lunch: '13:00',
                            afternoon_snack: '16:00',
                            dinner: '19:00',
                            evening_snack: '21:00',
                          };
                          const newMeal: Meal = {
                            meal_time: defaultTimes[mealType.value] || '12:00',
                            meal_name: mealType.value,
                            description: '',
                            alternatives: '',
                            calories: null,
                            protein: null,
                            carbs: null,
                            fat: null,
                            notes: '',
                            order_index: meals.length,
                          };
                          onAddMeal();
                          // Update the new meal to match the meal type
                          setTimeout(() => {
                            const lastIndex = meals.length;
                            onUpdateMeal(lastIndex, 'meal_name', mealType.value);
                            onUpdateMeal(lastIndex, 'meal_time', newMeal.meal_time);
                          }, 100);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all duration-300"
                      >
                        <Plus className="h-4 w-4" />
                        הוסף מזון
                      </button>
                    </div>
                  </div>
                </div>

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
                        <div
                          key={meal.id || `${meal.meal_name}-${meal.order_index}-${meal.meal_time}`}
                          className="p-5 hover:bg-[var(--color-accent-bg)] transition-all duration-300"
                        >
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => onToggleMeal(displayIndex)}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <Clock className="h-4 w-4 text-emerald-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-semibold text-[var(--color-text-primary)]">{meal.meal_time}</span>
                                  {meal.description && (
                                    <span className="text-[var(--color-text-muted)] text-sm line-clamp-1">{meal.description}</span>
                                  )}
                                </div>
                                {meal.total_calories || meal.total_protein ? (
                                  <div className="flex gap-2 text-xs">
                                    {meal.total_calories && (
                                      <span className="text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                        <span className="text-[var(--color-text-primary)] font-medium">{meal.total_calories}</span> קל'
                                      </span>
                                    )}
                                    {meal.total_protein && (
                                      <span className="text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                        <span className="text-[var(--color-text-primary)] font-medium">{meal.total_protein}ג</span> חלבון
                                      </span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteMeal(displayIndex);
                                }}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-300"
                                title="מחק מזון"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              {expandedMeals.has(displayIndex) ? (
                                <ChevronUp className="h-5 w-5 text-[var(--color-text-muted)]" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-[var(--color-text-muted)]" />
                              )}
                            </div>
                          </div>

                          {expandedMeals.has(displayIndex) && (
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

                              {/* Food Items List */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">פריטי מזון</label>
                                  <button
                                    onClick={async () => {
                                      if (!meal.id) {
                                        toast.error('שמור את הארוחה קודם לפני הוספת פריטי מזון');
                                        return;
                                      }
                                      const newItem = await createFoodItem(meal.id, {
                                        food_name: '',
                                        quantity: 1,
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
                                        toast.success('פריט מזון נוסף');
                                      }
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-all"
                                  >
                                    <Plus className="h-3 w-3" />
                                    הוסף פריט מזון
                                  </button>
                                </div>

                                  {meal.food_items && meal.food_items.length > 0 ? (
                                  <div className="space-y-2">
                                    {meal.food_items.map((item, itemIndex) => (
                                      <div
                                        key={item.id}
                                        className="bg-[var(--color-bg-surface)] rounded-xl p-4 border border-[var(--color-border)]"
                                      >
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                          <div className="col-span-4">
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
                                          <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">כמות</label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={item.quantity}
                                              onChange={(e) => {
                                                debouncedUpdateFoodItem(item.id, { quantity: parseFloat(e.target.value) || 0 }, displayIndex, itemIndex);
                                              }}
                                              className="glass-input w-full px-3 py-2 text-sm text-[var(--color-text-primary)]"
                                            />
                                          </div>
                                          <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">יחידה</label>
                                            <select
                                              value={item.unit}
                                              onChange={(e) => {
                                                debouncedUpdateFoodItem(item.id, { unit: e.target.value }, displayIndex, itemIndex);
                                              }}
                                              className="glass-input w-full px-3 py-2 text-sm text-[var(--color-text-primary)]"
                                            >
                                              <option value="g">גרם</option>
                                              <option value="unit">יחידה</option>
                                              <option value="ml">מ"ל</option>
                                              <option value="cup">כוס</option>
                                              <option value="tbsp">כף</option>
                                              <option value="tsp">כפית</option>
                                            </select>
                                          </div>
                                          <div className="col-span-3 flex gap-2">
                                            <div className="flex-1">
                                              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">קל'</label>
                                              <input
                                                type="number"
                                                value={item.calories || ''}
                                                onChange={(e) => {
                                                  debouncedUpdateFoodItem(item.id, { calories: e.target.value ? parseInt(e.target.value) : null }, displayIndex, itemIndex);
                                                }}
                                                className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
                                                placeholder="קל'"
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">חלבון</label>
                                              <input
                                                type="number"
                                                value={item.protein || ''}
                                                onChange={(e) => {
                                                  debouncedUpdateFoodItem(item.id, { protein: e.target.value ? parseInt(e.target.value) : null }, displayIndex, itemIndex);
                                                }}
                                                className="glass-input w-full px-2 py-2 text-xs text-[var(--color-text-primary)]"
                                                placeholder="גרם"
                                              />
                                            </div>
                                          </div>
                                          <div className="col-span-1">
                                            <button
                                              onClick={async () => {
                                                if (await deleteFoodItem(item.id)) {
                                                  const updatedMeals = [...meals];
                                                  updatedMeals[displayIndex] = {
                                                    ...updatedMeals[displayIndex],
                                                    food_items: (updatedMeals[displayIndex].food_items || []).filter(fi => fi.id !== item.id),
                                                  };
                                                  setMeals(updatedMeals);
                                                  toast.success('פריט מזון נמחק');
                                                }
                                              }}
                                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                                              title="מחק"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-[var(--color-text-muted)] text-sm bg-[var(--color-bg-surface)] rounded-xl border border-dashed border-[var(--color-border)]">
                                    אין פריטי מזון. לחץ על "הוסף פריט מזון" כדי להתחיל.
                                  </div>
                                )}

                                {/* Meal totals from food items */}
                                {meal.food_items && meal.food_items.length > 0 && (
                                  <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-[var(--color-text-secondary)] font-semibold">סיכום הארוחה:</span>
                                      <div className="flex gap-4">
                                        <span className="text-emerald-400">
                                          {meal.food_items.reduce((sum, item) => sum + (item.calories || 0), 0)} קל'
                                        </span>
                                        <span className="text-emerald-400">
                                          {meal.food_items.reduce((sum, item) => sum + (item.protein || 0), 0)}ג חלבון
                                        </span>
                                        <span className="text-emerald-400">
                                          {meal.food_items.reduce((sum, item) => sum + (item.carbs || 0), 0)}ג פחמימות
                                        </span>
                                        <span className="text-emerald-400">
                                          {meal.food_items.reduce((sum, item) => sum + (item.fat || 0), 0)}ג שומן
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">הערות כלליות (אופציונלי)</label>
                                <textarea
                                  value={meal.description}
                                  onChange={(e) => onUpdateMeal(displayIndex, 'description', e.target.value)}
                                  className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
                                  rows={2}
                                  placeholder="הערות כלליות על הארוחה..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">חלופות</label>
                                <textarea
                                  value={meal.alternatives}
                                  onChange={(e) => onUpdateMeal(displayIndex, 'alternatives', e.target.value)}
                                  className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
                                  rows={2}
                                  placeholder="ניתן להחליף ב..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">הערות</label>
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
                    })}
                </div>
              </div>
            );
          })
        )}

        {meals.length > 0 && totals.calories > 0 && (
          <div className="premium-card-static p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--color-text-primary)]">סיכום יומי כולל:</span>
              <div className="flex gap-6 text-sm">
                <span className="text-[var(--color-text-secondary)]"><span className="text-emerald-400 font-semibold">{totals.calories}</span> <span className="text-[var(--color-text-muted)]">קלוריות</span></span>
                <span className="text-[var(--color-text-secondary)]"><span className="text-emerald-400 font-semibold">{totals.protein}ג</span> <span className="text-[var(--color-text-muted)]">חלבון</span></span>
                <span className="text-[var(--color-text-secondary)]"><span className="text-emerald-400 font-semibold">{totals.carbs}ג</span> <span className="text-[var(--color-text-muted)]">פחמימות</span></span>
                <span className="text-[var(--color-text-secondary)]"><span className="text-emerald-400 font-semibold">{totals.fat}ג</span> <span className="text-[var(--color-text-muted)]">שומן</span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-foreground px-10 py-4 rounded-2xl flex items-center gap-3 font-semibold transition-all duration-300 shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-[1.02]"
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
    </div>
  );
}
