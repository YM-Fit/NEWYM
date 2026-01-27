import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Power, PowerOff, ArrowRight, Sparkles, UtensilsCrossed, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

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
      logger.error('Error loading meal plans', error, 'MealPlanManager');
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

      const { error } = await supabase
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
      logger.error('Error creating meal plan', error, 'MealPlanManager');
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
      logger.error('Error toggling meal plan', error, 'MealPlanManager');
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
      logger.error('Error deleting meal plan', error, 'MealPlanManager');
      toast.error('שגיאה במחיקת תפריט');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="premium-card-static p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 rounded-xl bg-surface text-muted hover:text-foreground hover:bg-elevated/50 transition-all"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">תפריטים</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{traineeName}</h1>
              <p className="text-muted">ניהול תפריטי תזונה</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            תפריט חדש
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="premium-card-static p-6 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                  <UtensilsCrossed className="h-5 w-5 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground">תפריט חדש</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPlanName('');
                }}
                className="p-2 hover:bg-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">שם התפריט</label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full p-4 bg-surface border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  placeholder="לדוגמה: תפריט שבועי - שלב הורדה"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreatePlan}
                  disabled={saving}
                  className="flex-1 btn-primary py-3 rounded-xl font-medium disabled:opacity-50"
                >
                  {saving ? 'שומר...' : 'צור תפריט'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPlanName('');
                  }}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-foreground hover:bg-surface transition-all disabled:opacity-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {plans.length === 0 ? (
          <div className="text-center py-12 premium-card-static">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center">
              <UtensilsCrossed className="h-8 w-8 text-muted" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">אין תפריטים עדיין</h3>
            <p className="text-muted mb-6">לחץ על "תפריט חדש" כדי ליצור תפריט ראשון</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary px-6 py-3 rounded-xl font-medium"
            >
              צור תפריט ראשון
            </button>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`premium-card-static p-5 hover:border-border-hover transition-all ${
                !plan.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                      <UtensilsCrossed className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{plan.name || 'תפריט ללא שם'}</h3>
                        {plan.is_active ? (
                          <span className="bg-emerald-500/15 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30">
                            פעיל
                          </span>
                        ) : (
                          <span className="bg-surface text-muted text-xs px-2 py-0.5 rounded-full border border-border">
                            לא פעיל
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted mt-1">
                        נוצר: {new Date(plan.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => onEditPlan(plan.id)}
                    className="p-2 text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all"
                    title="ערוך תפריט"
                  >
                    <Edit2 className="w-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(plan.id, plan.is_active)}
                    className={`p-2 rounded-lg transition-all ${
                      plan.is_active
                        ? 'text-amber-400 hover:bg-amber-500/15'
                        : 'text-emerald-400 hover:bg-emerald-500/15'
                    }`}
                    title={plan.is_active ? 'השבת' : 'הפעל'}
                  >
                    {plan.is_active ? (
                      <PowerOff className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-2 text-red-400 hover:bg-red-500/15 rounded-lg transition-all"
                    title="מחק תפריט"
                  >
                    <Trash2 className="w-4 h-4" />
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
