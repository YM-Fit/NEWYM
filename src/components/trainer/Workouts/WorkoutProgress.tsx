import { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Dumbbell, User, BarChart3, Target, Repeat } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

  const getChartData = () => {
    if (!selectedExerciseData) return [];

    switch (metricType) {
      case 'weight':
        return selectedExerciseData.progressData.map((d) => ({
          date: d.date,
          value: d.maxWeight,
        }));
      case 'reps':
        return selectedExerciseData.progressData.map((d) => ({
          date: d.date,
          value: d.totalReps,
        }));
      case 'volume':
        return selectedExerciseData.progressData.map((d) => ({
          date: d.date,
          value: d.totalVolume,
        }));
    }
  };

  const getMetricLabel = () => {
    switch (metricType) {
      case 'weight':
        return 'Max Weight (kg)';
      case 'reps':
        return 'Total Reps';
      case 'volume':
        return 'Total Volume (kg)';
    }
  };

  const getProgress = () => {
    if (!selectedExerciseData || selectedExerciseData.progressData.length < 2) return null;

    const data = selectedExerciseData.progressData;
    const first = data[0];
    const last = data[data.length - 1];

    let firstValue = 0;
    let lastValue = 0;

    switch (metricType) {
      case 'weight':
        firstValue = first.maxWeight;
        lastValue = last.maxWeight;
        break;
      case 'reps':
        firstValue = first.totalReps;
        lastValue = last.totalReps;
        break;
      case 'volume':
        firstValue = first.totalVolume;
        lastValue = last.totalVolume;
        break;
    }

    const change = lastValue - firstValue;
    const percentChange = firstValue > 0 ? ((change / firstValue) * 100).toFixed(1) : 0;

    return { change, percentChange };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading progress data...</p>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="space-y-6">
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300">
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Progress Chart</h1>
              <p className="text-emerald-100">{trainee.name}</p>
            </div>
          </div>
        </div>

        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <TrendingUp className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Not Enough Data</h3>
          <p className="text-gray-500">
            Need at least 2 workouts with the same exercise to see progress
          </p>
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const chartData = getChartData();

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300">
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Progress Chart</h1>
            <p className="text-emerald-100">{trainee.name}</p>
          </div>
        </div>
      </div>

      {/* Pair Member Selection */}
      {trainee.is_pair && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-4 transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Show progress for:</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedMember('all')}
              className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                selectedMember === 'all'
                  ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'all' ? 'text-emerald-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'all' ? 'text-emerald-700' : 'text-gray-600'
              }`}>{trainee.pair_name_1} + {trainee.pair_name_2}</p>
            </button>
            <button
              onClick={() => setSelectedMember('member_1')}
              className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                selectedMember === 'member_1'
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'member_1' ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'member_1' ? 'text-blue-700' : 'text-gray-600'
              }`}>{trainee.pair_name_1}</p>
            </button>
            <button
              onClick={() => setSelectedMember('member_2')}
              className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                selectedMember === 'member_2'
                  ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-teal-100 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'member_2' ? 'text-teal-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'member_2' ? 'text-teal-700' : 'text-gray-600'
              }`}>{trainee.pair_name_2}</p>
            </button>
          </div>
        </div>
      )}

      {/* Metric Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setMetricType('weight')}
          className={`p-4 rounded-2xl border-2 transition-all duration-300 shadow-xl hover:shadow-2xl ${
            metricType === 'weight'
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              metricType === 'weight'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gray-100'
            }`}>
              <BarChart3 className={`h-6 w-6 ${metricType === 'weight' ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div className={`font-bold ${metricType === 'weight' ? 'text-emerald-700' : 'text-gray-900'}`}>Weight</div>
            <div className="text-sm text-gray-600">Maximum</div>
          </div>
        </button>

        <button
          onClick={() => setMetricType('reps')}
          className={`p-4 rounded-2xl border-2 transition-all duration-300 shadow-xl hover:shadow-2xl ${
            metricType === 'reps'
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              metricType === 'reps'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gray-100'
            }`}>
              <Repeat className={`h-6 w-6 ${metricType === 'reps' ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div className={`font-bold ${metricType === 'reps' ? 'text-emerald-700' : 'text-gray-900'}`}>Reps</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </button>

        <button
          onClick={() => setMetricType('volume')}
          className={`p-4 rounded-2xl border-2 transition-all duration-300 shadow-xl hover:shadow-2xl ${
            metricType === 'volume'
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${
              metricType === 'volume'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gray-100'
            }`}>
              <Target className={`h-6 w-6 ${metricType === 'volume' ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div className={`font-bold ${metricType === 'volume' ? 'text-emerald-700' : 'text-gray-900'}`}>Volume</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </button>
      </div>

      {/* Chart Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl transition-all duration-300">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Exercise</label>
          <select
            value={selectedExercise || ''}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 shadow-sm"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.progressData.length} workouts)
              </option>
            ))}
          </select>
        </div>

        {progress && (
          <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">Overall Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {progress.change > 0 ? '+' : ''}
                  {progress.change.toFixed(metricType === 'volume' ? 0 : 1)}{' '}
                  {metricType === 'reps' ? 'reps' : 'kg'}
                </p>
              </div>
              <div
                className={`text-3xl font-bold px-4 py-2 rounded-xl ${
                  Number(progress.percentChange) >= 0
                    ? 'bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-700'
                    : 'bg-gradient-to-br from-red-100 to-red-200 text-red-700'
                }`}
              >
                {progress.percentChange > 0 ? '+' : ''}
                {progress.percentChange}%
              </div>
            </div>
          </div>
        )}

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={getMetricLabel()}
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl transition-all duration-300">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {selectedExerciseData?.name} History
        </h3>
        <div className="space-y-2">
          {selectedExerciseData?.progressData.map((data, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{data.date}</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-gray-900">
                  {metricType === 'weight' && `${data.maxWeight} kg`}
                  {metricType === 'reps' && `${data.totalReps} reps`}
                  {metricType === 'volume' && `${data.totalVolume.toLocaleString()} kg`}
                </div>
                <div className="text-xs text-gray-500">
                  {data.totalSets} sets - {data.totalReps} reps
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
