import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
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
  { value: 1, label: 'יום ראשון' },
  { value: 2, label: 'יום שני' },
  { value: 3, label: 'יום שלישי' },
  { value: 4, label: 'יום רביעי' },
  { value: 5, label: 'יום חמישי' },
  { value: 6, label: 'יום שישי' },
  { value: 7, label: 'יום שבת' }
];

const MEAL_TYPES = [
  { value: 'breakfast', label: 'ארוחת בוקר', icon: '☀️' },
  { value: 'lunch', label: 'ארוחת צהריים', icon: '🌞' },
  { value: 'dinner', label: 'ארוחת ערב', icon: '🌙' },
  { value: 'snack', label: 'חטיף', icon: '🍎' }
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
      toast.error('שגיאה בטעינת תפריט');
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
      toast.error('שגיאה בעדכון ארוחה');
    }
  };

  const handleDeleteMeal = async (itemId: string) => {
    if (!confirm('האם למחוק את הארוחה?')) return;

    try {
      const { error } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(item => item.id !== itemId));
      toast.success('ארוחה נמחקה');
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('שגיאה במחיקת ארוחה');
    }
  };

  const copyDayToAll = async () => {
    if (!confirm(`האם להעתיק את התפריט מיום ${DAYS.find(d => d.value === currentDay)?.label} לכל הימים?`)) {
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

      toast.success('התפריט הועתק לכל הימים');
      loadPlanData();
    } catch (error) {
      console.error('Error copying day:', error);
      toast.error('שגיאה בהעתקת תפריט');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">טוען תפריט...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">תפריט לא נמצא</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← חזרה לרשימת תפריטים
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{plan.name || 'תפריט'}</h1>
          <button
            onClick={copyDayToAll}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            העתק יום נוכחי לכל השבוע
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-6 border-b overflow-x-auto">
          {DAYS.map((day) => (
            <button
              key={day.value}
              onClick={() => setCurrentDay(day.value)}
              className={`px-4 py-2 font-medium whitespace-nowrap ${
                currentDay === day.value
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {MEAL_TYPES.map((mealType) => {
            const mealItem = getMealItem(currentDay, mealType.value);

            return (
              <div key={mealType.value} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>{mealType.icon}</span>
                    {mealType.label}
                  </h3>
                  {mealItem?.id && (
                    <button
                      onClick={() => handleDeleteMeal(mealItem.id!)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      תיאור הארוחה
                    </label>
                    <textarea
                      value={mealItem?.description || ''}
                      onChange={(e) => handleUpdateMeal(currentDay, mealType.value, 'description', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      placeholder="לדוגמה: חביתה עם 3 ביצים, שתי פרוסות לחם מלא, סלט ירקות..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      הערות נוספות
                    </label>
                    <input
                      type="text"
                      value={mealItem?.notes || ''}
                      onChange={(e) => handleUpdateMeal(currentDay, mealType.value, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="כ-30 גרם חלבון, 40 גרם פחמימות..."
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 טיפ: השלימו את התפריט ליום אחד ולחצו על "העתק יום נוכחי לכל השבוע" כדי לחסוך זמן
          </p>
        </div>
      </div>
    </div>
  );
}
