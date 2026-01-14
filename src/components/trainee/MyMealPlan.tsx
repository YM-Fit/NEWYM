import { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Flame,
  Droplets,
  Beef,
  Wheat,
  Droplet,
  Clock,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getActiveMealPlanWithMeals } from '../../api';
import type { MealPlan, MealPlanMeal } from '../../types/nutritionTypes';

interface MyMealPlanProps {
  traineeId: string | null;
}

const MEAL_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  breakfast: { label: 'ארוחת בוקר', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: '🌅' },
  morning_snack: { label: 'ביניים בוקר', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', icon: '🍎' },
  lunch: { label: 'ארוחת צהריים', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: '🌞' },
  afternoon_snack: { label: 'ביניים אחה"צ', color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-200', icon: '🥤' },
  dinner: { label: 'ארוחת ערב', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: '🌙' },
  evening_snack: { label: 'ביניים ערב', color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200', icon: '🍵' },
};

export default function MyMealPlan({ traineeId }: MyMealPlanProps) {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [meals, setMeals] = useState<MealPlanMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(true);

  useEffect(() => {
    loadMealPlan();
  }, [traineeId]);

  const loadMealPlan = async () => {
    if (!traineeId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { plan, meals } = await getActiveMealPlanWithMeals(traineeId);

    setMealPlan(plan);
    setMeals(meals);
    setExpandedMeals(new Set(meals.map((m) => m.id)));

    setLoading(false);
  };

  const toggleMeal = (mealId: string) => {
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(mealId)) {
      newExpanded.delete(mealId);
    } else {
      newExpanded.add(mealId);
    }
    setExpandedMeals(newExpanded);
  };

  const getMealConfig = (mealName: string) => {
    return MEAL_CONFIG[mealName] || { label: mealName, color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200', icon: '🍽️' };
  };

  const calculateTotals = () => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.total_protein || 0),
        carbs: acc.carbs + (meal.total_carbs || 0),
        fat: acc.fat + (meal.total_fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 flex items-center justify-center shadow-glow animate-float border border-white/10">
          <UtensilsCrossed className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
          <UtensilsCrossed className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">אין תפריט פעיל</h3>
        <p className="text-[var(--color-text-muted)]">המאמן עדיין לא הגדיר תפריט תזונה</p>
      </div>
    );
  }

  const totals = calculateTotals();
  const hasMacroTargets = mealPlan.protein_grams || mealPlan.carbs_grams || mealPlan.fat_grams;

  return (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-l from-emerald-600 to-emerald-500 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">{mealPlan.name}</h2>
          <button
            onClick={loadMealPlan}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {mealPlan.description && (
          <p className="text-emerald-100 text-sm mb-4">{mealPlan.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {mealPlan.daily_calories && (
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <Flame className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{mealPlan.daily_calories.toLocaleString()}</p>
              <p className="text-xs text-emerald-200">קלוריות יומי</p>
            </div>
          )}
          {mealPlan.daily_water_ml && (
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <Droplets className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{(mealPlan.daily_water_ml / 1000).toFixed(1)} ליטר</p>
              <p className="text-xs text-emerald-200">מים יומי</p>
            </div>
          )}
        </div>

        {hasMacroTargets && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {mealPlan.protein_grams && (
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{mealPlan.protein_grams} גרם</p>
                <p className="text-xs text-emerald-200">חלבון</p>
              </div>
            )}
            {mealPlan.carbs_grams && (
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{mealPlan.carbs_grams} גרם</p>
                <p className="text-xs text-emerald-200">פחמימות</p>
              </div>
            )}
            {mealPlan.fat_grams && (
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{mealPlan.fat_grams} גרם</p>
                <p className="text-xs text-emerald-200">שומן</p>
              </div>
            )}
          </div>
        )}

        {mealPlan.updated_at && (
          <p className="text-xs text-emerald-200 mt-3 text-center">
            עודכן: {formatDate(mealPlan.updated_at)}
          </p>
        )}
      </div>

      {mealPlan.notes && (
        <div className="premium-card-static overflow-hidden">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/15 border border-amber-500/30 p-2 rounded-lg">
                <MessageSquare className="w-5 h-5 text-amber-500" />
              </div>
              <span className="font-semibold text-[var(--color-text-primary)]">הערות המאמן</span>
            </div>
            {showNotes ? (
              <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
            )}
          </button>
          {showNotes && (
            <div className="px-4 pb-4">
              <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text-secondary)] whitespace-pre-wrap text-sm leading-relaxed">
                {mealPlan.notes}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-emerald-500" />
          ארוחות יומיות ({meals.length})
        </h3>

        {meals.length === 0 ? (
          <div className="premium-card-static p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-[var(--color-text-secondary)]">אין ארוחות בתפריט</p>
          </div>
        ) : (
          meals.map((meal) => {
            const config = getMealConfig(meal.meal_name);
            const isExpanded = expandedMeals.has(meal.id);

            return (
              <div
                key={meal.id}
                className="premium-card-static overflow-hidden"
              >
                <button
                  onClick={() => toggleMeal(meal.id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-text-primary)]">{config.label}</span>
                        <span className="text-[var(--color-text-secondary)] text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(meal.meal_time)}
                        </span>
                      </div>
                      {meal.total_calories && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {meal.total_calories} קלוריות
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[var(--color-border)] pt-3">
                    {/* Food Items List */}
                    {meal.food_items && meal.food_items.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">פריטי מזון:</p>
                        {meal.food_items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-[var(--color-text-primary)]">
                                  {item.food_name}
                                </p>
                                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                                  {item.quantity} {item.unit === 'g' ? 'גרם' : item.unit === 'unit' ? 'יחידה' : item.unit === 'ml' ? 'מ"ל' : item.unit === 'cup' ? 'כוס' : item.unit === 'tbsp' ? 'כף' : item.unit === 'tsp' ? 'כפית' : item.unit}
                                </p>
                              </div>
                              {(item.calories || item.protein || item.carbs || item.fat) && (
                                <div className="flex gap-2 flex-wrap">
                                  {item.calories && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-500">
                                      {item.calories} קל'
                                    </span>
                                  )}
                                  {item.protein && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-500">
                                      <Beef className="w-3 h-3" />
                                      {item.protein}ג
                                    </span>
                                  )}
                                  {item.carbs && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-600">
                                      <Wheat className="w-3 h-3" />
                                      {item.carbs}ג
                                    </span>
                                  )}
                                  {item.fat && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs text-blue-500">
                                      <Droplet className="w-3 h-3" />
                                      {item.fat}ג
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Meal totals from food items */}
                        {meal.total_calories || meal.total_protein || meal.total_carbs || meal.total_fat ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mt-3">
                            <p className="text-sm font-semibold text-emerald-400 mb-2">סיכום הארוחה:</p>
                            <div className="flex gap-3 flex-wrap">
                              {meal.total_calories && (
                                <span className="text-sm text-emerald-300">
                                  <span className="font-bold">{meal.total_calories}</span> קלוריות
                                </span>
                              )}
                              {meal.total_protein && (
                                <span className="text-sm text-emerald-300">
                                  <span className="font-bold">{meal.total_protein}ג</span> חלבון
                                </span>
                              )}
                              {meal.total_carbs && (
                                <span className="text-sm text-emerald-300">
                                  <span className="font-bold">{meal.total_carbs}ג</span> פחמימות
                                </span>
                              )}
                              {meal.total_fat && (
                                <span className="text-sm text-emerald-300">
                                  <span className="font-bold">{meal.total_fat}ג</span> שומן
                                </span>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : meal.description ? (
                      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-3">
                        <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">מה לאכול:</p>
                        <p className="text-[var(--color-text-primary)] whitespace-pre-wrap">{meal.description}</p>
                      </div>
                    ) : null}

                    {meal.alternatives && (
                      <div className="bg-[var(--color-bg-surface)] rounded-lg p-3 border border-dashed border-[var(--color-border)]">
                        <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">חלופות:</p>
                        <p className="text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap">{meal.alternatives}</p>
                      </div>
                    )}

                    {meal.description && meal.food_items && meal.food_items.length > 0 && (
                      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-3">
                        <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">הערות:</p>
                        <p className="text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap">{meal.description}</p>
                      </div>
                    )}

                    {meal.notes && (
                      <p className="text-xs text-[var(--color-text-muted)] italic">{meal.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totals.calories > 0 && (
        <div className="premium-card-static p-4">
          <h3 className="font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-emerald-500" />
            סיכום יומי (מהארוחות)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-center">
              <Flame className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{totals.calories.toLocaleString()}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">קלוריות</p>
              {mealPlan.daily_calories && (
                <p className={`text-xs mt-1 ${totals.calories <= mealPlan.daily_calories ? 'text-emerald-500' : 'text-red-500'}`}>
                  מתוך {mealPlan.daily_calories.toLocaleString()}
                </p>
              )}
            </div>
            <div className="bg-cyan-500/15 border border-cyan-500/30 rounded-lg p-3 text-center">
              <Beef className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{totals.protein} גרם</p>
              <p className="text-xs text-[var(--color-text-secondary)]">חלבון</p>
              {mealPlan.protein_grams && (
                <p className={`text-xs mt-1 ${totals.protein >= mealPlan.protein_grams ? 'text-emerald-500' : 'text-orange-500'}`}>
                  מתוך {mealPlan.protein_grams} גרם
                </p>
              )}
            </div>
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-3 text-center">
              <Wheat className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{totals.carbs} גרם</p>
              <p className="text-xs text-[var(--color-text-secondary)]">פחמימות</p>
              {mealPlan.carbs_grams && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">מתוך {mealPlan.carbs_grams} גרם</p>
              )}
            </div>
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-3 text-center">
              <Droplet className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{totals.fat} גרם</p>
              <p className="text-xs text-[var(--color-text-secondary)]">שומן</p>
              {mealPlan.fat_grams && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">מתוך {mealPlan.fat_grams} גרם</p>
              )}
            </div>
          </div>

          {mealPlan.daily_water_ml && (
            <div className="mt-3 bg-cyan-500/15 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-500" />
                  <span className="font-medium text-cyan-600 dark:text-cyan-400">יעד מים יומי</span>
                </div>
                <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                  {(mealPlan.daily_water_ml / 1000).toFixed(1)} ליטר
                </span>
              </div>
              <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                ({mealPlan.daily_water_ml.toLocaleString()} מ״ל = כ-{Math.round(mealPlan.daily_water_ml / 250)} כוסות)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}
