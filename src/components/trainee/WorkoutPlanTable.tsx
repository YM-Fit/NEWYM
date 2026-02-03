import { useState } from 'react';
import { Check, Edit3, BookOpen, Dumbbell, Target, Clock, Repeat, Activity, Award, Info, TrendingUp, Plus } from 'lucide-react';
import ExerciseInstructionsModal from '../common/ExerciseInstructionsModal';

interface WorkoutDay {
  id: string;
  plan_id: string;
  day_number: number;
  day_name: string | null;
  focus: string | null;
  notes: string | null;
  order_index: number;
  times_per_week?: number | null;
}

interface WorkoutPlan {
  id: string;
  days_per_week: number | null;
}

interface DayExercise {
  id: string;
  day_id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  sets_count: number;
  reps_range: string;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  target_weight: number | null;
  target_rpe: number | null;
  equipment_id: string | null;
  set_type: string;
  failure: boolean;
  superset_exercise_id: string | null;
  superset_weight: number | null;
  superset_reps: number | null;
  superset_rpe: number | null;
  superset_equipment_id: string | null;
  superset_dropset_weight: number | null;
  superset_dropset_reps: number | null;
  dropset_weight: number | null;
  dropset_reps: number | null;
  trainee_notes: string | null;
  trainee_target_weight: number | null;
  trainee_modified_at: string | null;
  exercise?: {
    id: string;
    name: string;
    muscle_group_id: string;
    instructions?: string | null;
    muscle_group?: {
      name: string;
    };
  };
  equipment?: {
    id: string;
    name: string;
    emoji: string | null;
  };
  superset_exercise?: {
    id: string;
    name: string;
  };
  superset_equipment?: {
    id: string;
    name: string;
    emoji: string | null;
  };
}

interface WorkoutPlanTableProps {
  days: WorkoutDay[];
  dayExercises: Record<string, DayExercise[]>;
  dayCompletions: Record<string, { count: number; required: number }>;
  editingExercise: string | null;
  onToggleDayComplete: (dayId: string) => void;
  onStartEditing: (exercise: DayExercise) => void;
  onAddExercise: (dayId: string) => void;
  onShowInstructions: (name: string, instructions: string | null | undefined) => void;
  instructionsExercise: { name: string; instructions: string | null | undefined } | null;
  onSetInstructionsExercise: (exercise: { name: string; instructions: string | null | undefined } | null) => void;
  calculateDayVolume: (dayId: string) => number;
  getCompletedCount: (dayId: string) => number;
  formatRestTime: (seconds: number) => string;
  plan: WorkoutPlan | null;
}

export default function WorkoutPlanTable({
  days,
  dayExercises,
  dayCompletions,
  editingExercise,
  onToggleDayComplete,
  onStartEditing,
  onAddExercise,
  onShowInstructions,
  instructionsExercise,
  onSetInstructionsExercise,
  calculateDayVolume,
  getCompletedCount,
  formatRestTime,
  plan,
}: WorkoutPlanTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');

  const toggleRow = (dayId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  const getDayStatus = (dayId: string): 'completed' | 'in_progress' | 'not_started' => {
    const completion = dayCompletions[dayId];
    if (!completion) return 'not_started';
    if (completion.count >= completion.required) return 'completed';
    if (completion.count > 0) return 'in_progress';
    return 'not_started';
  };

  const getStatusColor = (status: 'completed' | 'in_progress' | 'not_started') => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'in_progress':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'not_started':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: 'completed' | 'in_progress' | 'not_started') => {
    switch (status) {
      case 'completed':
        return 'הושלם';
      case 'in_progress':
        return 'בתהליך';
      case 'not_started':
        return 'לא התחיל';
    }
  };

  const filteredDays = days.filter(day => {
    if (statusFilter === 'all') return true;
    const status = getDayStatus(day.id);
    return status === statusFilter;
  });

  return (
    <div className="space-y-4">
      {/* Filter and Stats */}
      <div className="premium-card-static p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-[var(--color-text-primary)]">סנן לפי סטטוס:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">הכל</option>
            <option value="completed">הושלם</option>
            <option value="in_progress">בתהליך</option>
            <option value="not_started">לא התחיל</option>
          </select>
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden lg:block premium-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-b-2 border-emerald-500/30">
              <tr>
                <th className="text-right py-4 px-4 font-bold text-sm text-[var(--color-text-primary)]">יום</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-[var(--color-text-primary)]">שם יום</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-[var(--color-text-primary)]">תרגילים</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-[var(--color-text-primary)]">תדירות</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-[var(--color-text-primary)]">נפח</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-[var(--color-text-primary)]">סטטוס</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-[var(--color-text-primary)]">התקדמות</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-[var(--color-text-primary)]">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredDays.map((day, dayIndex) => {
                const exercises = dayExercises[day.id] || [];
                const status = getDayStatus(day.id);
                const completion = dayCompletions[day.id] || { count: 0, required: 1 };
                const progressPercent = completion.required > 0 ? (completion.count / completion.required) * 100 : 0;
                const volume = calculateDayVolume(day.id);
                const isExpanded = expandedRows.has(day.id);

                return (
                  <>
                    <tr
                      key={day.id}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-surface)] transition-colors cursor-pointer"
                      onClick={() => toggleRow(day.id)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-foreground font-bold">
                            {day.day_number}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-bold text-[var(--color-text-primary)]">{day.day_name || `יום ${day.day_number}`}</div>
                          {day.focus && (
                            <div className="text-sm text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                              <Target className="w-3 h-3" />
                              {day.focus}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-emerald-400" />
                          <span className="font-semibold">{exercises.length} תרגילים</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-blue-400" />
                          <span className="font-semibold">
                            {completion.count}/{completion.required}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            ({day.times_per_week ?? 1} בשבוע)
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {volume > 0 ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-cyan-400" />
                            <span className="font-semibold">{volume.toLocaleString()} ק״ג</span>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[var(--color-bg-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold min-w-[50px] text-right">{Math.round(progressPercent)}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div className="bg-[var(--color-bg-surface)] p-4 space-y-3">
                            {/* Day completion button */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-lg text-[var(--color-text-primary)]">
                                  ביצוע שבועי: {completion.count}/{completion.required}
                                </span>
                                {completion.count >= completion.required && (
                                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold border border-emerald-500/30">
                                    הושלם
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleDayComplete(day.id);
                                }}
                                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                                  completion.count >= completion.required
                                    ? 'bg-gray-500 hover:bg-gray-600 text-foreground'
                                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground'
                                }`}
                              >
                                {completion.count >= completion.required ? 'ביטול ביצוע' : 'סמן יום כהושלם'}
                              </button>
                            </div>

                            {day.notes && (
                              <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 mb-3">
                                <p className="text-sm font-bold text-amber-400 mb-1 flex items-center gap-2">
                                  <Info className="w-4 h-4" />
                                  הערות ליום זה
                                </p>
                                <p className="text-sm text-amber-300">{day.notes}</p>
                              </div>
                            )}
                            {exercises.map((exercise, exIndex) => {
                              const exerciseName = exercise.exercise?.name || exercise.exercise_name || 'תרגיל';

                              return (
                                <div
                                  key={exercise.id}
                                  className="p-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-base)] transition-all"
                                >
                                  <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                      <span className="font-bold">{exIndex + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h4 className="font-bold text-[var(--color-text-primary)]">
                                            {exerciseName}
                                          </h4>
                                          {exercise.exercise?.muscle_group?.name && (
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1">{exercise.exercise.muscle_group.name}</p>
                                          )}
                                        </div>
                                        {editingExercise !== exercise.id && (
                                          <div className="flex items-center gap-2">
                                            {exercise.exercise?.instructions && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onShowInstructions(exerciseName, exercise.exercise?.instructions);
                                                }}
                                                className="p-2 text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all"
                                                title="הצג הוראות"
                                              >
                                                <BookOpen className="w-4 h-4" />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onStartEditing(exercise);
                                              }}
                                              className="p-2 text-[var(--color-text-muted)] hover:text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all"
                                              title="ערוך"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-emerald-500/12 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1">
                                          <Repeat className="w-3 h-3" />
                                          {exercise.sets_count} סטים
                                        </span>
                                        <span className="px-2 py-1 bg-cyan-500/12 text-cyan-400 rounded-lg text-xs font-bold flex items-center gap-1">
                                          <Target className="w-3 h-3" />
                                          {exercise.reps_range} חזרות
                                        </span>
                                        <span className="px-2 py-1 bg-amber-500/12 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatRestTime(exercise.rest_seconds)}
                                        </span>
                                        {exercise.target_weight && (
                                          <span className="px-2 py-1 bg-teal-500/12 text-teal-400 rounded-lg text-xs font-bold">
                                            {exercise.target_weight} ק״ג
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {onAddExercise && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddExercise(day.id);
                                }}
                                className="w-full mt-3 p-3 border-2 border-dashed border-emerald-500/50 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="font-semibold text-sm">הוסף תרגיל</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile View */}
      <div className="lg:hidden space-y-4">
        {filteredDays.map((day) => {
          const exercises = dayExercises[day.id] || [];
          const status = getDayStatus(day.id);
          const completion = dayCompletions[day.id] || { count: 0, required: 1 };
          const progressPercent = completion.required > 0 ? (completion.count / completion.required) * 100 : 0;
          const volume = calculateDayVolume(day.id);
          const isExpanded = expandedRows.has(day.id);

          return (
            <div
              key={day.id}
              className="premium-card-static overflow-hidden"
              onClick={() => toggleRow(day.id)}
            >
              <div className="p-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-foreground font-bold">
                      {day.day_number}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--color-text-primary)]">{day.day_name || `יום ${day.day_number}`}</div>
                      {day.focus && (
                        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                          <Target className="w-3 h-3" />
                          {day.focus}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                    <span>{exercises.length} תרגילים</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Repeat className="w-4 h-4 text-blue-400" />
                    <span>{completion.count}/{completion.required}</span>
                  </div>
                  {volume > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      <span>{volume.toLocaleString()} ק״ג</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 h-2 bg-[var(--color-bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              {isExpanded && (
                <div className="p-4 space-y-3 bg-[var(--color-bg-surface)]">
                  {/* Day completion button for mobile */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base text-[var(--color-text-primary)]">
                        ביצוע שבועי: {completion.count}/{completion.required}
                      </span>
                      {completion.count >= completion.required && (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/30">
                          הושלם
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDayComplete(day.id);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        completion.count >= completion.required
                          ? 'bg-gray-500 hover:bg-gray-600 text-foreground'
                          : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground'
                      }`}
                    >
                      {completion.count >= completion.required ? 'ביטול' : 'סמן יום'}
                    </button>
                  </div>

                  {exercises.map((exercise, exIndex) => {
                    const exerciseName = exercise.exercise?.name || exercise.exercise_name || 'תרגיל';

                    return (
                      <div
                        key={exercise.id}
                        className="p-3 rounded-xl border-2 border-[var(--color-border)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                            <span className="text-xs font-bold">{exIndex + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-bold text-sm text-[var(--color-text-primary)]">
                                {exerciseName}
                              </h4>
                              {editingExercise !== exercise.id && (
                                <div className="flex gap-1">
                                  {exercise.exercise?.instructions && (
                                    <button
                                      onClick={() => onShowInstructions(exerciseName, exercise.exercise?.instructions)}
                                      className="p-1.5 text-cyan-400"
                                    >
                                      <BookOpen className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onStartEditing(exercise)}
                                    className="p-1.5 text-[var(--color-text-muted)]"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                              <span className="px-2 py-0.5 bg-emerald-500/12 text-emerald-400 rounded">{exercise.sets_count} סטים</span>
                              <span className="px-2 py-0.5 bg-cyan-500/12 text-cyan-400 rounded">{exercise.reps_range}</span>
                              <span className="px-2 py-0.5 bg-amber-500/12 text-amber-400 rounded">{formatRestTime(exercise.rest_seconds)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {onAddExercise && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddExercise(day.id);
                      }}
                      className="w-full mt-3 p-3 border-2 border-dashed border-emerald-500/50 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-semibold text-sm">הוסף תרגיל</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {instructionsExercise && (
        <ExerciseInstructionsModal
          isOpen={!!instructionsExercise}
          onClose={() => onSetInstructionsExercise(null)}
          exerciseName={instructionsExercise.name}
          instructions={instructionsExercise.instructions}
        />
      )}
    </div>
  );
}
