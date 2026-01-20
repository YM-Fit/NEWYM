import { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Dumbbell, User, BarChart3, Target, Repeat, List, Table2, Minus, Trophy, Calendar, Flame } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

interface WorkoutProgressProps {
  trainee: any;
  onBack: () => void;
}

interface ExerciseData {
  id: string;
  name: string;
  progressData: Array<{
    date: string;
    fullDate: string;
    maxWeight: number;
    totalReps: number;
    totalSets: number;
    totalVolume: number;
  }>;
}

export default function WorkoutProgress({ trainee, onBack }: WorkoutProgressProps) {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricType, setMetricType] = useState<'weight' | 'reps' | 'volume'>('weight');
  const [selectedMember, setSelectedMember] = useState<'member_1' | 'member_2' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'chart' | 'list' | 'table'>('chart');

  useEffect(() => {
    loadProgressData();
  }, [trainee.id, selectedMember]);

  const loadProgressData = async () => {
    const { data: workoutTrainees } = await supabase
      .from('workout_trainees')
      .select('workout_id')
      .eq('trainee_id', trainee.id);

    if (!workoutTrainees) {
      setLoading(false);
      return;
    }

    const workoutIds = workoutTrainees.map((wt) => wt.workout_id);

    const { data: workouts } = await supabase
      .from('workouts')
      .select(`
        id,
        workout_date,
        is_completed,
        workout_exercises (
          id,
          exercise_id,
          pair_member,
          exercises (
            id,
            name
          ),
          exercise_sets (
            weight,
            reps,
            equipment_id,
            equipment:equipment_id (
              id,
              name,
              emoji
            )
          )
        )
      `)
      .in('id', workoutIds)
      .eq('is_completed', true)
      .order('workout_date', { ascending: true });

    if (!workouts) {
      setLoading(false);
      return;
    }

    const exerciseMap = new Map<string, ExerciseData>();

    workouts.forEach((workout) => {
      workout.workout_exercises?.forEach((we: any) => {
        if (trainee.is_pair) {
          if (selectedMember === 'all') {
            if (we.pair_member !== null) {
              return;
            }
          } else {
            if (we.pair_member !== selectedMember) {
              return;
            }
          }
        }

        const exerciseId = we.exercises.id;
        const exerciseName = we.exercises.name;
        const sets = we.exercise_sets || [];

        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, {
            id: exerciseId,
            name: exerciseName,
            progressData: [],
          });
        }

        const exercise = exerciseMap.get(exerciseId)!;
        const maxWeight = Math.max(...sets.map((s: any) => s.weight), 0);
        const totalReps = sets.reduce((sum: number, s: any) => sum + s.reps, 0);
        const totalSets = sets.length;
        const totalVolume = sets.reduce((sum: number, s: any) => sum + s.weight * s.reps, 0);

        exercise.progressData.push({
          date: new Date(workout.workout_date).toLocaleDateString('he-IL'),
          fullDate: workout.workout_date,
          maxWeight,
          totalReps,
          totalSets,
          totalVolume,
        });
      });
    });

    const exercisesArray = Array.from(exerciseMap.values()).filter(
      (ex) => ex.progressData.length >= 2
    );

    setExercises(exercisesArray);
    if (exercisesArray.length > 0) {
      setSelectedExercise(exercisesArray[0].id);
    }
    setLoading(false);
  };

  const selectedExerciseData = exercises.find((ex) => ex.id === selectedExercise);

  const getMetricValue = (data: ExerciseData['progressData'][0]) => {
    switch (metricType) {
      case 'weight': return data.maxWeight;
      case 'reps': return data.totalReps;
      case 'volume': return data.totalVolume;
    }
  };

  const getChartData = () => {
    if (!selectedExerciseData) return [];
    return selectedExerciseData.progressData.map((d) => ({
      date: d.date,
      value: getMetricValue(d),
    }));
  };

  const getMetricLabel = () => {
    switch (metricType) {
      case 'weight': return 'משקל מקסימלי (ק"ג)';
      case 'reps': return 'סה"כ חזרות';
      case 'volume': return 'נפח כולל (ק"ג)';
    }
  };

  const getMetricUnit = () => {
    switch (metricType) {
      case 'weight': return 'ק"ג';
      case 'reps': return 'חזרות';
      case 'volume': return 'ק"ג';
    }
  };

  const getMetricColor = () => {
    switch (metricType) {
      case 'weight': return '#10b981';
      case 'reps': return '#06b6d4';
      case 'volume': return '#f59e0b';
    }
  };

  const getChange = (current: number, previous: number) => {
    const diff = current - previous;
    const percentage = previous > 0 ? ((diff / previous) * 100).toFixed(1) : '0';
    const isPositive = diff > 0;
    return { diff, percentage, isPositive };
  };

  const getProgress = () => {
    if (!selectedExerciseData || selectedExerciseData.progressData.length < 2) return null;

    const data = selectedExerciseData.progressData;
    const first = data[0];
    const last = data[data.length - 1];

    const firstValue = getMetricValue(first);
    const lastValue = getMetricValue(last);

    return getChange(lastValue, firstValue);
  };

  const getBestWorkout = () => {
    if (!selectedExerciseData) return null;
    let best = selectedExerciseData.progressData[0];
    selectedExerciseData.progressData.forEach(d => {
      if (getMetricValue(d) > getMetricValue(best)) {
        best = d;
      }
    });
    return best;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4 shadow-2xl">
          <p className="text-zinc-400 text-xs mb-2 font-medium">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="font-bold text-2xl" style={{ color: getMetricColor() }}>
              {metricType === 'volume' ? payload[0].value.toLocaleString() : payload[0].value}
            </p>
            <p className="text-sm text-zinc-500 font-medium">{getMetricUnit()}</p>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-700/50">
            <p className="text-xs text-zinc-500">{getMetricLabel()}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="space-y-6">
        <div className="premium-card-static p-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/15">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">גרף התקדמות</h1>
                <p className="text-sm text-zinc-500">{trainee.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center py-12 premium-card-static">
          <div className="w-16 h-16 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">אין מספיק נתונים</h3>
          <p className="text-zinc-500">נדרשים לפחות 2 אימונים עם אותו תרגיל כדי לראות התקדמות</p>
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const chartData = getChartData();
  const bestWorkout = getBestWorkout();

  return (
    <div className="space-y-6">
      <div className="premium-card-static p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/15">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">גרף התקדמות</h1>
                <p className="text-sm text-zinc-500">{trainee.name}</p>
              </div>
            </div>
          </div>
          {progress && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              progress.isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {progress.isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="font-bold text-lg">
                {progress.diff > 0 ? '+' : ''}{metricType === 'volume' ? progress.diff.toLocaleString() : progress.diff.toFixed(1)} ({progress.percentage}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {trainee.is_pair && (
        <div className="premium-card-static p-4">
          <p className="text-sm font-medium text-zinc-400 mb-3">הצג התקדמות עבור:</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'all', label: `${trainee.pair_name_1} + ${trainee.pair_name_2}`, color: 'emerald' },
              { id: 'member_1', label: trainee.pair_name_1, color: 'cyan' },
              { id: 'member_2', label: trainee.pair_name_2, color: 'amber' },
            ].map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member.id as typeof selectedMember)}
                className={`p-3 rounded-xl border transition-all ${
                  selectedMember === member.id
                    ? `bg-${member.color}-500/15 border-${member.color}-500/30 text-${member.color}-400`
                    : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-400 hover:text-white hover:border-zinc-600/50'
                }`}
              >
                <User className="w-5 h-5 mx-auto mb-2" />
                <p className="text-sm font-medium text-center truncate">{member.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'weight', label: 'משקל', sublabel: 'מקסימלי', icon: BarChart3, 
            activeBg: 'bg-emerald-500/15', inactiveBg: 'bg-zinc-800/30',
            activeIconBg: 'bg-emerald-500/20', inactiveIconBg: 'bg-zinc-700/50',
            activeColor: 'text-emerald-400', inactiveColor: 'text-zinc-500',
            activeBorder: 'border-emerald-500/30' },
          { id: 'reps', label: 'חזרות', sublabel: 'סה"כ', icon: Repeat,
            activeBg: 'bg-cyan-500/15', inactiveBg: 'bg-zinc-800/30',
            activeIconBg: 'bg-cyan-500/20', inactiveIconBg: 'bg-zinc-700/50',
            activeColor: 'text-cyan-400', inactiveColor: 'text-zinc-500',
            activeBorder: 'border-cyan-500/30' },
          { id: 'volume', label: 'נפח', sublabel: 'כולל', icon: Target,
            activeBg: 'bg-amber-500/15', inactiveBg: 'bg-zinc-800/30',
            activeIconBg: 'bg-amber-500/20', inactiveIconBg: 'bg-zinc-700/50',
            activeColor: 'text-amber-400', inactiveColor: 'text-zinc-500',
            activeBorder: 'border-amber-500/30' },
        ].map((metric) => (
          <button
            key={metric.id}
            onClick={() => setMetricType(metric.id as typeof metricType)}
            className={`p-4 rounded-xl border transition-all ${
              metricType === metric.id
                ? `${metric.activeBg} ${metric.activeBorder}`
                : `${metric.inactiveBg} border-zinc-700/30 hover:border-zinc-600/50`
            }`}
          >
            <div
              className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${
                metricType === metric.id ? metric.activeIconBg : metric.inactiveIconBg
              }`}
            >
              <metric.icon
                className={`w-5 h-5 ${metricType === metric.id ? metric.activeColor : 'text-zinc-500'}`}
              />
            </div>
            <p className={`font-bold text-center ${metricType === metric.id ? metric.activeColor : 'text-white'}`}>
              {metric.label}
            </p>
            <p className="text-xs text-zinc-500 text-center">{metric.sublabel}</p>
          </button>
        ))}
      </div>

      <div className="premium-card-static p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <select
              value={selectedExercise || ''}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.progressData.length} אימונים)
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl border border-zinc-700/50">
            <button
              onClick={() => setViewMode('chart')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'chart' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              title="גרף"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              title="רשימה"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
              title="טבלה"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {selectedExerciseData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <p className="text-xs text-zinc-500">אימונים</p>
              </div>
              <p className="text-xl font-bold text-white">{selectedExerciseData.progressData.length}</p>
            </div>
            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-zinc-500">שיא {metricType === 'weight' ? 'משקל' : metricType === 'reps' ? 'חזרות' : 'נפח'}</p>
              </div>
              <p className={`text-xl font-bold ${
                metricType === 'weight' ? 'text-emerald-400' : 
                metricType === 'reps' ? 'text-cyan-400' : 
                'text-amber-400'
              }`}>
                {metricType === 'volume' ? getMetricValue(bestWorkout!).toLocaleString() : getMetricValue(bestWorkout!)}
              </p>
            </div>
            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-zinc-500" />
                <p className="text-xs text-zinc-500">התחלה</p>
              </div>
              <p className="text-xl font-bold text-zinc-300">
                {metricType === 'volume'
                  ? getMetricValue(selectedExerciseData.progressData[0]).toLocaleString()
                  : getMetricValue(selectedExerciseData.progressData[0])}
              </p>
            </div>
            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-zinc-500">נוכחי</p>
              </div>
              <p className="text-xl font-bold text-emerald-400">
                {metricType === 'volume'
                  ? getMetricValue(selectedExerciseData.progressData[selectedExerciseData.progressData.length - 1]).toLocaleString()
                  : getMetricValue(selectedExerciseData.progressData[selectedExerciseData.progressData.length - 1])}
              </p>
            </div>
          </div>
        )}

        {viewMode === 'chart' && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id={`gradient-${metricType}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getMetricColor()} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={getMetricColor()} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#3f3f46" 
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={{ stroke: '#3f3f46', strokeOpacity: 0.5 }}
                  tick={{ fill: '#a1a1aa' }}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#a1a1aa' }}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: getMetricColor(), strokeWidth: 1, strokeDasharray: '5 5', strokeOpacity: 0.3 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getMetricColor()}
                  strokeWidth={3}
                  dot={{ 
                    fill: getMetricColor(), 
                    strokeWidth: 3, 
                    r: 5, 
                    stroke: '#09090b',
                    filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))'
                  }}
                  activeDot={{ 
                    r: 8, 
                    stroke: getMetricColor(), 
                    strokeWidth: 3, 
                    fill: '#09090b',
                    filter: 'drop-shadow(0 0 8px ' + getMetricColor() + ')'
                  }}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'list' && selectedExerciseData && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {[...selectedExerciseData.progressData].reverse().map((data, index, arr) => {
              const value = getMetricValue(data);
              const prevData = arr[index + 1];
              const prevValue = prevData ? getMetricValue(prevData) : null;
              const change = prevValue !== null ? getChange(value, prevValue) : null;
              const isBest = bestWorkout && data.fullDate === bestWorkout.fullDate;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isBest
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-zinc-800/30 border-zinc-700/30 hover:border-zinc-600/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isBest ? 'bg-amber-500/20' : 
                        metricType === 'weight' ? 'bg-emerald-500/20' : 
                        metricType === 'reps' ? 'bg-cyan-500/20' : 
                        'bg-amber-500/20'
                      }`}
                    >
                      {isBest ? (
                        <Trophy className="w-5 h-5 text-amber-400" />
                      ) : (
                        <span className={`text-sm font-bold ${
                          metricType === 'weight' ? 'text-emerald-400' : 
                          metricType === 'reps' ? 'text-cyan-400' : 
                          'text-amber-400'
                        }`}>
                          {arr.length - index}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {new Date(data.fullDate).toLocaleDateString('he-IL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {data.totalSets} סטים - {data.totalReps} חזרות - {data.totalVolume.toLocaleString()} ק"ג נפח
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {change && (
                      <div className={`flex items-center gap-1 text-sm ${
                        change.isPositive ? 'text-emerald-400' : change.diff < 0 ? 'text-red-400' : 'text-zinc-500'
                      }`}>
                        {change.diff === 0 ? (
                          <Minus className="w-3 h-3" />
                        ) : change.isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="font-medium">
                          {change.diff > 0 ? '+' : ''}{metricType === 'volume' ? change.diff.toLocaleString() : change.diff.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-xl font-bold text-lg ${
                        metricType === 'weight' ? 'bg-emerald-500/15 text-emerald-400' : 
                        metricType === 'reps' ? 'bg-cyan-500/15 text-cyan-400' : 
                        'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {metricType === 'volume' ? value.toLocaleString() : value}
                      <span className="text-xs font-normal mr-1 text-zinc-400">{getMetricUnit()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'table' && selectedExerciseData && (
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full min-w-[700px]">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="border-b border-zinc-700/50">
                  <th className="text-right py-3 px-3 text-xs font-semibold text-zinc-400">#</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-zinc-400">תאריך</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-400">סטים</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-400">חזרות</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-400">משקל מקס'</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-400">נפח</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-400">שינוי</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-zinc-400">מהתחלה</th>
                </tr>
              </thead>
              <tbody>
                {[...selectedExerciseData.progressData].reverse().map((data, index, arr) => {
                  const value = getMetricValue(data);
                  const prevData = arr[index + 1];
                  const prevValue = prevData ? getMetricValue(prevData) : null;
                  const change = prevValue !== null ? getChange(value, prevValue) : null;
                  const firstValue = getMetricValue(selectedExerciseData.progressData[0]);
                  const fromStart = index < arr.length - 1 ? getChange(value, firstValue) : null;
                  const isBest = bestWorkout && data.fullDate === bestWorkout.fullDate;

                  return (
                    <tr key={index} className={`border-b border-zinc-800/50 transition-all ${
                      isBest ? 'bg-amber-500/10' : 'hover:bg-zinc-800/30'
                    }`}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-sm">{arr.length - index}</span>
                          {isBest && <Trophy className="w-4 h-4 text-amber-400" />}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-white text-sm">
                          {new Date(data.fullDate).toLocaleDateString('he-IL')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-zinc-300">{data.totalSets}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-cyan-400 font-semibold">{data.totalReps}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-emerald-400 font-semibold">{data.maxWeight}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-amber-400 font-semibold">{data.totalVolume.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {change ? (
                          <span className={`text-sm font-medium ${
                            change.isPositive ? 'text-emerald-400' : change.diff < 0 ? 'text-red-400' : 'text-zinc-500'
                          }`}>
                            {change.diff > 0 ? '+' : ''}{metricType === 'volume' ? change.diff.toLocaleString() : change.diff.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {fromStart ? (
                          <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                            fromStart.isPositive ? 'bg-emerald-500/15 text-emerald-400' : fromStart.diff < 0 ? 'bg-red-500/15 text-red-400' : 'text-zinc-500'
                          }`}>
                            {fromStart.diff > 0 ? '+' : ''}{fromStart.percentage}%
                          </span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
