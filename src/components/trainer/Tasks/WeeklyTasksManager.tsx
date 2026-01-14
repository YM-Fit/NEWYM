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

// Get Monday of current week (ISO 8601 week start)
function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay() || 7; // Convert Sunday (0) to 7
  const daysToMonday = dayOfWeek - 1; // Monday is day 1
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Return in YYYY-MM-DD format using local date to avoid timezone issues
  const year = startOfWeek.getFullYear();
  const month = (startOfWeek.getMonth() + 1).toString().padStart(2, '0');
  const day = startOfWeek.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekEnd(weekStart: string): string {
  const [yearStr, monthStr, dayStr] = weekStart.split('-');
  const start = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  // Return in YYYY-MM-DD format using local date
  const year = end.getFullYear();
  const month = (end.getMonth() + 1).toString().padStart(2, '0');
  const day = end.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
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


  // Convert date (YYYY-MM-DD) to week format (YYYY-Www) - ISO 8601 week
  // ISO 8601: Week starts on Monday, week 1 contains January 4th
  // Note: date should already be a Monday date (from selectedWeek)
  function dateToWeekFormat(date: string): string {
    // Parse date and ensure it's treated as UTC to avoid timezone issues
    const [yearStr, monthStr, dayStr] = date.split('-');
    const dateObj = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10)));
    
    // Ensure we're working with Monday (convert if needed)
    const dayOfWeek = dateObj.getUTCDay() || 7;
    const daysToMonday = dayOfWeek - 1;
    const monday = new Date(dateObj);
    monday.setUTCDate(dateObj.getUTCDate() - daysToMonday);
    
    const year = monday.getUTCFullYear();
    
    // Find Monday of week containing January 4th (week 1)
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const daysToJan4Monday = jan4Day - 1;
    const jan4Monday = new Date(Date.UTC(year, 0, 4 - daysToJan4Monday));
    
    // Calculate week number
    const daysDiff = Math.floor((monday.getTime() - jan4Monday.getTime()) / (24 * 60 * 60 * 1000));
    let weekNumber = Math.floor(daysDiff / 7) + 1;
    let resultYear = year;
    
    // Handle year boundaries
    if (weekNumber < 1) {
      // Week belongs to previous year
      resultYear = year - 1;
      const prevJan4 = new Date(Date.UTC(resultYear, 0, 4));
      const prevJan4Day = prevJan4.getUTCDay() || 7;
      const prevJan4Monday = new Date(Date.UTC(resultYear, 0, 4 - (prevJan4Day - 1)));
      const prevDaysDiff = Math.floor((monday.getTime() - prevJan4Monday.getTime()) / (24 * 60 * 60 * 1000));
      weekNumber = Math.floor(prevDaysDiff / 7) + 1;
    } else if (weekNumber >= 53) {
      // Check if week 53 exists or if it's week 1 of next year
      const nextJan4 = new Date(Date.UTC(year + 1, 0, 4));
      const nextJan4Day = nextJan4.getUTCDay() || 7;
      const nextJan4Monday = new Date(Date.UTC(year + 1, 0, 4 - (nextJan4Day - 1)));
      if (monday.getTime() >= nextJan4Monday.getTime()) {
        resultYear = year + 1;
        weekNumber = 1;
      }
    }
    
    return `${resultYear}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  // Convert week format (YYYY-Www) to date (YYYY-MM-DD) - returns Monday of that week (ISO 8601)
  function weekFormatToDate(weekStr: string): string {
    const [yearStr, weekNumStr] = weekStr.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekNumStr, 10);
    
    // Get January 4th of the year (always in week 1 per ISO 8601)
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7; // Convert Sunday (0) to 7
    // Calculate days to go back to Monday (Monday is day 1, so subtract 1)
    const daysToMonday = jan4Day - 1;
    // Calculate week 1 Monday using UTC to avoid timezone issues
    const week1Monday = new Date(Date.UTC(year, 0, 4 - daysToMonday));
    
    // Add weeks (week 1 starts at week1Monday)
    const weekStart = new Date(week1Monday);
    weekStart.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
    
    // Return in YYYY-MM-DD format
    const yearStr2 = weekStart.getUTCFullYear().toString();
    const monthStr = (weekStart.getUTCMonth() + 1).toString().padStart(2, '0');
    const dayStr = weekStart.getUTCDate().toString().padStart(2, '0');
    return `${yearStr2}-${monthStr}-${dayStr}`;
  }

  const loadTasks = async () => {
    if (!user) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1dd5cb88-736d-47fc-9cba-353896e5dc1e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'WeeklyTasksManager.tsx:60',
        message: 'loadTasks entry',
        data: { traineeId, selectedWeek },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'WT1',
      }),
    }).catch(() => {});
    // #endregion

    try {
      setLoading(true);
      const data = await tasksApi.getTraineeTasks(traineeId, selectedWeek);
      setTasks(data);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1dd5cb88-736d-47fc-9cba-353896e5dc1e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'WeeklyTasksManager.tsx:66',
          message: 'loadTasks success',
          data: { tasksCount: data.length },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'WT1',
        }),
      }).catch(() => {});
      // #endregion
    } catch (error) {
      logger.error('Error loading tasks', error, 'WeeklyTasksManager');
      const errorMessage = error instanceof Error ? error.message : 'שגיאה בטעינת משימות';
      if (errorMessage.includes('לא קיימת במסד הנתונים')) {
        toast.error('טבלת המשימות השבועיות לא קיימת. יש להריץ את המיגרציה במסד הנתונים.', {
          duration: 6000,
        });
      } else {
        toast.error('שגיאה בטעינת משימות');
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1dd5cb88-736d-47fc-9cba-353896e5dc1e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'WeeklyTasksManager.tsx:75',
          message: 'loadTasks error',
          data: { errorMessage },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'WT1',
        }),
      }).catch(() => {});
      // #endregion
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!user || !newTask.task_title.trim()) {
      toast.error('נא להזין כותרת למשימה');
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1dd5cb88-736d-47fc-9cba-353896e5dc1e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'WeeklyTasksManager.tsx:82',
        message: 'handleAddTask entry',
        data: { traineeId, selectedWeek, title: newTask.task_title },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'WT2',
      }),
    }).catch(() => {});
    // #endregion

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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1dd5cb88-736d-47fc-9cba-353896e5dc1e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'WeeklyTasksManager.tsx:108',
          message: 'handleAddTask error',
          data: {},
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'WT2',
        }),
      }).catch(() => {});
      // #endregion
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
            value={dateToWeekFormat(selectedWeek)}
            onChange={(e) => {
              const weekValue = e.target.value;
              if (weekValue) {
                const weekStart = weekFormatToDate(weekValue);
                setSelectedWeek(weekStart);
              }
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
