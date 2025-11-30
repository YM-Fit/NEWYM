import { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Dumbbell, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

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
        return 'משקל מקסימלי (ק"ג)';
      case 'reps':
        return 'סה"כ חזרות';
      case 'volume':
        return 'נפח כולל (ק"ג)';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני התקדמות...</p>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">גרף התקדמות</h1>
            <p className="text-gray-600">{trainee.name}</p>
          </div>
        </div>

        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין מספיק נתונים</h3>
          <p className="text-gray-500">
            צריך לפחות 2 אימונים עם אותו תרגיל כדי לראות התקדמות
          </p>
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const chartData = getChartData();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowRight className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">גרף התקדמות</h1>
          <p className="text-gray-600">{trainee.name}</p>
        </div>
      </div>

      {/* Pair Member Selection */}
      {trainee.is_pair && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">הצג התקדמות עבור:</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedMember('all')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMember === 'all'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'all' ? 'text-green-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'all' ? 'text-green-700' : 'text-gray-600'
              }`}>{trainee.pair_name_1} + {trainee.pair_name_2}</p>
            </button>
            <button
              onClick={() => setSelectedMember('member_1')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMember === 'member_1'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
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
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMember === 'member_2'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'member_2' ? 'text-purple-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'member_2' ? 'text-purple-700' : 'text-gray-600'
              }`}>{trainee.pair_name_2}</p>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setMetricType('weight')}
          className={`p-4 rounded-xl border-2 transition-all ${
            metricType === 'weight'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">⚖️</div>
            <div className="font-semibold text-gray-900">משקל</div>
            <div className="text-sm text-gray-600">מקסימום</div>
          </div>
        </button>

        <button
          onClick={() => setMetricType('reps')}
          className={`p-4 rounded-xl border-2 transition-all ${
            metricType === 'reps'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">🔁</div>
            <div className="font-semibold text-gray-900">חזרות</div>
            <div className="text-sm text-gray-600">סה"כ</div>
          </div>
        </button>

        <button
          onClick={() => setMetricType('volume')}
          className={`p-4 rounded-xl border-2 transition-all ${
            metricType === 'volume'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">💪</div>
            <div className="font-semibold text-gray-900">נפח</div>
            <div className="text-sm text-gray-600">כולל</div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">בחר תרגיל</label>
          <select
            value={selectedExercise || ''}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.progressData.length} אימונים)
              </option>
            ))}
          </select>
        </div>

        {progress && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">התקדמות כללית</p>
                <p className="text-2xl font-bold text-gray-900">
                  {progress.change > 0 ? '+' : ''}
                  {progress.change.toFixed(metricType === 'volume' ? 0 : 1)}{' '}
                  {metricType === 'reps' ? 'חזרות' : 'ק"ג'}
                </p>
              </div>
              <div
                className={`text-3xl font-bold ${
                  Number(progress.percentChange) >= 0 ? 'text-green-600' : 'text-red-600'
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={getMetricLabel()}
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 6, fill: '#10b981' }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          היסטוריית {selectedExerciseData?.name}
        </h3>
        <div className="space-y-2">
          {selectedExerciseData?.progressData.map((data, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <Dumbbell className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-900">{data.date}</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {metricType === 'weight' && `${data.maxWeight} ק"ג`}
                  {metricType === 'reps' && `${data.totalReps} חזרות`}
                  {metricType === 'volume' && `${data.totalVolume.toLocaleString()} ק"ג`}
                </div>
                <div className="text-xs text-gray-500">
                  {data.totalSets} סטים • {data.totalReps} חזרות
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
