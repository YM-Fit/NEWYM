import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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

interface MyMealPlanProps {
  traineeId: string | null;
}

interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  daily_calories: number | null;
  daily_water_ml: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  notes: string | null;
  updated_at: string | null;
  created_at: string;
}

interface Meal {
  id: string;
  meal_time: string;
  meal_name: string;
  description: string;
  alternatives: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string;
  order_index: number;
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
  const [meals, setMeals] = useState<Meal[]>([]);
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

    const { data: plan } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('trainee_id', traineeId)
      .eq('is_active', true)
      .maybeSingle();

    if (plan) {
      setMealPlan(plan);

      const { data: mealsData } = await supabase
        .from('meal_plan_meals')
        .select('*')
        .eq('plan_id', plan.id)
        .order('order_index', { ascending: true });

      setMeals(mealsData || []);
      setExpandedMeals(new Set((mealsData || []).map((m) => m.id)));
    } else {
      setMealPlan(null);
      setMeals([]);
    }

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
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UtensilsCrossed className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">אין תפריט פעיל</h3>
        <p className="text-gray-500">המאמן עדיין לא הגדיר תפריט תזונה</p>
      </div>
    );
  }

  const totals = calculateTotals();
  const hasMacroTargets = mealPlan.protein_grams || mealPlan.carbs_grams || mealPlan.fat_grams;

  return (
    <div className="space-y-4 pb-4">
      <div className="bg-gradient-to-l from-green-600 to-green-500 rounded-2xl p-5 text-white shadow-lg">
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
          <p className="text-green-100 text-sm mb-4">{mealPlan.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {mealPlan.daily_calories && (
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <Flame className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{mealPlan.daily_calories.toLocaleString()}</p>
              <p className="text-xs text-green-200">קלוריות יומי</p>
            </div>
          )}
          {mealPlan.daily_water_ml && (
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <Droplets className="w-5 h-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{(mealPlan.daily_water_ml / 1000).toFixed(1)}L</p>
              <p className="text-xs text-green-200">מים יומי</p>
            </div>
          )}
        </div>

        {hasMacroTargets && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {mealPlan.protein_grams && (
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{mealPlan.protein_grams}g</p>
                <p className="text-xs text-green-200">חלבון</p>
              </div>
            )}
            {mealPlan.carbs_grams && (
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{mealPlan.carbs_grams}g</p>
                <p className="text-xs text-green-200">פחמימות</p>
              </div>
            )}
            {mealPlan.fat_grams && (
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <p className="text-sm font-bold">{mealPlan.fat_grams}g</p>
                <p className="text-xs text-green-200">שומן</p>
              </div>
            )}
          </div>
        )}

        {mealPlan.updated_at && (
          <p className="text-xs text-green-200 mt-3 text-center">
            עודכן: {formatDate(mealPlan.updated_at)}
          </p>
        )}
      </div>

      {mealPlan.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <MessageSquare className="w-5 h-5 text-amber-700" />
              </div>
              <span className="font-semibold text-amber-800">הערות המאמן</span>
            </div>
            {showNotes ? (
              <ChevronUp className="w-5 h-5 text-amber-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-amber-600" />
            )}
          </button>
          {showNotes && (
            <div className="px-4 pb-4">
              <div className="bg-white rounded-lg p-3 text-amber-900 whitespace-pre-wrap text-sm leading-relaxed">
                {mealPlan.notes}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-green-600" />
          ארוחות יומיות ({meals.length})
        </h3>

        {meals.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">אין ארוחות בתפריט</p>
          </div>
        ) : (
          meals.map((meal) => {
            const config = getMealConfig(meal.meal_name);
            const isExpanded = expandedMeals.has(meal.id);

            return (
              <div
                key={meal.id}
                className={`rounded-xl border overflow-hidden ${config.bgColor}`}
              >
                <button
                  onClick={() => toggleMeal(meal.id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${config.color}`}>{config.label}</span>
                        <span className="text-gray-500 text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(meal.meal_time)}
                        </span>
                      </div>
                      {meal.calories && (
                        <span className="text-xs text-gray-500">{meal.calories} קלוריות</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {meal.description && (
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-600 mb-1">מה לאכול:</p>
                        <p className="text-gray-800 whitespace-pre-wrap">{meal.description}</p>
                      </div>
                    )}

                    {meal.alternatives && (
                      <div className="bg-white/80 rounded-lg p-3 border border-dashed border-gray-300">
                        <p className="text-sm font-medium text-gray-600 mb-1">חלופות:</p>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{meal.alternatives}</p>
                      </div>
                    )}

                    {(meal.protein || meal.carbs || meal.fat) && (
                      <div className="flex gap-2 flex-wrap">
                        {meal.protein && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs">
                            <Beef className="w-3 h-3 text-red-500" />
                            {meal.protein}g חלבון
                          </span>
                        )}
                        {meal.carbs && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs">
                            <Wheat className="w-3 h-3 text-amber-500" />
                            {meal.carbs}g פחמימות
                          </span>
                        )}
                        {meal.fat && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs">
                            <Droplet className="w-3 h-3 text-blue-500" />
                            {meal.fat}g שומן
                          </span>
                        )}
                      </div>
                    )}

                    {meal.notes && (
                      <p className="text-xs text-gray-500 italic">{meal.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totals.calories > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-green-600" />
            סיכום יומי (מהארוחות)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <Flame className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{totals.calories.toLocaleString()}</p>
              <p className="text-xs text-gray-500">קלוריות</p>
              {mealPlan.daily_calories && (
                <p className={`text-xs mt-1 ${totals.calories <= mealPlan.daily_calories ? 'text-green-600' : 'text-red-600'}`}>
                  מתוך {mealPlan.daily_calories.toLocaleString()}
                </p>
              )}
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <Beef className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{totals.protein}g</p>
              <p className="text-xs text-gray-500">חלבון</p>
              {mealPlan.protein_grams && (
                <p className={`text-xs mt-1 ${totals.protein >= mealPlan.protein_grams ? 'text-green-600' : 'text-orange-600'}`}>
                  מתוך {mealPlan.protein_grams}g
                </p>
              )}
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <Wheat className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{totals.carbs}g</p>
              <p className="text-xs text-gray-500">פחמימות</p>
              {mealPlan.carbs_grams && (
                <p className="text-xs text-gray-400 mt-1">מתוך {mealPlan.carbs_grams}g</p>
              )}
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <Droplet className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{totals.fat}g</p>
              <p className="text-xs text-gray-500">שומן</p>
              {mealPlan.fat_grams && (
                <p className="text-xs text-gray-400 mt-1">מתוך {mealPlan.fat_grams}g</p>
              )}
            </div>
          </div>

          {mealPlan.daily_water_ml && (
            <div className="mt-3 bg-cyan-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-600" />
                  <span className="font-medium text-cyan-800">יעד מים יומי</span>
                </div>
                <span className="text-lg font-bold text-cyan-700">
                  {(mealPlan.daily_water_ml / 1000).toFixed(1)} ליטר
                </span>
              </div>
              <p className="text-xs text-cyan-600 mt-1">
                ({mealPlan.daily_water_ml.toLocaleString()} מ"ל = כ-{Math.round(mealPlan.daily_water_ml / 250)} כוסות)
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
