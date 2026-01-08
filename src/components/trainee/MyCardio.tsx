import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, TrendingUp, Timer, Calendar, Target, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

interface CardioActivity {
  id: string;
  date: string;
  avg_weekly_steps: number;
  distance: number;
  duration: number;
  frequency: number;
  weekly_goal_steps: number;
  notes: string | null;
  cardio_type: {
    name: string;
  };
}

interface MyCardioProps {
  traineeId: string | null;
}

export default function MyCardio({ traineeId }: MyCardioProps) {
  const [activities, setActivities] = useState<CardioActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgSteps: 0,
    avgDistance: 0,
    avgDuration: 0,
    totalActivities: 0,
    goalProgress: 0
  });

  useEffect(() => {
    if (traineeId) {
      loadActivities();
    }
  }, [traineeId]);

  const loadActivities = async () => {
    if (!traineeId) return;

    const { data, error } = await supabase
      .from('cardio_activities')
      .select('*, cardio_type:cardio_types(name)')
      .eq('trainee_id', traineeId)
      .order('date', { ascending: false });

    if (error) {
      toast.error('שגיאה בטעינת פעילויות אירוביות');
      setLoading(false);
      return;
    }

    if (data) {
      setActivities(data as any);
      calculateStats(data as any);
    }
    setLoading(false);
  };

  const calculateStats = (data: CardioActivity[]) => {
    if (data.length === 0) {
      setStats({
        avgSteps: 0,
        avgDistance: 0,
        avgDuration: 0,
        totalActivities: 0,
        goalProgress: 0
      });
      return;
    }

    const totalSteps = data.reduce((sum, a) => sum + a.avg_weekly_steps, 0);
    const totalDistance = data.reduce((sum, a) => sum + a.distance, 0);
    const totalDuration = data.reduce((sum, a) => sum + a.duration, 0);
    const totalGoal = data.reduce((sum, a) => sum + a.weekly_goal_steps, 0);

    setStats({
      avgSteps: Math.round(totalSteps / data.length),
      avgDistance: parseFloat((totalDistance / data.length).toFixed(1)),
      avgDuration: Math.round(totalDuration / data.length),
      totalActivities: data.length,
      goalProgress: totalGoal > 0 ? Math.round((totalSteps / totalGoal) * 100) : 0
    });
  };

  const getChartData = () => {
    return activities
      .slice(0, 10)
      .reverse()
      .map(activity => ({
        date: new Date(activity.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
        צעדים: activity.avg_weekly_steps,
        יעד: activity.weekly_goal_steps,
        מרחק: activity.distance,
        זמן: activity.duration
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
          <h2 className="text-2xl font-bold text-white">האירובי שלי</h2>
          <p className="text-sm text-zinc-500">מעקב אחר פעילות אירובית</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="premium-card-static p-12 text-center">
          <Activity className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-zinc-400 mb-2">אין פעילויות אירוביות</h3>
          <p className="text-zinc-500">המאמן שלך עוד לא הוסיף פעילויות אירוביות</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card p-5 bg-gradient-to-br from-sky-500/20 to-sky-500/5 shadow-[0_0_20px_rgba(14,165,233,0.15)]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1">ממוצע צעדים</p>
                  <p className="text-2xl font-bold text-sky-400">{stats.avgSteps.toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-sky-500/20">
                  <TrendingUp className="h-5 w-5 text-sky-400" />
                </div>
              </div>
            </div>

            <div className="stat-card p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1">אחוז השגת יעד</p>
                  <p className="text-2xl font-bold text-emerald-400">{stats.goalProgress}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/20">
                  <Target className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="stat-card p-5 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1">ממוצע מרחק</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.avgDistance} ק״מ</p>
                </div>
                <div className="p-2.5 rounded-lg bg-cyan-500/20">
                  <BarChart3 className="h-5 w-5 text-cyan-400" />
                </div>
              </div>
            </div>

            <div className="stat-card p-5 bg-gradient-to-br from-violet-500/20 to-violet-500/5 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1">ממוצע זמן</p>
                  <p className="text-2xl font-bold text-violet-400">{stats.avgDuration} דק׳</p>
                </div>
                <div className="p-2.5 rounded-lg bg-violet-500/20">
                  <Timer className="h-5 w-5 text-violet-400" />
                </div>
              </div>
            </div>
          </div>

          {activities.length >= 2 && (
            <div className="premium-card-static p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-sky-400" />
                מעקב התקדמות
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="צעדים"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ fill: '#0ea5e9', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="יעד"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="premium-card-static p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-400" />
              היסטוריית פעילות
            </h3>
            <div className="space-y-3">
              {activities.map(activity => (
                <div
                  key={activity.id}
                  className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold mb-1">
                        {activity.cardio_type.name}
                      </h4>
                      <p className="text-sm text-zinc-500">
                        {new Date(activity.date).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    {activity.weekly_goal_steps > 0 && (
                      <div className="text-left">
                        <p className="text-xs text-zinc-500 mb-1">השגת יעד</p>
                        <p className={`text-lg font-bold ${
                          activity.avg_weekly_steps >= activity.weekly_goal_steps
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}>
                          {Math.round((activity.avg_weekly_steps / activity.weekly_goal_steps) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-sky-400" />
                      <div>
                        <p className="text-xs text-zinc-500">צעדים</p>
                        <p className="text-sm font-semibold text-white">
                          {activity.avg_weekly_steps.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {activity.distance > 0 && (
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-cyan-400" />
                        <div>
                          <p className="text-xs text-zinc-500">מרחק</p>
                          <p className="text-sm font-semibold text-white">{activity.distance} ק״מ</p>
                        </div>
                      </div>
                    )}

                    {activity.duration > 0 && (
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-violet-400" />
                        <div>
                          <p className="text-xs text-zinc-500">זמן</p>
                          <p className="text-sm font-semibold text-white">{activity.duration} דק׳</p>
                        </div>
                      </div>
                    )}

                    {activity.frequency > 0 && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-rose-400" />
                        <div>
                          <p className="text-xs text-zinc-500">תדירות</p>
                          <p className="text-sm font-semibold text-white">{activity.frequency}x שבוע</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {activity.notes && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-sm text-zinc-400">{activity.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}