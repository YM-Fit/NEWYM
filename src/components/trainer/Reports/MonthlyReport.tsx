import { useState, useEffect } from 'react';
import { FileText, Users, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { themeColors } from '@/utils/themeColors';

interface MonthlyReportProps {
  month: Date;
  stats: {
    totalWorkouts: number;
    activeTrainees: number;
    newTrainees: number;
    averageWorkoutsPerTrainee: number;
    totalVolume: number;
    personalRecords: number;
  };
}

interface TopTrainee {
  id: string;
  name: string;
  workoutCount: number;
  weightChange: number | null;
  prCount: number;
}

interface WeeklyData {
  week: string;
  workouts: number;
}

export default function MonthlyReport({ month, stats }: MonthlyReportProps) {
  const { user } = useAuth();
  const [topTrainees, setTopTrainees] = useState<TopTrainee[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadReportData();
  }, [user, month]);

  const loadReportData = async () => {
    if (!user) return;
    setLoading(true);

    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

    const { data: trainees } = await supabase
      .from('trainees')
      .select('id, full_name')
      .eq('trainer_id', user.id);

    const traineeStats: TopTrainee[] = [];

    for (const trainee of (trainees || [])) {
      const { data: workoutTrainees } = await supabase
        .from('workout_trainees')
        .select('workout_id, workouts!inner(id, workout_date)')
        .eq('trainee_id', trainee.id)
        .gte('workouts.workout_date', startOfMonth.toISOString())
        .lte('workouts.workout_date', endOfMonth.toISOString());
      
      const workouts = workoutTrainees?.map((wt: any) => wt.workouts).filter(Boolean) || [];

      const { data: measurements } = await supabase
        .from('measurements')
        .select('weight, measurement_date')
        .eq('trainee_id', trainee.id)
        .gte('measurement_date', startOfMonth.toISOString())
        .lte('measurement_date', endOfMonth.toISOString())
        .order('measurement_date', { ascending: true });

      const { data: prs } = await supabase
        .from('personal_records')
        .select('id')
        .eq('trainee_id', trainee.id)
        .gte('achieved_at', startOfMonth.toISOString())
        .lte('achieved_at', endOfMonth.toISOString());

      let weightChange: number | null = null;
      if (measurements && measurements.length >= 2) {
        const firstWeight = measurements[0].weight;
        const lastWeight = measurements[measurements.length - 1].weight;
        weightChange = lastWeight - firstWeight;
      }

      traineeStats.push({
        id: trainee.id,
        name: trainee.full_name,
        workoutCount: workouts?.length || 0,
        weightChange,
        prCount: prs?.length || 0,
      });
    }

    traineeStats.sort((a, b) => b.workoutCount - a.workoutCount);
    setTopTrainees(traineeStats.slice(0, 10));

    const weekly: WeeklyData[] = [];
    for (let week = 0; week < 5; week++) {
      const weekStart = new Date(startOfMonth);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekStart > endOfMonth) break;

      // Use the earlier of weekEnd or endOfMonth, converted to ISO string
      const effectiveEndDate = weekEnd <= endOfMonth ? weekEnd : endOfMonth;
      
      const { data: weekWorkouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('trainer_id', user.id)
        .gte('workout_date', weekStart.toISOString())
        .lte('workout_date', effectiveEndDate.toISOString());

      weekly.push({
        week: `שבוע ${week + 1}`,
        workouts: weekWorkouts?.length || 0,
      });
    }
    setWeeklyData(weekly);
    setLoading(false);
  };

  const getWeightChangeIcon = (change: number | null) => {
    if (change === null) return <Minus className="w-4 h-4 text-muted" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-primary-400" />;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted" />;
  };

  if (loading) {
    return (
      <div className="premium-card-static p-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-2xl">
          <p className="text-muted text-xs mb-2 font-medium">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-primary-400 font-bold text-2xl">{payload[0].value}</p>
            <p className="text-muted text-sm font-medium">אימונים</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="premium-card-static overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-500/15 border border-primary-500/30">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">אימונים לפי שבוע</h2>
          </div>
        </div>

        <div className="p-5">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={themeColors.chartPrimary} stopOpacity={1} />
                    <stop offset="100%" stopColor={themeColors.chartSecondary} stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={themeColors.zinc700} 
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 12, fill: themeColors.zinc400 }} 
                  axisLine={{ stroke: themeColors.zinc700, strokeOpacity: 0.5 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: themeColors.zinc400 }} 
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: themeColors.chartPrimary + '1a' }}
                />
                <Bar 
                  dataKey="workouts" 
                  fill="url(#barGradient)" 
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="premium-card-static overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">מתאמנים מובילים החודש</h2>
          </div>
        </div>

        <div className="p-5">
          {topTrainees.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-muted" />
              </div>
              <p className="text-muted">אין נתונים להצגה</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted">#</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted">מתאמן</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted">אימונים</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted">שינוי משקל</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted">שיאים</th>
                  </tr>
                </thead>
                <tbody>
                  {topTrainees.map((trainee, index) => (
                    <tr key={trainee.id} className="border-b border-border/50 hover:bg-surface/30 transition-all">
                      <td className="py-4 px-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' :
                          index === 1 ? 'bg-surface/15 text-foreground border border-border' :
                          index === 2 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          'bg-surface text-muted'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-foreground">{trainee.name}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-primary-400 bg-primary-500/15 px-3 py-1 rounded-lg border border-primary-500/30">
                          {trainee.workoutCount}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getWeightChangeIcon(trainee.weightChange)}
                          <span className={`font-semibold ${
                            trainee.weightChange === null ? 'text-muted' :
                            trainee.weightChange < 0 ? 'text-primary-400' :
                            trainee.weightChange > 0 ? 'text-red-400' :
                            'text-muted'
                          }`}>
                            {trainee.weightChange !== null ? `${trainee.weightChange > 0 ? '+' : ''}${trainee.weightChange.toFixed(1)} ק"ג` : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {trainee.prCount > 0 ? (
                          <span className="font-bold text-amber-400 bg-amber-500/15 px-3 py-1 rounded-lg border border-amber-500/30 inline-flex items-center justify-center gap-1">
                            <Trophy className="w-4 h-4" />
                            {trainee.prCount}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
