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

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'weight': return 'from-emerald-500 to-teal-500';
      case 'strength': return 'from-blue-500 to-cyan-500';
      case 'measurement': return 'from-amber-500 to-orange-500';
      default: return 'from-gray-500 to-zinc-500';
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Target className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">יעדים אישיים</h2>
              <p className="text-sm text-emerald-100">{traineeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 hover:scale-105"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex gap-2">
            {[
              { id: 'active', label: 'פעילים' },
              { id: 'achieved', label: 'הושגו' },
              { id: 'all', label: 'הכל' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  filter === f.id
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            יעד חדש
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">אין יעדים להצגה</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-emerald-600 font-semibold hover:text-emerald-700"
              >
                הוסף יעד ראשון
              </button>
            </div>
          ) : (
            filteredGoals.map(goal => {
              const progress = getProgress(goal);
              return (
                <div
                  key={goal.id}
                  className={`bg-white rounded-xl border-2 p-5 transition-all duration-300 ${
                    goal.status === 'achieved' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGoalTypeColor(goal.goal_type)} flex items-center justify-center text-white`}>
                        {goal.status === 'achieved' ? <Trophy className="w-6 h-6" /> : getGoalTypeIcon(goal.goal_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{goal.title}</h3>
                        {goal.target_date && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            יעד: {new Date(goal.target_date).toLocaleDateString('he-IL')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {goal.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleMarkAchieved(goal.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="סמן כהושג"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(goal)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {goal.target_value && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">התקדמות</span>
                        <span className="font-bold text-gray-900">
                          {goal.current_value || 0} / {goal.target_value} {goal.unit}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            goal.status === 'achieved'
                              ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                              : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {goal.status === 'active' && (
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="עדכן התקדמות"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateProgress(goal.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                          <span className="text-sm text-gray-500">{goal.unit}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {goal.notes && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{goal.notes}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {showAddForm && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingGoal ? 'עריכת יעד' : 'יעד חדש'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">סוג יעד</label>
                  <select
                    value={formData.goal_type}
                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value as Goal['goal_type'] })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="weight">משקל</option>
                    <option value="strength">כוח (תרגיל)</option>
                    <option value="measurement">מידה</option>
                    <option value="custom">אחר</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">כותרת *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="למשל: ירידה ל-75 ק״ג"
                    required
                  />
                </div>

                {formData.goal_type === 'strength' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">תרגיל</label>
                    <select
                      value={formData.exercise_id}
                      onChange={(e) => setFormData({ ...formData, exercise_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ערך נוכחי</label>
                    <input
                      type="number"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ערך יעד</label>
                    <input
                      type="number"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">יחידת מדידה</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder='ק"ג / ס"מ / חזרות'
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך יעד</label>
                    <input
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">הערות</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows={2}
                    placeholder="הערות נוספות..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                  >
                    {editingGoal ? 'עדכן' : 'הוסף'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
