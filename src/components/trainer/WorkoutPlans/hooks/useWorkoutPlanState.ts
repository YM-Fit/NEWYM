import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import type { WorkoutDay } from '../types';
import { createEmptyDay } from '../types';

export function useWorkoutPlanState(traineeId: string) {
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minimizedDays, setMinimizedDays] = useState<Set<string>>(new Set());

  const loadActivePlan = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: planData } = await supabase
        .from('trainee_workout_plans')
        .select('*')
        .eq('trainee_id', traineeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planData) {
        setActivePlanId(planData.id);
        setPlanName(planData.name || '');
        setPlanDescription(planData.description || '');
        setDaysPerWeek(planData.days_per_week || 3);
        await loadPlanDays(planData.id);
      }
    } catch (error) {
      logger.error('Error loading active plan', error, 'WorkoutPlanBuilder');
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  const loadPlanDays = useCallback(async (planId: string) => {
    try {
      const { data: daysData } = await supabase
        .from('workout_plan_days')
        .select('*')
        .eq('plan_id', planId)
        .order('order_index', { ascending: true });

      if (!daysData || daysData.length === 0) {
        setDays([]);
        return;
      }

      // Load days with exercises and sets (simplified - full implementation would include all relations)
      const loadedDays: WorkoutDay[] = daysData.map((day) => ({
        tempId: day.id,
        day_number: day.day_number,
        day_name: day.day_name || '',
        focus: day.focus || '',
        notes: day.notes || '',
        exercises: [], // Will be loaded separately if needed
      }));

      setDays(loadedDays);
    } catch (error) {
      logger.error('Error loading plan days', error, 'WorkoutPlanBuilder');
      toast.error('שגיאה בטעינת התוכנית');
    }
  }, []);

  const addDay = useCallback(() => {
    const newDay = createEmptyDay(days.length + 1);
    setDays([...days, newDay]);
    setSelectedDay(newDay);
  }, [days.length]);

  const removeDay = useCallback((dayId: string) => {
    if (!confirm('האם למחוק את היום?')) return;
    setDays(days.filter(d => d.tempId !== dayId));
    if (selectedDay?.tempId === dayId) {
      setSelectedDay(null);
    }
  }, [days, selectedDay]);

  const duplicateDay = useCallback((day: WorkoutDay) => {
    const newDay: WorkoutDay = {
      ...day,
      tempId: Date.now().toString() + Math.random(),
      day_number: days.length + 1,
      day_name: day.day_name ? `${day.day_name} (עותק)` : '',
      exercises: day.exercises.map(ex => ({
        ...ex,
        tempId: Date.now().toString() + Math.random(),
        sets: ex.sets.map(set => ({ ...set, id: Date.now().toString() + Math.random() })),
      })),
    };
    setDays([...days, newDay]);
    toast.success('יום שוכפל בהצלחה');
  }, [days]);

  const updateDay = useCallback((dayId: string, field: keyof WorkoutDay, value: any) => {
    setDays(days.map(d => d.tempId === dayId ? { ...d, [field]: value } : d));
    if (selectedDay?.tempId === dayId) {
      setSelectedDay({ ...selectedDay, [field]: value });
    }
  }, [days, selectedDay]);

  const toggleMinimizeDay = useCallback((dayId: string) => {
    const newMinimized = new Set(minimizedDays);
    if (newMinimized.has(dayId)) {
      newMinimized.delete(dayId);
    } else {
      newMinimized.add(dayId);
    }
    setMinimizedDays(newMinimized);
  }, [minimizedDays]);

  return {
    planName,
    planDescription,
    daysPerWeek,
    days,
    selectedDay,
    activePlanId,
    loading,
    minimizedDays,
    setPlanName,
    setPlanDescription,
    setDaysPerWeek,
    setDays,
    setSelectedDay,
    setActivePlanId,
    setLoading,
    setMinimizedDays,
    loadActivePlan,
    loadPlanDays,
    addDay,
    removeDay,
    duplicateDay,
    updateDay,
    toggleMinimizeDay,
  };
}
