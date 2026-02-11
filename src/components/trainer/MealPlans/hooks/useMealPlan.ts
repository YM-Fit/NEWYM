import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import type { Meal, MealPlan } from '../types/mealPlanTypes';
import { MEAL_NAMES } from '../constants/mealPlanConstants';

export function useMealPlan(traineeId: string, trainerId: string) {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [activePlan, setActivePlan] = useState<MealPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeals = useCallback(async (planId: string) => {
    const { data: mealsData, error } = await supabase
      .from('meal_plan_meals')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index', { ascending: true });

    if (error) {
      toast.error('שגיאה בטעינת ארוחות');
      return;
    }

    if (!mealsData) {
      setMeals([]);
      return;
    }

    // Load food items for each meal
    const mealsWithFoodItems = await Promise.all(
      mealsData.map(async (meal) => {
        const { data: foodItems } = await supabase
          .from('meal_plan_food_items')
          .select('*')
          .eq('meal_id', meal.id)
          .order('order_index', { ascending: true });

        // Calculate totals from food items
        const totals = (foodItems || []).reduce(
          (acc, item) => ({
            calories: acc.calories + (item.calories || 0),
            protein: acc.protein + (item.protein || 0),
            carbs: acc.carbs + (item.carbs || 0),
            fat: acc.fat + (item.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return {
          ...meal,
          food_items: foodItems || [],
          total_calories: totals.calories || null,
          total_protein: totals.protein || null,
          total_carbs: totals.carbs || null,
          total_fat: totals.fat || null,
        };
      })
    );

    setMeals(mealsWithFoodItems);
  }, []);

  const loadPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('שגיאה בטעינת תפריטים');
      return;
    }

    setPlans(data || []);
    const active = data?.find((p) => p.is_active);
    if (active) {
      setActivePlan(active);
      await loadMeals(active.id);
    }
  }, [traineeId, trainerId, loadMeals]);

  const createPlan = useCallback(async (planData: {
    name: string;
    description?: string | null;
    daily_calories?: number | null;
    daily_water_ml?: number | null;
    protein_grams?: number | null;
    carbs_grams?: number | null;
    fat_grams?: number | null;
    notes?: string | null;
  }) => {
    // Deactivate all other plans
    await supabase
      .from('meal_plans')
      .update({ is_active: false })
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId);

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        trainer_id: trainerId,
        trainee_id: traineeId,
        name: planData.name,
        description: planData.description || null,
        daily_calories: planData.daily_calories || null,
        daily_water_ml: planData.daily_water_ml || null,
        protein_grams: planData.protein_grams || null,
        carbs_grams: planData.carbs_grams || null,
        fat_grams: planData.fat_grams || null,
        notes: planData.notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error('שגיאה ביצירת תפריט');
      return null;
    }

    toast.success('תפריט נוצר בהצלחה');
    setActivePlan(data);
    setMeals([]);
    await loadPlans();
    return data;
  }, [traineeId, trainerId, loadPlans]);

  const updatePlan = useCallback(async (planId: string, updates: Partial<MealPlan>) => {
    const { error } = await supabase
      .from('meal_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) {
      toast.error('שגיאה בעדכון תפריט');
      return false;
    }

    if (activePlan?.id === planId) {
      setActivePlan({ ...activePlan, ...updates });
    }
    await loadPlans();
    return true;
  }, [activePlan, loadPlans]);

  const activatePlan = useCallback(async (planId: string) => {
    await supabase
      .from('meal_plans')
      .update({ is_active: false })
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId);

    await supabase
      .from('meal_plans')
      .update({ is_active: true })
      .eq('id', planId);

    toast.success('תפריט הופעל');
    await loadPlans();
  }, [traineeId, trainerId, loadPlans]);

  const deletePlan = useCallback(async (planId: string) => {
    if (!confirm('האם למחוק את התפריט? פעולה זו תמחק גם את כל הארוחות בתפריט.')) {
      return false;
    }

    const { error } = await supabase.from('meal_plans').delete().eq('id', planId);

    if (error) {
      toast.error('שגיאה במחיקת תפריט');
      return false;
    }

    toast.success('תפריט נמחק בהצלחה');
    if (activePlan?.id === planId) {
      setActivePlan(null);
      setMeals([]);
    }
    await loadPlans();
    return true;
  }, [activePlan, loadPlans]);

  const addMeal = useCallback(() => {
    const newMeal: Meal = {
      meal_time: '08:00',
      meal_name: 'breakfast',
      description: '',
      alternatives: '',
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      notes: '',
      order_index: meals.length,
    };
    setMeals([...meals, newMeal]);
  }, [meals.length]);

  const updateMeal = useCallback((index: number, field: keyof Meal, value: any) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], [field]: value };
    setMeals(updated);
  }, [meals]);

  const deleteMeal = useCallback((index: number) => {
    const updated = meals.filter((_, i) => i !== index);
    updated.forEach((meal, i) => (meal.order_index = i));
    setMeals(updated);
  }, [meals]);

  const saveMeals = useCallback(async (planId: string, onHistorySave?: (description: string) => Promise<void>) => {
    await supabase.from('meal_plan_meals').delete().eq('plan_id', planId);

    const mealsToInsert = meals.map((meal) => ({
      plan_id: planId,
      meal_time: meal.meal_time,
      meal_name: meal.meal_name,
      description: meal.description,
      alternatives: meal.alternatives,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      notes: meal.notes,
      order_index: meal.order_index,
    }));

    if (mealsToInsert.length > 0) {
      const { error } = await supabase.from('meal_plan_meals').insert(mealsToInsert);

      if (error) {
        toast.error('שגיאה בשמירת ארוחות');
        return false;
      }
    }

    if (onHistorySave) {
      await onHistorySave('Updated meals');
    }
    await updatePlan(planId, { updated_at: new Date().toISOString() } as any);

    toast.success('הארוחות נשמרו בהצלחה');
    await loadMeals(planId);
    return true;
  }, [meals, updatePlan]);

  const getMealLabel = useCallback((value: string) => {
    return MEAL_NAMES.find((m) => m.value === value)?.label || value;
  }, []);

  const calculateMealTotals = useCallback((meal: Meal) => {
    // עדיפות: total_* > food_items > 0
    if (meal.total_calories !== null && meal.total_calories !== undefined) {
      return {
        calories: meal.total_calories,
        protein: meal.total_protein ?? 0,
        carbs: meal.total_carbs ?? 0,
        fat: meal.total_fat ?? 0,
      };
    }
    
    if (meal.food_items && meal.food_items.length > 0) {
      return meal.food_items.reduce(
        (acc, item) => ({
          calories: acc.calories + (item.calories || 0),
          protein: acc.protein + (item.protein || 0),
          carbs: acc.carbs + (item.carbs || 0),
          fat: acc.fat + (item.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
    }
    
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }, []);

  const calculateTotalMacros = useCallback(() => {
    return meals.reduce(
      (acc, meal) => {
        const totals = calculateMealTotals(meal);
        return {
          calories: acc.calories + totals.calories,
          protein: acc.protein + totals.protein,
          carbs: acc.carbs + totals.carbs,
          fat: acc.fat + totals.fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals, calculateMealTotals]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  return {
    plans,
    activePlan,
    meals,
    loading,
    setLoading,
    setActivePlan,
    setMeals,
    loadPlans,
    loadMeals,
    createPlan,
    updatePlan,
    activatePlan,
    deletePlan,
    addMeal,
    updateMeal,
    deleteMeal,
    saveMeals,
    getMealLabel,
    calculateTotalMacros,
  };
}
