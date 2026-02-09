import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRight, Activity, TrendingUp, Calendar, Target, BarChart3, Plus, Edit2, Trash2, Save, X, Footprints, Loader2, Flame } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { cardioApi, type CardioActivity, type CardioType, type CardioStats } from '../../../api/cardioApi';
import { logger } from '../../../utils/logger';

interface CardioManagerProps {
  traineeId: string;
  trainerId: string;
  traineeName: string;
  onBack: () => void;
}

export default function CardioManager({ traineeId, trainerId, traineeName, onBack }: CardioManagerProps) {
  const [activities, setActivities] = useState<CardioActivity[]>([]);
  const [cardioTypes, setCardioTypes] = useState<CardioType[]>([]);
  const [stats, setStats] = useState<CardioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CardioActivity | null>(null);
  const [newCardioType, setNewCardioType] = useState('');
  const [showNewType, setShowNewType] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cardio_type_id: '',
    date: new Date().toISOString().split('T')[0],
    avg_weekly_steps: 0,
    distance: 0,
    duration: 0,
    frequency: 0,
    weekly_goal_steps: 0,
    notes: ''
  });

  const loadActivities = useCallback(async () => {
    try {
      const data = await cardioApi.getTraineeActivities(traineeId);
      setActivities(data);
    } catch (error: any) {
      logger.error('Error loading activities', error, 'CardioManager');
      toast.error(error.message || 'שגיאה בטעינת פעילויות');
    }
  }, [traineeId]);

  const loadCardioTypes = useCallback(async () => {
    try {
      const data = await cardioApi.getCardioTypes(trainerId);
      setCardioTypes(data);
    } catch (error: any) {
      logger.error('Error loading cardio types', error, 'CardioManager');
      toast.error(error.message || 'שגיאה בטעינת סוגי אירובי');
    }
  }, [trainerId]);

  const loadStats = useCallback(async () => {
    try {
      const data = await cardioApi.getCardioStats(traineeId);
      setStats(data);
    } catch (error: any) {
      logger.error('Error loading stats', error, 'CardioManager');
    }
  }, [traineeId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadActivities(),
        loadCardioTypes(),
        loadStats()
      ]);
    } catch (error) {
      logger.error('Error loading data', error, 'CardioManager');
    } finally {
      setLoading(false);
    }
  }, [loadActivities, loadCardioTypes, loadStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddCardioType = useCallback(async () => {
    if (!newCardioType.trim()) {
      toast.error('נא להזין שם סוג אירובי');
      return;
    }

    try {
      const data = await cardioApi.createCardioType({
        trainer_id: trainerId,
        name: newCardioType.trim()
      });
      setCardioTypes(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, cardio_type_id: data.id }));
      setNewCardioType('');
      setShowNewType(false);
      toast.success('סוג אירובי נוסף בהצלחה');
    } catch (error: any) {
      logger.error('Error adding cardio type', error, 'CardioManager');
      toast.error(error.message || 'שגיאה בהוספת סוג אירובי');
    }
  }, [newCardioType, trainerId]);

  const resetForm = useCallback(() => {
    setFormData({
      cardio_type_id: '',
      date: new Date().toISOString().split('T')[0],
      avg_weekly_steps: 0,
      distance: 0,
      duration: 0,
      frequency: 0,
      weekly_goal_steps: 0,
      notes: ''
    });
    setEditingActivity(null);
    setShowAddForm(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.cardio_type_id) {
      toast.error('נא לבחור סוג אירובי');
      return;
    }

    if (saving) return;

    setSaving(true);
    try {
      if (editingActivity) {
        await cardioApi.updateActivity(editingActivity.id, {
          cardio_type_id: formData.cardio_type_id,
          date: formData.date,
          avg_weekly_steps: formData.avg_weekly_steps,
          distance: formData.distance,
          duration: formData.duration,
          frequency: formData.frequency,
          weekly_goal_steps: formData.weekly_goal_steps,
          notes: formData.notes || null
        });
        toast.success('פעילות עודכנה בהצלחה');
      } else {
        await cardioApi.createActivity({
          trainee_id: traineeId,
          trainer_id: trainerId,
          cardio_type_id: formData.cardio_type_id,
          date: formData.date,
          avg_weekly_steps: formData.avg_weekly_steps,
          distance: formData.distance,
          duration: formData.duration,
          frequency: formData.frequency,
          weekly_goal_steps: formData.weekly_goal_steps,
          notes: formData.notes || null
        });
        toast.success('פעילות נשמרה בהצלחה');
      }
      resetForm();
      await Promise.all([loadActivities(), loadStats()]);
    } catch (error: any) {
      logger.error('Error saving activity', error, 'CardioManager');
      toast.error(error.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }, [formData, editingActivity, traineeId, trainerId, saving, resetForm, loadActivities, loadStats]);

  const handleEdit = useCallback((activity: CardioActivity) => {
    setFormData({
      cardio_type_id: activity.cardio_type?.id || '',
      date: activity.date,
      avg_weekly_steps: activity.avg_weekly_steps,
      distance: activity.distance,
      duration: activity.duration,
      frequency: activity.frequency,
      weekly_goal_steps: activity.weekly_goal_steps,
      notes: activity.notes || ''
    });
    setEditingActivity(activity);
    setShowAddForm(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('האם למחוק את הפעילות?')) return;

    setDeletingId(id);
    try {
      await cardioApi.deleteActivity(id);
      toast.success('פעילות נמחקה בהצלחה');
      await Promise.all([loadActivities(), loadStats()]);
    } catch (error: any) {
      logger.error('Error deleting activity', error, 'CardioManager');
      toast.error(error.message || 'שגיאה במחיקה');
    } finally {
      setDeletingId(null);
    }
  }, [loadActivities, loadStats]);

  const latestActivity = useMemo(() => activities[0], [activities]);

  const chartData = useMemo(() => {
    return activities
      .slice(0, 12)
      .reverse()
      .map(a => ({
        date: new Date(a.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
        בוצע: a.avg_weekly_steps,
        יעד: a.weekly_goal_steps,
        achieved: a.weekly_goal_steps > 0 && a.avg_weekly_steps >= a.weekly_goal_steps
      }));
  }, [activities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-glow animate-pulse">
          <Activity className="w-8 h-8 text-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 text-muted hover:text-foreground hover:bg-surface rounded-xl transition-all border border-border"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-glow">
              <Activity className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">ניהול אירובי</h2>
              <p className="text-sm text-muted">{traineeName}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 text-foreground rounded-xl font-medium hover:from-sky-600 hover:to-sky-700 transition-all flex items-center gap-2 shadow-glow"
        >
          <Plus className="h-5 w-5" />
          הוסף פעילות
        </button>
      </div>

      {latestActivity && (
        <div className="premium-card-static p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-400" />
              תוכנית אירובי נוכחית
            </h3>
            <span className="text-sm text-muted">
              עדכון אחרון: {new Date(latestActivity.date).toLocaleDateString('he-IL')}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-card/50 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted">סוג אירובי</span>
              </div>
              <p className="text-lg font-bold text-foreground">{latestActivity.cardio_type?.name || 'לא זמין'}</p>
            </div>

            <div className="p-4 bg-card/50 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted">יעד צעדים שבועי</span>
              </div>
              <p className="text-lg font-bold text-emerald-400">{latestActivity.weekly_goal_steps.toLocaleString()}</p>
            </div>

            <div className="p-4 bg-card/50 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted">ביצוע בפועל</span>
              </div>
              <p className="text-lg font-bold text-amber-400">{latestActivity.avg_weekly_steps.toLocaleString()}</p>
            </div>

            <div className="p-4 bg-card/50 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted">אחוז עמידה ביעד</span>
              </div>
              <p className={`text-lg font-bold ${
                latestActivity.avg_weekly_steps >= latestActivity.weekly_goal_steps
                  ? 'text-emerald-400'
                  : latestActivity.avg_weekly_steps >= latestActivity.weekly_goal_steps * 0.8
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}>
                {latestActivity.weekly_goal_steps > 0
                  ? Math.round((latestActivity.avg_weekly_steps / latestActivity.weekly_goal_steps) * 100)
                  : 0}%
              </p>
            </div>
          </div>

          {(latestActivity.duration > 0 || latestActivity.distance > 0 || latestActivity.frequency > 0) && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              {latestActivity.frequency > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted mb-1">תדירות שבועית</p>
                  <p className="text-lg font-semibold text-foreground">{latestActivity.frequency}x</p>
                </div>
              )}
              {latestActivity.duration > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted mb-1">משך זמן</p>
                  <p className="text-lg font-semibold text-foreground">{latestActivity.duration} דק'</p>
                </div>
              )}
              {latestActivity.distance > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted mb-1">מרחק</p>
                  <p className="text-lg font-semibold text-foreground">{latestActivity.distance} ק"מ</p>
                </div>
              )}
            </div>
          )}

          {latestActivity.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted">{latestActivity.notes}</p>
            </div>
          )}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card p-5 bg-gradient-to-br from-sky-500/20 to-sky-500/5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-muted mb-1">ממוצע צעדים</p>
                <p className="text-2xl font-bold text-sky-400">{stats.avgSteps.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-sky-500/20">
                <Footprints className="h-4 w-4 text-sky-400" />
              </div>
            </div>
            {stats.stepsChange !== 0 && (
              <p className={`text-xs ${stats.stepsChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.stepsChange > 0 ? '+' : ''}{stats.stepsChange.toLocaleString()} מהפעם הקודמת
              </p>
            )}
          </div>

          <div className="stat-card p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-muted mb-1">עמידה ביעד</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.goalProgress}%</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-xs text-muted mt-1">אחוז הצלחה: {stats.successRate}%</p>
          </div>

          <div className="stat-card p-5 bg-gradient-to-br from-amber-500/20 to-amber-500/5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-muted mb-1">יעד ממוצע</p>
                <p className="text-2xl font-bold text-amber-400">{stats.avgGoal.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/20">
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="stat-card p-5 bg-gradient-to-br from-blue-500/20 to-blue-500/5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-muted mb-1">רצף נוכחי</p>
                <p className="text-2xl font-bold text-blue-400 flex items-center gap-1">
                  {stats.currentStreak}
                  {stats.currentStreak > 0 && <Flame className="h-5 w-5 text-orange-400" />}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Calendar className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            {stats.longestStreak > stats.currentStreak && (
              <p className="text-xs text-muted mt-1">שיא: {stats.longestStreak} שבועות</p>
            )}
          </div>
        </div>
      )}

      {activities.length >= 2 && (
        <div className="premium-card-static p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            גרף התקדמות - יעד מול ביצוע
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#3f3f46" 
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  style={{ fontSize: '12px' }}
                  tickLine={false}
                  axisLine={{ stroke: '#3f3f46', strokeOpacity: 0.5 }}
                  tick={{ fill: '#a1a1aa' }}
                />
                <YAxis 
                  stroke="#71717a" 
                  style={{ fontSize: '12px' }}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#a1a1aa' }}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(63, 63, 70, 0.5)',
                    borderRadius: '12px',
                    color: '#fff',
                    padding: '12px'
                  }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="יעד" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
                <Bar 
                  dataKey="בוצע" 
                  radius={[6, 6, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.achieved ? '#3b82f6' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="premium-card-static p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-sky-400" />
          היסטוריית פעילות
        </h3>

        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted mx-auto mb-3" />
            <p className="text-muted">אין עדיין פעילויות אירוביות</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-sky-500/15 text-sky-400 rounded-xl hover:bg-sky-500/25 transition-all text-sm font-medium"
            >
              הוסף פעילות ראשונה
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 bg-card/50 border border-border rounded-xl hover:border-border transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-1 bg-sky-500/15 text-sky-400 rounded-lg text-sm font-medium">
                        {activity.cardio_type?.name || 'לא זמין'}
                      </span>
                      <span className="text-sm text-muted">
                        {new Date(activity.date).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-muted">יעד</p>
                        <p className="text-sm font-semibold text-emerald-400">
                          {activity.weekly_goal_steps.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">בוצע</p>
                        <p className="text-sm font-semibold text-amber-400">
                          {activity.avg_weekly_steps.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">עמידה ביעד</p>
                        <p className={`text-sm font-semibold ${
                          activity.avg_weekly_steps >= activity.weekly_goal_steps
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}>
                          {activity.weekly_goal_steps > 0
                            ? Math.round((activity.avg_weekly_steps / activity.weekly_goal_steps) * 100)
                            : 0}%
                        </p>
                      </div>
                      {activity.frequency > 0 && (
                        <div>
                          <p className="text-xs text-muted">תדירות</p>
                          <p className="text-sm font-semibold text-foreground">{activity.frequency}x שבוע</p>
                        </div>
                      )}
                    </div>

                    {activity.notes && (
                      <p className="text-sm text-muted mt-2 pt-2 border-t border-border">
                        {activity.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mr-4">
                    <button
                      onClick={() => handleEdit(activity)}
                      className="p-2 text-muted hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id)}
                      disabled={deletingId === activity.id}
                      className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === activity.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-sky-400" />
                {editingActivity ? 'עריכת פעילות' : 'הוספת פעילות'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-muted hover:text-foreground hover:bg-surface rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">סוג אירובי</label>
                {!showNewType ? (
                  <div className="flex gap-2">
                    <select
                      value={formData.cardio_type_id}
                      onChange={(e) => setFormData({ ...formData, cardio_type_id: e.target.value })}
                      className="flex-1 px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">בחר סוג</option>
                      {cardioTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewType(true)}
                      className="px-3 py-2 bg-sky-500/15 text-sky-400 rounded-xl hover:bg-sky-500/25 transition-all text-sm"
                    >
                      חדש
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCardioType}
                      onChange={(e) => setNewCardioType(e.target.value)}
                      placeholder="שם סוג אירובי"
                      className="flex-1 px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button onClick={handleAddCardioType} className="px-3 py-2 bg-emerald-500/15 text-emerald-400 rounded-xl hover:bg-emerald-500/25">שמור</button>
                    <button onClick={() => { setShowNewType(false); setNewCardioType(''); }} className="px-3 py-2 bg-surface text-muted rounded-xl">ביטול</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">תאריך</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">יעד צעדים שבועי</label>
                  <input
                    type="number"
                    value={formData.weekly_goal_steps || ''}
                    onChange={(e) => setFormData({ ...formData, weekly_goal_steps: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">ביצוע בפועל</label>
                  <input
                    type="number"
                    value={formData.avg_weekly_steps || ''}
                    onChange={(e) => setFormData({ ...formData, avg_weekly_steps: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">תדירות שבועית</label>
                  <input
                    type="number"
                    value={formData.frequency || ''}
                    onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                    max="7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">משך (דקות)</label>
                  <input
                    type="number"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">מרחק (ק"מ)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.distance || ''}
                    onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">הערות</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-card/50 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-foreground rounded-xl font-medium hover:from-sky-600 hover:to-sky-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {editingActivity ? 'עדכן' : 'שמור'}
                    </>
                  )}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-surface text-foreground rounded-xl font-medium hover:bg-elevated transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}