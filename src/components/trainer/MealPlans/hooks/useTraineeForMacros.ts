import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { ActivityLevel, Goal } from '../../../../utils/calorieCalculations';
import {
  calculateFullCalorieData,
  calculateMacros,
  calculateWaterIntake,
} from '../../../../utils/calorieCalculations';

export interface TraineeMacroData {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface UseTraineeForMacrosResult {
  data: TraineeMacroData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Load trainee data needed for TDEE and macro calculation.
 * Weight: measurements > trainee_self_weights > last_known_weight > 70
 * Height: trainees.height > 170
 * Age: from birth_date > 30
 * Gender: trainees.gender > male
 * Goal: from trainee_goals (weight) > maintenance
 */
export function useTraineeForMacros(traineeId: string | null): UseTraineeForMacrosResult {
  const [data, setData] = useState<TraineeMacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!traineeId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [traineeRes, measurementsRes, selfWeightsRes, goalsRes] = await Promise.all([
        supabase
          .from('trainees')
          .select('height, birth_date, gender, last_known_weight')
          .eq('id', traineeId)
          .maybeSingle(),
        supabase
          .from('measurements')
          .select('weight')
          .eq('trainee_id', traineeId)
          .not('weight', 'is', null)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('trainee_self_weights')
          .select('weight_kg')
          .eq('trainee_id', traineeId)
          .order('weight_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('trainee_goals')
          .select('goal_type, target_value, current_value')
          .eq('trainee_id', traineeId)
          .eq('status', 'active')
          .eq('goal_type', 'weight')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const trainee = traineeRes.data;
      const meas = measurementsRes.data;
      const selfW = selfWeightsRes.data;
      const goalRow = goalsRes.data;

      const weight =
        (meas as { weight?: number })?.weight ??
        (selfW as { weight_kg?: number })?.weight_kg ??
        (trainee as { last_known_weight?: number })?.last_known_weight ??
        70;

      const height = Number((trainee as { height?: number })?.height) || 170;

      const birthDate = (trainee as { birth_date?: string })?.birth_date;
      const age = birthDate
        ? Math.floor(
            (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          )
        : 30;
      const clampedAge = Math.max(14, Math.min(age, 100));

      const g = String((trainee as { gender?: string })?.gender || 'male').toLowerCase();
      const gender: 'male' | 'female' =
        g === 'female' || g === 'ז' || g === 'אישה' ? 'female' : 'male';

      let goal: Goal = 'maintenance';
      if (goalRow && typeof (goalRow as { target_value?: number }).target_value === 'number') {
        const target = (goalRow as { target_value: number }).target_value;
        const current =
          (goalRow as { current_value?: number }).current_value ?? weight;
        if (target < current - 1) goal = 'cutting';
        else if (target > current + 1) goal = 'bulking';
      }

      setData({
        weight: Number(weight) || 70,
        height: Number(height) || 170,
        age: clampedAge,
        gender,
        activityLevel: 'moderate',
        goal,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

export interface CalculatedMacros {
  daily_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  daily_water_ml: number;
}

/**
 * Calculate plan macros from trainee data.
 */
export function calculatePlanMacros(
  traineeData: TraineeMacroData,
  overrides?: { goal?: Goal; activityLevel?: ActivityLevel }
): CalculatedMacros {
  const goal = overrides?.goal ?? traineeData.goal;
  const activityLevel = overrides?.activityLevel ?? traineeData.activityLevel;

  const calorieData = calculateFullCalorieData(
    traineeData.weight,
    traineeData.height,
    traineeData.age,
    traineeData.gender,
    activityLevel
  );

  const calories = calorieData.recommendations[goal].calories;
  const macros = calculateMacros(calories, traineeData.weight, goal);
  const water = calculateWaterIntake(traineeData.weight, activityLevel);

  return {
    daily_calories: calories,
    protein_grams: macros.protein.grams,
    carbs_grams: macros.carbs.grams,
    fat_grams: macros.fat.grams,
    daily_water_ml: water,
  };
}
