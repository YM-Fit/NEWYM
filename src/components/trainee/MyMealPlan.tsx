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
  Search,
  Filter,
  X,
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
  afternoon_snack: { label: 'ביניים אחה"צ', color: 'text-primary-600', bgColor: 'bg-primary-50 border-primary-200', icon: '🥤' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [mealFilter, setMealFilter] = useState<string>('all');

  useEffect(() => {
    loadMealPlan();
  }, [traineeId]);

  const loadMealPlan = async () => {
    if (!traineeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { plan, meals } = await getActiveMealPlanWithMeals(traineeId);

      setMealPlan(plan);
      setMeals(meals || []);
      setExpandedMeals(new Set((meals || []).map((m) => m.id)));
    } catch (error) {
      console.error('Error loading meal plan:', error);
      setMealPlan(null);
      setMeals([]);
    } finally {
      setLoading(false);
    }
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

  const totals = useMemo(() => {
    if (!meals || meals.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.total_protein || 0),
        carbs: acc.carbs + (meal.total_carbs || 0),
        fat: acc.fat + (meal.total_fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

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

  // Filter meals based on search and filter
  const filteredMeals = useMemo(() => {
    if (!meals || meals.length === 0) return [];
    
    let filtered = meals;

    // Filter by meal type
    if (mealFilter !== 'all') {
      filtered = filtered.filter(meal => meal.meal_name === mealFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(meal => {
        // Search in meal name
        const mealConfig = getMealConfig(meal.meal_name);
        if (mealConfig.label.toLowerCase().includes(query)) return true;

        // Search in food items
        if (meal.food_items && meal.food_items.length > 0) {
          return meal.food_items.some(item => 
            item.food_name?.toLowerCase().includes(query)
          );
        }

        // Search in description
        if (meal.description && meal.description.toLowerCase().includes(query)) {
          return true;
        }

        return false;
      });
    }

    return filtered;
  }, [meals, mealFilter, searchQuery]);

  // Get unique meal types for filter
  const mealTypes = useMemo(() => {
    const types = new Set(meals.map(m => m.meal_name));
    return Array.from(types);
  }, [meals]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 flex items-center justify-center shadow-glow animate-float border border-white/10">
          <UtensilsCrossed className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-300">
          <UtensilsCrossed className="w-10 h-10 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">אין תפריט פעיל</h3>
        <p className="text-muted">המאמן עדיין לא הגדיר תפריט תזונה</p>
      </div>
    );
  }

  const hasMacroTargets = mealPlan?.protein_grams || mealPlan?.carbs_grams || mealPlan?.fat_grams;

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
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary-600" />
            ארוחות יומיות ({filteredMeals.length}{meals.length !== filteredMeals.length && ` מתוך ${meals.length}`})
          </h3>
        </div>

        {/* Search and Filter */}
        {(meals.length > 0 || searchQuery || mealFilter !== 'all') && (
          <div className="premium-card p-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="חפש בארוחות ובפריטי מזון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-border-light rounded-lg bg-elevated text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-surface rounded-full transition-colors"
                  aria-label="נקה חיפוש"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              )}
            </div>

            {/* Filter */}
            {mealTypes.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted" />
                <button
                  onClick={() => setMealFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    mealFilter === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-light text-secondary hover:bg-surface border border-border-light'
                  }`}
                >
                  הכל
                </button>
                {mealTypes.map((type) => {
                  const config = getMealConfig(type);
                  return (
                    <button
                      key={type}
                      onClick={() => setMealFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        mealFilter === type
                          ? 'bg-primary-500 text-white'
                          : 'bg-surface-light text-secondary hover:bg-surface border border-border-light'
                      }`}
                    >
                      <span>{config.icon}</span>
                      {config.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {meals.length === 0 ? (
          <div className="premium-card p-5 sm:p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-300">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-secondary">אין ארוחות בתפריט</p>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="premium-card p-5 sm:p-8 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-300">
              <Search className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-secondary mb-2">לא נמצאו ארוחות התואמות לחיפוש</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setMealFilter('all');
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              נקה חיפוש
            </button>
          </div>
        ) : (
          filteredMeals.map((meal) => (
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
    <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold drop-shadow-sm">{mealPlan.name}</h2>
          <button
            onClick={onRefresh}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all hover:scale-110 active:scale-95"
            aria-label="רענון"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {mealPlan.description && (
          <p className="text-white/80 text-sm mb-4 leading-relaxed">{mealPlan.description}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {mealPlan.daily_calories && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 hover:bg-white/25 transition-all">
              <Flame className="w-5 h-5 mx-auto mb-1 drop-shadow-sm" />
              <p className="text-lg font-bold">{mealPlan.daily_calories.toLocaleString()}</p>
              <p className="text-xs text-white/70">קלוריות יומי</p>
            </div>
          )}
          {mealPlan.daily_water_ml && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 hover:bg-white/25 transition-all">
              <Droplets className="w-5 h-5 mx-auto mb-1 drop-shadow-sm" />
              <p className="text-lg font-bold">{(mealPlan.daily_water_ml / 1000).toFixed(1)} ליטר</p>
              <p className="text-xs text-white/70">מים יומי</p>
            </div>
          )}
        </div>

        {hasMacroTargets && (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3">
            {mealPlan.protein_grams && (
              <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10">
                <p className="text-sm font-bold">{mealPlan.protein_grams} גרם</p>
                <p className="text-xs text-white/70">חלבון</p>
              </div>
            )}
            {mealPlan.carbs_grams && (
              <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10">
                <p className="text-sm font-bold">{mealPlan.carbs_grams} גרם</p>
                <p className="text-xs text-white/70">פחמימות</p>
              </div>
            )}
            {mealPlan.fat_grams && (
              <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2 text-center border border-white/10">
                <p className="text-sm font-bold">{mealPlan.fat_grams} גרם</p>
                <p className="text-xs text-white/70">שומן</p>
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
    <div className="premium-card overflow-hidden">
      <button 
        onClick={onToggle} 
        className="w-full p-4 flex items-center justify-between hover:bg-surface-light/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 border border-amber-300 p-2.5 rounded-lg">
            <MessageSquare className="w-5 h-5 text-amber-600" />
          </div>
          <span className="font-semibold text-foreground">הערות המאמן</span>
        </div>
        <div className={`transition-transform duration-300 ${showNotes ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-muted" />
        </div>
      </button>
      {showNotes && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="bg-surface-light border border-border-light rounded-lg p-4 text-secondary whitespace-pre-wrap text-sm leading-relaxed">
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
    <div className="premium-card overflow-hidden transition-all duration-300">
      <button 
        onClick={onToggle} 
        className="w-full p-4 flex items-center justify-between hover:bg-surface-light/50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`meal-section-${meal.id}`}
        aria-label={`${config.label} - ${isExpanded ? 'סגור' : 'פתח'}`}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl filter drop-shadow-sm">{config.icon}</div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{config.label}</span>
              <span className="text-secondary text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(meal.meal_time)}
              </span>
            </div>
            {meal.total_calories && (
              <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                <Flame className="w-3 h-3 text-primary-500" />
                {meal.total_calories} קלוריות
              </span>
            )}
          </div>
        </div>
        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-muted" />
        </div>
      </button>

      {isExpanded && (
        <div id={`meal-section-${meal.id}`} className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-4 animate-fade-in" role="region" aria-labelledby={`meal-header-${meal.id}`}>
          {meal.food_items && meal.food_items.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-primary-500" />
                פריטי מזון:
              </p>
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
            <div className="bg-surface-light border border-border-light rounded-lg p-3 animate-fade-in">
              <p className="text-sm font-semibold text-secondary mb-2">מה לאכול:</p>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">{meal.description}</p>
            </div>
          ) : null}

          {meal.alternatives && (
            <div className="bg-surface-light rounded-lg p-3 border border-dashed border-primary-300 animate-fade-in">
              <p className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-primary-500" />
                חלופות:
              </p>
              <p className="text-secondary text-sm whitespace-pre-wrap leading-relaxed">{meal.alternatives}</p>
            </div>
          )}

          {meal.description && meal.food_items && meal.food_items.length > 0 && (
            <div className="bg-surface-light border border-border-light rounded-lg p-3 animate-fade-in">
              <p className="text-sm font-semibold text-secondary mb-2">הערות:</p>
              <p className="text-secondary text-sm whitespace-pre-wrap leading-relaxed">{meal.description}</p>
            </div>
          )}

          {meal.notes && (
            <p className="text-xs text-muted italic animate-fade-in">{meal.notes}</p>
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
    <div className="bg-surface-light border border-border-light rounded-xl p-3 hover:border-border-medium transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{item.food_name}</p>
            {catColors && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${catColors.bg} ${catColors.text} border ${catColors.border}`}>
                {catColors.label}
              </span>
            )}
          </div>
          <p className="text-sm text-secondary mt-1">
            {item.quantity} {formatUnit(item.unit)}
          </p>
          {hasCatalogData && item.unit === 'g' && (
            <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
              <Info className="w-2.5 h-2.5" />
              חישוב אוטומטי ל-{item.quantity} גרם (בסיס: {item.calories_per_100g} קל' ל-100 גרם)
            </p>
          )}
        </div>
        {hasCatalogData && (
          <button
            onClick={onToggleAlts}
            className={`p-2 rounded-lg transition-all flex-shrink-0 hover:scale-110 active:scale-95 ${
              showAlts
                ? 'bg-primary-500/20 text-primary-600 border border-primary-300'
                : 'text-muted hover:bg-elevated border border-transparent'
            }`}
            title="הצג חלופות"
            aria-label="הצג חלופות"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {(item.calories || item.protein || item.carbs || item.fat) && (
        <div className="flex gap-2 flex-wrap mt-3">
          {item.calories != null && item.calories > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 border border-primary-300 rounded-full text-xs font-semibold text-primary-700">
              <Flame className="w-3 h-3" />
              {item.calories} קל'
            </span>
          )}
          {item.protein != null && item.protein > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 border border-red-300 rounded-full text-xs font-semibold text-red-600">
              <Beef className="w-3 h-3" />
              {item.protein}ג
            </span>
          )}
          {item.carbs != null && item.carbs > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 border border-blue-300 rounded-full text-xs font-semibold text-blue-600">
              <Wheat className="w-3 h-3" />
              {item.carbs}ג
            </span>
          )}
          {item.fat != null && item.fat > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-semibold text-amber-600">
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
      <div className="mt-2 p-3 bg-elevated rounded-lg border border-dashed border-border-light">
        <p className="text-xs text-muted text-center">אין חלופות דומות בקטגוריה זו</p>
      </div>
    );
  }

  const categoryLabel = FOOD_CATEGORIES.find(c => c.value === category)?.label || '';
  const isGrams = unit === 'g';
  const ratio = isGrams ? quantity / 100 : 1;

  return (
    <div className="mt-2 p-3 bg-elevated rounded-xl border border-dashed border-primary-300">
      <div className="flex items-center gap-2 mb-2">
        <ArrowLeftRight className="w-3.5 h-3.5 text-primary-500" />
        <span className="text-xs font-semibold text-primary-600">
          חלופות ({categoryLabel})
        </span>
        {isGrams && (
          <span className="text-[10px] text-muted mr-auto">
            ערכים ל-{quantity} גרם
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-primary-300 scrollbar-track-transparent">
        {alternatives.map((alt) => (
          <div
            key={alt.id}
            className="flex-shrink-0 text-right p-2.5 rounded-lg border border-border-light bg-surface-light hover:border-primary-400 transition-all min-w-[150px] max-w-[180px]"
          >
            <p className="font-semibold text-foreground text-xs mb-1.5 truncate">{alt.name}</p>
            {alt.brand && (
              <p className="text-[10px] text-muted mb-1 truncate">{alt.brand}</p>
            )}
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span className="flex items-center gap-0.5 text-primary-600 font-semibold">
                <Flame className="w-2.5 h-2.5" />
                {isGrams ? Math.round(alt.calories_per_100g * ratio) : alt.calories_per_100g}
              </span>
              <span className="flex items-center gap-0.5 text-red-600 font-semibold">
                <Beef className="w-2.5 h-2.5" />
                {isGrams ? Math.round(alt.protein_per_100g * ratio) : alt.protein_per_100g}ג
              </span>
              <span className="flex items-center gap-0.5 text-blue-600 font-semibold">
                <Wheat className="w-2.5 h-2.5" />
                {isGrams ? Math.round(alt.carbs_per_100g * ratio) : alt.carbs_per_100g}ג
              </span>
              <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                <Droplet className="w-2.5 h-2.5" />
                {isGrams ? Math.round(alt.fat_per_100g * ratio) : alt.fat_per_100g}ג
              </span>
            </div>
            {!isGrams && (
              <p className="text-[9px] text-muted mt-1">ל-100 גרם</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MealTotals({ meal }: { meal: MealPlanMeal }) {
  return (
    <div className="bg-surface-light border border-border-light rounded-xl p-4 mt-3">
      <p className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
        <UtensilsCrossed className="w-4 h-4 text-primary-500" />
        סיכום הארוחה:
      </p>
      <div className="flex gap-3 flex-wrap">
        {meal.total_calories != null && meal.total_calories > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-sm font-semibold text-primary-700">
            <Flame className="w-4 h-4" />
            <span className="font-bold">{meal.total_calories}</span> קלוריות
          </span>
        )}
        {meal.total_protein != null && meal.total_protein > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm font-semibold text-red-600">
            <Beef className="w-4 h-4" />
            <span className="font-bold">{meal.total_protein}ג</span> חלבון
          </span>
        )}
        {meal.total_carbs != null && meal.total_carbs > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-600">
            <Wheat className="w-4 h-4" />
            <span className="font-bold">{meal.total_carbs}ג</span> פחמימות
          </span>
        )}
        {meal.total_fat != null && meal.total_fat > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-semibold text-amber-600">
            <Droplet className="w-4 h-4" />
            <span className="font-bold">{meal.total_fat}ג</span> שומן
          </span>
        )}
      </div>
    </div>
  );
}

function DailySummary({ totals, mealPlan }: { totals: { calories: number; protein: number; carbs: number; fat: number }; mealPlan: MealPlan }) {
  const caloriesProgress = mealPlan?.daily_calories && mealPlan.daily_calories > 0 
    ? Math.min((totals.calories / mealPlan.daily_calories) * 100, 100) 
    : 0;
  const proteinProgress = mealPlan?.protein_grams && mealPlan.protein_grams > 0
    ? Math.min((totals.protein / mealPlan.protein_grams) * 100, 100) 
    : 0;
  const carbsProgress = mealPlan?.carbs_grams && mealPlan.carbs_grams > 0
    ? Math.min((totals.carbs / mealPlan.carbs_grams) * 100, 100) 
    : 0;
  const fatProgress = mealPlan?.fat_grams && mealPlan.fat_grams > 0
    ? Math.min((totals.fat / mealPlan.fat_grams) * 100, 100) 
    : 0;

  return (
    <div className="premium-card p-5">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <DailySummaryIcon className="w-5 h-5 text-primary-600" />
        סיכום יומי (מהארוחות)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-primary-100">
            <div 
              className={`h-full transition-all duration-500 ${caloriesProgress >= 100 ? 'bg-red-400' : caloriesProgress >= 80 ? 'bg-primary-400' : 'bg-primary-300'}`}
              style={{ width: `${Math.max(0, Math.min(100, caloriesProgress))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(caloriesProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <Flame className="w-5 h-5 text-primary-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{totals.calories.toLocaleString()}</p>
          <p className="text-xs text-secondary mt-1">קלוריות</p>
          {mealPlan.daily_calories && (
            <p className={`text-xs mt-2 font-semibold ${totals.calories <= mealPlan.daily_calories ? 'text-primary-600' : 'text-red-500'}`}>
              מתוך {mealPlan.daily_calories.toLocaleString()} ({Math.round(caloriesProgress)}%)
            </p>
          )}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-red-100">
            <div 
              className={`h-full transition-all duration-500 ${proteinProgress >= 100 ? 'bg-primary-400' : proteinProgress >= 80 ? 'bg-red-400' : 'bg-red-300'}`}
              style={{ width: `${Math.max(0, Math.min(100, proteinProgress))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(proteinProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <Beef className="w-5 h-5 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{totals.protein} גרם</p>
          <p className="text-xs text-secondary mt-1">חלבון</p>
          {mealPlan.protein_grams && (
            <p className={`text-xs mt-2 font-semibold ${totals.protein >= mealPlan.protein_grams ? 'text-primary-600' : 'text-orange-500'}`}>
              מתוך {mealPlan.protein_grams} גרם ({Math.round(proteinProgress)}%)
            </p>
          )}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-blue-100">
            <div 
              className="h-full bg-blue-300 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, carbsProgress))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(carbsProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <Wheat className="w-5 h-5 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{totals.carbs} גרם</p>
          <p className="text-xs text-secondary mt-1">פחמימות</p>
          {mealPlan.carbs_grams && (
            <p className="text-xs text-muted mt-2">מתוך {mealPlan.carbs_grams} גרם ({Math.round(carbsProgress)}%)</p>
          )}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-amber-100">
            <div 
              className="h-full bg-amber-300 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, fatProgress))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(fatProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <Droplet className="w-5 h-5 text-amber-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{totals.fat} גרם</p>
          <p className="text-xs text-secondary mt-1">שומן</p>
          {mealPlan.fat_grams && (
            <p className="text-xs text-muted mt-2">מתוך {mealPlan.fat_grams} גרם ({Math.round(fatProgress)}%)</p>
          )}
        </div>
      </div>

      {mealPlan?.daily_water_ml && mealPlan.daily_water_ml > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-700">יעד מים יומי</span>
            </div>
            <span className="text-xl font-bold text-blue-700">
              {(mealPlan.daily_water_ml / 1000).toFixed(1)} ליטר
            </span>
          </div>
          <p className="text-xs text-blue-600">
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
