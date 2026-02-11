import { ArrowRight, Dumbbell, Copy, Edit2, Trash2, Calendar, User, Sparkles, List, Table2, Search, Filter, ArrowUpDown, X } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

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
  onRefresh?: () => void;
}

type SortField = 'date' | 'volume' | 'exercises';
type SortDirection = 'asc' | 'desc';

export default function WorkoutsList({
  trainee,
  workouts,
  onBack,
  onViewWorkout,
  onEditWorkout,
  onDuplicateWorkout,
  onWorkoutsUpdated,
  onRefresh
}: WorkoutsListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<'all' | 'trainer' | 'self'>('all');
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);

  // Refresh data on mount to ensure we have the latest workouts
  useEffect(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Filter and sort workouts
  const filteredAndSortedWorkouts = useMemo(() => {
    let filtered = [...workouts];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(w => 
        filterType === 'trainer' ? !w.isSelfRecorded : w.isSelfRecorded
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w => 
        w.exercises.some(ex => ex.name.toLowerCase().includes(query)) ||
        new Date(w.date).toLocaleDateString('he-IL').includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'volume':
          comparison = a.totalVolume - b.totalVolume;
          break;
        case 'exercises':
          comparison = a.exercises.length - b.exercises.length;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [workouts, searchQuery, sortField, sortDirection, filterType]);

  const handleDeleteWorkout = useCallback(async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Use toast for confirmation instead of native confirm
    const confirmed = await new Promise<boolean>((resolve) => {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full glass-card shadow-dark-lg pointer-events-auto flex flex-col`} dir="rtl">
          <div className="p-4">
            <h3 className="text-lg font-bold text-foreground mb-2">מחיקת אימון</h3>
            <p className="text-muted">האם אתה בטוח שברצונך למחוק אימון זה? הפעולה אינה ניתנת לביטול!</p>
          </div>
          <div className="flex border-t border-border">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="flex-1 p-4 text-muted hover:text-foreground hover:bg-surface/50 transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="flex-1 p-4 text-red-400 hover:bg-red-500/15 transition-colors font-semibold"
            >
              מחק
            </button>
          </div>
        </div>
      ), { duration: Infinity });
    });

    if (!confirmed) return;

    setDeletingWorkoutId(workoutId);
    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) {
        logger.error('Error deleting workout', { error, workoutId }, 'WorkoutsList');
        toast.error('שגיאה במחיקת האימון');
      } else {
        toast.success('האימון נמחק בהצלחה');
        onWorkoutsUpdated();
      }
    } catch (error) {
      logger.error('Error deleting workout', { error, workoutId }, 'WorkoutsList');
      toast.error('שגיאה במחיקת האימון');
    } finally {
      setDeletingWorkoutId(null);
    }
  }, [onWorkoutsUpdated]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const handleViewModeChange = useCallback((mode: 'list' | 'table') => {
    setViewMode(mode);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('all');
    setSortField('date');
    setSortDirection('desc');
  }, []);

  const hasActiveFilters = searchQuery.trim() !== '' || filterType !== 'all' || sortField !== 'date' || sortDirection !== 'desc';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="premium-card-static p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 sm:p-3 rounded-xl bg-surface text-muted hover:text-foreground hover:bg-elevated transition-all"
                aria-label="חזור"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary-400" />
                  <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">אימונים</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{trainee.name}</h1>
                <p className="text-sm text-muted">
                  {filteredAndSortedWorkouts.length} מתוך {workouts.length} אימונים
                </p>
              </div>
            </div>
            {workouts.length > 0 && (
              <div className="flex gap-1 bg-surface p-1 rounded-xl border border-border">
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-primary-500/15 text-primary-400' : 'text-muted hover:text-foreground'
                  }`}
                  title="תצוגת רשימה"
                  aria-label="תצוגת רשימה"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('table')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'table' ? 'bg-primary-500/15 text-primary-400' : 'text-muted hover:text-foreground'
                  }`}
                  title="תצוגת טבלה"
                  aria-label="תצוגת טבלה"
                >
                  <Table2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Search and Filters */}
          {workouts.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי תרגיל או תאריך..."
                  className="w-full pr-10 pl-4 py-2.5 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                />
              </div>

              {/* Filter by type */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    filterType === 'all'
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                      : 'bg-surface text-muted border border-border hover:bg-elevated'
                  }`}
                >
                  הכל
                </button>
                <button
                  onClick={() => setFilterType('trainer')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    filterType === 'trainer'
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                      : 'bg-surface text-muted border border-border hover:bg-elevated'
                  }`}
                >
                  מאמן
                </button>
                <button
                  onClick={() => setFilterType('self')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    filterType === 'self'
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'bg-surface text-muted border border-border hover:bg-elevated'
                  }`}
                >
                  עצמאי
                </button>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface text-muted border border-border hover:bg-elevated hover:text-foreground transition-all flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  נקה
                </button>
              )}
            </div>
          )}

          {/* Sort controls */}
          {workouts.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted">מיון לפי:</span>
              <button
                onClick={() => handleSort('date')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  sortField === 'date'
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'bg-surface text-muted hover:bg-elevated'
                }`}
              >
                תאריך
                {sortField === 'date' && (
                  <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                )}
              </button>
              <button
                onClick={() => handleSort('volume')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  sortField === 'volume'
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'bg-surface text-muted hover:bg-elevated'
                }`}
              >
                נפח
                {sortField === 'volume' && (
                  <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                )}
              </button>
              <button
                onClick={() => handleSort('exercises')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  sortField === 'exercises'
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'bg-surface text-muted hover:bg-elevated'
                }`}
              >
                תרגילים
                {sortField === 'exercises' && (
                  <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {workouts.length > 0 ? (
        filteredAndSortedWorkouts.length > 0 ? (
          viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredAndSortedWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="premium-card-static p-5 hover:border-border-hover transition-all cursor-pointer group"
                onClick={() => onViewWorkout(workout)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl ${workout.isSelfRecorded ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-primary-500/15 border border-primary-500/30'}`}>
                        {workout.isSelfRecorded ? (
                          <User className="h-5 w-5 text-blue-400" />
                        ) : (
                          <Dumbbell className="h-5 w-5 text-primary-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {new Date(workout.date).toLocaleDateString('he-IL', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>
                          {workout.isSelfRecorded && (
                            <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                              אימון עצמאי
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted">
                          {workout.exercises.length} תרגילים
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">נפח כולל:</span>
                        <span className="font-semibold text-primary-400">
                          {workout.totalVolume.toLocaleString()} ק״ג
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {workout.exercises.slice(0, 3).map((ex, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-surface text-foreground px-2 py-1 rounded-lg border border-border"
                          >
                            {ex.name}
                          </span>
                        ))}
                        {workout.exercises.length > 3 && (
                          <span className="text-xs bg-surface text-muted px-2 py-1 rounded-lg border border-border">
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
                      className="p-2 text-blue-400 hover:bg-blue-500/15 rounded-lg transition-all"
                      title="שכפל אימון"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditWorkout(workout);
                      }}
                      className="p-2 text-muted hover:bg-elevated hover:text-foreground rounded-lg transition-all"
                      title="ערוך אימון"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteWorkout(workout.id, e)}
                      disabled={deletingWorkoutId === workout.id}
                      className="p-2 text-red-400 hover:bg-red-500/15 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <tr className="border-b border-border">
                      <th className="text-right py-4 px-4 text-sm font-semibold text-muted">
                        <button
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          תאריך
                          {sortField === 'date' && (
                            <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                      </th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-muted">סוג</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-muted">
                        <button
                          onClick={() => handleSort('exercises')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          תרגילים
                          {sortField === 'exercises' && (
                            <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                      </th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-muted">
                        <button
                          onClick={() => handleSort('volume')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          נפח כולל
                          {sortField === 'volume' && (
                            <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                      </th>
                      <th className="text-right py-4 px-4 text-sm font-semibold text-muted">תרגילים עיקריים</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-muted">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedWorkouts.map((workout, index) => {
                      // Find previous workout in the original sorted list (by date desc)
                      const sortedWorkouts = [...workouts].sort((a, b) => 
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                      );
                      const workoutIndex = sortedWorkouts.findIndex(w => w.id === workout.id);
                      const prevWorkout = workoutIndex > 0 ? sortedWorkouts[workoutIndex - 1] : null;
                      const volumeChange = prevWorkout ? workout.totalVolume - prevWorkout.totalVolume : null;
                    return (
                      <tr
                        key={workout.id}
                        className="border-b border-border/50 hover:bg-surface/30 transition-all cursor-pointer"
                        onClick={() => onViewWorkout(workout)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${workout.isSelfRecorded ? 'bg-blue-500/15' : 'bg-primary-500/15'}`}>
                              {workout.isSelfRecorded ? (
                                <User className="h-4 w-4 text-blue-400" />
                              ) : (
                                <Dumbbell className="h-4 w-4 text-primary-400" />
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-foreground block">
                                {new Date(workout.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                              <span className="text-xs text-muted">
                                {new Date(workout.date).toLocaleDateString('he-IL', { year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded-lg ${
                            workout.isSelfRecorded
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                          }`}>
                            {workout.isSelfRecorded ? 'עצמאי' : 'מאמן'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-foreground bg-surface px-3 py-1 rounded-lg">
                            {workout.exercises.length}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-primary-400">
                              {workout.totalVolume.toLocaleString()}
                            </span>
                            {volumeChange !== null && volumeChange !== 0 && (
                              <span className={`text-xs font-medium ${volumeChange > 0 ? 'text-primary-400' : 'text-red-400'}`}>
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
                                className="text-xs bg-surface text-foreground px-2 py-0.5 rounded"
                              >
                                {ex.name}
                              </span>
                            ))}
                            {workout.exercises.length > 2 && (
                              <span className="text-xs text-muted">
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
                              className="p-1.5 text-blue-400 hover:bg-blue-500/15 rounded-lg transition-all"
                              title="שכפל"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditWorkout(workout);
                              }}
                              className="p-1.5 text-muted hover:bg-elevated hover:text-foreground rounded-lg transition-all"
                              title="ערוך"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteWorkout(workout.id, e)}
                              disabled={deletingWorkoutId === workout.id}
                              className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center">
              <Search className="h-8 w-8 text-muted" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">לא נמצאו תוצאות</h3>
            <p className="text-muted mb-6">נסה לשנות את החיפוש או הסינון</p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="btn-primary px-6 py-3 rounded-xl font-medium"
              >
                נקה סינון
              </button>
            )}
          </div>
        )
      ) : (
        <div className="text-center py-12 premium-card-static">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">אין אימונים עדיין</h3>
          <p className="text-muted mb-6">התחל לעקוב אחר האימונים של {trainee.name}</p>
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
