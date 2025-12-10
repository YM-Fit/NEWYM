import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface MealPlan {
  id: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}

interface MealPlanManagerProps {
  traineeId: string;
  traineeName: string;
  onBack: () => void;
  onEditPlan: (planId: string) => void;
}

export default function MealPlanManager({ traineeId, traineeName, onBack, onEditPlan }: MealPlanManagerProps) {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, [traineeId]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('trainer_id', user.id)
        .eq('trainee_id', traineeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading meal plans:', error);
      toast.error('שגיאה בטעינת תפריטים');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) {
      toast.error('נא להזין שם לתפריט');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          trainer_id: user.id,
          trainee_id: traineeId,
          name: newPlanName,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('תפריט נוצר בהצלחה');
      setShowCreateForm(false);
      setNewPlanName('');
      loadPlans();
    } catch (error) {
      console.error('Error creating meal plan:', error);
      toast.error('שגיאה ביצירת תפריט');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId);

      if (error) throw error;

      toast.success(currentStatus ? 'תפריט הושבת' : 'תפריט הופעל');
      loadPlans();
    } catch (error) {
      console.error('Error toggling meal plan:', error);
      toast.error('שגיאה בשינוי סטטוס תפריט');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('האם למחוק את התפריט? פעולה זו תמחק גם את כל הארוחות בתפריט.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast.success('תפריט נמחק בהצלחה');
      loadPlans();
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast.error('שגיאה במחיקת תפריט');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">טוען תפריטים...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← חזרה לפרופיל
          </button>
          <h1 className="text-3xl font-bold">תפריטים - {traineeName}</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          תפריט חדש
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">תפריט חדש</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם התפריט</label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="לדוגמה: תפריט שבועי - שלב הורדה"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreatePlan}
                  disabled={saving}
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? 'שומר...' : 'צור תפריט'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPlanName('');
                  }}
                  disabled={saving}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {plans.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">אין עדיין תפריטים</p>
            <p className="text-sm text-gray-500 mt-2">לחץ על "תפריט חדש" כדי ליצור תפריט ראשון</p>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                !plan.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{plan.name || 'תפריט ללא שם'}</h3>
                    {plan.is_active ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        פעיל
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        לא פעיל
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    נוצר: {new Date(plan.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEditPlan(plan.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="ערוך תפריט"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(plan.id, plan.is_active)}
                    className={`p-2 rounded ${
                      plan.is_active
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={plan.is_active ? 'השבת' : 'הפעל'}
                  >
                    {plan.is_active ? (
                      <PowerOff className="w-5 h-5" />
                    ) : (
                      <Power className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="מחק תפריט"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
