import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import type { WorkoutDay, PlanExercise, SetData } from '../types';
import { createEmptyDay } from '../types';

export interface PlanSettings {
  daysPerWeek: number;
  restDaysBetween: number; // 0-3
  includeCardio: boolean;
  cardioTypeId: string | null;
  cardioFrequency: number; // 0-7
  cardioWeeklyGoalSteps: number | null;
}

export function useWorkoutPlanState(traineeId: string) {
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [restDaysBetween, setRestDaysBetween] = useState(0);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [cardioTypeId, setCardioTypeId] = useState<string | null>(null);
  const [cardioFrequency, setCardioFrequency] = useState(0);
  const [cardioWeeklyGoalSteps, setCardioWeeklyGoalSteps] = useState<number | null>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minimizedDays, setMinimizedDays] = useState<Set<string>>(new Set());

  const loadPlanDays = useCallback(async (planId: string) => {
    try {
      // Verify that times_per_week column exists (migration check)
      // This is a safety check - in production, migrations should be verified separately
      const { data: daysData, error: daysError } = await supabase
        .from('workout_plan_days')
        .select('*')
        .eq('plan_id', planId)
        .order('order_index', { ascending: true });

      if (daysError) {
        logger.error('Error loading days', daysError, 'WorkoutPlanBuilder');
        toast.error('שגיאה בטעינת ימי התוכנית');
        return;
      }

      if (!daysData || daysData.length === 0) {
        setDays([]);
        return;
      }

      const loadedDays: WorkoutDay[] = [];
      
      for (const day of daysData as any[]) {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('workout_plan_day_exercises')
          .select(`
            *,
            exercise:exercise_id(
              id,
              name,
              muscle_group_id
            ),
            equipment:equipment_id(
              id,
              name,
              emoji
            ),
            superset_exercise:superset_exercise_id(
              id,
              name
            ),
            superset_equipment:superset_equipment_id(
              id,
              name,
              emoji
            )
          `)
          .eq('day_id', day.id)
          .order('order_index', { ascending: true });

        if (exercisesError) {
          logger.error('Error loading exercises for day', exercisesError, 'WorkoutPlanBuilder');
          // Continue with empty exercises array for this day
        }

        const planExercises: PlanExercise[] = [];
        
        if (exercisesData) {
          for (const ex of exercisesData as any[]) {
            if (!ex.exercise) {
              logger.warn('Exercise data missing for exercise_id', ex.exercise_id, 'WorkoutPlanBuilder');
              continue;
            }
            
            const setsCount = ex.sets_count || 1;
            const repsRange = ex.reps_range || '10-12';
            const reps = parseInt(repsRange.split('-')[0]) || 10;
            
            const sets: SetData[] = Array.from({ length: setsCount }, (_, i) => ({
              id: `${day.id}-${ex.id}-${i}`,
              set_number: i + 1,
              weight: ex.target_weight || 0,
              reps: reps,
              rpe: ex.target_rpe || null,
              set_type: (ex.set_type || 'regular') as 'regular' | 'superset' | 'dropset',
              failure: ex.failure || false,
              superset_exercise_id: ex.superset_exercise_id || null,
              superset_exercise_name: ex.superset_exercise?.name || null,
              superset_weight: ex.superset_weight || null,
              superset_reps: ex.superset_reps || null,
              superset_rpe: ex.superset_rpe || null,
              superset_equipment_id: ex.superset_equipment_id || null,
              superset_equipment: ex.superset_equipment || null,
              superset_dropset_weight: ex.superset_dropset_weight || null,
              superset_dropset_reps: ex.superset_dropset_reps || null,
              dropset_weight: ex.dropset_weight || null,
              dropset_reps: ex.dropset_reps || null,
              equipment_id: ex.equipment_id || null,
              equipment: ex.equipment || null,
            }));

            planExercises.push({
              tempId: `${day.id}-${ex.id}`,
              exercise: ex.exercise,
              sets: sets,
              rest_seconds: ex.rest_seconds || 90,
              notes: ex.notes || '',
            });
          }
        }

                    loadedDays.push({
                      tempId: day.id,
                      day_number: day.day_number,
                      day_name: day.day_name || '',
                      focus: day.focus || '',
                      notes: day.notes || '',
                      exercises: planExercises,
                      times_per_week: day.times_per_week ?? 1, // Load times_per_week, default to 1
                    });
      }

      setDays(loadedDays);
    } catch (error) {
      logger.error('Error loading plan days', error, 'WorkoutPlanBuilder');
      toast.error('שגיאה בטעינת התוכנית');
    }
  }, []);

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
        setRestDaysBetween(planData.rest_days_between ?? 0);
        setIncludeCardio(planData.include_cardio ?? false);
        setCardioTypeId(planData.cardio_type_id || null);
        setCardioFrequency(planData.cardio_frequency ?? 0);
        setCardioWeeklyGoalSteps(planData.cardio_weekly_goal_steps || null);
        await loadPlanDays(planData.id);
      } else {
        // No active plan found - reset state
        setActivePlanId(null);
        setPlanName('');
        setPlanDescription('');
        setDaysPerWeek(3);
        setRestDaysBetween(0);
        setIncludeCardio(false);
        setCardioTypeId(null);
        setCardioFrequency(0);
        setCardioWeeklyGoalSteps(null);
        setDays([]);
      }
    } catch (error) {
      logger.error('Error loading active plan', error, 'WorkoutPlanBuilder');
      toast.error('שגיאה בטעינת התוכנית');
    } finally {
      setLoading(false);
    }
  }, [traineeId, loadPlanDays]);

  const addDay = useCallback(() => {
    // Calculate the next day number based on existing days
    const maxDayNumber = days.length > 0 
      ? Math.max(...days.map(d => d.day_number))
      : 0;
    const newDay = createEmptyDay(maxDayNumber + 1);
    setDays([...days, newDay]);
    setSelectedDay(newDay);
  }, [days]);

  const removeDay = useCallback((dayId: string) => {
    if (!confirm('האם למחוק את היום?')) return;
    setDays(days.filter(d => d.tempId !== dayId));
    if (selectedDay?.tempId === dayId) {
      setSelectedDay(null);
    }
  }, [days, selectedDay]);

  const duplicateDay = useCallback((day: WorkoutDay) => {
    // Calculate the next day number based on existing days
    const maxDayNumber = days.length > 0 
      ? Math.max(...days.map(d => d.day_number))
      : 0;
    const newDay: WorkoutDay = {
      ...day,
      tempId: Date.now().toString() + Math.random(),
      day_number: maxDayNumber + 1,
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
    restDaysBetween,
    includeCardio,
    cardioTypeId,
    cardioFrequency,
    cardioWeeklyGoalSteps,
    days,
    selectedDay,
    activePlanId,
    loading,
    minimizedDays,
    setPlanName,
    setPlanDescription,
    setDaysPerWeek,
    setRestDaysBetween,
    setIncludeCardio,
    setCardioTypeId,
    setCardioFrequency,
    setCardioWeeklyGoalSteps,
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
