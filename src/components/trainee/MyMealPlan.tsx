import { useState, useEffect, useMemo } from 'react';
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
  ArrowLeftRight,
  Info,
} from 'lucide-react';
import { getActiveMealPlanWithMeals } from '../../api';
import type { MealPlan, MealPlanMeal, NutritionFoodItem } from '../../types/nutritionTypes';
import { FOOD_CATALOG, FOOD_CATEGORIES } from '../../data/foodCatalog';

interface MyMealPlanProps {
  traineeId: string | null;
}

const MEAL_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  breakfast: { label: 'ארוחת בוקר', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: '🌅' },
  morning_snack: { label: 'ביניים בוקר', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', icon: '🍎' },
  lunch: { label: 'ארוחת צהריים', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: '🌞' },
  afternoon_snack: { label: 'ביניים אחה"צ', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', icon: '🥤' },
  dinner: { label: 'ארוחת ערב', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: '🌙' },
  evening_snack: { label: 'ביניים ערב', color: 'text-slate-600', bgColor: 'bg-slate-50 border-slate-200', icon: '🍵' },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  protein: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30', label: 'חלבון' },
  fat: { bg: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-500/30', label: 'שומן' },
  carb: { bg: 'bg-blue-500/15', text: 'text-blue-500', border: 'border-blue-500/30', label: 'פחמימה' },
};

export default function MyMealPlan({ traineeId }: MyMealPlanProps) {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [meals, setMeals] = useState<MealPlanMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState<Set<string>>(new Set());

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

  const toggleAlternatives = (foodItemId: string) => {
    const next = new Set(showAlternatives);
    if (next.has(foodItemId)) {
      next.delete(foodItemId);
    } else {
      next.add(foodItemId);
    }
    setShowAlternatives(next);
  };

  const getMealConfig = (mealName: string) => {
    return MEAL_CONFIG[mealName] || { label: mealName, color: 'text-slate-700', bgColor: 'bg-slate-50 border-slate-200', icon: '🍽️' };
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

  const formatUnit = (unit: string) => {
    switch (unit) {
      case 'g': return 'גרם';
      case 'unit': return 'יחידה';
      case 'ml': return 'מ"ל';
      case 'cup': return 'כוס';
      case 'tbsp': return 'כף';
      case 'tsp': return 'כפית';
      default: return unit;
    }
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
      <PlanHeader
        mealPlan={mealPlan}
        hasMacroTargets={!!hasMacroTargets}
        onRefresh={loadMealPlan}
        formatDate={formatDate}
      />

      {mealPlan.notes && (
        <NotesSection notes={mealPlan.notes} showNotes={showNotes} onToggle={() => setShowNotes(!showNotes)} />
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
          meals.map((meal) => (
            <MealSection
              key={meal.id}
              meal={meal}
              isExpanded={expandedMeals.has(meal.id)}
              onToggle={() => toggleMeal(meal.id)}
              getMealConfig={getMealConfig}
              formatTime={formatTime}
              formatUnit={formatUnit}
              showAlternatives={showAlternatives}
              onToggleAlternatives={toggleAlternatives}
            />
          ))
        )}
      </div>

      {totals.calories > 0 && (
        <DailySummary totals={totals} mealPlan={mealPlan} />
      )}
    </div>
  );
}

function PlanHeader({
  mealPlan,
  hasMacroTargets,
  onRefresh,
  formatDate,
}: {
  mealPlan: MealPlan;
  hasMacroTargets: boolean;
  onRefresh: () => void;
  formatDate: (d: string | null) => string;
}) {
  return (
    <div className="bg-gradient-to-l from-emerald-600 to-emerald-500 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">{mealPlan.name}</h2>
        <button
          onClick={onRefresh}
          className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {mealPlan.description && (
        <p className="text-white/70 text-sm mb-4">{mealPlan.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {mealPlan.daily_calories && (
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1" />
            <p className="text-lg font-bold">{mealPlan.daily_calories.toLocaleString()}</p>
            <p className="text-xs text-white/60">קלוריות יומי</p>
          </div>
        )}
        {mealPlan.daily_water_ml && (
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <Droplets className="w-5 h-5 mx-auto mb-1" />
            <p className="text-lg font-bold">{(mealPlan.daily_water_ml / 1000).toFixed(1)} ליטר</p>
            <p className="text-xs text-white/60">מים יומי</p>
          </div>
        )}
      </div>

      {hasMacroTargets && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {mealPlan.protein_grams && (
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-sm font-bold">{mealPlan.protein_grams} גרם</p>
              <p className="text-xs text-white/60">חלבון</p>
            </div>
          )}
          {mealPlan.carbs_grams && (
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-sm font-bold">{mealPlan.carbs_grams} גרם</p>
              <p className="text-xs text-white/60">פחמימות</p>
            </div>
          )}
          {mealPlan.fat_grams && (
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-sm font-bold">{mealPlan.fat_grams} גרם</p>
              <p className="text-xs text-white/60">שומן</p>
            </div>
          )}
        </div>
      )}

      {mealPlan.updated_at && (
        <p className="text-xs text-white/60 mt-3 text-center">
          עודכן: {formatDate(mealPlan.updated_at)}
        </p>
      )}
    </div>
  );
}

function NotesSection({
  notes,
  showNotes,
  onToggle,
}: {
  notes: string;
  showNotes: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="premium-card-static overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between">
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
            {notes}
          </div>
        </div>
      )}
    </div>
  );
}

function MealSection({
  meal,
  isExpanded,
  onToggle,
  getMealConfig,
  formatTime,
  formatUnit,
  showAlternatives,
  onToggleAlternatives,
}: {
  meal: MealPlanMeal;
  isExpanded: boolean;
  onToggle: () => void;
  getMealConfig: (name: string) => { label: string; icon: string };
  formatTime: (time: string) => string;
  formatUnit: (unit: string) => string;
  showAlternatives: Set<string>;
  onToggleAlternatives: (id: string) => void;
}) {
  const config = getMealConfig(meal.meal_name);

  return (
    <div className="premium-card-static overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between">
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
          {meal.food_items && meal.food_items.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">פריטי מזון:</p>
              {meal.food_items.map((item) => (
                <FoodItemCard
                  key={item.id}
                  item={item}
                  formatUnit={formatUnit}
                  showAlts={showAlternatives.has(item.id)}
                  onToggleAlts={() => onToggleAlternatives(item.id)}
                />
              ))}

              {(meal.total_calories || meal.total_protein || meal.total_carbs || meal.total_fat) && (
                <MealTotals meal={meal} />
              )}
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
}

function FoodItemCard({
  item,
  formatUnit,
  showAlts,
  onToggleAlts,
}: {
  item: NutritionFoodItem;
  formatUnit: (unit: string) => string;
  showAlts: boolean;
  onToggleAlts: () => void;
}) {
  const hasCatalogData = !!item.category && !!item.calories_per_100g;
  const catColors = item.category ? CATEGORY_COLORS[item.category] : null;

  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[var(--color-text-primary)]">{item.food_name}</p>
            {catColors && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${catColors.bg} ${catColors.text} border ${catColors.border}`}>
                {catColors.label}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {item.quantity} {formatUnit(item.unit)}
          </p>
          {hasCatalogData && item.unit === 'g' && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
              <Info className="w-2.5 h-2.5" />
              חישוב אוטומטי ל-{item.quantity} גרם (בסיס: {item.calories_per_100g} קל' ל-100 גרם)
            </p>
          )}
        </div>
        {hasCatalogData && (
          <button
            onClick={onToggleAlts}
            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
              showAlts
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
            }`}
            title="הצג חלופות"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {(item.calories || item.protein || item.carbs || item.fat) && (
        <div className="flex gap-2 flex-wrap mt-2">
          {item.calories != null && item.calories > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-500">
              <Flame className="w-3 h-3" />
              {item.calories} קל'
            </span>
          )}
          {item.protein != null && item.protein > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/15 border border-red-500/30 rounded-full text-xs text-red-500">
              <Beef className="w-3 h-3" />
              {item.protein}ג
            </span>
          )}
          {item.carbs != null && item.carbs > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs text-blue-500">
              <Wheat className="w-3 h-3" />
              {item.carbs}ג
            </span>
          )}
          {item.fat != null && item.fat > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-600">
              <Droplet className="w-3 h-3" />
              {item.fat}ג
            </span>
          )}
        </div>
      )}

      {showAlts && hasCatalogData && (
        <TraineeAlternativesPanel
          foodName={item.food_name}
          category={item.category!}
          caloriesPer100g={item.calories_per_100g!}
          quantity={item.quantity}
          unit={item.unit}
        />
      )}
    </div>
  );
}

function TraineeAlternativesPanel({
  foodName,
  category,
  caloriesPer100g,
  quantity,
  unit,
}: {
  foodName: string;
  category: string;
  caloriesPer100g: number;
  quantity: number;
  unit: string;
}) {
  const alternatives = useMemo(() => {
    const tolerance = caloriesPer100g * 0.35;

    return FOOD_CATALOG
      .filter(item => {
        if (item.category !== category) return false;
        if (item.name === foodName) return false;
        const diff = Math.abs(item.calories_per_100g - caloriesPer100g);
        return diff <= tolerance;
      })
      .sort((a, b) =>
        Math.abs(a.calories_per_100g - caloriesPer100g) - Math.abs(b.calories_per_100g - caloriesPer100g)
      )
      .slice(0, 6);
  }, [foodName, category, caloriesPer100g]);

  if (alternatives.length === 0) {
    return (
      <div className="mt-2 p-3 bg-[var(--color-bg-elevated)] rounded-lg border border-dashed border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-muted)] text-center">אין חלופות דומות בקטגוריה זו</p>
      </div>
    );
  }

  const categoryLabel = FOOD_CATEGORIES.find(c => c.value === category)?.label || '';
  const isGrams = unit === 'g';
  const ratio = isGrams ? quantity / 100 : 1;

  return (
    <div className="mt-2 p-3 bg-[var(--color-bg-elevated)] rounded-xl border border-dashed border-emerald-500/30">
      <div className="flex items-center gap-2 mb-2">
        <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400">
          חלופות ({categoryLabel})
        </span>
        {isGrams && (
          <span className="text-[10px] text-[var(--color-text-muted)] mr-auto">
            ערכים ל-{quantity} גרם
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {alternatives.map((alt) => (
          <div
            key={alt.id}
            className="flex-shrink-0 text-right p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] min-w-[150px] max-w-[180px]"
          >
            <p className="font-semibold text-[var(--color-text-primary)] text-xs mb-1.5 truncate">{alt.name}</p>
            {alt.brand && (
              <p className="text-[10px] text-[var(--color-text-muted)] mb-1 truncate">{alt.brand}</p>
            )}
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span className="flex items-center gap-0.5 text-emerald-500">
                <Flame className="w-2.5 h-2.5" />
                {isGrams ? Math.round(alt.calories_per_100g * ratio) : alt.calories_per_100g}
              </span>
              <span className="flex items-center gap-0.5 text-red-500">
                <Beef className="w-2.5 h-2.5" />
                {isGrams ? Math.round(alt.protein_per_100g * ratio) : alt.protein_per_100g}ג
              </span>
              <span className="flex items-center gap-0.5 text-blue-500">
                <Wheat className="w-2.5 h-2.5" />
                {isGrams ? Math.round(alt.carbs_per_100g * ratio) : alt.carbs_per_100g}ג
              </span>
              <span className="flex items-center gap-0.5 text-amber-600">
                <Droplet className="w-2.5 h-2.5" />
                {isGrams ? Math.round(alt.fat_per_100g * ratio) : alt.fat_per_100g}ג
              </span>
            </div>
            {!isGrams && (
              <p className="text-[9px] text-[var(--color-text-muted)] mt-1">ל-100 גרם</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MealTotals({ meal }: { meal: MealPlanMeal }) {
  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-3 mt-3">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">סיכום הארוחה:</p>
      <div className="flex gap-3 flex-wrap">
        {meal.total_calories != null && meal.total_calories > 0 && (
          <span className="text-sm text-emerald-500">
            <span className="font-bold">{meal.total_calories}</span> קלוריות
          </span>
        )}
        {meal.total_protein != null && meal.total_protein > 0 && (
          <span className="text-sm text-red-500">
            <span className="font-bold">{meal.total_protein}ג</span> חלבון
          </span>
        )}
        {meal.total_carbs != null && meal.total_carbs > 0 && (
          <span className="text-sm text-blue-500">
            <span className="font-bold">{meal.total_carbs}ג</span> פחמימות
          </span>
        )}
        {meal.total_fat != null && meal.total_fat > 0 && (
          <span className="text-sm text-amber-600">
            <span className="font-bold">{meal.total_fat}ג</span> שומן
          </span>
        )}
      </div>
    </div>
  );
}

function DailySummary({ totals, mealPlan }: { totals: { calories: number; protein: number; carbs: number; fat: number }; mealPlan: MealPlan }) {
  return (
    <div className="premium-card-static p-4">
      <h3 className="font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
        <DailySummaryIcon className="w-5 h-5 text-emerald-500" />
        סיכום יומי (מהארוחות)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-3 text-center">
          <Flame className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--color-text-primary)]">{totals.calories.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">קלוריות</p>
          {mealPlan.daily_calories && (
            <p className={`text-xs mt-1 ${totals.calories <= mealPlan.daily_calories ? 'text-emerald-500' : 'text-red-500'}`}>
              מתוך {mealPlan.daily_calories.toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-3 text-center">
          <Beef className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--color-text-primary)]">{totals.protein} גרם</p>
          <p className="text-xs text-[var(--color-text-secondary)]">חלבון</p>
          {mealPlan.protein_grams && (
            <p className={`text-xs mt-1 ${totals.protein >= mealPlan.protein_grams ? 'text-emerald-500' : 'text-orange-500'}`}>
              מתוך {mealPlan.protein_grams} גרם
            </p>
          )}
        </div>
        <div className="bg-blue-500/15 border border-blue-500/30 rounded-lg p-3 text-center">
          <Wheat className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--color-text-primary)]">{totals.carbs} גרם</p>
          <p className="text-xs text-[var(--color-text-secondary)]">פחמימות</p>
          {mealPlan.carbs_grams && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">מתוך {mealPlan.carbs_grams} גרם</p>
          )}
        </div>
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-3 text-center">
          <Droplet className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-[var(--color-text-primary)]">{totals.fat} גרם</p>
          <p className="text-xs text-[var(--color-text-secondary)]">שומן</p>
          {mealPlan.fat_grams && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">מתוך {mealPlan.fat_grams} גרם</p>
          )}
        </div>
      </div>

      {mealPlan.daily_water_ml && (
        <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-blue-600">יעד מים יומי</span>
            </div>
            <span className="text-lg font-bold text-blue-600">
              {(mealPlan.daily_water_ml / 1000).toFixed(1)} ליטר
            </span>
          </div>
          <p className="text-xs text-blue-500 mt-1">
            ({mealPlan.daily_water_ml.toLocaleString()} מ"ל = כ-{Math.round(mealPlan.daily_water_ml / 250)} כוסות)
          </p>
        </div>
      )}
    </div>
  );
}

function DailySummaryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}
