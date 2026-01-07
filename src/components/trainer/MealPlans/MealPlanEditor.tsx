import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Copy, Calendar, UtensilsCrossed } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface MealPlanItem {
  id?: string;
  day_of_week: number;
  meal_type: string;
  description: string;
  notes: string;
}

interface MealPlan {
  id: string;
  name: string | null;
}

interface MealPlanEditorProps {
  planId: string;
  onBack: () => void;
}

const DAYS = [
  { value: 1, label: 'Sunday' },
  { value: 2, label: 'Monday' },
  { value: 3, label: 'Tuesday' },
  { value: 4, label: 'Wednesday' },
  { value: 5, label: 'Thursday' },
  { value: 6, label: 'Friday' },
  { value: 7, label: 'Saturday' }
];

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { value: 'lunch', label: 'Lunch', icon: '🌞' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍎' }
];

export default function MealPlanEditor({ planId, onBack }: MealPlanEditorProps) {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(1);

  useEffect(() => {
    loadPlanData();
  }, [planId]);

  const loadPlanData = async () => {
    try {
      setLoading(true);

      const { data: planData, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;
      setPlan(planData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('plan_id', planId)
        .order('day_of_week', { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error loading meal plan:', error);
      toast.error('Error loading meal plan');
    } finally {
      setLoading(false);
    }
  };

  const getDayItems = (day: number) => {
    return items.filter(item => item.day_of_week === day);
  };

  const getMealItem = (day: number, mealType: string) => {
    return items.find(item => item.day_of_week === day && item.meal_type === mealType);
  };

  const handleUpdateMeal = async (day: number, mealType: string, field: string, value: string) => {
    const existingItem = getMealItem(day, mealType);

    try {
      if (existingItem?.id) {
        const { error } = await supabase
          .from('meal_plan_items')
          .update({ [field]: value })
          .eq('id', existingItem.id);

        if (error) throw error;

        setItems(items.map(item =>
          item.id === existingItem.id ? { ...item, [field]: value } : item
        ));
      } else {
        const newItem = {
          plan_id: planId,
          day_of_week: day,
          meal_type: mealType,
          description: field === 'description' ? value : '',
          notes: field === 'notes' ? value : ''
        };

        const { data, error } = await supabase
          .from('meal_plan_items')
          .insert(newItem)
          .select()
          .single();

        if (error) throw error;

        setItems([...items, data]);
      }
    } catch (error) {
      console.error('Error updating meal:', error);
      toast.error('Error updating meal');
    }
  };

  const handleDeleteMeal = async (itemId: string) => {
    if (!confirm('Delete this meal?')) return;

    try {
      const { error } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(item => item.id !== itemId));
      toast.success('Meal deleted');
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Error deleting meal');
    }
  };

  const copyDayToAll = async () => {
    if (!confirm(`Copy the menu from ${DAYS.find(d => d.value === currentDay)?.label} to all days?`)) {
      return;
    }

    try {
      const currentDayItems = getDayItems(currentDay);
      const newItems = [];

      for (let day = 1; day <= 7; day++) {
        if (day === currentDay) continue;

        for (const item of currentDayItems) {
          newItems.push({
            plan_id: planId,
            day_of_week: day,
            meal_type: item.meal_type,
            description: item.description,
            notes: item.notes
          });
        }
      }

      const { error: deleteError } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('plan_id', planId)
        .neq('day_of_week', currentDay);

      if (deleteError) throw deleteError;

      const { data, error: insertError } = await supabase
        .from('meal_plan_items')
        .insert(newItems)
        .select();

      if (insertError) throw insertError;

      toast.success('Menu copied to all days');
      loadPlanData();
    } catch (error) {
      console.error('Error copying day:', error);
      toast.error('Error copying menu');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-400 font-medium">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <div className="text-center">
          <div className="p-4 bg-gray-800/50 rounded-2xl inline-block mb-4">
            <UtensilsCrossed className="h-12 w-12 text-gray-600" />
          </div>
          <p className="text-gray-400 text-xl font-medium">Meal plan not found</p>
          <button
            onClick={onBack}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl shadow-xl border border-white/10 p-6 lg:p-8 mb-8 backdrop-blur-sm">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-6 transition-colors duration-300 font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to meal plans
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-2xl shadow-lg">
                <UtensilsCrossed className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">{plan.name || 'Meal Plan'}</h1>
                <p className="text-gray-400 mt-1">Edit your weekly meal schedule</p>
              </div>
            </div>
            <button
              onClick={copyDayToAll}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
            >
              <Copy className="h-5 w-5" />
              Copy to All Days
            </button>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl shadow-xl border border-white/10 overflow-hidden backdrop-blur-sm">
          {/* Day Tabs */}
          <div className="flex items-center gap-1 p-4 border-b border-white/10 overflow-x-auto bg-gray-800/30">
            {DAYS.map((day) => (
              <button
                key={day.value}
                onClick={() => setCurrentDay(day.value)}
                className={`px-5 py-3 font-semibold whitespace-nowrap rounded-xl transition-all duration-300 ${
                  currentDay === day.value
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          {/* Meals Section */}
          <div className="p-6 lg:p-8 space-y-6">
            {MEAL_TYPES.map((mealType) => {
              const mealItem = getMealItem(currentDay, mealType.value);

              return (
                <div
                  key={mealType.value}
                  className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-2xl p-6 border border-white/5 hover:border-emerald-500/20 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <span className="text-2xl filter drop-shadow-lg">{mealType.icon}</span>
                      {mealType.label}
                    </h3>
                    {mealItem?.id && (
                      <button
                        onClick={() => handleDeleteMeal(mealItem.id!)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-300 hover:scale-105"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-3">
                        Meal Description
                      </label>
                      <textarea
                        value={mealItem?.description || ''}
                        onChange={(e) => handleUpdateMeal(currentDay, mealType.value, 'description', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
                        rows={3}
                        placeholder="e.g., Omelet with 3 eggs, two slices of whole wheat bread, vegetable salad..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-3">
                        Additional Notes
                      </label>
                      <input
                        type="text"
                        value={mealItem?.notes || ''}
                        onChange={(e) => handleUpdateMeal(currentDay, mealType.value, 'notes', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
                        placeholder="~30g protein, 40g carbs..."
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tip Section */}
          <div className="m-6 lg:m-8 mt-0 p-5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl border border-blue-500/20">
            <p className="text-sm text-blue-300 flex items-center gap-3">
              <span className="text-xl">💡</span>
              <span><strong>Tip:</strong> Complete the menu for one day and click "Copy to All Days" to save time</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
