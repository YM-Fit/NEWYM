import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Timer, Calendar, Target, BarChart3, Footprints, CheckCircle, AlertCircle, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { cardioApi, type CardioActivity } from '../../api/cardioApi';
import { themeColors } from '../../utils/themeColors';

interface MyCardioProps {
  traineeId: string | null;
}

export default function MyCardio({ traineeId }: MyCardioProps) {
  const [activities, setActivities] = useState<CardioActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    avgSteps: number;
    successRate: number;
    stepsChange: number;
    currentStreak: number;
    longestStreak: number;
  } | null>(null);

  useEffect(() => {
    if (traineeId) {
      loadData();
    }
  }, [traineeId]);

  const loadData = async () => {
    if (!traineeId) return;

    setLoading(true);
    try {
      const [activitiesData, statsData] = await Promise.all([
        cardioApi.getTraineeActivities(traineeId),
        cardioApi.getCardioStats(traineeId)
      ]);
      setActivities(activitiesData);
      setStats({
        avgSteps: statsData.avgSteps,
        successRate: statsData.successRate,
        stepsChange: statsData.stepsChange,
        currentStreak: statsData.currentStreak,
        longestStreak: statsData.longestStreak,
      });
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בטעינת פעילויות אירוביות');
    } finally {
      setLoading(false);
    }
  };

  const latestActivity = activities[0];

  const getProgressPercentage = () => {
    if (!latestActivity || latestActivity.weekly_goal_steps === 0) return 0;
    return Math.min(100, Math.round((latestActivity.avg_weekly_steps / latestActivity.weekly_goal_steps) * 100));
  };

  const progressPercentage = getProgressPercentage();

  const getChartData = () => {
    return activities
      .slice(0, 8)
      .reverse()
      .map(a => ({
        date: new Date(a.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
        בוצע: a.avg_weekly_steps,
        יעד: a.weekly_goal_steps,
        achieved: a.weekly_goal_steps > 0 && a.avg_weekly_steps >= a.weekly_goal_steps
      }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-glow animate-pulse">
          <Activity className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-glow">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">האירובי שלי</h2>
          <p className="text-sm text-[var(--color-text-muted)]">מעקב יעדים והתקדמות</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="premium-card-static p-12 text-center">
          <div className="w-20 h-20 bg-sky-500/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
            <Activity className="h-10 w-10 text-sky-400" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">אין תוכנית אירובי</h3>
          <p className="text-[var(--color-text-muted)]">המאמן שלך עוד לא הגדיר תוכנית אירובית</p>
        </div>
      ) : (
        <>
          {latestActivity && (
            <div className="premium-card-static p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary-400" />
                  היעד השבועי שלי
                </h3>
                <span className="px-3 py-1 bg-sky-500/15 text-sky-400 rounded-lg text-sm font-medium">
                  {latestActivity.cardio_type.name}
                </span>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)] mb-1">התקדמות ליעד</p>
                    <p className="text-4xl font-bold text-[var(--color-text-primary)]">
                      {latestActivity.avg_weekly_steps.toLocaleString()}
                      <span className="text-lg text-[var(--color-text-muted)] font-normal mr-2">
                        / {latestActivity.weekly_goal_steps.toLocaleString()} צעדים
                      </span>
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                    progressPercentage >= 100
                      ? 'bg-primary-500/15 text-primary-400'
                      : progressPercentage >= 80
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                  }`}>
                    {progressPercentage >= 100 ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span className="text-2xl font-bold">{progressPercentage}%</span>
                  </div>
                </div>

                <div className="h-4 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden border border-[var(--color-border)]">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      progressPercentage >= 100
                        ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                        : progressPercentage >= 80
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                          : 'bg-gradient-to-r from-red-500 to-red-400'
                    }`}
                    style={{ width: `${Math.min(100, progressPercentage)}%` }}
                  />
                </div>

                {progressPercentage < 100 && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    נשארו עוד {(latestActivity.weekly_goal_steps - latestActivity.avg_weekly_steps).toLocaleString()} צעדים להשגת היעד
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-[var(--color-border)]">
                {latestActivity.frequency > 0 && (
                  <div className="text-center p-3 bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)]">
                    <Calendar className="h-5 w-5 text-sky-400 mx-auto mb-2" />
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">תדירות</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{latestActivity.frequency}x שבוע</p>
                  </div>
                )}
                {latestActivity.duration > 0 && (
                  <div className="text-center p-3 bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)]">
                    <Timer className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">משך זמן</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{latestActivity.duration} דק'</p>
                  </div>
                )}
                {latestActivity.distance > 0 && (
                  <div className="text-center p-3 bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)]">
                    <TrendingUp className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">מרחק</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{latestActivity.distance} ק"מ</p>
                  </div>
                )}
              </div>

              {latestActivity.notes && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{latestActivity.notes}</p>
                </div>
              )}
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="stat-card p-5 bg-gradient-to-br from-sky-500/20 to-sky-500/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">ממוצע צעדים</p>
                    <p className="text-2xl font-bold text-sky-400">{stats.avgSteps.toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-sky-500/20">
                    <Footprints className="h-5 w-5 text-sky-400" />
                  </div>
                </div>
                {stats.stepsChange !== 0 && (
                  <p className={`text-xs ${stats.stepsChange > 0 ? 'text-primary-400' : 'text-red-400'}`}>
                    {stats.stepsChange > 0 ? '+' : ''}{stats.stepsChange.toLocaleString()} מהשבוע הקודם
                  </p>
                )}
              </div>

              <div className="stat-card p-5 bg-gradient-to-br from-primary-500/20 to-primary-500/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">אחוז הצלחה</p>
                    <p className="text-2xl font-bold text-primary-400">{stats.successRate}%</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-primary-500/20">
                    <CheckCircle className="h-5 w-5 text-primary-400" />
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">שבועות שעמדת ביעד</p>
              </div>

              {stats.currentStreak > 0 && (
                <div className="stat-card p-5 bg-gradient-to-br from-orange-500/20 to-orange-500/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">רצף נוכחי</p>
                      <p className="text-2xl font-bold text-orange-400 flex items-center gap-1">
                        {stats.currentStreak}
                        <Flame className="h-5 w-5 text-orange-400" />
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-orange-500/20">
                      <Flame className="h-5 w-5 text-orange-400" />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">שבועות רצופים</p>
                </div>
              )}

              {stats.longestStreak > 0 && stats.longestStreak !== stats.currentStreak && (
                <div className="stat-card p-5 bg-gradient-to-br from-amber-500/20 to-amber-500/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">שיא אישי</p>
                      <p className="text-2xl font-bold text-amber-400">{stats.longestStreak}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-500/20">
                      <Target className="h-5 w-5 text-amber-400" />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">שבועות רצופים</p>
                </div>
              )}
            </div>
          )}

          {activities.length >= 2 && (
            <div className="premium-card-static p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-sky-400" />
                התקדמות לאורך זמן
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
                    <YAxis stroke="#71717a" style={{ fontSize: '11px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="יעד" fill={themeColors.chartPrimary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="בוצע" radius={[4, 4, 0, 0]}>
                      {getChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.achieved ? themeColors.chartBlue : themeColors.chartAmber} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="premium-card-static p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-400" />
              היסטוריית שבועות
            </h3>
            <div className="space-y-3">
              {activities.map((activity) => {
                const achieved = activity.weekly_goal_steps > 0 && 
                  activity.avg_weekly_steps >= activity.weekly_goal_steps;
                const percentage = activity.weekly_goal_steps > 0
                  ? Math.round((activity.avg_weekly_steps / activity.weekly_goal_steps) * 100)
                  : 0;

                return (
                  <div
                    key={activity.id}
                    className={`p-4 rounded-xl border transition-all ${
                      achieved
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : 'bg-[var(--color-bg-surface)] border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {achieved ? (
                          <CheckCircle className="h-5 w-5 text-primary-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-400" />
                        )}
                        <div>
                          <p className="text-[var(--color-text-primary)] font-medium">{activity.cardio_type.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {new Date(activity.date).toLocaleDateString('he-IL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-lg font-bold ${achieved ? 'text-primary-400' : 'text-amber-400'}`}>
                          {percentage}%
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {activity.avg_weekly_steps.toLocaleString()} / {activity.weekly_goal_steps.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden border border-[var(--color-border)]">
                      <div
                        className={`h-full rounded-full ${
                          achieved ? 'bg-primary-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}