import { useState, useEffect } from 'react';
import { X, Target, Plus, Trophy, TrendingUp, Calendar, Trash2, Edit2, Check, Dumbbell } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Goal {
  id: string;
  goal_type: 'weight' | 'strength' | 'measurement' | 'custom';
  title: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  target_date: string | null;
  exercise_id: string | null;
  status: 'active' | 'achieved' | 'cancelled';
  notes: string | null;
  pair_member: string | null;
  created_at: string;
}

interface TraineeGoalsProps {
  traineeId: string;
  traineeName: string;
  onClose: () => void;
  pairMember?: string | null;
}

export default function TraineeGoals({ traineeId, traineeName, onClose, pairMember }: TraineeGoalsProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved'>('active');
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    goal_type: 'weight' as Goal['goal_type'],
    title: '',
    target_value: '',
    current_value: '',
    unit: 'ק"ג',
    target_date: '',
    exercise_id: '',
    notes: '',
  });

  useEffect(() => {
    loadGoals();
    loadExercises();
  }, [traineeId]);

  const loadGoals = async () => {
    setLoading(true);
    let query = supabase
      .from('trainee_goals')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('created_at', { ascending: false });

    if (pairMember) {
      query = query.eq('pair_member', pairMember);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('שגיאה בטעינת היעדים');
    } else {
      setGoals(data || []);
    }
    setLoading(false);
  };

  const loadExercises = async () => {
    const { data } = await supabase.from('exercises').select('id, name').order('name');
    if (data) setExercises(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const goalData = {
      trainee_id: traineeId,
      goal_type: formData.goal_type,
      title: formData.title,
      target_value: formData.target_value ? parseFloat(formData.target_value) : null,
      current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      unit: formData.unit || null,
      target_date: formData.target_date || null,
      exercise_id: formData.exercise_id || null,
      notes: formData.notes || null,
      pair_member: pairMember || null,
      status: 'active' as const,
    };

    if (editingGoal) {
      const { error } = await supabase
        .from('trainee_goals')
        .update({ ...goalData, updated_at: new Date().toISOString() })
        .eq('id', editingGoal.id);

      if (error) {
        toast.error('שגיאה בעדכון היעד');
      } else {
        toast.success('היעד עודכן בהצלחה');
        loadGoals();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('trainee_goals').insert(goalData);

      if (error) {
        toast.error('שגיאה בהוספת היעד');
      } else {
        toast.success('היעד נוסף בהצלחה');
        loadGoals();
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      goal_type: 'weight',
      title: '',
      target_value: '',
      current_value: '',
      unit: 'ק"ג',
      target_date: '',
      exercise_id: '',
      notes: '',
    });
    setShowAddForm(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setFormData({
      goal_type: goal.goal_type,
      title: goal.title,
      target_value: goal.target_value?.toString() || '',
      current_value: goal.current_value?.toString() || '',
      unit: goal.unit || 'ק"ג',
      target_date: goal.target_date || '',
      exercise_id: goal.exercise_id || '',
      notes: goal.notes || '',
    });
    setEditingGoal(goal);
    setShowAddForm(true);
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק יעד זה?')) return;

    const { error } = await supabase.from('trainee_goals').delete().eq('id', goalId);
    if (error) {
      toast.error('שגיאה במחיקת היעד');
    } else {
      toast.success('היעד נמחק');
      loadGoals();
    }
  };

  const handleMarkAchieved = async (goalId: string) => {
    const { error } = await supabase
      .from('trainee_goals')
      .update({ status: 'achieved', updated_at: new Date().toISOString() })
      .eq('id', goalId);

    if (error) {
      toast.error('שגיאה בעדכון היעד');
    } else {
      toast.success('מעולה! היעד הושג!');
      loadGoals();
    }
  };

  const handleUpdateProgress = async (goalId: string, newValue: string) => {
    const value = parseFloat(newValue);
    if (isNaN(value)) return;

    const { error } = await supabase
      .from('trainee_goals')
      .update({ current_value: value, updated_at: new Date().toISOString() })
      .eq('id', goalId);

    if (error) {
      toast.error('שגיאה בעדכון ההתקדמות');
    } else {
      loadGoals();
    }
  };

  const filteredGoals = goals.filter(g => {
    if (filter === 'all') return true;
    if (filter === 'active') return g.status === 'active';
    return g.status === 'achieved';
  });

  const getProgress = (goal: Goal) => {
    if (!goal.target_value || !goal.current_value) return 0;
    const isDecreasing = goal.goal_type === 'weight';
    if (isDecreasing) {
      const startValue = goal.current_value + (goal.target_value - goal.current_value);
      return Math.min(100, Math.max(0, ((startValue - goal.current_value) / (startValue - goal.target_value)) * 100));
    }
    return Math.min(100, (goal.current_value / goal.target_value) * 100);
  };

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'weight': return <TrendingUp className="w-5 h-5" />;
      case 'strength': return <Dumbbell className="w-5 h-5" />;
      case 'measurement': return <Target className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getGoalTypeStyles = (type: string) => {
    switch (type) {
      case 'weight': return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'strength': return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' };
      case 'measurement': return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
      default: return { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' };
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="premium-card-static max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/15">
              <Target className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">יעדים אישיים</h2>
              <p className="text-sm text-zinc-500">{traineeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            {[
              { id: 'active', label: 'פעילים' },
              { id: 'achieved', label: 'הושגו' },
              { id: 'all', label: 'הכל' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  filter === f.id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800/50 text-zinc-400 hover:text-white border border-zinc-700/30'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 btn-primary text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            יעד חדש
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-zinc-500">אין יעדים להצגה</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
              >
                הוסף יעד ראשון
              </button>
            </div>
          ) : (
            filteredGoals.map(goal => {
              const progress = getProgress(goal);
              const styles = getGoalTypeStyles(goal.goal_type);
              return (
                <div
                  key={goal.id}
                  className={`bg-zinc-800/30 rounded-xl border p-5 transition-all ${
                    goal.status === 'achieved' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-zinc-700/30 hover:border-zinc-600/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${styles.bg} flex items-center justify-center ${styles.text}`}>
                        {goal.status === 'achieved' ? <Trophy className="w-6 h-6 text-yellow-400" /> : getGoalTypeIcon(goal.goal_type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{goal.title}</h3>
                        {goal.target_date && (
                          <p className="text-sm text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            יעד: {new Date(goal.target_date).toLocaleDateString('he-IL')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {goal.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleMarkAchieved(goal.id)}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                            title="סמן כהושג"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(goal)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {goal.target_value && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-zinc-500">התקדמות</span>
                        <span className="font-semibold text-white">
                          {goal.current_value || 0} / {goal.target_value} {goal.unit}
                        </span>
                      </div>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            goal.status === 'achieved'
                              ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {goal.status === 'active' && (
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="עדכן התקדמות"
                            className="flex-1 glass-input px-3 py-2 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateProgress(goal.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                          <span className="text-sm text-zinc-500">{goal.unit}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {goal.notes && (
                    <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30">{goal.notes}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {showAddForm && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="premium-card-static max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                {editingGoal ? 'עריכת יעד' : 'יעד חדש'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">סוג יעד</label>
                  <select
                    value={formData.goal_type}
                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value as Goal['goal_type'] })}
                    className="w-full glass-input px-4 py-3"
                  >
                    <option value="weight">משקל</option>
                    <option value="strength">כוח (תרגיל)</option>
                    <option value="measurement">מידה</option>
                    <option value="custom">אחר</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">כותרת *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full glass-input px-4 py-3"
                    placeholder="למשל: ירידה ל-75 ק״ג"
                    required
                  />
                </div>

                {formData.goal_type === 'strength' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">תרגיל</label>
                    <select
                      value={formData.exercise_id}
                      onChange={(e) => setFormData({ ...formData, exercise_id: e.target.value })}
                      className="w-full glass-input px-4 py-3"
                    >
                      <option value="">בחר תרגיל</option>
                      {exercises.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">ערך נוכחי</label>
                    <input
                      type="number"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                      className="w-full glass-input px-4 py-3"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">ערך יעד</label>
                    <input
                      type="number"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      className="w-full glass-input px-4 py-3"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">יחידת מדידה</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full glass-input px-4 py-3"
                      placeholder='ק"ג / ס"מ / חזרות'
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">תאריך יעד</label>
                    <input
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                      className="w-full glass-input px-4 py-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">הערות</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full glass-input px-4 py-3"
                    rows={2}
                    placeholder="הערות נוספות..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 btn-primary px-6 py-3 font-semibold"
                  >
                    {editingGoal ? 'עדכן' : 'הוסף'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 btn-secondary px-6 py-3 font-semibold"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="p-6 border-t border-zinc-800/50">
          <button
            onClick={onClose}
            className="w-full btn-primary px-6 py-4 text-lg font-bold"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
