import { useState, useEffect } from 'react';
import { ClipboardList, Plus, CheckCircle2, X, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { tasksApi, WeeklyTask } from '../../../api/tasksApi';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { EmptyState } from '../../common/EmptyState';
import { logger } from '../../../utils/logger';

interface WeeklyTasksManagerProps {
  traineeId: string;
  traineeName: string;
  onBack?: () => void;
}

export default function WeeklyTasksManager({
  traineeId,
  traineeName,
  onBack,
}: WeeklyTasksManagerProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart());

  const [newTask, setNewTask] = useState({
    task_title: '',
    task_description: '',
    task_type: 'custom' as 'workout_focus' | 'nutrition' | 'habit' | 'measurement' | 'custom',
    priority: 'medium' as 'low' | 'medium' | 'high',
    week_start_date: selectedWeek,
    week_end_date: getWeekEnd(selectedWeek),
  });

  useEffect(() => {
    if (user && traineeId) {
      loadTasks();
    }
  }, [user, traineeId, selectedWeek]);

  function getCurrentWeekStart(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek.toISOString().split('T')[0];
  }

  function getWeekEnd(weekStart: string): string {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
  }

  const loadTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await tasksApi.getTraineeTasks(traineeId, selectedWeek);
      setTasks(data);
    } catch (error) {
      logger.error('Error loading tasks', error, 'WeeklyTasksManager');
      toast.error('שגיאה בטעינת משימות');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!user || !newTask.task_title.trim()) {
      toast.error('נא להזין כותרת למשימה');
      return;
    }

    try {
      await tasksApi.createTask({
        ...newTask,
        trainee_id: traineeId,
        trainer_id: user.id,
        week_end_date: getWeekEnd(newTask.week_start_date),
      });

      toast.success('המשימה נוספה בהצלחה');
      setShowAddForm(false);
      setNewTask({
        task_title: '',
        task_description: '',
        task_type: 'custom',
        priority: 'medium',
        week_start_date: selectedWeek,
        week_end_date: getWeekEnd(selectedWeek),
      });
      loadTasks();
    } catch (error) {
      logger.error('Error creating task', error, 'WeeklyTasksManager');
      toast.error('שגיאה ביצירת משימה');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await tasksApi.completeTask(taskId);
      toast.success('המשימה סומנה כמושלמת');
      loadTasks();
    } catch (error) {
      logger.error('Error completing task', error, 'WeeklyTasksManager');
      toast.error('שגיאה בסימון משימה');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) return;

    try {
      await tasksApi.deleteTask(taskId);
      toast.success('המשימה נמחקה בהצלחה');
      loadTasks();
    } catch (error) {
      logger.error('Error deleting task', error, 'WeeklyTasksManager');
      toast.error('שגיאה במחיקת משימה');
    }
  };

  const getTaskTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      workout_focus: 'פוקוס אימון',
      nutrition: 'תזונה',
      habit: 'הרגל',
      measurement: 'מדידה',
      custom: 'מותאם',
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      high: 'text-red-400 bg-red-500/10 border-red-500/30',
      medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentWeekTasks = tasks.filter(t => t.week_start_date === selectedWeek);
  const completedTasks = currentWeekTasks.filter(t => t.is_completed);
  const pendingTasks = currentWeekTasks.filter(t => !t.is_completed);

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה לפרופיל המתאמן</span>
        </button>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-400" />
            משימות שבועיות - {traineeName}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {completedTasks.length} מתוך {currentWeekTasks.length} הושלמו השבוע
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="week"
            value={`${selectedWeek}T00:00`}
            onChange={(e) => {
              const weekStart = e.target.value.split('T')[0];
              setSelectedWeek(weekStart);
            }}
            className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
          />
          <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            משימה חדשה
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="p-5 border border-emerald-500/30">
          <h3 className="font-semibold text-white mb-4">משימה חדשה</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">כותרת</label>
              <input
                type="text"
                value={newTask.task_title}
                onChange={(e) => setNewTask({ ...newTask, task_title: e.target.value })}
                placeholder="לדוגמה: להתמקד בסקוואט השבוע"
                className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">תיאור</label>
              <textarea
                value={newTask.task_description}
                onChange={(e) => setNewTask({ ...newTask, task_description: e.target.value })}
                placeholder="פרטים נוספים על המשימה..."
                rows={3}
                className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">סוג</label>
                <select
                  value={newTask.task_type}
                  onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                >
                  <option value="workout_focus">פוקוס אימון</option>
                  <option value="nutrition">תזונה</option>
                  <option value="habit">הרגל</option>
                  <option value="measurement">מדידה</option>
                  <option value="custom">מותאם</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">עדיפות</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                >
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTask} className="flex-1">
                שמור
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTask({
                    task_title: '',
                    task_description: '',
                    task_type: 'custom',
                    priority: 'medium',
                    week_start_date: selectedWeek,
                    week_end_date: getWeekEnd(selectedWeek),
                  });
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        </Card>
      )}

      {pendingTasks.length === 0 && completedTasks.length === 0 && !showAddForm ? (
        <EmptyState
          icon={ClipboardList}
          title="אין משימות השבוע"
          description="הוסף משימה שבועית למתאמן"
          action={{
            label: 'הוסף משימה',
            onClick: () => setShowAddForm(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {pendingTasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                משימות ממתינות ({pendingTasks.length})
              </h3>
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <Card
                    key={task.id}
                    className={`p-5 border ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-white">{task.task_title}</h4>
                          <span className="text-xs px-2 py-1 rounded-lg bg-opacity-20">
                            {getTaskTypeLabel(task.task_type)}
                          </span>
                        </div>
                        {task.task_description && (
                          <p className="text-sm text-gray-400 mb-2">{task.task_description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(task.week_start_date).toLocaleDateString('he-IL')} -{' '}
                              {new Date(task.week_end_date).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleCompleteTask(task.id)}
                          className="px-3 py-1.5 text-sm"
                        >
                          סיים
                        </Button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                משימות שהושלמו ({completedTasks.length})
              </h3>
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="p-5 bg-emerald-500/10 border-emerald-500/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-white line-through">
                            {task.task_title}
                          </h4>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        {task.completion_notes && (
                          <p className="text-sm text-gray-400 mb-2">{task.completion_notes}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          הושלם ב-{' '}
                          {task.completed_at
                            ? new Date(task.completed_at).toLocaleDateString('he-IL')
                            : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
