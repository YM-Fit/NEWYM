import { useState, useEffect } from 'react';
import { TrendingUp, Scale, Users, Filter, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface TraineeProgress {
  id: string;
  name: string;
  color: string;
  data: { date: string; weight: number }[];
}

interface TraineesProgressChartProps {
  selectedMonth: Date;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export default function TraineesProgressChart({ selectedMonth }: TraineesProgressChartProps) {
  const { user } = useAuth();
  const [trainees, setTrainees] = useState<{ id: string; name: string }[]>([]);
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);
  const [progressData, setProgressData] = useState<TraineeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'weight' | 'volume'>('weight');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) loadTrainees();
  }, [user]);

  useEffect(() => {
    if (selectedTrainees.length > 0) loadProgressData();
  }, [selectedTrainees, selectedMonth, chartType]);

  const loadTrainees = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('trainees')
      .select('id, full_name')
      .eq('trainer_id', user.id)
      .eq('status', 'active')
      .order('full_name');

    if (data) {
      setTrainees(data.map(t => ({ id: t.id, name: t.full_name })));
      if (data.length > 0) {
        setSelectedTrainees(data.slice(0, 5).map(t => t.id));
      }
    }
    setLoading(false);
  };

  const loadProgressData = async () => {
    if (selectedTrainees.length === 0) return;

    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 2, 1);
    const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

    const progressResults: TraineeProgress[] = [];

    for (let i = 0; i < selectedTrainees.length; i++) {
      const traineeId = selectedTrainees[i];
      const trainee = trainees.find(t => t.id === traineeId);
      if (!trainee) continue;

      if (chartType === 'weight') {
        const { data: measurements } = await supabase
          .from('measurements')
          .select('weight_kg, measurement_date')
          .eq('trainee_id', traineeId)
          .gte('measurement_date', startDate.toISOString())
          .lte('measurement_date', endDate.toISOString())
          .order('measurement_date', { ascending: true });

        const { data: selfWeights } = await supabase
          .from('trainee_self_weights')
          .select('weight_kg, weight_date')
          .eq('trainee_id', traineeId)
          .gte('weight_date', startDate.toISOString())
          .lte('weight_date', endDate.toISOString())
          .order('weight_date', { ascending: true });

        const allWeights: { date: string; weight: number }[] = [];

        measurements?.forEach(m => {
          allWeights.push({ date: m.measurement_date, weight: m.weight_kg });
        });

        selfWeights?.forEach(sw => {
          allWeights.push({ date: sw.weight_date, weight: sw.weight_kg });
        });

        allWeights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        progressResults.push({
          id: traineeId,
          name: trainee.name,
          color: COLORS[i % COLORS.length],
          data: allWeights,
        });
      } else {
        const { data: workouts } = await supabase
          .from('workouts')
          .select(`
            workout_date,
            workout_exercises(
              exercise_sets(weight, reps)
            )
          `)
          .eq('workout_trainees.trainee_id', traineeId)
          .gte('workout_date', startDate.toISOString())
          .lte('workout_date', endDate.toISOString())
          .order('workout_date', { ascending: true });

        const volumeData: { date: string; weight: number }[] = [];

        workouts?.forEach(w => {
          let volume = 0;
          w.workout_exercises?.forEach((we: any) => {
            we.exercise_sets?.forEach((es: any) => {
              volume += (es.weight || 0) * (es.reps || 0);
            });
          });
          volumeData.push({ date: w.workout_date, weight: volume });
        });

        progressResults.push({
          id: traineeId,
          name: trainee.name,
          color: COLORS[i % COLORS.length],
          data: volumeData,
        });
      }
    }

    setProgressData(progressResults);
  };

  const toggleTrainee = (traineeId: string) => {
    setSelectedTrainees(prev => {
      if (prev.includes(traineeId)) {
        return prev.filter(id => id !== traineeId);
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, traineeId];
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  const allDates = Array.from(new Set(progressData.flatMap(p => p.data.map(d => d.date)))).sort();

  const chartData = allDates.map(date => {
    const point: Record<string, unknown> = { date: formatDate(date) };
    progressData.forEach(trainee => {
      const dataPoint = trainee.data.find(d => d.date === date);
      if (dataPoint) {
        point[trainee.name] = dataPoint.weight;
      }
    });
    return point;
  });

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
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">התקדמות מתאמנים</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setChartType('weight')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                chartType === 'weight' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
              }`}
            >
              <Scale className="w-4 h-4 inline-block ml-1" />
              משקל
            </button>
            <button
              onClick={() => setChartType('volume')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                chartType === 'volume' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline-block ml-1" />
              נפח
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm transition-all"
            >
              <Filter className="w-4 h-4" />
              בחר מתאמנים ({selectedTrainees.length})
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-20 max-h-80 overflow-y-auto">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm text-gray-500">בחר עד 10 מתאמנים</p>
                </div>
                <div className="p-2">
                  {trainees.map(trainee => (
                    <label
                      key={trainee.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTrainees.includes(trainee.id)}
                        onChange={() => toggleTrainee(trainee.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!selectedTrainees.includes(trainee.id) && selectedTrainees.length >= 10}
                      />
                      <span className="text-sm font-medium text-gray-700">{trainee.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTrainees.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">בחר מתאמנים להצגת ההתקדמות</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">אין נתונים להצגה בתקופה זו</p>
        </div>
      ) : (
        <>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => chartType === 'volume' ? `${(value / 1000).toFixed(0)}K` : value}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [
                    chartType === 'weight' ? `${value.toFixed(1)} ק"ג` : `${value.toLocaleString()} ק"ג`,
                    chartType === 'weight' ? 'משקל' : 'נפח'
                  ]}
                />
                <Legend />
                {progressData.map(trainee => (
                  <Line
                    key={trainee.id}
                    type="monotone"
                    dataKey={trainee.name}
                    stroke={trainee.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: trainee.color }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {progressData.map(trainee => {
              const firstValue = trainee.data[0]?.weight;
              const lastValue = trainee.data[trainee.data.length - 1]?.weight;
              const change = firstValue && lastValue ? lastValue - firstValue : null;

              return (
                <div
                  key={trainee.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: trainee.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">{trainee.name}</span>
                  {change !== null && (
                    <span className={`text-xs font-semibold ${
                      chartType === 'weight'
                        ? (change < 0 ? 'text-emerald-600' : change > 0 ? 'text-red-500' : 'text-gray-500')
                        : (change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-gray-500')
                    }`}>
                      {change > 0 ? '+' : ''}{chartType === 'weight' ? change.toFixed(1) : (change / 1000).toFixed(1)}
                      {chartType === 'weight' ? ' ק"ג' : 'K'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
