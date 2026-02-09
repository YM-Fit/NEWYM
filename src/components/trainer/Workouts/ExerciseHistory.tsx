import { X, Calendar, TrendingUp, Dumbbell, Trophy, ArrowUp, Copy, Filter, BarChart3, TrendingDown, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { LazyChart } from '../../common/LazyChart';
import { usePagination } from '../../../hooks/usePagination';

interface ExerciseHistoryProps {
  traineeId: string;
  traineeName: string;
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
  onLoadData?: (sets: HistorySet[]) => void;
}

interface HistorySet {
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number;
  failure?: boolean;
  set_type: string;
  superset_weight?: number;
  superset_reps?: number;
  dropset_weight?: number;
  dropset_reps?: number;
}

interface WorkoutHistory {
  workout_id: string;
  workout_date: string;
  sets: HistorySet[];
}

export default function ExerciseHistory({
  traineeId,
  traineeName,
  exerciseId,
  exerciseName,
  onClose,
  onLoadData
}: ExerciseHistoryProps) {
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<'weight' | 'volume' | 'reps'>('volume');
  const [sortBy, setSortBy] = useState<'date' | 'weight' | 'volume'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  
  // Pagination for history
  const { paginatedData: paginatedHistory, currentPage, totalPages, hasNextPage, hasPrevPage, nextPage, prevPage, goToPage } = usePagination(history, { initialPageSize: 5 });

  // Define getTotalVolume before using it in useMemo hooks
  const getTotalVolume = useCallback((sets: HistorySet[]) => {
    return sets.reduce((total, set) => {
      let volume = set.weight * set.reps;

      if (set.set_type === 'superset' && set.superset_weight && set.superset_reps) {
        volume += set.superset_weight * set.superset_reps;
      }

      if (set.set_type === 'dropset' && set.dropset_weight && set.dropset_reps) {
        volume += set.dropset_weight * set.dropset_reps;
      }

      return total + volume;
    }, 0);
  }, []);

  // Calculate personal records with dates
  const personalRecords = useMemo(() => {
    if (history.length === 0) return null;
    
    let maxWeight = 0;
    let maxVolume = 0;
    let maxReps = 0;
    let maxWeightDate = '';
    let maxVolumeDate = '';
    let maxRepsDate = '';
    
    history.forEach(workout => {
      workout.sets.forEach(set => {
        if (set.weight > maxWeight) {
          maxWeight = set.weight;
          maxWeightDate = workout.workout_date;
        }
        if (set.reps > maxReps) {
          maxReps = set.reps;
          maxRepsDate = workout.workout_date;
        }
        const volume = set.weight * set.reps;
        if (volume > maxVolume) {
          maxVolume = volume;
          maxVolumeDate = workout.workout_date;
        }
      });
    });
    
    return { maxWeight, maxVolume, maxReps, maxWeightDate, maxVolumeDate, maxRepsDate };
  }, [history, getTotalVolume]);
  
  // Calculate trends
  const trends = useMemo(() => {
    if (history.length < 2) return null;
    
    const sorted = [...history].sort((a, b) => 
      new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
    );
    
    const recent = sorted.slice(-3);
    const previous = sorted.slice(-6, -3);
    
    if (previous.length === 0) return null;
    
    const recentAvgVolume = recent.reduce((sum, w) => sum + getTotalVolume(w.sets), 0) / recent.length;
    const previousAvgVolume = previous.reduce((sum, w) => sum + getTotalVolume(w.sets), 0) / previous.length;
    const volumeChange = previousAvgVolume > 0 ? ((recentAvgVolume - previousAvgVolume) / previousAvgVolume) * 100 : 0;
    
    const recentAvgWeight = recent.reduce((sum, w) => {
      const maxWeight = Math.max(...w.sets.map(s => s.weight));
      return sum + maxWeight;
    }, 0) / recent.length;
    const previousAvgWeight = previous.reduce((sum, w) => {
      const maxWeight = Math.max(...w.sets.map(s => s.weight));
      return sum + maxWeight;
    }, 0) / previous.length;
    const weightChange = previousAvgWeight > 0 ? ((recentAvgWeight - previousAvgWeight) / previousAvgWeight) * 100 : 0;
    
    return { volumeChange, weightChange };
  }, [history, getTotalVolume]);
  
  // Prepare chart data
  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    
    const sorted = [...history].sort((a, b) => 
      new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
    );
    
    return sorted.map(workout => {
      const maxWeight = Math.max(...workout.sets.map(s => s.weight));
      const maxReps = Math.max(...workout.sets.map(s => s.reps));
      const totalVolume = getTotalVolume(workout.sets);
      
      return {
        date: new Date(workout.workout_date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }),
        weight: maxWeight,
        reps: maxReps,
        volume: totalVolume,
        fullDate: workout.workout_date
      };
    });
  }, [history, getTotalVolume]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const { data: workoutExercises } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        workout_id,
        workouts!inner (
          id,
          workout_date,
          is_completed
        ),
        exercise_sets (
          set_number,
          weight,
          reps,
          rpe,
          failure,
          set_type,
          superset_weight,
          superset_reps,
          dropset_weight,
          dropset_reps
        )
      `)
      .eq('trainee_id', traineeId)
      .eq('exercise_id', exerciseId)
      .eq('workouts.is_completed', true)
      .order('workouts(workout_date)', { ascending: false })
      .limit(50); // Increased limit for better analysis

    if (workoutExercises) {
      const formatted: WorkoutHistory[] = workoutExercises.map((we: any) => ({
        workout_id: we.workouts.id,
        workout_date: we.workouts.workout_date,
        sets: (we.exercise_sets || []).sort((a: any, b: any) => a.set_number - b.set_number)
      }));

      // Sort by selected criteria
      formatted.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'date':
            comparison = new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime();
            break;
          case 'weight':
            const aMaxWeight = Math.max(...a.sets.map(s => s.weight));
            const bMaxWeight = Math.max(...b.sets.map(s => s.weight));
            comparison = bMaxWeight - aMaxWeight;
            break;
          case 'volume':
            const aVolume = getTotalVolume(a.sets);
            const bVolume = getTotalVolume(b.sets);
            comparison = bVolume - aVolume;
            break;
        }
        return sortOrder === 'asc' ? -comparison : comparison;
      });

      setHistory(formatted);
    }

    setLoading(false);
  }, [traineeId, exerciseId, sortBy, sortOrder, getTotalVolume]);
  
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getBestSet = (sets: HistorySet[]) => {
    if (sets.length === 0) return null;
    return sets.reduce((best, set) => {
      const currentVolume = set.weight * set.reps;
      const bestVolume = best.weight * best.reps;
      return currentVolume > bestVolume ? set : best;
    });
  };

  return (
    <>
      {/* Overlay - not full screen, allows seeing exercise list */}
      <div 
        className="fixed inset-0 backdrop-blur-sm bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Side Panel - Minimized */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 flex flex-col shadow-2xl bg-card border-r border-border animate-slide-in-right exercise-history-panel">
        {/* Header - Minimized */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 min-w-0">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg flex-shrink-0">
                <Dumbbell className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-white truncate">{exerciseName}</h2>
                <p className="text-xs text-emerald-100 truncate">{traineeName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-all flex-shrink-0 mr-2"
              aria-label="סגור"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Personal Records with Trends */}
        {personalRecords && (
          <div className="p-2 bg-gradient-to-b from-amber-500/10 to-transparent border-b border-border space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface rounded-lg p-2 border border-amber-500/20 text-center relative">
                <Trophy className="h-3 w-3 text-amber-400 absolute top-1 left-1" />
                <div className="text-base font-bold text-foreground">{personalRecords.maxWeight}</div>
                <div className="text-[10px] text-muted">מקס ק״ג</div>
                {personalRecords.maxWeightDate && (
                  <div className="text-[9px] text-muted mt-1">
                    {new Date(personalRecords.maxWeightDate).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
              <div className="bg-surface rounded-lg p-2 border border-blue-500/20 text-center relative">
                <Trophy className="h-3 w-3 text-blue-400 absolute top-1 left-1" />
                <div className="text-base font-bold text-foreground">{personalRecords.maxReps}</div>
                <div className="text-[10px] text-muted">מקס חזרות</div>
                {personalRecords.maxRepsDate && (
                  <div className="text-[9px] text-muted mt-1">
                    {new Date(personalRecords.maxRepsDate).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
              <div className="bg-surface rounded-lg p-2 border border-emerald-500/20 text-center relative">
                <Trophy className="h-3 w-3 text-emerald-400 absolute top-1 left-1" />
                <div className="text-base font-bold text-foreground">{personalRecords.maxVolume.toLocaleString()}</div>
                <div className="text-[10px] text-muted">מקס נפח</div>
                {personalRecords.maxVolumeDate && (
                  <div className="text-[9px] text-muted mt-1">
                    {new Date(personalRecords.maxVolumeDate).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Trends */}
            {trends && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted">מגמה:</span>
                {trends.volumeChange > 0 ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{trends.volumeChange.toFixed(1)}% נפח</span>
                  </div>
                ) : trends.volumeChange < 0 ? (
                  <div className="flex items-center gap-1 text-red-400">
                    <TrendingDown className="h-3 w-3" />
                    <span>{trends.volumeChange.toFixed(1)}% נפח</span>
                  </div>
                ) : null}
                {trends.weightChange > 0 && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <ArrowUp className="h-3 w-3" />
                    <span>+{trends.weightChange.toFixed(1)}% משקל</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Chart Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowChart(!showChart)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 transition-all text-[10px] font-medium"
              >
                <BarChart3 className="h-3 w-3" />
                <span>{showChart ? 'הסתר גרף' : 'הצג גרף'}</span>
              </button>
              
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'weight' | 'volume')}
                  className="bg-surface/50 border border-border rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none"
                >
                  <option value="date">תאריך</option>
                  <option value="weight">משקל</option>
                  <option value="volume">נפח</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 bg-surface/50 hover:bg-surface border border-border rounded-lg transition-all"
                >
                  {sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 text-muted" /> : <ChevronDown className="h-3 w-3 text-muted" />}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Chart */}
        {showChart && chartData.length > 0 && (
          <div className="p-2 bg-surface/30 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'weight' | 'volume' | 'reps')}
                className="bg-surface border border-border rounded-lg px-2 py-1 text-[10px] text-foreground focus:outline-none"
              >
                <option value="volume">נפח</option>
                <option value="weight">משקל</option>
                <option value="reps">חזרות</option>
              </select>
            </div>
            <LazyChart>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)" 
                    fontSize={10}
                    tick={{ fill: 'rgba(255,255,255,0.7)' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)" 
                    fontSize={10}
                    tick={{ fill: 'rgba(255,255,255,0.7)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={chartType} 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </LazyChart>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 bg-card min-h-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
              <p className="text-muted text-xs">טוען...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center mx-auto mb-2 border border-border">
                <Calendar className="h-6 w-6 text-muted" />
              </div>
              <p className="text-foreground text-sm font-medium">אין היסטוריה</p>
              <p className="text-muted text-xs mt-1">אימון ראשון</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedHistory.map((workout, index) => {
                const bestSet = getBestSet(workout.sets);
                const totalVolume = getTotalVolume(workout.sets);
                const isLatest = index === 0;

                return (
                  <div
                    key={workout.workout_id}
                    className={`bg-surface rounded-lg p-2 border transition-all ${
                      isLatest ? 'border-emerald-500/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <div className={`p-1 rounded ${isLatest ? 'bg-emerald-500/20' : 'bg-elevated/50'}`}>
                          <Calendar className={`h-3 w-3 ${isLatest ? 'text-emerald-400' : 'text-muted'}`} />
                        </div>
                        <span className="font-semibold text-foreground text-xs">
                          {new Date(workout.workout_date).toLocaleDateString('he-IL', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                            אחרון
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs">
                        {onLoadData && (
                          <button
                            onClick={() => {
                              onLoadData(workout.sets);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-amber-400 transition-all text-[10px] font-medium"
                            title="טען"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                        <div className="flex items-center space-x-1 rtl:space-x-reverse bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/30">
                          <TrendingUp className="h-3 w-3 text-blue-400" />
                          <span className="font-semibold text-blue-400 text-xs">{totalVolume.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {(expandedWorkout === workout.workout_id ? workout.sets : workout.sets.slice(0, 3)).map((set) => {
                        const isPR = personalRecords && 
                          (set.weight === personalRecords.maxWeight || 
                           set.weight * set.reps === personalRecords.maxVolume);
                        
                        return (
                          <div
                            key={set.set_number}
                            className={`flex items-center justify-between p-1.5 rounded-lg transition-all text-xs ${
                              bestSet && set.set_number === bestSet.set_number
                                ? 'bg-amber-500/10 border border-amber-500/30'
                                : 'bg-card/50 border border-border/30'
                            }`}
                          >
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <span className="font-semibold text-muted text-[10px]">
                                {set.set_number}
                              </span>
                              {set.set_type !== 'regular' && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded border border-blue-500/30">
                                  {set.set_type === 'superset' ? 'ס' : 'ד'}
                                </span>
                              )}
                              {set.failure && (
                                <span className="text-[10px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded border border-red-500/30">🔥</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-[10px]">
                              <span className="font-bold text-foreground">
                                {set.weight}×{set.reps}
                              </span>
                              {set.rpe && (
                                <span className="text-muted bg-surface px-1 py-0.5 rounded border border-border">
                                  {set.rpe}
                                </span>
                              )}
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/30">
                                {(set.weight * set.reps).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {workout.sets.length > 3 && (
                        <button
                          onClick={() => setExpandedWorkout(expandedWorkout === workout.workout_id ? null : workout.workout_id)}
                          className="text-[10px] text-muted hover:text-foreground text-center pt-1 w-full transition-all"
                        >
                          {expandedWorkout === workout.workout_id ? 'הצג פחות' : `+${workout.sets.length - 3} עוד`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <button
                    onClick={prevPage}
                    disabled={!hasPrevPage}
                    className="px-3 py-1.5 bg-surface hover:bg-surface/80 border border-border rounded-lg text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    קודם
                  </button>
                  <span className="text-xs text-muted">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={!hasNextPage}
                    className="px-3 py-1.5 bg-surface hover:bg-surface/80 border border-border rounded-lg text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    הבא
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
