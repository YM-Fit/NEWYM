import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { getWeekStartDate } from '../utils/workoutPlanUtils';
import toast from 'react-hot-toast';

export interface WeeklyExecution {
  id: string;
  plan_id: string;
  day_id: string;
  week_start_date: string;
  execution_date: string;
  completed_at: string | null;
  workout_id: string | null;
  notes: string | null;
  created_at: string;
}

interface UseWorkoutPlanWeeklyExecutionsProps {
  planId: string | null;
  dayId: string | null;
  enabled?: boolean;
}

export function useWorkoutPlanWeeklyExecutions({
  planId,
  dayId,
  enabled = true,
}: UseWorkoutPlanWeeklyExecutionsProps) {
  const [executions, setExecutions] = useState<WeeklyExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);

  // Get current week start date
  useEffect(() => {
    if (enabled) {
      const weekStart = getWeekStartDate(new Date());
      setCurrentWeekStart(weekStart);
    }
  }, [enabled]);

  // Load executions for current week
  const loadExecutions = useCallback(async () => {
    if (!planId || !dayId || !enabled || !currentWeekStart) {
      setExecutions([]);
      return;
    }

    setLoading(true);
    try {
      const weekStartStr = currentWeekStart.toISOString().split('T')[0];

      // Check if table exists before querying (safety check)
      // Note: This is a simple check - in production, migrations should be verified separately
      const { data: executionsData, error } = await supabase
        .from('workout_plan_weekly_executions')
        .select('*')
        .eq('plan_id', planId)
        .eq('day_id', dayId)
        .eq('week_start_date', weekStartStr)
        .order('execution_date', { ascending: false });

      if (error) {
        // If table doesn't exist, log warning but don't show error to user
        if (error.code === '42P01') {
          logger.warn('workout_plan_weekly_executions table does not exist yet', error, 'useWorkoutPlanWeeklyExecutions');
          setExecutions([]);
          return;
        }
        logger.error('Error loading weekly executions', error, 'useWorkoutPlanWeeklyExecutions');
        toast.error('שגיאה בטעינת ביצועים שבועיים');
        setExecutions([]);
        return;
      }

      setExecutions(executionsData || []);
    } catch (error) {
      logger.error('Error loading weekly executions', error, 'useWorkoutPlanWeeklyExecutions');
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  }, [planId, dayId, enabled, currentWeekStart]);

  // Load executions when dependencies change
  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  // Mark day as complete
  const markDayComplete = useCallback(async (workoutId?: string | null, notes?: string) => {
    if (!planId || !dayId || !enabled || !currentWeekStart) {
      toast.error('חסרים פרטים לשמירת ביצוע');
      return false;
    }

    try {
      const weekStartStr = currentWeekStart.toISOString().split('T')[0];
      const executionDate = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('workout_plan_weekly_executions')
        .insert({
          plan_id: planId,
          day_id: dayId,
          week_start_date: weekStartStr,
          execution_date: executionDate,
          completed_at: new Date().toISOString(),
          workout_id: workoutId || null,
          notes: notes || null,
        } as any)
        .select()
        .single();

      if (error) {
        // If table doesn't exist, log warning
        if (error.code === '42P01') {
          logger.warn('workout_plan_weekly_executions table does not exist yet', error, 'useWorkoutPlanWeeklyExecutions');
          toast.error('טבלת ביצועים שבועיים עדיין לא קיימת. אנא הפעל את המיגרציות.');
          return false;
        }
        logger.error('Error marking day complete', error, 'useWorkoutPlanWeeklyExecutions');
        toast.error('שגיאה בשמירת ביצוע');
        return false;
      }

      // Reload executions
      await loadExecutions();
      return true;
    } catch (error) {
      logger.error('Error marking day complete', error, 'useWorkoutPlanWeeklyExecutions');
      toast.error('שגיאה בשמירת ביצוע');
      return false;
    }
  }, [planId, dayId, enabled, currentWeekStart, loadExecutions]);

  // Unmark day as complete (delete execution)
  const unmarkDayComplete = useCallback(async (executionId: string) => {
    if (!enabled) return false;

    try {
      const { error } = await supabase
        .from('workout_plan_weekly_executions')
        .delete()
        .eq('id', executionId);

      if (error) {
        logger.error('Error unmarking day complete', error, 'useWorkoutPlanWeeklyExecutions');
        toast.error('שגיאה בביטול ביצוע');
        return false;
      }

      // Reload executions
      await loadExecutions();
      return true;
    } catch (error) {
      logger.error('Error unmarking day complete', error, 'useWorkoutPlanWeeklyExecutions');
      toast.error('שגיאה בביטול ביצוע');
      return false;
    }
  }, [enabled, loadExecutions]);

  // Get execution count for current week
  const getExecutionCount = useCallback((): number => {
    return executions.length;
  }, [executions]);

  // Check if day is completed for current week
  const isDayCompleted = useCallback((): boolean => {
    return executions.length > 0;
  }, [executions]);

  return {
    executions,
    loading,
    currentWeekStart,
    markDayComplete,
    unmarkDayComplete,
    getExecutionCount,
    isDayCompleted,
    reloadExecutions: loadExecutions,
  };
}
