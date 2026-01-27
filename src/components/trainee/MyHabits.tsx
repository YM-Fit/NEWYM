import { useState, useEffect } from 'react';
import { Flame, Plus, CheckCircle2, X, Calendar, TrendingUp } from 'lucide-react';
import { habitsApi, TraineeHabit, HabitLog } from '../../api/habitsApi';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import toast from 'react-hot-toast';
import { EmptyState } from '../common/EmptyState';
import { logger } from '../../utils/logger';

interface MyHabitsProps {
  traineeId: string;
}

export default function MyHabits({ traineeId }: MyHabitsProps) {
  const [habits, setHabits] = useState<TraineeHabit[]>([]);
  const [habitLogs, setHabitLogs] = useState<Map<string, HabitLog[]>>(new Map());
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHabit, setNewHabit] = useState({
    habit_name: '',
    habit_type: 'custom' as 'water' | 'steps' | 'sleep' | 'nutrition' | 'custom',
    target_value: '',
    unit: '',
  });
  const [todayLogs, setTodayLogs] = useState<Map<string, HabitLog>>(new Map());
  const [inputValues, setInputValues] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadHabits();
  }, [traineeId]);

  useEffect(() => {
    if (habits.length > 0) {
      loadTodayLogs();
      loadStreaks();
    }
  }, [habits]);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await habitsApi.getTraineeHabits(traineeId);
      setHabits(data);
      
      // Load logs for each habit
      const logsMap = new Map<string, HabitLog[]>();
      for (const habit of data) {
        const logs = await habitsApi.getHabitLogs(habit.id);
        logsMap.set(habit.id, logs);
      }
      setHabitLogs(logsMap);
    } catch (error) {
      logger.error('Error loading habits', error, 'MyHabits');
      toast.error('שגיאה בטעינת הרגלים');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayLogs = async () => {
    const today = new Date().toISOString().split('T')[0];
    const todayMap = new Map<string, HabitLog>();
    
    for (const habit of habits) {
      const logs = habitLogs.get(habit.id) || [];
      const todayLog = logs.find(log => log.log_date === today);
      if (todayLog) {
        todayMap.set(habit.id, todayLog);
      }
    }
    
    setTodayLogs(todayMap);
  };

  const loadStreaks = async () => {
    const streaksMap = new Map<string, number>();
    for (const habit of habits) {
      const streak = await habitsApi.getHabitStreak(habit.id);
      streaksMap.set(habit.id, streak);
    }
    setStreaks(streaksMap);
  };

  const handleAddHabit = async () => {
    if (!newHabit.habit_name.trim()) {
      toast.error('נא להזין שם להרגל');
      return;
    }

    try {
      await habitsApi.createHabit({
        trainee_id: traineeId,
        habit_name: newHabit.habit_name,
        habit_type: newHabit.habit_type,
        target_value: newHabit.target_value ? parseFloat(newHabit.target_value) : null,
        unit: newHabit.unit || null,
      });

      toast.success('ההרגל נוסף בהצלחה');
      setShowAddForm(false);
      setNewHabit({
        habit_name: '',
        habit_type: 'custom',
        target_value: '',
        unit: '',
      });
      loadHabits();
    } catch (error) {
      logger.error('Error creating habit', error, 'MyHabits');
      toast.error('שגיאה ביצירת הרגל');
    }
  };

  const handleLogHabit = async (habitId: string, value: number) => {
    if (isNaN(value) || value <= 0) {
      toast.error('נא להזין ערך תקין');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      await habitsApi.logHabit({
        habit_id: habitId,
        log_date: today,
        actual_value: value,
      });

      toast.success('ההרגל נרשם בהצלחה');
      setInputValues(prev => {
        const next = new Map(prev);
        next.set(habitId, '');
        return next;
      });
      loadHabits();
    } catch (error) {
      logger.error('Error logging habit', error, 'MyHabits');
      toast.error('שגיאה ברישום הרגל');
    }
  };

  const handleInputChange = (habitId: string, value: string) => {
    setInputValues(prev => {
      const next = new Map(prev);
      next.set(habitId, value);
      return next;
    });
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק הרגל זה?')) return;

    try {
      await habitsApi.deleteHabit(habitId);
      toast.success('ההרגל נמחק בהצלחה');
      loadHabits();
    } catch (error) {
      logger.error('Error deleting habit', error, 'MyHabits');
      toast.error('שגיאה במחיקת הרגל');
    }
  };

  const getHabitTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      water: 'מים',
      steps: 'צעדים',
      sleep: 'שינה',
      nutrition: 'תזונה',
      custom: 'מותאם',
    };
    return labels[type] || type;
  };

  const getDefaultUnit = (type: string): string => {
    const units: Record<string, string> = {
      water: 'ליטר',
      steps: 'צעדים',
      sleep: 'שעות',
      nutrition: 'פעמים',
      custom: '',
    };
    return units[type] || '';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-400" />
            ההרגלים שלי
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {habits.length} הרגלים פעילים
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הרגל חדש
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-5 border border-amber-500/30">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">הרגל חדש</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                סוג הרגל
              </label>
              <select
                value={newHabit.habit_type}
                onChange={(e) => {
                  const type = e.target.value as any;
                  setNewHabit({
                    ...newHabit,
                    habit_type: type,
                    unit: getDefaultUnit(type),
                  });
                }}
                className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
              >
                <option value="water">מים</option>
                <option value="steps">צעדים</option>
                <option value="sleep">שינה</option>
                <option value="nutrition">תזונה</option>
                <option value="custom">מותאם אישית</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                שם ההרגל
              </label>
              <input
                type="text"
                value={newHabit.habit_name}
                onChange={(e) => setNewHabit({ ...newHabit, habit_name: e.target.value })}
                placeholder="לדוגמה: שתיית מים יומית"
                className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  יעד יומי
                </label>
                <input
                  type="number"
                  value={newHabit.target_value}
                  onChange={(e) => setNewHabit({ ...newHabit, target_value: e.target.value })}
                  placeholder="2.5"
                  className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  יחידה
                </label>
                <input
                  type="text"
                  value={newHabit.unit}
                  onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                  placeholder={getDefaultUnit(newHabit.habit_type)}
                  className="w-full px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddHabit} className="flex-1">
                שמור
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setNewHabit({
                    habit_name: '',
                    habit_type: 'custom',
                    target_value: '',
                    unit: '',
                  });
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        </Card>
      )}

      {habits.length === 0 && !showAddForm ? (
        <EmptyState
          icon={Flame}
          title="אין הרגלים פעילים"
          description="הוסף הרגל חדש כדי להתחיל לעקוב אחר ההתקדמות היומית שלך"
          action={{
            label: 'הוסף הרגל',
            onClick: () => setShowAddForm(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => {
            const todayLog = todayLogs.get(habit.id);
            const streak = streaks.get(habit.id) || 0;
            const logs = habitLogs.get(habit.id) || [];
            const thisWeekLogs = logs.filter(log => {
              const logDate = new Date(log.log_date);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return logDate >= weekAgo;
            });

            return (
              <Card key={habit.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">
                        {habit.habit_name}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-lg text-amber-400 bg-amber-500/10">
                        {getHabitTypeLabel(habit.habit_type)}
                      </span>
                    </div>
                    {habit.target_value && (
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        יעד יומי: {habit.target_value} {habit.unit || ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="p-2 text-muted400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">
                      {streak} ימים רצופים
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{thisWeekLogs.length} מתוך 7 ימים השבוע</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={`הזן ${habit.unit || 'ערך'}`}
                    value={inputValues.get(habit.id) || (todayLog?.actual_value?.toString() || '')}
                    onChange={(e) => handleInputChange(habit.id, e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const value = parseFloat((e.target as HTMLInputElement).value);
                        if (!isNaN(value) && value > 0) {
                          handleLogHabit(habit.id, value);
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const value = parseFloat(inputValues.get(habit.id) || '0');
                      if (!isNaN(value) && value > 0) {
                        handleLogHabit(habit.id, value);
                      } else {
                        toast.error('נא להזין ערך תקין');
                      }
                    }}
                    className="px-4"
                  >
                    שמור
                  </Button>
                </div>

                {todayLog && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      היום: <span className="font-semibold text-emerald-400">
                        {todayLog.actual_value} {habit.unit || ''}
                      </span>
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
