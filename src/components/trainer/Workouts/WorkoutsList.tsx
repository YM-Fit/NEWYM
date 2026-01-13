import { ArrowRight, Dumbbell, Copy, Edit2, Trash2, Calendar, User, Sparkles, List, Table2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface Workout {
  id: string;
  date: string;
  exercises: Array<{
    name: string;
    sets: number;
  }>;
  totalVolume: number;
  duration: number;
  isSelfRecorded?: boolean;
}

interface WorkoutsListProps {
  trainee: any;
  workouts: Workout[];
  onBack: () => void;
  onViewWorkout: (workout: Workout) => void;
  onEditWorkout: (workout: Workout) => void;
  onDuplicateWorkout: (workout: Workout) => void;
  onWorkoutsUpdated: () => void;
}

export default function WorkoutsList({
  trainee,
  workouts,
  onBack,
  onViewWorkout,
  onEditWorkout,
  onDuplicateWorkout,
  onWorkoutsUpdated
}: WorkoutsListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  const handleDeleteWorkout = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('האם אתה בטוח שברצונך למחוק אימון זה? הפעולה אינה ניתנת לביטול!')) {
      return;
    }

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);

    if (!error) {
      onWorkoutsUpdated();
    } else {
      alert('שגיאה במחיקת האימון');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="premium-card-static p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">אימונים</span>
              </div>
              <h1 className="text-2xl font-bold text-white">{trainee.name}</h1>
              <p className="text-zinc-500">{workouts.length} אימונים כולל</p>
            </div>
          </div>
          {workouts.length > 0 && (
            <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl border border-zinc-700/50">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
                }`}
                title="תצוגת רשימה"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
                }`}
                title="תצוגת טבלה"
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {workouts.length > 0 ? (
        viewMode === 'list' ? (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="premium-card-static p-5 hover:border-zinc-600/50 transition-all cursor-pointer group"
                onClick={() => onViewWorkout(workout)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl ${workout.isSelfRecorded ? 'bg-cyan-500/15 border border-cyan-500/30' : 'bg-emerald-500/15 border border-emerald-500/30'}`}>
                        {workout.isSelfRecorded ? (
                          <User className="h-5 w-5 text-cyan-400" />
                        ) : (
                          <Dumbbell className="h-5 w-5 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">
                            {new Date(workout.date).toLocaleDateString('he-IL', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>
                          {workout.isSelfRecorded && (
                            <span className="text-xs bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">
                              אימון עצמאי
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500">
                          {workout.exercises.length} תרגילים
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">נפח כולל:</span>
                        <span className="font-semibold text-emerald-400">
                          {workout.totalVolume.toLocaleString()} ק״ג
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {workout.exercises.slice(0, 3).map((ex, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-zinc-800/50 text-zinc-300 px-2 py-1 rounded-lg border border-zinc-700/50"
                          >
                            {ex.name}
                          </span>
                        ))}
                        {workout.exercises.length > 3 && (
                          <span className="text-xs bg-zinc-800/50 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-700/50">
                            +{workout.exercises.length - 3} עוד
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 mr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateWorkout(workout);
                      }}
                      className="p-2 text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all"
                      title="שכפל אימון"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditWorkout(workout);
                      }}
                      className="p-2 text-zinc-400 hover:bg-zinc-700/50 hover:text-white rounded-lg transition-all"
                      title="ערוך אימון"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteWorkout(workout.id, e)}
                      className="p-2 text-red-400 hover:bg-red-500/15 rounded-lg transition-all"
                      title="מחק אימון"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="premium-card-static overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-700/50">
                    <th className="text-right py-4 px-4 text-sm font-semibold text-zinc-400">תאריך</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-zinc-400">סוג</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-zinc-400">תרגילים</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-zinc-400">נפח כולל</th>
                    <th className="text-right py-4 px-4 text-sm font-semibold text-zinc-400">תרגילים עיקריים</th>
                    <th className="text-center py-4 px-4 text-sm font-semibold text-zinc-400">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {workouts.map((workout, index) => {
                    const prevWorkout = workouts[index + 1];
                    const volumeChange = prevWorkout ? workout.totalVolume - prevWorkout.totalVolume : null;
                    return (
                      <tr
                        key={workout.id}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-all cursor-pointer"
                        onClick={() => onViewWorkout(workout)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${workout.isSelfRecorded ? 'bg-cyan-500/15' : 'bg-emerald-500/15'}`}>
                              {workout.isSelfRecorded ? (
                                <User className="h-4 w-4 text-cyan-400" />
                              ) : (
                                <Dumbbell className="h-4 w-4 text-emerald-400" />
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-white block">
                                {new Date(workout.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {new Date(workout.date).toLocaleDateString('he-IL', { year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded-lg ${
                            workout.isSelfRecorded
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {workout.isSelfRecorded ? 'עצמאי' : 'מאמן'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-white bg-zinc-800/50 px-3 py-1 rounded-lg">
                            {workout.exercises.length}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-emerald-400">
                              {workout.totalVolume.toLocaleString()}
                            </span>
                            {volumeChange !== null && volumeChange !== 0 && (
                              <span className={`text-xs font-medium ${volumeChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {volumeChange > 0 ? '+' : ''}{volumeChange.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {workout.exercises.slice(0, 2).map((ex, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-zinc-800/50 text-zinc-300 px-2 py-0.5 rounded"
                              >
                                {ex.name}
                              </span>
                            ))}
                            {workout.exercises.length > 2 && (
                              <span className="text-xs text-zinc-500">
                                +{workout.exercises.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateWorkout(workout);
                              }}
                              className="p-1.5 text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all"
                              title="שכפל"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditWorkout(workout);
                              }}
                              className="p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-white rounded-lg transition-all"
                              title="ערוך"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteWorkout(workout.id, e)}
                              className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition-all"
                              title="מחק"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12 premium-card-static">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">אין אימונים עדיין</h3>
          <p className="text-zinc-500 mb-6">התחל לעקוב אחר האימונים של {trainee.name}</p>
          <button
            onClick={onBack}
            className="btn-primary px-6 py-3 rounded-xl font-medium"
          >
            חזור לפרופיל
          </button>
        </div>
      )}
    </div>
  );
}
