import { useState, useEffect } from 'react';
import { FileText, Download, Users, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

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
      .select('id, full_name, status')
      .eq('trainer_id', user.id)
      .eq('status', 'active');

    const traineeStats: TopTrainee[] = [];

    for (const trainee of (trainees || [])) {
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('workout_trainees.trainee_id', trainee.id)
        .gte('workout_date', startOfMonth.toISOString())
        .lte('workout_date', endOfMonth.toISOString());

      const { data: measurements } = await supabase
        .from('measurements')
        .select('weight_kg, measurement_date')
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
        const firstWeight = measurements[0].weight_kg;
        const lastWeight = measurements[measurements.length - 1].weight_kg;
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

      const { data: weekWorkouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('trainer_id', user.id)
        .gte('workout_date', weekStart.toISOString())
        .lte('workout_date', Math.min(weekEnd.getTime(), endOfMonth.getTime()));

      weekly.push({
        week: `שבוע ${week + 1}`,
        workouts: weekWorkouts?.length || 0,
      });
    }
    setWeeklyData(weekly);
    setLoading(false);
  };

  const getWeightChangeIcon = (change: number | null) => {
    if (change === null) return <Minus className="w-4 h-4 text-gray-400" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-emerald-500" />;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">אימונים לפי שבוע</h2>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number) => [`${value} אימונים`, 'אימונים']}
              />
              <Bar dataKey="workouts" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">מתאמנים מובילים החודש</h2>
        </div>

        {topTrainees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">אין נתונים להצגה</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">#</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">מתאמן</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">אימונים</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">שינוי משקל</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">שיאים</th>
                </tr>
              </thead>
              <tbody>
                {topTrainees.map((trainee, index) => (
                  <tr key={trainee.id} className="border-b border-gray-100 hover:bg-gray-50 transition-all">
                    <td className="py-4 px-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-900">{trainee.name}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">
                        {trainee.workoutCount}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getWeightChangeIcon(trainee.weightChange)}
                        <span className={`font-semibold ${
                          trainee.weightChange === null ? 'text-gray-400' :
                          trainee.weightChange < 0 ? 'text-emerald-600' :
                          trainee.weightChange > 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {trainee.weightChange !== null ? `${trainee.weightChange > 0 ? '+' : ''}${trainee.weightChange.toFixed(1)} ק"ג` : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {trainee.prCount > 0 ? (
                        <span className="font-bold text-amber-600 bg-amber-100 px-3 py-1 rounded-lg flex items-center justify-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {trainee.prCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
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
  );
}
