import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { Calendar, ChevronDown, ChevronUp, Check, Clock, Dumbbell } from 'lucide-react';
import { formatWeekRange, getWeekStartDate } from '../../utils/workoutPlanUtils';

interface WeeklyExecution {
  id: string;
  plan_id: string;
  day_id: string;
  week_start_date: string;
  execution_date: string;
  completed_at: string | null;
  workout_id: string | null;
  notes: string | null;
  created_at: string;
  day?: {
    id: string;
    day_number: number;
    day_name: string | null;
  };
}

interface WorkoutPlanHistoryProps {
  planId: string;
  onClose: () => void;
}

export default function WorkoutPlanHistory({ planId, onClose }: WorkoutPlanHistoryProps) {
  const [executions, setExecutions] = useState<WeeklyExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHistory();
  }, [planId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Check if table exists before querying
      const { data, error } = await supabase
        .from('workout_plan_weekly_executions')
        .select(`
          *,
          day:day_id(
            id,
            day_number,
            day_name
          )
        `)
        .eq('plan_id', planId)
        .order('week_start_date', { ascending: false })
        .order('execution_date', { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116' || 
            error.message?.includes('does not exist') || 
            error.message?.includes('relation') ||
            error.message?.includes('Could not find')) {
          logger.warn('workout_plan_weekly_executions table does not exist yet', error, 'WorkoutPlanHistory');
          setExecutions([]);
          setLoading(false);
          return;
        }
        logger.error('Error loading history', error, 'WorkoutPlanHistory');
        setExecutions([]);
        setLoading(false);
        return;
      }

      setExecutions((data || []) as WeeklyExecution[]);
    } catch (error) {
      logger.error('Error loading history', error, 'WorkoutPlanHistory');
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  // Group executions by week
  const groupedByWeek = executions.reduce((acc, execution) => {
    const weekKey = execution.week_start_date;
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(execution);
    return acc;
  }, {} as Record<string, WeeklyExecution[]>);

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface0 rounded-2xl p-6 w-full max-w-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-muted600">טוען היסטוריה...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-surface0 rounded-2xl p-4 md:p-6 w-full max-w-2xl my-4 md:my-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-muted900">היסטוריית ביצועים</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface100 rounded-xl transition-all duration-300"
            aria-label="סגור"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {Object.keys(groupedByWeek).length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-muted400 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted900">אין היסטוריה עדיין</p>
            <p className="text-sm text-muted600 mt-2">ביצועים יופיעו כאן לאחר שתסמן ימים כהושלמו</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
            {Object.entries(groupedByWeek)
              .sort((a, b) => b[0].localeCompare(a[0])) // Sort by week_start_date descending
              .map(([weekKey, weekExecutions]) => {
                const weekStart = new Date(weekKey);
                const weekRange = formatWeekRange(weekStart);
                const isExpanded = expandedWeeks.has(weekKey);

                return (
                  <div
                    key={weekKey}
                    className="premium-card-static overflow-hidden transition-all duration-300"
                  >
                    <div
                      className="p-4 cursor-pointer hover:bg-surface100 transition-colors"
                      onClick={() => toggleWeek(weekKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-muted900">{weekRange}</div>
                            <div className="text-sm text-muted600">
                              {weekExecutions.length} ביצוע{weekExecutions.length !== 1 ? 'ים' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-emerald-400" />
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-2 bg-surface50 border-t border-border200">
                        {weekExecutions.map((execution, execIndex) => {
                          const day = execution.day as { day_number: number; day_name: string | null } | undefined;
                          return (
                            <div
                              key={execution.id || `exec-${weekKey}-${execIndex}`}
                              className="p-3 bg-surface0 rounded-xl border border-border200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-muted900">
                                      יום {day?.day_number || '?'} {day?.day_name ? `- ${day.day_name}` : ''}
                                    </div>
                                    <div className="text-xs text-muted600 flex items-center gap-2 mt-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(execution.execution_date)}
                                      {execution.completed_at && (
                                        <>
                                          <Clock className="w-3 h-3 mr-2" />
                                          {formatTime(execution.completed_at)}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                              </div>
                              {execution.notes && (
                                <div className="mt-2 pt-2 border-t border-border200">
                                  <p className="text-xs text-muted600">{execution.notes}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
