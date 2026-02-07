import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Target, Calendar, Award } from 'lucide-react';

interface WorkoutDay {
  id: string;
  day_number: number;
  day_name: string | null;
}

interface DayExercise {
  id: string;
  day_id: string;
  target_weight: number | null;
  trainee_target_weight: number | null;
  sets_count: number;
  reps_range: string;
  target_rpe: number | null;
  exercise?: {
    id: string;
    name: string;
  };
}

interface WorkoutPlanProgressProps {
  days: WorkoutDay[];
  dayExercises: Record<string, DayExercise[]>;
  dayCompletions: Record<string, { count: number; required: number }>;
  getCompletedCount: (dayId: string) => number;
  calculateDayVolume: (dayId: string) => number;
}

export default function WorkoutPlanProgress({
  days,
  dayExercises,
  dayCompletions,
  getCompletedCount,
  calculateDayVolume,
}: WorkoutPlanProgressProps) {
  const stats = useMemo(() => {
    const totalExercises = Object.values(dayExercises).reduce((sum, exercises) => sum + exercises.length, 0);
    const totalDays = days.length;
    const completedDays = days.filter(day => {
      const completion = dayCompletions[day.id];
      return completion && completion.count >= completion.required;
    }).length;
    
    // Calculate total required executions for the week
    const totalRequired = days.reduce((sum, day) => {
      const completion = dayCompletions[day.id];
      return sum + (completion?.required || 1);
    }, 0);
    
    // Calculate total completed executions for the week
    const totalCompleted = days.reduce((sum, day) => {
      const completion = dayCompletions[day.id];
      return sum + (completion?.count || 0);
    }, 0);

    const totalVolume = days.reduce((sum, day) => sum + calculateDayVolume(day.id), 0);
    const avgVolume = totalDays > 0 ? totalVolume / totalDays : 0;

    const overallProgress = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;

    return {
      totalExercises,
      totalCompleted,
      totalRequired,
      totalDays,
      completedDays,
      totalVolume,
      avgVolume,
      overallProgress,
    };
  }, [days, dayExercises, dayCompletions, getCompletedCount, calculateDayVolume]);

  const dayProgressData = useMemo(() => {
    return days.map(day => {
      const exercises = dayExercises[day.id] || [];
      const completion = dayCompletions[day.id] || { count: 0, required: 1 };
      const progress = completion.required > 0 ? (completion.count / completion.required) * 100 : 0;
      const volume = calculateDayVolume(day.id);

      return {
        day: `יום ${day.day_number}`,
        progress: Math.min(100, Math.round(progress)),
        volume,
        exercises: exercises.length,
        completed: completion.count >= completion.required,
      };
    });
  }, [days, dayExercises, dayCompletions, calculateDayVolume]);

  const exerciseProgressData = useMemo(() => {
    const exerciseMap = new Map<string, { name: string; volume: number; completed: boolean }>();
    const completedDayIds = new Set(
      days.filter(day => {
        const completion = dayCompletions[day.id];
        return completion && completion.count >= completion.required;
      }).map(day => day.id)
    );

    days.forEach(day => {
      const exercises = dayExercises[day.id] || [];
      exercises.forEach(exercise => {
        const exerciseName = exercise.exercise?.name || 'תרגיל';
        const weight = exercise.trainee_target_weight || exercise.target_weight || 0;
        const avgReps = exercise.reps_range.includes('-')
          ? (parseInt(exercise.reps_range.split('-')[0]) + parseInt(exercise.reps_range.split('-')[1])) / 2
          : parseInt(exercise.reps_range) || 0;
        const volume = weight * avgReps * exercise.sets_count;

        const existing = exerciseMap.get(exerciseName);
        if (existing) {
          existing.volume += volume;
          if (completedDayIds.has(day.id)) existing.completed = true;
        } else {
          exerciseMap.set(exerciseName, {
            name: exerciseName,
            volume,
            completed: completedDayIds.has(day.id),
          });
        }
      });
    });

    return Array.from(exerciseMap.values()).slice(0, 10);
  }, [days, dayExercises, dayCompletions]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="premium-card-static p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">אחוז השלמה כללי</p>
              <p className="text-2xl font-bold text-emerald-400">{Math.round(stats.overallProgress)}%</p>
            </div>
            <div className="p-3 bg-emerald-500/15 rounded-xl">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="h-2 bg-[var(--color-bg-surface)] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
              style={{ width: `${stats.overallProgress}%` }}
            />
          </div>
        </div>

        <div className="premium-card-static p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">ימים שהושלמו</p>
              <p className="text-2xl font-bold text-cyan-400">
                {stats.completedDays}/{stats.totalDays}
              </p>
            </div>
            <div className="p-3 bg-cyan-500/15 rounded-xl">
              <Calendar className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="premium-card-static p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">תרגילים שהושלמו</p>
              <p className="text-2xl font-bold text-amber-400">
                {stats.totalCompleted}/{stats.totalRequired}
              </p>
            </div>
            <div className="p-3 bg-amber-500/15 rounded-xl">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="premium-card-static p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">נפח ממוצע</p>
              <p className="text-2xl font-bold text-purple-400">
                {Math.round(stats.avgVolume).toLocaleString()} ק״ג
              </p>
            </div>
            <div className="p-3 bg-purple-500/15 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Chart by Day */}
      <div className="premium-card-static p-6">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          התקדמות לפי יום
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayProgressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#6b6b6b"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={{ stroke: '#d4d4d4', strokeOpacity: 0.8 }}
                tick={{ fill: '#4a4a4a' }}
              />
              <YAxis
                stroke="#6b6b6b"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#4a4a4a' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  color: '#000',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
              />
              <Legend />
              <Bar dataKey="progress" fill="#10b981" radius={[6, 6, 0, 0]} name="אחוז השלמה (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume Chart by Day */}
      <div className="premium-card-static p-6">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          נפח אימון לפי יום
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dayProgressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#6b6b6b"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={{ stroke: '#d4d4d4', strokeOpacity: 0.8 }}
                tick={{ fill: '#4a4a4a' }}
              />
              <YAxis
                stroke="#6b6b6b"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#4a4a4a' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  color: '#000',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ fill: '#06b6d4', r: 5 }}
                activeDot={{ r: 8 }}
                name="נפח (ק״ג)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exercise Completion Table */}
      <div className="premium-card-static p-6">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          התקדמות לפי תרגיל
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-bg-surface)] border-b-2 border-[var(--color-border)]">
              <tr>
                <th className="text-right py-3 px-4 font-bold text-sm text-[var(--color-text-primary)]">תרגיל</th>
                <th className="text-right py-3 px-4 font-bold text-sm text-[var(--color-text-primary)]">נפח</th>
                <th className="text-right py-3 px-4 font-bold text-sm text-[var(--color-text-primary)]">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {exerciseProgressData.map((exercise, index) => (
                <tr
                  key={index}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-surface)] transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">{exercise.name}</td>
                  <td className="py-3 px-4 text-cyan-400 font-bold">{Math.round(exercise.volume).toLocaleString()} ק״ג</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        exercise.completed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {exercise.completed ? 'הושלם' : 'בתהליך'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
