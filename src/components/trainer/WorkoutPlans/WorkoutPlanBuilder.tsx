import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { ArrowRight, Plus, Save, Dumbbell, Activity, Settings } from 'lucide-react';
import { logger } from '../../../utils/logger';
import type { WorkoutDay, Exercise, SetData, PlanExercise, WorkoutPlanTemplate, WorkoutPlanBuilderProps } from './types';
import { useWorkoutPlanState } from './hooks/useWorkoutPlanState';
import { useWorkoutPlanSets } from './hooks/useWorkoutPlanSets';
import { useWorkoutPlanExercises } from './hooks/useWorkoutPlanExercises';
import { useWorkoutPlanNumericPads } from './hooks/useWorkoutPlanNumericPads';
import { useWorkoutPlanTemplates } from './hooks/useWorkoutPlanTemplates';
import { cardioApi, type CardioType } from '../../../api/cardioApi';
import WorkoutDayCard from './components/WorkoutDayCard';
import DayEditView from './components/DayEditView';
import LoadTemplateModal from './components/LoadTemplateModal';
import SaveTemplateModal from './components/SaveTemplateModal';
import PlanBlockBuilder from './components/PlanBlockBuilder';

// Validation function
function validatePlan(planName: string, days: WorkoutDay[]): { valid: boolean; error?: string } {
  if (!planName.trim()) {
    return { valid: false, error: 'נא להזין שם לתוכנית' };
  }

  if (days.length === 0) {
    return { valid: false, error: 'נא להוסיף לפחות יום אימון אחד' };
  }

  for (const day of days) {
    if (day.exercises.length === 0) {
      return { valid: false, error: `יום ${day.day_number}${day.day_name ? ` (${day.day_name})` : ''} חייב להכיל לפחות תרגיל אחד` };
    }

    for (const exercise of day.exercises) {
      if (exercise.sets.length === 0) {
        return { valid: false, error: `תרגיל "${exercise.exercise.name}" ביום ${day.day_number} חייב להכיל לפחות סט אחד` };
      }

      for (const set of exercise.sets) {
        // Validate RPE
        if (set.rpe !== null && (set.rpe < 1 || set.rpe > 10)) {
          return { valid: false, error: `RPE חייב להיות בין 1-10 (תרגיל: ${exercise.exercise.name})` };
        }

        // Validate reps
        if (set.reps < 0 || set.reps > 1000) {
          return { valid: false, error: `מספר חזרות חייב להיות בין 0-1000 (תרגיל: ${exercise.exercise.name})` };
        }

        // Validate weight
        if (set.weight < 0 || set.weight > 10000) {
          return { valid: false, error: `משקל חייב להיות בין 0-10000 ק"ג (תרגיל: ${exercise.exercise.name})` };
        }

        // Validate superset RPE
        if (set.superset_rpe !== null && set.superset_rpe !== undefined && (set.superset_rpe < 1 || set.superset_rpe > 10)) {
          return { valid: false, error: `RPE של סופרסט חייב להיות בין 1-10 (תרגיל: ${exercise.exercise.name})` };
        }
      }

      // Validate rest seconds
      if (exercise.rest_seconds < 0 || exercise.rest_seconds > 3600) {
        return { valid: false, error: `זמן מנוחה חייב להיות בין 0-3600 שניות (תרגיל: ${exercise.exercise.name})` };
      }
    }

    // Validate times_per_week
    if (day.times_per_week !== undefined && day.times_per_week !== null) {
      if (day.times_per_week < 0 || day.times_per_week > 7) {
        return { valid: false, error: `תדירות שבועית חייבת להיות בין 0-7 (יום ${day.day_number})` };
      }
    }
  }

  return { valid: true };
}

export default function WorkoutPlanBuilder({ traineeId, traineeName, onBack }: WorkoutPlanBuilderProps) {
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [instructionsExercise, setInstructionsExercise] = useState<{
    name: string;
    instructions: string | null | undefined;
  } | null>(null);
  const [cardioTypes, setCardioTypes] = useState<CardioType[]>([]);
  const [loadingCardioTypes, setLoadingCardioTypes] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showBlockBuilder, setShowBlockBuilder] = useState(false);

  // Use hooks for state management
  const {
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
    loadActivePlan,
    addDay,
    removeDay,
    duplicateDay,
    updateDay,
    toggleMinimizeDay,
  } = useWorkoutPlanState(traineeId);

  const { addSet, removeSet, updateSet, duplicateSet } = useWorkoutPlanSets(
    selectedDay,
    days,
    setDays,
    setSelectedDay
  );

  const { addExercise, removeExercise, updateExercise, updateAllExercises } = useWorkoutPlanExercises(
    selectedDay,
    days,
    setDays,
    setSelectedDay
  );

  const {
    numericPad,
    supersetNumericPad,
    dropsetNumericPad,
    supersetDropsetNumericPad,
    equipmentSelector,
    supersetSelector,
    supersetEquipmentSelector,
    setNumericPad,
    setSupersetNumericPad,
    setDropsetNumericPad,
    setSupersetDropsetNumericPad,
    setEquipmentSelector,
    setSupersetSelector,
    setSupersetEquipmentSelector,
    openNumericPad,
    handleNumericPadConfirm,
    openSupersetNumericPad,
    handleSupersetNumericPadConfirm,
    openDropsetNumericPad,
    handleDropsetNumericPadConfirm,
    openSupersetDropsetNumericPad,
    handleSupersetDropsetNumericPadConfirm,
    openEquipmentSelector,
    handleEquipmentSelect,
    openSupersetSelector,
    handleSupersetExerciseSelect,
    openSupersetEquipmentSelector,
    handleSupersetEquipmentSelect,
  } = useWorkoutPlanNumericPads(selectedDay, updateSet);

  const {
    templates,
    showLoadTemplateModal,
    showSaveTemplateModal,
    templateName,
    setShowLoadTemplateModal,
    setShowSaveTemplateModal,
    setTemplateName,
    loadTemplates,
    loadTemplate,
    saveTemplate,
  } = useWorkoutPlanTemplates();

  const addExerciseToDay = (exercise: Exercise) => {
    addExercise(exercise);
    setShowExerciseSelector(false);
  };

  const completeExercise = (exerciseIndex: number) => {
    setSelectedExerciseIndex(exerciseIndex === selectedExerciseIndex ? null : exerciseIndex);
  };

  const completeDay = (dayId: string) => {
    toggleMinimizeDay(dayId);
    setSelectedDay(null);
  };

  const loadCardioTypes = async () => {
    try {
      setLoadingCardioTypes(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const types = await cardioApi.getCardioTypes(user.id);
      setCardioTypes(types);
    } catch (error) {
      logger.error('Error loading cardio types', error, 'WorkoutPlanBuilder');
    } finally {
      setLoadingCardioTypes(false);
    }
  };

  useEffect(() => {
    loadActivePlan();
    loadTemplates(traineeId);
    loadCardioTypes();
  }, [traineeId, loadActivePlan, loadTemplates]);

  // Track changes to mark as unsaved (only after initial load)
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    if (loading) {
      setIsInitialLoad(true);
      setHasUnsavedChanges(false);
    } else if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);

  useEffect(() => {
    if (activePlanId && !loading && !isInitialLoad) {
      setHasUnsavedChanges(true);
    }
  }, [planName, planDescription, daysPerWeek, restDaysBetween, includeCardio, cardioTypeId, cardioFrequency, cardioWeeklyGoalSteps, days, activePlanId, loading, isInitialLoad]);

  const handleLoadTemplate = async (template: WorkoutPlanTemplate) => {
    await loadTemplate(template, setDays, setPlanName, setPlanDescription, setDaysPerWeek);
  };

  const handleSaveAsTemplate = async (isGeneral: boolean) => {
    await saveTemplate(templateName, planDescription, days, isGeneral ? null : traineeId);
  };

  const handleSave = async () => {
    // Validate plan before saving
    const validation = validatePlan(planName, days);
    if (!validation.valid) {
      toast.error(validation.error || 'שגיאה באימות התוכנית');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let planId = activePlanId;

      if (activePlanId) {
        // Update existing plan - use smart UPDATE/INSERT logic
        // Step 1: Update plan metadata
        const updateData: any = {
          name: planName,
          description: planDescription || null,
          days_per_week: daysPerWeek,
          rest_days_between: restDaysBetween,
          include_cardio: includeCardio,
          updated_at: new Date().toISOString(),
        };

        // Only include cardio fields if cardio is included
        if (includeCardio) {
          if (cardioTypeId) {
            updateData.cardio_type_id = cardioTypeId;
          } else {
            updateData.cardio_type_id = null;
          }
          if (cardioFrequency !== null && cardioFrequency !== undefined) {
            updateData.cardio_frequency = cardioFrequency;
          } else {
            updateData.cardio_frequency = null;
          }
          if (cardioWeeklyGoalSteps !== null && cardioWeeklyGoalSteps !== undefined) {
            updateData.cardio_weekly_goal_steps = cardioWeeklyGoalSteps;
          } else {
            updateData.cardio_weekly_goal_steps = null;
          }
        } else {
          // Clear cardio fields if cardio is not included
          updateData.cardio_type_id = null;
          updateData.cardio_frequency = null;
          updateData.cardio_weekly_goal_steps = null;
        }

        const { error: updateError } = await supabase
          .from('trainee_workout_plans')
          .update(updateData)
          .eq('id', activePlanId);

        if (updateError) {
          logger.error('Error updating plan', updateError, 'WorkoutPlanBuilder');
          console.error('Plan update error details:', {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
            updateData,
            activePlanId,
          });
          toast.error(`שגיאה בעדכון תוכנית: ${updateError.message || 'שגיאה לא ידועה'}`);
          setSaving(false);
          return;
        }

        // Step 2: Get all existing days to determine which to update/delete
        const { data: allExistingDays, error: existingDaysError } = await supabase
          .from('workout_plan_days')
          .select('id, day_number')
          .eq('plan_id', activePlanId);

        if (existingDaysError) {
          logger.error('Error loading existing days', existingDaysError, 'WorkoutPlanBuilder');
          toast.error('שגיאה בטעינת ימים קיימים');
          setSaving(false);
          return;
        }

        const existingDayIds = new Set((allExistingDays || []).map((d: any) => d.id));
        const currentDayIds = new Set(days.filter(d => d.dayId).map(d => d.dayId!));
        
        // Days to delete: exist in DB but not in current days
        const daysToDelete = Array.from(existingDayIds).filter(id => !currentDayIds.has(id));

        // Step 3: Process each day - UPDATE if exists, INSERT if new
        for (const day of days) {
          let dayDbId: string;

          if (day.dayId && existingDayIds.has(day.dayId)) {
            // Update existing day
            const { error: dayUpdateError } = await supabase
              .from('workout_plan_days')
              .update({
                day_number: day.day_number,
                day_name: day.day_name || null,
                focus: day.focus || null,
                notes: day.notes || null,
                order_index: day.day_number - 1,
                times_per_week: day.times_per_week ?? 1,
              } as any)
              .eq('id', day.dayId);

            if (dayUpdateError) {
              logger.error('Error updating day', dayUpdateError, 'WorkoutPlanBuilder');
              toast.error(`שגיאה בעדכון יום ${day.day_number}`);
              setSaving(false);
              return;
            }

            dayDbId = day.dayId;
          } else {
            // Insert new day
            const { data: dayData, error: dayError } = await supabase
              .from('workout_plan_days')
              .insert({
                plan_id: activePlanId,
                day_number: day.day_number,
                day_name: day.day_name || null,
                focus: day.focus || null,
                notes: day.notes || null,
                order_index: day.day_number - 1,
                times_per_week: day.times_per_week ?? 1,
              } as any)
              .select()
              .single();

            if (dayError || !dayData) {
              logger.error('Error inserting day', dayError, 'WorkoutPlanBuilder');
              toast.error(`שגיאה בהוספת יום ${day.day_number}`);
              setSaving(false);
              return;
            }

            dayDbId = (dayData as any).id;
          }

          // Step 4: Get existing exercises for this day
          const { data: existingExercises, error: existingExercisesError } = await supabase
            .from('workout_plan_day_exercises')
            .select('id, order_index')
            .eq('day_id', dayDbId);

          if (existingExercisesError) {
            logger.error('Error loading existing exercises', existingExercisesError, 'WorkoutPlanBuilder');
            toast.error(`שגיאה בטעינת תרגילים ליום ${day.day_number}`);
            setSaving(false);
            return;
          }

          const existingExerciseIds = new Set((existingExercises || []).map((ex: any) => ex.id));
          const currentExerciseIds = new Set(day.exercises.filter(ex => ex.exerciseId).map(ex => ex.exerciseId!));

          // Exercises to delete: exist in DB but not in current exercises
          const exercisesToDelete = Array.from(existingExerciseIds).filter(id => !currentExerciseIds.has(id));
          if (exercisesToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('workout_plan_day_exercises')
              .delete()
              .in('id', exercisesToDelete);

            if (deleteError) {
              logger.error('Error deleting exercises', deleteError, 'WorkoutPlanBuilder');
              toast.error(`שגיאה במחיקת תרגילים ליום ${day.day_number}`);
              setSaving(false);
              return;
            }
          }

          // Step 5: Process each exercise - UPDATE if exists, INSERT if new
          for (let i = 0; i < day.exercises.length; i++) {
            const exercise = day.exercises[i];
            const firstSet = exercise.sets[0];

            const exerciseData: any = {
              day_id: dayDbId,
              exercise_id: exercise.exercise.id,
              sets_count: exercise.sets.length,
              reps_range: firstSet ? `${firstSet.reps}` : '10-12',
              rest_seconds: exercise.rest_seconds,
              notes: exercise.notes || null,
              order_index: i,
              target_weight: firstSet?.weight || null,
              target_rpe: firstSet?.rpe && firstSet.rpe >= 1 && firstSet.rpe <= 10 ? firstSet.rpe : null,
              equipment_id: firstSet?.equipment_id || null,
              set_type: firstSet?.set_type || 'regular',
              failure: firstSet?.failure || false,
              superset_exercise_id: firstSet?.superset_exercise_id || null,
              superset_weight: firstSet?.superset_weight || null,
              superset_reps: firstSet?.superset_reps || null,
              superset_rpe: firstSet?.superset_rpe && firstSet.superset_rpe >= 1 && firstSet.superset_rpe <= 10 ? firstSet.superset_rpe : null,
              superset_equipment_id: firstSet?.superset_equipment_id || null,
              superset_dropset_weight: firstSet?.superset_dropset_weight || null,
              superset_dropset_reps: firstSet?.superset_dropset_reps || null,
              dropset_weight: firstSet?.dropset_weight || null,
              dropset_reps: firstSet?.dropset_reps || null,
            };

            if (exercise.exerciseId && existingExerciseIds.has(exercise.exerciseId)) {
              // Update existing exercise
              const { error: exerciseUpdateError } = await supabase
                .from('workout_plan_day_exercises')
                .update(exerciseData)
                .eq('id', exercise.exerciseId);

              if (exerciseUpdateError) {
                logger.error('Error updating exercise', exerciseUpdateError, 'WorkoutPlanBuilder');
                toast.error(`שגיאה בעדכון תרגיל ${exercise.exercise.name}`);
                setSaving(false);
                return;
              }
            } else {
              // Insert new exercise
              const { error: exerciseInsertError } = await supabase
                .from('workout_plan_day_exercises')
                .insert(exerciseData);

              if (exerciseInsertError) {
                logger.error('Error inserting exercise', exerciseInsertError, 'WorkoutPlanBuilder');
                toast.error(`שגיאה בהוספת תרגיל ${exercise.exercise.name}`);
                setSaving(false);
                return;
              }
            }
          }
        }

        // Step 6: Delete days that were removed (only after all updates succeeded)
        if (daysToDelete.length > 0) {
          const { error: deleteDaysError } = await supabase
            .from('workout_plan_days')
            .delete()
            .in('id', daysToDelete);

          if (deleteDaysError) {
            logger.error('Error deleting days', deleteDaysError, 'WorkoutPlanBuilder');
            toast.error('שגיאה במחיקת ימים');
            setSaving(false);
            return;
          }
        }
      } else {
        // Create new plan
        const insertData: any = {
          trainer_id: user.id,
          trainee_id: traineeId,
          name: planName,
          description: planDescription || null,
          days_per_week: daysPerWeek,
          rest_days_between: restDaysBetween,
          include_cardio: includeCardio,
          is_active: true,
        };

        // Only include cardio fields if cardio is included
        if (includeCardio) {
          if (cardioTypeId) {
            insertData.cardio_type_id = cardioTypeId;
          }
          if (cardioFrequency !== null && cardioFrequency !== undefined) {
            insertData.cardio_frequency = cardioFrequency;
          }
          if (cardioWeeklyGoalSteps !== null && cardioWeeklyGoalSteps !== undefined) {
            insertData.cardio_weekly_goal_steps = cardioWeeklyGoalSteps;
          }
        }

        const { data: plan, error: planError } = await supabase
          .from('trainee_workout_plans')
          .insert(insertData)
          .select()
          .single();

        if (planError) {
          logger.error('Error creating plan', planError, 'WorkoutPlanBuilder');
          console.error('Plan insert error details:', {
            message: planError.message,
            details: planError.details,
            hint: planError.hint,
            code: planError.code,
            insertData,
          });
          toast.error(`שגיאה ביצירת תוכנית: ${planError.message || 'שגיאה לא ידועה'}`);
          setSaving(false);
          return;
        }

        if (!plan) {
          logger.error('No plan returned after insert', null, 'WorkoutPlanBuilder');
          toast.error('שגיאה ביצירת תוכנית - לא התקבל מזהה תוכנית');
          setSaving(false);
          return;
        }

        const planData = plan as any;
        planId = planData.id;
        setActivePlanId(planData.id);
      }

      if (!planId) {
        toast.error('שגיאה בשמירת התוכנית');
        setSaving(false);
        return;
      }

      // For new plans, insert days and exercises
      if (!activePlanId) {
        for (const day of days) {
          const { data: dayData, error: dayError } = await supabase
            .from('workout_plan_days')
            .insert({
              plan_id: planId,
              day_number: day.day_number,
              day_name: day.day_name || null,
              focus: day.focus || null,
              notes: day.notes || null,
              order_index: day.day_number - 1,
              times_per_week: day.times_per_week ?? 1, // Save times_per_week, default to 1
            } as any)
            .select()
            .single();

          if (dayError || !dayData) {
            logger.error('Error inserting day', dayError, 'WorkoutPlanBuilder');
            toast.error(`שגיאה בהוספת יום ${day.day_number}`);
            continue;
          }

          const dayDataTyped = dayData as any;

          for (let i = 0; i < day.exercises.length; i++) {
            const exercise = day.exercises[i];
            const firstSet = exercise.sets[0];

            const { error: exerciseError } = await supabase
              .from('workout_plan_day_exercises')
              .insert({
                day_id: dayDataTyped.id,
                exercise_id: exercise.exercise.id,
                sets_count: exercise.sets.length,
                reps_range: firstSet ? `${firstSet.reps}` : '10-12',
                rest_seconds: exercise.rest_seconds,
                notes: exercise.notes || null,
                order_index: i,
                target_weight: firstSet?.weight || null,
                target_rpe: firstSet?.rpe && firstSet.rpe >= 1 && firstSet.rpe <= 10 ? firstSet.rpe : null,
                equipment_id: firstSet?.equipment_id || null,
                set_type: firstSet?.set_type || 'regular',
                failure: firstSet?.failure || false,
                superset_exercise_id: firstSet?.superset_exercise_id || null,
                superset_weight: firstSet?.superset_weight || null,
                superset_reps: firstSet?.superset_reps || null,
                superset_rpe: firstSet?.superset_rpe && firstSet.superset_rpe >= 1 && firstSet.superset_rpe <= 10 ? firstSet.superset_rpe : null,
                superset_equipment_id: firstSet?.superset_equipment_id || null,
                superset_dropset_weight: firstSet?.superset_dropset_weight || null,
                superset_dropset_reps: firstSet?.superset_dropset_reps || null,
                dropset_weight: firstSet?.dropset_weight || null,
                dropset_reps: firstSet?.dropset_reps || null,
              } as any);

            if (exerciseError) {
              logger.error('Error inserting exercise', exerciseError, 'WorkoutPlanBuilder');
              toast.error(`שגיאה בהוספת תרגיל ${exercise.exercise.name}`);
            }
          }
        }
      }

      toast.success(activePlanId ? 'תוכנית עודכנה בהצלחה!' : 'תוכנית נשמרה בהצלחה!');
      
      // Clear unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Reload the plan to ensure state is synced
      await loadActivePlan();
      
      // Don't navigate back automatically - let user continue editing
      // onBack();
    } catch (error) {
      logger.error('Error saving plan', error, 'WorkoutPlanBuilder');
      toast.error('שגיאה בשמירת התוכנית');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted600">טוען תוכנית...</p>
        </div>
      </div>
    );
  }

  if (selectedDay) {
    return (
      <DayEditView
        day={selectedDay}
        selectedExerciseIndex={selectedExerciseIndex}
        showExerciseSelector={showExerciseSelector}
        onBack={() => setSelectedDay(null)}
        onComplete={completeDay}
        onUpdateDay={updateDay}
        onAddExercise={addExerciseToDay}
        onRemoveExercise={removeExercise}
        onCompleteExercise={completeExercise}
        onShowInstructions={(name, instructions) => setInstructionsExercise({ name, instructions })}
        onUpdateExercise={updateExercise}
        onUpdateAllExercises={updateAllExercises}
        onAddSet={addSet}
        onRemoveSet={removeSet}
        onUpdateSet={updateSet}
        onDuplicateSet={duplicateSet}
        onSetShowExerciseSelector={setShowExerciseSelector}
        numericPad={numericPad}
        equipmentSelector={equipmentSelector}
        supersetSelector={supersetSelector}
        supersetNumericPad={supersetNumericPad}
        dropsetNumericPad={dropsetNumericPad}
        supersetDropsetNumericPad={supersetDropsetNumericPad}
        supersetEquipmentSelector={supersetEquipmentSelector}
        instructionsExercise={instructionsExercise}
        onHandleNumericPadConfirm={handleNumericPadConfirm}
        onHandleEquipmentSelect={handleEquipmentSelect}
        onHandleSupersetExerciseSelect={handleSupersetExerciseSelect}
        onHandleSupersetNumericPadConfirm={handleSupersetNumericPadConfirm}
        onHandleSupersetEquipmentSelect={handleSupersetEquipmentSelect}
        onHandleDropsetNumericPadConfirm={handleDropsetNumericPadConfirm}
        onHandleSupersetDropsetNumericPadConfirm={handleSupersetDropsetNumericPadConfirm}
        onOpenNumericPad={openNumericPad}
        onOpenEquipmentSelector={openEquipmentSelector}
        onOpenSupersetSelector={openSupersetSelector}
        onOpenSupersetNumericPad={openSupersetNumericPad}
        onOpenSupersetEquipmentSelector={openSupersetEquipmentSelector}
        onOpenDropsetNumericPad={openDropsetNumericPad}
        onOpenSupersetDropsetNumericPad={openSupersetDropsetNumericPad}
        onSetNumericPad={setNumericPad}
        onSetEquipmentSelector={setEquipmentSelector}
        onSetSupersetSelector={setSupersetSelector}
        onSetSupersetNumericPad={setSupersetNumericPad}
        onSetDropsetNumericPad={setDropsetNumericPad}
        onSetSupersetDropsetNumericPad={setSupersetDropsetNumericPad}
        onSetSupersetEquipmentSelector={setSupersetEquipmentSelector}
        onSetInstructionsExercise={setInstructionsExercise}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6">
      {/* Main Header */}
      <div className="premium-card-static p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-surface100 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-label="חזור"
              title="חזור"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7 text-muted600" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105">
                <Dumbbell className="w-7 h-7 lg:w-8 lg:h-8 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-muted900">{activePlanId ? 'ערוך תוכנית אימון' : 'תוכנית אימון חדשה'}</h1>
                <p className="text-base lg:text-lg text-muted600">{traineeName}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activePlanId && (
              <button
                onClick={async () => {
                  // Reload plan to discard changes
                  setLoading(true);
                  try {
                    await loadActivePlan();
                    toast.success('שינויים בוטלו');
                  } catch (error) {
                    toast.error('שגיאה בטעינת התוכנית');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 lg:px-6 py-3 lg:py-4 bg-surface200 hover:bg-surface300 text-muted700 font-bold rounded-xl transition-all duration-300 flex items-center space-x-2 rtl:space-x-reverse shadow-md hover:shadow-lg"
                aria-label="בטל שינויים"
                title="בטל שינויים"
              >
                <span className="text-base lg:text-lg">בטל</span>
              </button>
            )}
          <button
            onClick={handleSave}
            disabled={saving || days.length === 0 || !planName.trim()}
              className={`bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground px-6 lg:px-8 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${hasUnsavedChanges ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
              aria-label={saving ? 'שומר תוכנית' : activePlanId ? 'עדכן תוכנית' : 'שמור תוכנית'}
              aria-disabled={saving || days.length === 0 || !planName.trim()}
          >
            <Save className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-bold text-base lg:text-lg">
                {saving ? 'שומר...' : activePlanId ? 'עדכן תוכנית' : 'שמור תוכנית'}
                {hasUnsavedChanges && !saving && <span className="ml-2 text-amber-300">●</span>}
              </span>
          </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">שם התוכנית</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => {
                setPlanName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
              placeholder="לדוגמה: תוכנית כוח - שלב 1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">תיאור</label>
            <textarea
              value={planDescription}
              onChange={(e) => {
                setPlanDescription(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
              rows={2}
              placeholder="מטרות, הערות כלליות..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">ימי אימון בשבוע</label>
            <select
              value={daysPerWeek}
              onChange={(e) => {
                setDaysPerWeek(parseInt(e.target.value));
                setHasUnsavedChanges(true);
              }}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} ימים</option>
              ))}
            </select>
          </div>

          {/* Advanced Settings Section */}
          <div className="border-t border-border200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center gap-2 text-muted700 hover:text-muted900 font-semibold mb-4 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>הגדרות מתקדמות</span>
            </button>

            {showAdvancedSettings && (
              <div className="space-y-4 bg-surface50 p-4 rounded-xl border border-border200">
                {/* Rest Days Between Workouts */}
                <div>
                  <label className="block text-sm font-semibold text-muted700 mb-2">
                    ימי מנוחה בין אימונים
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="3"
                      value={restDaysBetween}
                      onChange={(e) => setRestDaysBetween(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-muted900 min-w-[60px] text-center">
                      {restDaysBetween} {restDaysBetween === 1 ? 'יום' : 'ימים'}
                    </span>
                  </div>
                  <p className="text-xs text-muted600 mt-1">
                    מספר ימי המנוחה בין אימון לאימון בתוכנית
                  </p>
                </div>

                {/* Include Cardio */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCardio}
                      onChange={(e) => {
                        setIncludeCardio(e.target.checked);
                        if (!e.target.checked) {
                          setCardioTypeId(null);
                          setCardioFrequency(0);
                          setCardioWeeklyGoalSteps(null);
                        }
                      }}
                      className="w-5 h-5 rounded border-border200 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-muted700 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      כולל תוכנית אירובי
                    </span>
                  </label>
                </div>

                {/* Cardio Settings */}
                {includeCardio && (
                  <div className="space-y-4 bg-white p-4 rounded-xl border border-emerald-200">
                    {/* Cardio Type */}
                    <div>
                      <label className="block text-sm font-semibold text-muted700 mb-2">
                        סוג אירובי
                      </label>
                      {loadingCardioTypes ? (
                        <div className="text-muted600">טוען סוגי אירובי...</div>
                      ) : (
                        <select
                          value={cardioTypeId || ''}
                          onChange={(e) => setCardioTypeId(e.target.value || null)}
                          className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                        >
                          <option value="">בחר סוג אירובי</option>
                          {cardioTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Cardio Frequency */}
                    <div>
                      <label className="block text-sm font-semibold text-muted700 mb-2">
                        תדירות אירובי (פעמים בשבוע)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="7"
                        value={cardioFrequency}
                        onChange={(e) => setCardioFrequency(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                      />
                    </div>

                    {/* Weekly Goal Steps */}
                    <div>
                      <label className="block text-sm font-semibold text-muted700 mb-2">
                        יעד צעדים שבועי (אופציונלי)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cardioWeeklyGoalSteps || ''}
                        onChange={(e) => setCardioWeeklyGoalSteps(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="לדוגמה: 10000"
                        className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                  loadTemplates(traineeId);
                setShowLoadTemplateModal(true);
              }}
                className="py-4 px-4 bg-gradient-to-br from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 text-blue-700 font-bold rounded-xl transition-all duration-300 border-2 border-blue-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="טען תבנית"
            >
              טען תבנית
            </button>
            {days.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                  className="py-4 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 font-bold rounded-xl transition-all duration-300 border-2 border-emerald-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-label="שמור כתבנית"
              >
                שמור כתבנית
              </button>
            )}
              <button
                type="button"
                onClick={() => setShowBlockBuilder(true)}
                className="py-4 px-4 bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-700 font-bold rounded-xl transition-all duration-300 border-2 border-purple-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                aria-label="בלוקי תוכנית"
              >
                בלוקים
              </button>
            </div>
          </div>
        </div>
      </div>

      <LoadTemplateModal
        isOpen={showLoadTemplateModal}
        templates={templates}
        onLoad={handleLoadTemplate}
        onClose={() => setShowLoadTemplateModal(false)}
      />

      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        templateName={templateName}
        onTemplateNameChange={setTemplateName}
        onSave={handleSaveAsTemplate}
        traineeName={traineeName}
        onClose={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                }}
      />

      {/* Day Cards */}
      <div className="space-y-4">
        {days.map((day) => (
            <div
              key={day.tempId}
              className={`premium-card-static transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
              minimizedDays.has(day.tempId) ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-r-4 border-emerald-500' : ''
              }`}
              style={{
              height: minimizedDays.has(day.tempId) ? '88px' : 'auto',
              overflow: minimizedDays.has(day.tempId) ? 'hidden' : 'visible',
            }}
          >
            <WorkoutDayCard
              day={day}
              isMinimized={minimizedDays.has(day.tempId)}
              onSelect={(day) => {
                    setSelectedDay(day);
                    toggleMinimizeDay(day.tempId);
                  }}
              onRemove={removeDay}
              onDuplicate={duplicateDay}
              onToggleMinimize={toggleMinimizeDay}
              onComplete={completeDay}
            />
                        </div>
                      ))}
                    </div>

      <button
        onClick={addDay}
        className="w-full mt-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground py-5 lg:py-6 rounded-2xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-label={days.length === 0 ? 'הוסף יום אימון ראשון' : 'הוסף יום אימון נוסף'}
      >
        <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
        <span className="font-bold text-lg lg:text-xl">{days.length === 0 ? 'הוסף יום אימון ראשון' : 'הוסף יום אימון נוסף'}</span>
      </button>

      {/* Block Builder - Full Screen Overlay */}
      {showBlockBuilder && (
        <div className="fixed inset-0 z-50 bg-[var(--color-bg-base)]">
          <PlanBlockBuilder
            traineeId={traineeId}
            currentDays={days}
            onBack={() => setShowBlockBuilder(false)}
            onSelectBlock={(block) => {
              // Add block days to current plan
              if (block.days && Array.isArray(block.days) && block.days.length > 0) {
                // Calculate the next day number based on existing days
                const maxDayNumber = days.length > 0 
                  ? Math.max(...days.map(d => d.day_number))
                  : 0;
                const newDays = block.days.map((day: any, index: number) => ({
                  ...day,
                  tempId: Date.now().toString() + Math.random() + index,
                  day_number: maxDayNumber + index + 1,
                  exercises: day.exercises || [],
                }));
                setDays([...days, ...newDays]);
                toast.success(`בלוק "${block.name}" נוסף לתוכנית`);
              } else {
                toast.error('הבלוק אינו מכיל ימים');
              }
              setShowBlockBuilder(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
