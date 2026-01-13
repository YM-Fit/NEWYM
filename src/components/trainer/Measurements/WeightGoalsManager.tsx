import { useState, useEffect } from 'react';
import { Target, Plus, Edit, Trash2, TrendingUp, TrendingDown, Calendar, CheckCircle, X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

interface WeightGoal {
  id: string;
  trainee_id: string;
  trainee_name?: string;
  goal_type: 'weight';
  title: string;
  target_value: number;
  current_value: number | null;
  unit: string;
  target_date: string | null;
  status: 'active' | 'achieved' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface WeightGoalsManagerProps {
  traineeId: string;
  traineeName: string;
  currentWeight?: number;
  onGoalUpdated?: () => void;
}

export default function WeightGoalsManager({
  traineeId,
  traineeName,
  currentWeight,
  onGoalUpdated
}: WeightGoalsManagerProps) {
  const [goals, setGoals] = useState<WeightGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<WeightGoal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    target_value: '',
    target_date: '',
    notes: ''
  });

  useEffect(() => {
    loadGoals();
  }, [traineeId]);

  useEffect(() => {
    if (currentWeight !== undefined) {
      updateCurrentValues();
    }
  }, [currentWeight, goals]);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('trainee_goals')
        .select('*')
        .eq('trainee_id', traineeId)
        .eq('goal_type', 'weight')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const goalsWithNames = (data || []).map(goal => ({
        ...goal,
        trainee_name: traineeName
      }));

      setGoals(goalsWithNames);
    } catch (error) {
      logger.error('Error loading goals', error, 'WeightGoalsManager');
      toast.error('שגיאה בטעינת יעדים');
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentValues = async () => {
    if (!currentWeight || goals.length === 0) return;

    const goalsToUpdate = goals.filter(g => 
      g.status === 'active' && 
      (g.current_value === null || g.current_value !== currentWeight)
    );

    if (goalsToUpdate.length === 0) return;

    for (const goal of goalsToUpdate) {
      const { error } = await supabase
        .from('trainee_goals')
        .update({ current_value: currentWeight, updated_at: new Date().toISOString() })
        .eq('id', goal.id);

      if (!error) {
        // Check if goal is achieved
        const isAchieved = goal.target_value && currentWeight <= goal.target_value;
        if (isAchieved && goal.status === 'active') {
          await supabase
            .from('trainee_goals')
            .update({ status: 'achieved', updated_at: new Date().toISOString() })
            .eq('id', goal.id);
        }
      }
    }

    loadGoals();
  };

  const handleSave = async () => {
    if (!formData.title || !formData.target_value) {
      toast.error('אנא מלא את כל השדות הנדרשים');
      return;
    }

    try {
      const goalData = {
        trainee_id: traineeId,
        goal_type: 'weight' as const,
        title: formData.title,
        target_value: parseFloat(formData.target_value),
        current_value: currentWeight || null,
        unit: 'ק״ג',
        target_date: formData.target_date || null,
        notes: formData.notes || null,
        status: 'active' as const
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('trainee_goals')
          .update({ ...goalData, updated_at: new Date().toISOString() })
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast.success('היעד עודכן בהצלחה');
      } else {
        const { error } = await supabase
          .from('trainee_goals')
          .insert([goalData]);

        if (error) throw error;
        toast.success('היעד נוצר בהצלחה');
      }

      setShowAddModal(false);
      setEditingGoal(null);
      setFormData({ title: '', target_value: '', target_date: '', notes: '' });
      loadGoals();
      onGoalUpdated?.();
    } catch (error) {
      logger.error('Error saving goal', error, 'WeightGoalsManager');
      toast.error('שגיאה בשמירת היעד');
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את היעד?')) return;

    try {
      const { error } = await supabase
        .from('trainee_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      toast.success('היעד נמחק בהצלחה');
      loadGoals();
      onGoalUpdated?.();
    } catch (error) {
      logger.error('Error deleting goal', error, 'WeightGoalsManager');
      toast.error('שגיאה במחיקת היעד');
    }
  };

  const handleCancel = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('trainee_goals')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', goalId);

      if (error) throw error;
      toast.success('היעד בוטל');
      loadGoals();
      onGoalUpdated?.();
    } catch (error) {
      logger.error('Error cancelling goal', error, 'WeightGoalsManager');
      toast.error('שגיאה בביטול היעד');
    }
  };

  const getProgress = (goal: WeightGoal) => {
    if (!goal.target_value || !goal.current_value) return 0;
    const startWeight = goal.current_value;
    const targetWeight = goal.target_value;
    const current = currentWeight || goal.current_value;
    
    // For weight loss goals (target < start)
    if (targetWeight < startWeight) {
      const total = startWeight - targetWeight;
      const achieved = startWeight - current;
      return Math.min(100, Math.max(0, (achieved / total) * 100));
    }
    // For weight gain goals (target > start)
    else {
      const total = targetWeight - startWeight;
      const achieved = current - startWeight;
      return Math.min(100, Math.max(0, (achieved / total) * 100));
    }
  };

  const getDaysRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getProjectedDate = (goal: WeightGoal) => {
    if (!currentWeight || !goal.target_value || !goal.current_value) return null;
    
    const startWeight = goal.current_value;
    const targetWeight = goal.target_value;
    const weightDiff = Math.abs(targetWeight - currentWeight);
    const totalDiff = Math.abs(targetWeight - startWeight);
    
    if (weightDiff === 0) return null;
    
    // Calculate average daily change (assuming linear progress)
    const daysSinceStart = Math.max(1, Math.floor((new Date().getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    const weightChanged = Math.abs(currentWeight - startWeight);
    const dailyRate = weightChanged / daysSinceStart;
    
    if (dailyRate === 0) return null;
    
    const daysRemaining = weightDiff / dailyRate;
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + daysRemaining);
    
    return projectedDate;
  };

  if (loading) {
    return (
      <div className="premium-card-static p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card-static p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30">
            <Target className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">יעדי משקל</h3>
            <p className="text-sm text-gray-400">{traineeName}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setFormData({ title: '', target_value: '', target_date: '', notes: '' });
            setShowAddModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold flex items-center gap-2 transition-all hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          יעד חדש
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium mb-2">אין יעדי משקל</p>
          <p className="text-sm text-gray-500">צור יעד חדש כדי להתחיל לעקוב אחר ההתקדמות</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = getProgress(goal);
            const daysRemaining = getDaysRemaining(goal.target_date);
            const projectedDate = getProjectedDate(goal);
            const isAchieved = goal.status === 'achieved';
            const isActive = goal.status === 'active';

            return (
              <div
                key={goal.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isAchieved
                    ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10'
                    : isActive
                    ? 'border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-emerald-500/5'
                    : 'border-gray-700/50 bg-gray-800/30'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-white text-lg">{goal.title}</h4>
                      {isAchieved && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          הושג
                        </span>
                      )}
                      {!isActive && !isAchieved && (
                        <span className="px-2 py-1 rounded-lg bg-gray-500/20 text-gray-400 text-xs font-semibold">
                          בוטל
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>
                        יעד: <span className="font-semibold text-white">{goal.target_value} ק״ג</span>
                      </span>
                      {currentWeight && (
                        <span>
                          נוכחי: <span className="font-semibold text-white">{currentWeight.toFixed(1)} ק״ג</span>
                        </span>
                      )}
                      {goal.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(goal.target_date).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingGoal(goal);
                          setFormData({
                            title: goal.title,
                            target_value: goal.target_value.toString(),
                            target_date: goal.target_date || '',
                            notes: goal.notes || ''
                          });
                          setShowAddModal(true);
                        }}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCancel(goal.id)}
                        className="p-2 text-amber-400 hover:bg-amber-500/15 rounded-lg transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 text-red-400 hover:bg-red-500/15 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {isActive && (
                  <>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">התקדמות</span>
                        <span className="text-sm font-semibold text-white">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            progress >= 100
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {daysRemaining !== null && (
                        <div className="flex items-center gap-2">
                          {daysRemaining >= 0 ? (
                            <>
                              <Calendar className="h-4 w-4 text-cyan-400" />
                              <span className="text-gray-400">
                                נותרו: <span className="font-semibold text-white">{daysRemaining} ימים</span>
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-amber-400" />
                              <span className="text-amber-400">
                                עברו: <span className="font-semibold">{Math.abs(daysRemaining)} ימים</span>
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      {projectedDate && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-teal-400" />
                          <span className="text-gray-400">
                            תחזית הגעה: <span className="font-semibold text-white">
                              {projectedDate.toLocaleDateString('he-IL')}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {goal.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-sm text-gray-300">{goal.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-white/10 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingGoal ? 'ערוך יעד' : 'יעד חדש'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingGoal(null);
                  setFormData({ title: '', target_value: '', target_date: '', notes: '' });
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">כותרת</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="למשל: ירידה ל-70 ק״ג"
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/80 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">משקל יעד (ק״ג)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.target_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                  placeholder="70"
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/80 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">תאריך יעד (אופציונלי)</label>
                <input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/80 border border-white/10 text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">הערות (אופציונלי)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="הוסף הערות..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/80 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingGoal(null);
                  setFormData({ title: '', target_value: '', target_date: '', notes: '' });
                }}
                className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-all"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all hover:scale-[1.02]"
              >
                {editingGoal ? 'עדכן' : 'צור'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
