import { useState, useEffect } from 'react';
import { Target, Plus, CheckCircle2, X, TrendingUp, Calendar } from 'lucide-react';
import { goalsApi, TraineeGoal } from '../../api/goalsApi';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import toast from 'react-hot-toast';
import { EmptyState } from '../common/EmptyState';

interface MyGoalsProps {
  traineeId: string;
}

export default function MyGoals({ traineeId }: MyGoalsProps) {
  const [goals, setGoals] = useState<TraineeGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: 'custom' as 'weight' | 'strength' | 'measurement' | 'custom',
    title: '',
    target_value: '',
    unit: '',
    target_date: '',
  });

  useEffect(() => {
    loadGoals();
  }, [traineeId]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await goalsApi.getTraineeGoals(traineeId);
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('שגיאה בטעינת יעדים');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.title.trim()) {
      toast.error('נא להזין כותרת ליעד');
      return;
    }

    try {
      await goalsApi.createGoal({
        trainee_id: traineeId,
        goal_type: newGoal.goal_type,
        title: newGoal.title,
        target_value: newGoal.target_value ? parseFloat(newGoal.target_value) : null,
        unit: newGoal.unit || null,
        target_date: newGoal.target_date || null,
      });

      toast.success('היעד נוסף בהצלחה');
      setShowAddForm(false);
      setNewGoal({
        goal_type: 'custom',
        title: '',
        target_value: '',
        unit: '',
        target_date: '',
      });
      loadGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('שגיאה ביצירת יעד');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק יעד זה?')) return;

    try {
      await goalsApi.deleteGoal(goalId);
      toast.success('היעד נמחק בהצלחה');
      loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('שגיאה במחיקת יעד');
    }
  };

  const getGoalProgress = (goal: TraineeGoal): number => {
    if (!goal.target_value || !goal.current_value) return 0;
    return Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100);
  };

  const getGoalStatusColor = (goal: TraineeGoal): string => {
    if (goal.status === 'achieved') return 'text-emerald-400';
    if (goal.status === 'cancelled') return 'text-gray-500';
    
    const progress = getGoalProgress(goal);
    if (progress >= 100) return 'text-emerald-400';
    if (progress >= 50) return 'text-amber-400';
    return 'text-blue-400';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  const achievedGoals = goals.filter(g => g.status === 'achieved');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-400" />
            היעדים שלי
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {activeGoals.length} יעדים פעילים • {achievedGoals.length} הושגו
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          יעד חדש
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-5 border border-emerald-500/30">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">יעד חדש</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                סוג יעד
              </label>
              <select
                value={newGoal.goal_type}
                onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value as any })}
                className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
              >
                <option value="custom">מותאם אישית</option>
                <option value="weight">משקל</option>
                <option value="strength">כוח</option>
                <option value="measurement">היקפים</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                כותרת
              </label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="לדוגמה: להגיע ל-80 ק״ג"
                className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  יעד
                </label>
                <input
                  type="number"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                  placeholder="80"
                  className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  יחידה
                </label>
                <input
                  type="text"
                  value={newGoal.unit}
                  onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                  placeholder="ק״ג"
                  className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                תאריך יעד
              </label>
              <input
                type="date"
                value={newGoal.target_date}
                onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddGoal} className="flex-1">
                שמור
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setNewGoal({
                    goal_type: 'custom',
                    title: '',
                    target_value: '',
                    unit: '',
                    target_date: '',
                  });
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeGoals.length === 0 && !showAddForm ? (
        <EmptyState
          icon={Target}
          title="אין יעדים פעילים"
          description="הוסף יעד חדש כדי להתחיל לעקוב אחר ההתקדמות שלך"
          action={{
            label: 'הוסף יעד',
            onClick: () => setShowAddForm(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {activeGoals.map((goal) => {
            const progress = getGoalProgress(goal);
            return (
              <Card key={goal.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">
                        {goal.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-lg ${getGoalStatusColor(goal)} bg-opacity-10`}>
                        {goal.goal_type === 'weight' ? 'משקל' :
                         goal.goal_type === 'strength' ? 'כוח' :
                         goal.goal_type === 'measurement' ? 'היקפים' : 'מותאם'}
                      </span>
                    </div>
                    {goal.target_value && (
                      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <span>
                          {goal.current_value || 0} {goal.unit || ''}
                        </span>
                        <span>/</span>
                        <span className="font-semibold">
                          {goal.target_value} {goal.unit || ''}
                        </span>
                        {goal.target_date && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(goal.target_date).toLocaleDateString('he-IL')}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {goal.target_value && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-1">
                      <span>התקדמות</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          progress >= 100 ? 'bg-emerald-500' :
                          progress >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {achievedGoals.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            יעדים שהושגו
          </h3>
          <div className="space-y-3">
            {achievedGoals.map((goal) => (
              <Card key={goal.id} className="p-4 bg-emerald-500/10 border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">{goal.title}</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      הושג ב-{new Date(goal.updated_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
