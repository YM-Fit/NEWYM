import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { HistoryEntry } from '../types/mealPlanTypes';

export function useMealPlanHistory(traineeId: string) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const loadHistory = useCallback(async (planId: string) => {
    const { data } = await supabase
      .from('meal_plan_history')
      .select('*')
      .eq('plan_id', planId)
      .order('changed_at', { ascending: false });

    setHistory(data || []);
  }, []);

  const saveToHistory = useCallback(async (planId: string, description: string, snapshot: any) => {
    await supabase.from('meal_plan_history').insert({
      plan_id: planId,
      trainee_id: traineeId,
      change_description: description,
      snapshot: snapshot,
    });
  }, [traineeId]);

  return {
    history,
    loadHistory,
    saveToHistory,
  };
}
