import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { ArrowRight, Plus, Save, Dumbbell } from 'lucide-react';
import { logger } from '../../../utils/logger';
import type { WorkoutDay, Exercise, SetData, PlanExercise, WorkoutPlanTemplate, WorkoutPlanBuilderProps } from './types';
import { useWorkoutPlanState } from './hooks/useWorkoutPlanState';
import { useWorkoutPlanSets } from './hooks/useWorkoutPlanSets';
import { useWorkoutPlanExercises } from './hooks/useWorkoutPlanExercises';
import { useWorkoutPlanNumericPads } from './hooks/useWorkoutPlanNumericPads';
import { useWorkoutPlanTemplates } from './hooks/useWorkoutPlanTemplates';
import WorkoutDayCard from './components/WorkoutDayCard';
import DayEditView from './components/DayEditView';
import LoadTemplateModal from './components/LoadTemplateModal';
import SaveTemplateModal from './components/SaveTemplateModal';

export default function WorkoutPlanBuilder({ traineeId, traineeName, onBack }: WorkoutPlanBuilderProps) {
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [instructionsExercise, setInstructionsExercise] = useState<{
    name: string;
    instructions: string | null | undefined;
  } | null>(null);

  // Use hooks for state management
  const {
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

  const { addExercise, removeExercise, updateExercise } = useWorkoutPlanExercises(
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

  useEffect(() => {
    loadActivePlan();
    loadTemplates();
  }, [traineeId, loadActivePlan, loadTemplates]);

  // Override loadPlanDays with full implementation
  const loadPlanDays = async (planId: string) => {
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

      const loadedDays: WorkoutDay[] = [];
      
      for (const day of daysData as any[]) {
        const { data: exercisesData } = await supabase
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

        const planExercises: PlanExercise[] = [];
        
        if (exercisesData) {
          for (const ex of exercisesData as any[]) {
            if (!ex.exercise) continue;
            
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
        });
      }

      setDays(loadedDays);
    } catch (error) {
      logger.error('Error loading plan days', error, 'WorkoutPlanBuilder');
      toast.error('שגיאה בטעינת התוכנית');
    }
  };

  // Override loadActivePlan to use custom loadPlanDays
  useEffect(() => {
    const loadActivePlanWithDays = async () => {
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
          const plan = planData as any;
          setActivePlanId(plan.id);
          setPlanName(plan.name || '');
          setPlanDescription(plan.description || '');
          setDaysPerWeek(plan.days_per_week || 3);
          await loadPlanDays(plan.id);
        }
      } catch (error) {
        logger.error('Error loading active plan', error, 'WorkoutPlanBuilder');
      } finally {
        setLoading(false);
      }
    };

    loadActivePlanWithDays();
    loadTemplates();
  }, [traineeId, loadTemplates]);

  const handleLoadTemplate = (template: WorkoutPlanTemplate) => {
    loadTemplate(template, setDays, setPlanName, setPlanDescription, setDaysPerWeek);
  };

  const handleSaveAsTemplate = async () => {
    await saveTemplate(templateName, planDescription, days);
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      toast.error('נא להזין שם לתוכנית');
      return;
    }

    if (days.length === 0) {
      toast.error('נא להוסיף לפחות יום אימון אחד');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let planId = activePlanId;

      if (activePlanId) {
        // Update existing plan
        const updateData = {
          name: planName,
          description: planDescription || null,
          days_per_week: daysPerWeek,
          updated_at: new Date().toISOString(),
        };
        const { error: updateError } = await (supabase
          .from('trainee_workout_plans') as any)
          .update(updateData as any)
          .eq('id', activePlanId);

        if (updateError) {
          toast.error('שגיאה בעדכון תוכנית');
          setSaving(false);
          return;
        }

        // Delete existing days and exercises (cascade will handle exercises)
        const { data: existingDays } = await supabase
          .from('workout_plan_days')
          .select('id')
          .eq('plan_id', activePlanId);

        if (existingDays && existingDays.length > 0) {
          await supabase
            .from('workout_plan_days')
            .delete()
            .eq('plan_id', activePlanId);
        }
      } else {
        // Create new plan
        const { data: plan, error: planError } = await supabase
          .from('trainee_workout_plans')
          .insert({
            trainer_id: user.id,
            trainee_id: traineeId,
            name: planName,
            description: planDescription || null,
            days_per_week: daysPerWeek,
            is_active: true,
          } as any)
          .select()
          .single();

        if (planError || !plan) {
          toast.error('שגיאה ביצירת תוכנית');
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

      // Insert new days and exercises
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
          } as any)
          .select()
          .single();

        if (dayError || !dayData) {
          toast.error('שגיאה בהוספת יום');
          continue;
        }

        const dayDataTyped = dayData as any;

        for (let i = 0; i < day.exercises.length; i++) {
          const exercise = day.exercises[i];
          const firstSet = exercise.sets[0];

          await supabase
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
        }
      }

      toast.success(activePlanId ? 'תוכנית עודכנה בהצלחה!' : 'תוכנית נשמרה בהצלחה!');
      onBack();
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
      <div className="bg-white rounded-2xl shadow-xl p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-surface100 rounded-xl transition-all duration-300"
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

          <button
            onClick={handleSave}
            disabled={saving || days.length === 0 || !planName.trim()}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground px-6 lg:px-8 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <Save className="h-5 w-5 lg:h-6 lg:w-6" />
            <span className="font-bold text-base lg:text-lg">{saving ? 'שומר...' : 'שמור תוכנית'}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">שם התוכנית</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
              placeholder="לדוגמה: תוכנית כוח - שלב 1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">תיאור</label>
            <textarea
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
              rows={2}
              placeholder="מטרות, הערות כלליות..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">ימי אימון בשבוע</label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
              className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} ימים</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                loadTemplates();
                setShowLoadTemplateModal(true);
              }}
              className="flex-1 py-4 px-4 bg-gradient-to-br from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 text-blue-700 font-bold rounded-xl transition-all duration-300 border-2 border-blue-200 shadow-md hover:shadow-lg"
            >
              טען תבנית
            </button>
            {days.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                className="flex-1 py-4 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 font-bold rounded-xl transition-all duration-300 border-2 border-emerald-200 shadow-md hover:shadow-lg"
              >
                שמור כתבנית
              </button>
            )}
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
              className={`bg-white rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl ${
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
        className="w-full mt-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground py-5 lg:py-6 rounded-2xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
      >
        <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
        <span className="font-bold text-lg lg:text-xl">{days.length === 0 ? 'הוסף יום אימון ראשון' : 'הוסף יום אימון נוסף'}</span>
      </button>
    </div>
  );
}
