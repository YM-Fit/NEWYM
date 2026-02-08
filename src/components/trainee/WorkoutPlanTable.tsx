import React, { useState, useMemo } from 'react';
import { Check, Edit3, BookOpen, Dumbbell, Target, Clock, Repeat, Activity, Award, Info, TrendingUp, Plus, ChevronDown } from 'lucide-react';
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
        return 'bg-primary-100 text-primary-700 border-primary-300';
      case 'in_progress':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'not_started':
        return 'bg-muted-100 text-muted-600 border-muted-300';
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

  const filteredDays = useMemo(() => {
    if (!days || days.length === 0) return [];
    return days.filter(day => {
      if (statusFilter === 'all') return true;
      const status = getDayStatus(day.id);
      return status === statusFilter;
    });
  }, [days, statusFilter, dayCompletions]);

  return (
    <div className="space-y-4">
      {/* Filter and Stats */}
      <div className="premium-card p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-foreground">סנן לפי סטטוס:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-border-light rounded-xl bg-elevated text-foreground focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all"
          >
            <option value="all">הכל</option>
            <option value="completed">הושלם</option>
            <option value="in_progress">בתהליך</option>
            <option value="not_started">לא התחיל</option>
          </select>
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden lg:block premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-br from-primary-100 to-primary-200 border-b-2 border-primary-300">
              <tr>
                <th className="text-right py-4 px-4 font-bold text-sm text-foreground">יום</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-foreground">שם יום</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-foreground">תרגילים</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-foreground">תדירות</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-foreground">נפח</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-foreground">סטטוס</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-foreground">התקדמות</th>
                <th className="text-right py-4 px-4 font-bold text-sm text-foreground">פעולות</th>
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
                  <React.Fragment key={day.id}>
                    <tr
                      className="border-b border-border-subtle hover:bg-surface-light transition-all duration-200 cursor-pointer"
                      onClick={() => toggleRow(day.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-controls={`day-details-${day.id}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleRow(day.id);
                        }
                      }}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                            {day.day_number}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-bold text-foreground">{day.day_name || `יום ${day.day_number}`}</div>
                          {day.focus && (
                            <div className="text-sm text-muted flex items-center gap-1 mt-1">
                              <Target className="w-3 h-3 text-primary-500" />
                              {day.focus}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-primary-500" />
                          <span className="font-semibold text-foreground">{exercises.length} תרגילים</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-primary-400" />
                          <span className="font-semibold text-foreground">
                            {completion.count}/{completion.required}
                          </span>
                          <span className="text-xs text-muted">
                            ({day.times_per_week ?? 1} בשבוע)
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {volume > 0 ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary-400" />
                            <span className="font-semibold text-foreground">{volume.toLocaleString()} ק״ג</span>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                progressPercent >= 100 
                                  ? 'bg-gradient-to-r from-primary-500 to-primary-600' 
                                  : progressPercent >= 50
                                  ? 'bg-gradient-to-r from-primary-400 to-primary-500'
                                  : 'bg-gradient-to-r from-primary-300 to-primary-400'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold min-w-[50px] text-right text-foreground">{Math.round(progressPercent)}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className={`flex items-center gap-2 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronDown className="w-5 h-5 text-muted" />
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div id={`day-details-${day.id}`} className="bg-surface-light p-5 space-y-4 animate-fade-in" role="region" aria-labelledby={`day-header-${day.id}`}>
                            {/* Day completion button */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-light">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-lg text-foreground">
                                  ביצוע שבועי: {completion.count}/{completion.required}
                                </span>
                                {completion.count >= completion.required && (
                                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-bold border border-primary-300 animate-pulse-soft">
                                    <Check className="w-3 h-3 inline mr-1" />
                                    הושלם
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleDayComplete(day.id);
                                }}
                                className={`px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 ${
                                  completion.count >= completion.required
                                    ? 'bg-muted-500 hover:bg-muted-600 text-white'
                                    : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white shadow-lg'
                                }`}
                              >
                                {completion.count >= completion.required ? 'ביטול ביצוע' : 'סמן יום כהושלם'}
                              </button>
                            </div>

                            {day.notes && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 animate-fade-in">
                                <p className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
                                  <Info className="w-4 h-4" />
                                  הערות ליום זה
                                </p>
                                <p className="text-sm text-amber-600 leading-relaxed">{day.notes}</p>
                              </div>
                            )}
                            {exercises.map((exercise, exIndex) => {
                              const exerciseName = exercise.exercise?.name || exercise.exercise_name || 'תרגיל';

                              return (
                                <div
                                  key={exercise.id}
                                  className="p-4 rounded-xl border-2 border-border-light bg-elevated transition-all hover:border-primary-300 hover:shadow-md animate-fade-in"
                                  style={{ animationDelay: `${exIndex * 50}ms` }}
                                >
                                  <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary-50 text-primary-700 border border-primary-200 font-bold">
                                      {exIndex + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-3">
                                        <div>
                                          <h4 className="font-bold text-foreground">
                                            {exerciseName}
                                          </h4>
                                          {exercise.exercise?.muscle_group?.name && (
                                            <p className="text-xs text-muted mt-1">{exercise.exercise.muscle_group.name}</p>
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
                                                className="p-2 text-primary-500 hover:bg-primary-100 rounded-lg transition-all hover:scale-110 active:scale-95"
                                                title="הצג הוראות"
                                                aria-label="הצג הוראות"
                                              >
                                                <BookOpen className="w-4 h-4" />
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onStartEditing(exercise);
                                              }}
                                              className="p-2 text-muted hover:text-primary-500 hover:bg-primary-100 rounded-lg transition-all hover:scale-110 active:scale-95"
                                              title="ערוך"
                                              aria-label="ערוך"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <span className="px-2.5 py-1.5 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                          <Repeat className="w-3.5 h-3.5" />
                                          {exercise.sets_count} סטים
                                        </span>
                                        <span className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                          <Target className="w-3.5 h-3.5" />
                                          {exercise.reps_range} חזרות
                                        </span>
                                        <span className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                          <Clock className="w-3.5 h-3.5" />
                                          {formatRestTime(exercise.rest_seconds)}
                                        </span>
                                        {exercise.target_weight && (
                                          <span className="px-2.5 py-1.5 bg-primary-100 border border-primary-300 text-primary-700 rounded-lg text-xs font-bold">
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
                                className="w-full mt-3 p-3 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 hover:bg-primary-50 hover:border-primary-400 transition-all flex items-center justify-center gap-2 font-semibold text-sm"
                              >
                                <Plus className="w-4 h-4" />
                                הוסף תרגיל
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
              className="premium-card overflow-hidden"
              onClick={() => toggleRow(day.id)}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-controls={`mobile-day-details-${day.id}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleRow(day.id);
                }
              }}
            >
              <div className="p-4 border-b border-border-subtle">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                      {day.day_number}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{day.day_name || `יום ${day.day_number}`}</div>
                      {day.focus && (
                        <div className="text-xs text-muted flex items-center gap-1 mt-1">
                          <Target className="w-3 h-3 text-primary-500" />
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
                    <Dumbbell className="w-4 h-4 text-primary-500" />
                    <span className="text-foreground">{exercises.length} תרגילים</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Repeat className="w-4 h-4 text-primary-400" />
                    <span className="text-foreground">{completion.count}/{completion.required}</span>
                  </div>
                  {volume > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-primary-400" />
                      <span className="text-foreground">{volume.toLocaleString()} ק״ג</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 h-2.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      progressPercent >= 100 
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600' 
                        : progressPercent >= 50
                        ? 'bg-gradient-to-r from-primary-400 to-primary-500'
                        : 'bg-gradient-to-r from-primary-300 to-primary-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(progressPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
              {isExpanded && (
                <div id={`mobile-day-details-${day.id}`} className="p-4 space-y-3 bg-surface-light animate-fade-in" role="region">
                  {/* Day completion button for mobile */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-light">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base text-foreground">
                        ביצוע שבועי: {completion.count}/{completion.required}
                      </span>
                      {completion.count >= completion.required && (
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-bold border border-primary-300">
                          <Check className="w-3 h-3 inline mr-1" />
                          הושלם
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDayComplete(day.id);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
                        completion.count >= completion.required
                          ? 'bg-muted-500 hover:bg-muted-600 text-white'
                          : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white shadow-lg'
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
                        className="p-3 rounded-xl border-2 border-border-light bg-elevated hover:border-primary-300 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary-50 text-primary-700 border border-primary-200">
                            <span className="text-xs font-bold">{exIndex + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-bold text-sm text-foreground">
                                {exerciseName}
                              </h4>
                              {editingExercise !== exercise.id && (
                                <div className="flex gap-1">
                                  {exercise.exercise?.instructions && (
                                    <button
                                      onClick={() => onShowInstructions(exerciseName, exercise.exercise?.instructions)}
                                      className="p-1.5 text-primary-500 hover:bg-primary-100 rounded transition-all"
                                    >
                                      <BookOpen className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onStartEditing(exercise)}
                                    className="p-1.5 text-muted hover:text-primary-500 hover:bg-primary-100 rounded transition-all"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                              <span className="px-2 py-0.5 bg-primary-50 border border-primary-200 text-primary-700 rounded font-semibold">{exercise.sets_count} סטים</span>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded font-semibold">{exercise.reps_range}</span>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded font-semibold">{formatRestTime(exercise.rest_seconds)}</span>
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
                      className="w-full mt-3 p-3 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 hover:bg-primary-50 hover:border-primary-400 transition-all flex items-center justify-center gap-2 font-semibold text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      הוסף תרגיל
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
