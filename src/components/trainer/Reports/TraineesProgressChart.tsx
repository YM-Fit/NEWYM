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
  '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#84cc16', '#f97316', '#6366f1',
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
          .select('weight, measurement_date')
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
          allWeights.push({ date: m.measurement_date, weight: m.weight });
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
        const { data: workoutTrainees } = await supabase
          .from('workout_trainees')
          .select(`
            workouts!inner(
              workout_date,
              workout_exercises(
                exercise_sets(weight, reps)
              )
            )
          `)
          .eq('trainee_id', traineeId)
          .gte('workouts.workout_date', startDate.toISOString())
          .lte('workouts.workout_date', endDate.toISOString())
          .order('workouts(workout_date)', { ascending: true });
        
        const workouts = workoutTrainees?.map((wt: any) => wt.workouts).filter(Boolean) || [];

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4 shadow-2xl">
          <p className="text-zinc-400 text-xs mb-3 font-medium">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-baseline gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: entry.color }} />
                <p className="text-xs text-zinc-400 flex-1">{entry.name}:</p>
                <p className="font-bold text-base" style={{ color: entry.color }}>
                  {chartType === 'weight' ? entry.value?.toFixed(1) : entry.value?.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">ק"ג</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="premium-card-static p-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card-static overflow-hidden">
      <div className="p-5 border-b border-zinc-800/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">התקדמות מתאמנים</h2>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl border border-zinc-700/50">
              <button
                onClick={() => setChartType('weight')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-1.5 ${
                  chartType === 'weight' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Scale className="w-4 h-4" />
                משקל
              </button>
              <button
                onClick={() => setChartType('volume')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-1.5 ${
                  chartType === 'volume' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                נפח
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl font-semibold text-sm transition-all border border-zinc-700/50 text-zinc-300"
              >
                <Filter className="w-4 h-4" />
                בחר מתאמנים ({selectedTrainees.length})
                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute left-0 top-full mt-2 w-64 premium-card-static z-20 max-h-80 overflow-y-auto">
                  <div className="p-3 border-b border-zinc-800/50">
                    <p className="text-sm text-zinc-500">בחר עד 10 מתאמנים</p>
                  </div>
                  <div className="p-2">
                    {trainees.map(trainee => (
                      <label
                        key={trainee.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTrainees.includes(trainee.id)}
                          onChange={() => toggleTrainee(trainee.id)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                          disabled={!selectedTrainees.includes(trainee.id) && selectedTrainees.length >= 10}
                        />
                        <span className="text-sm font-medium text-zinc-300">{trainee.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {selectedTrainees.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-zinc-500">בחר מתאמנים להצגת ההתקדמות</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-zinc-500">אין נתונים להצגה בתקופה זו</p>
          </div>
        ) : (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#3f3f46" 
                    strokeOpacity={0.3}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: '#a1a1aa' }} 
                    axisLine={{ stroke: '#3f3f46', strokeOpacity: 0.5 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#a1a1aa' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => chartType === 'volume' ? `${(value / 1000).toFixed(0)}K` : value}
                    width={45}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5 5', strokeOpacity: 0.3 }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-zinc-300 text-sm">{value}</span>}
                    iconType="circle"
                  />
                  {progressData.map(trainee => (
                    <Line
                      key={trainee.id}
                      type="monotone"
                      dataKey={trainee.name}
                      stroke={trainee.color}
                      strokeWidth={3}
                      dot={{ 
                        r: 4, 
                        fill: trainee.color,
                        strokeWidth: 2,
                        stroke: '#09090b'
                      }}
                      activeDot={{ 
                        r: 7,
                        fill: '#09090b',
                        stroke: trainee.color,
                        strokeWidth: 3
                      }}
                      connectNulls
                      animationDuration={1000}
                      animationEasing="ease-in-out"
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
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: trainee.color }}
                    />
                    <span className="text-sm font-medium text-zinc-300">{trainee.name}</span>
                    {change !== null && (
                      <span className={`text-xs font-semibold ${
                        chartType === 'weight'
                          ? (change < 0 ? 'text-emerald-400' : change > 0 ? 'text-red-400' : 'text-zinc-500')
                          : (change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-zinc-500')
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
    </div>
  );
}
