import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Plus, Save, Copy, Trash2, Calculator, BookMarked } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { useWorkoutSession } from '../../../hooks/useWorkoutSession';
import ExerciseSelector from './ExerciseSelector';
import QuickNumericPad from './QuickNumericPad';
import EquipmentSelector from '../Equipment/EquipmentSelector';
import WorkingWeightCalculator from '../Tools/WorkingWeightCalculator';
import AutoSaveIndicator from '../../common/AutoSaveIndicator';
import DraftModal from '../../common/DraftModal';
import WorkoutTemplates from './WorkoutTemplates';
import { WorkoutTemplate, WorkoutTemplateExercise, Trainee, Workout } from '../../../types';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
}

interface Equipment {
  id: string;
  name: string;
  emoji: string | null;
}

interface SetData {
  id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  set_type: 'regular' | 'superset' | 'dropset';
  failure?: boolean;
  superset_exercise_id?: string | null;
  superset_exercise_name?: string | null;
  superset_weight?: number | null;
  superset_reps?: number | null;
  superset_rpe?: number | null;
  superset_equipment_id?: string | null;
  superset_equipment?: Equipment | null;
  superset_dropset_weight?: number | null;
  superset_dropset_reps?: number | null;
  dropset_weight?: number | null;
  dropset_reps?: number | null;
  equipment_id?: string | null;
  equipment?: Equipment | null;
}

interface WorkoutExercise {
  tempId: string;
  exercise: Exercise;
  sets: SetData[];
}

interface WorkoutSessionProps {
  trainee: Trainee;
  onBack: () => void;
  onSave: (workout: Workout) => void;
  previousWorkout?: Workout | null;
  editingWorkout?: {
    id: string;
    exercises: WorkoutExercise[];
  };
  initialSelectedMember?: 'member_1' | 'member_2' | null;
}

export default function WorkoutSession({ trainee, onBack, onSave, previousWorkout, editingWorkout, initialSelectedMember }: WorkoutSessionProps) {
  const { user } = useAuth();
  const {
    exercises,
    setExercises,
    minimizedExercises,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    duplicateSet,
    calculateTotalVolume,
    calculateExerciseVolume,
    toggleMinimizeExercise,
    completeExercise,
    getExerciseSummary,
  } = useWorkoutSession({ initialExercises: editingWorkout?.exercises });

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [workoutType, setWorkoutType] = useState<'personal' | 'pair'>('personal');
  const [selectedMember] = useState<'member_1' | 'member_2' | null>(
    initialSelectedMember || null
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [workoutId] = useState(editingWorkout?.id || null);
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [numericPad, setNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'weight' | 'reps' | 'rpe';
    value: number;
    label: string;
  } | null>(null);
  const [equipmentSelector, setEquipmentSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);
  const [supersetSelector, setSupersetSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);
  const [supersetNumericPad, setSupersetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'superset_weight' | 'superset_reps' | 'superset_rpe';
    value: number;
    label: string;
  } | null>(null);
  const [dropsetNumericPad, setDropsetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'dropset_weight' | 'dropset_reps';
    value: number;
    label: string;
  } | null>(null);
  const [supersetDropsetNumericPad, setSupersetDropsetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'superset_dropset_weight' | 'superset_dropset_reps';
    value: number;
    label: string;
  } | null>(null);
  const [supersetEquipmentSelector, setSupersetEquipmentSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);
  const [calculatorData, setCalculatorData] = useState<{
    weight: number;
    reps: number;
  } | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<{
    exercises: WorkoutExercise[];
    notes: string;
    workoutDate: string;
    workoutType: 'personal' | 'pair';
  } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const workoutData = {
    exercises,
    notes,
    workoutDate: workoutDate.toISOString(),
    workoutType,
  };

  const { lastSaved, isDirty, clearSaved, loadSaved } = useAutoSave({
    data: workoutData,
    localStorageKey: `workout_draft_${trainee.id}`,
    enabled: !workoutId,
  });

  useEffect(() => {
    if (!workoutId) {
      const saved = loadSaved();
      if (saved && saved.exercises && saved.exercises.length > 0) {
        setDraftData(saved);
        setShowDraftModal(true);
      }
    }
  }, []);

  const handleRestoreDraft = () => {
    if (draftData) {
      setExercises(draftData.exercises);
      setNotes(draftData.notes || '');
      setWorkoutDate(new Date(draftData.workoutDate));
      setWorkoutType(draftData.workoutType || 'personal');
      setShowDraftModal(false);
      setDraftData(null);
    }
  };

  const handleDiscardDraft = () => {
    clearSaved();
    setShowDraftModal(false);
    setDraftData(null);
  };

  useEffect(() => {
    if (workoutId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && exercises.length > 0) {
        e.preventDefault();
        e.returnValue = 'יש שינויים שלא נשמרו. בטוח שברצונך לצאת?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, exercises.length, workoutId]);


  const openNumericPad = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => {
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    setNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleNumericPadConfirm = (value: number) => {
    if (numericPad) {
      updateSet(numericPad.exerciseIndex, numericPad.setIndex, numericPad.field, value);
      setNumericPad(null);
    }
  };

  const handleEquipmentSelect = (equipment: Equipment | null) => {
    if (equipmentSelector) {
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment_id', equipment?.id || null);
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment', equipment);
      setEquipmentSelector(null);
    }
  };

  const handleSupersetExerciseSelect = (exercise: Exercise) => {
    if (supersetSelector) {
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'set_type', 'superset');
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_id', exercise.id);
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_name', exercise.name);
      setSupersetSelector(null);
    }
  };

  const openSupersetNumericPad = (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => {
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    setSupersetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleSupersetEquipmentSelect = (equipment: Equipment | null) => {
    if (supersetEquipmentSelector) {
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment_id', equipment?.id || null);
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment', equipment);
      setSupersetEquipmentSelector(null);
    }
  };

  const handleSupersetNumericPadConfirm = (value: number) => {
    if (supersetNumericPad) {
      updateSet(supersetNumericPad.exerciseIndex, supersetNumericPad.setIndex, supersetNumericPad.field, value);
      setSupersetNumericPad(null);
    }
  };

  const openDropsetNumericPad = (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => {
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    setDropsetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleDropsetNumericPadConfirm = (value: number) => {
    if (dropsetNumericPad) {
      updateSet(dropsetNumericPad.exerciseIndex, dropsetNumericPad.setIndex, dropsetNumericPad.field, value);
      setDropsetNumericPad(null);
    }
  };

  const openSupersetDropsetNumericPad = (exerciseIndex: number, setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps', label: string) => {
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    setSupersetDropsetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleSupersetDropsetNumericPadConfirm = (value: number) => {
    if (supersetDropsetNumericPad) {
      updateSet(supersetDropsetNumericPad.exerciseIndex, supersetDropsetNumericPad.setIndex, supersetDropsetNumericPad.field, value);
      setSupersetDropsetNumericPad(null);
    }
  };


  const handleLoadTemplate = (template: WorkoutTemplate) => {
    const loadedExercises: WorkoutExercise[] = template.exercises.map(te => ({
      tempId: Date.now().toString() + Math.random(),
      exercise: {
        id: te.exerciseId,
        name: te.exerciseName,
        muscle_group_id: '',
      },
      sets: Array.from({ length: te.setsCount }, (_, i) => ({
        id: `temp-${Date.now()}-${i}`,
        set_number: i + 1,
        weight: te.targetWeight || 0,
        reps: te.targetReps || 0,
        rpe: null,
        set_type: 'regular' as const,
        failure: false,
        equipment_id: null,
        equipment: null,
      })),
    }));

    setExercises(loadedExercises);
    setShowTemplateModal(false);
  };

  const handleSaveAsTemplate = async () => {
    if (!user || !templateName.trim() || exercises.length === 0) return;

    setSavingTemplate(true);

    try {
      const templateExercises: WorkoutTemplateExercise[] = exercises.map(ex => ({
        exerciseId: ex.exercise.id,
        exerciseName: ex.exercise.name,
        setsCount: ex.sets.length,
        targetReps: ex.sets[0]?.reps || undefined,
        targetWeight: ex.sets[0]?.weight || undefined,
      }));

      const { error } = await supabase
        .from('workout_templates')
        .insert({
          trainer_id: user.id,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          exercises: templateExercises,
        });

      if (error) {
        console.error('Error saving template:', error);
        toast.error('שגיאה בשמירת התבנית');
      } else {
        toast.success('התבנית נשמרה בהצלחה!');
        setShowSaveTemplateModal(false);
        setTemplateName('');
        setTemplateDescription('');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('שגיאה בשמירת התבנית');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSave = async () => {
    if (!user || exercises.length === 0) return;

    setSaving(true);

    try {
      let workout;

      if (workoutId) {
        const { data: existingSets } = await supabase
          .from('workout_exercises')
          .select('id')
          .eq('workout_id', workoutId);

        if (existingSets && existingSets.length > 0) {
          await supabase
            .from('exercise_sets')
            .delete()
            .in(
              'workout_exercise_id',
              existingSets.map((we) => we.id)
            );
        }

        await supabase.from('workout_exercises').delete().eq('workout_id', workoutId);

        const { data: updatedWorkout } = await supabase
          .from('workouts')
          .update({
            notes: notes || null,
            updated_at: new Date().toISOString(),
            workout_date: workoutDate.toISOString(),
          })
          .eq('id', workoutId)
          .select()
          .single();

        workout = updatedWorkout;
      } else {
        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert([
            {
              trainer_id: user.id,
              workout_type: workoutType,
              notes,
              workout_date: workoutDate.toISOString(),
            },
          ])
          .select()
          .single();

        if (workoutError || !newWorkout) {
          console.error('Workout error:', workoutError);
          toast.error('שגיאה בשמירת האימון');
          setSaving(false);
          return;
        }

        const { error: traineeError } = await supabase
          .from('workout_trainees')
          .insert([
            {
              workout_id: newWorkout.id,
              trainee_id: trainee.id,
            },
          ]);

        if (traineeError) {
          console.error('Trainee link error:', traineeError);
          toast.error('שגיאה בקישור המתאמן לאימון');
          setSaving(false);
          return;
        }

        workout = newWorkout;
      }

      if (!workout) {
        toast.error('שגיאה בשמירת האימון');
        setSaving(false);
        return;
      }

      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];

        const { data: workoutExercise, error: exerciseError } = await supabase
          .from('workout_exercises')
          .insert([
            {
              workout_id: workout.id,
              trainee_id: trainee.id,
              exercise_id: exercise.exercise.id,
              order_index: i,
              pair_member: trainee.is_pair ? selectedMember : null,
            },
          ])
          .select()
          .single();

        if (exerciseError || !workoutExercise) {
          console.error('Exercise error:', exerciseError, 'Exercise:', exercise);
          toast.error(`שגיאה בשמירת התרגיל: ${exerciseError?.message || 'לא ידוע'}`);
          setSaving(false);
          return;
        }

        const setsToInsert = exercise.sets.map((set) => ({
          workout_exercise_id: workoutExercise.id,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          set_type: set.set_type,
          failure: set.failure || false,
          superset_exercise_id: set.superset_exercise_id,
          superset_weight: set.superset_weight,
          superset_reps: set.superset_reps,
          superset_rpe: set.superset_rpe,
          superset_equipment_id: set.superset_equipment_id,
          superset_dropset_weight: set.superset_dropset_weight,
          superset_dropset_reps: set.superset_dropset_reps,
          dropset_weight: set.dropset_weight,
          dropset_reps: set.dropset_reps,
          equipment_id: set.equipment_id,
        }));

        const { error: setsError } = await supabase
          .from('exercise_sets')
          .insert(setsToInsert);

        if (setsError) {
          console.error('Sets error:', setsError);
          toast.error(`שגיאה בשמירת הסטים: ${setsError?.message || 'לא ידוע'}`);
          setSaving(false);
          return;
        }
      }

      clearSaved();
      onSave(workout);
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('שגיאה בשמירת האימון');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 lg:space-x-4 rtl:space-x-reverse">
            <button
              type="button"
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors touch-manipulation"
              aria-label="חזור"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7" />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900">
                {workoutId ? 'עריכת אימון' : 'אימון חדש'}
              </h1>
              <p className="text-base lg:text-lg text-gray-600">{trainee.full_name}</p>
              {exercises.length > 0 && (
                <p className="text-sm lg:text-base text-green-600 font-semibold mt-1">
                  נפח כולל: {calculateTotalVolume().toLocaleString()} ק"ג
                </p>
              )}
              {!workoutId && <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />}
            </div>
          </div>

          <div className="flex space-x-3 rtl:space-x-reverse">
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 lg:px-6 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all shadow-lg hover:shadow-xl touch-manipulation"
            >
              <Calculator className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-semibold text-base lg:text-lg">מחשבון</span>
            </button>
            {exercises.length > 0 && !workoutId && (
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 lg:px-6 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all shadow-lg hover:shadow-xl touch-manipulation"
              >
                <BookMarked className="h-5 w-5 lg:h-6 lg:w-6" />
                <span className="font-semibold text-base lg:text-lg">שמור תבנית</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || exercises.length === 0}
              className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl touch-manipulation"
            >
              <Save className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-semibold text-base lg:text-lg">{saving ? 'שומר...' : (workoutId ? 'עדכן אימון' : 'שמור אימון')}</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">תאריך האימון</label>
          <input
            type="date"
            value={workoutDate.toISOString().split('T')[0]}
            onChange={(e) => setWorkoutDate(new Date(e.target.value))}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:gap-4 mt-4">
          <button
            type="button"
            onClick={() => setWorkoutType('personal')}
            className={`py-4 lg:py-5 px-4 rounded-lg border-2 transition-all touch-manipulation ${
              workoutType === 'personal'
                ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                : 'border-gray-200 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <span className="text-base lg:text-lg">אימון אישי</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkoutType('pair')}
            className={`py-4 lg:py-5 px-4 rounded-lg border-2 transition-all touch-manipulation ${
              workoutType === 'pair'
                ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                : 'border-gray-200 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <span className="text-base lg:text-lg">אימון זוגי</span>
          </button>
        </div>
      </div>

      {exercises.map((workoutExercise, exerciseIndex) => {
        const isMinimized = minimizedExercises.includes(workoutExercise.tempId);
        const summary = getExerciseSummary(workoutExercise);

        return (
          <div
            key={workoutExercise.tempId}
            className={`bg-white rounded-xl shadow-sm mb-4 lg:mb-6 transition-all duration-300 ease-in-out ${
              isMinimized
                ? 'bg-green-50 border-r-4 border-green-500'
                : ''
            }`}
            style={{
              height: isMinimized ? '64px' : 'auto',
              overflow: isMinimized ? 'hidden' : 'visible',
            }}
          >
            {isMinimized ? (
              <div
                className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => toggleMinimizeExercise(workoutExercise.tempId)}
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <span className="text-2xl">✓</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{workoutExercise.exercise.name}</h3>
                    <p className="text-sm text-gray-600">
                      {summary.totalSets} סטים • {summary.maxWeight} ק״ג מקס • נפח: {summary.totalVolume.toLocaleString()} ק״ג
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="text-sm text-green-600 font-semibold">לחץ לעריכה</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeExercise(exerciseIndex);
                    }}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    aria-label="מחק תרגיל"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg lg:text-2xl font-bold text-gray-900">{workoutExercise.exercise.name}</h3>
                    {workoutExercise.sets.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        נפח: {calculateExerciseVolume(workoutExercise).toLocaleString()} ק"ג
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => completeExercise(workoutExercise.tempId)}
                      className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                      סיים תרגיל
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExercise(exerciseIndex)}
                      className="p-2 lg:p-3 hover:bg-red-50 active:bg-red-100 text-red-600 rounded-lg transition-colors touch-manipulation"
                      aria-label="מחק תרגיל"
                    >
                      <Trash2 className="h-5 w-5 lg:h-6 lg:w-6" />
                    </button>
                  </div>
                </div>

          <div className="space-y-3">
            {workoutExercise.sets.map((set, setIndex) => (
              <div
                key={set.id}
                className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-base lg:text-lg text-gray-700">סט {set.set_number}</span>
                  <div className="flex space-x-2 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => duplicateSet(exerciseIndex, setIndex)}
                      className="p-2 lg:p-3 hover:bg-white active:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                      title="שכפל סט"
                      aria-label="שכפל סט"
                    >
                      <Copy className="h-4 w-4 lg:h-5 lg:w-5 text-gray-600" />
                    </button>
                    {workoutExercise.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSet(exerciseIndex, setIndex)}
                        className="p-2 lg:p-3 hover:bg-red-50 active:bg-red-100 text-red-600 rounded-lg transition-colors touch-manipulation"
                        aria-label="מחק סט"
                      >
                        <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-3">
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1">משקל (ק״ג)</label>
                    <button
                      type="button"
                      onClick={() => openNumericPad(exerciseIndex, setIndex, 'weight', 'משקל (ק״ג)')}
                      className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-green-500 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 active:bg-green-200 transition-all touch-manipulation"
                    >
                      {set.weight || '0'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1">חזרות</label>
                    <button
                      type="button"
                      onClick={() => openNumericPad(exerciseIndex, setIndex, 'reps', 'חזרות')}
                      className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-all touch-manipulation"
                    >
                      {set.reps || '0'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1">RPE</label>
                    <button
                      type="button"
                      onClick={() => openNumericPad(exerciseIndex, setIndex, 'rpe', 'RPE (1-10)')}
                      className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-purple-500 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 active:bg-purple-200 transition-all touch-manipulation"
                    >
                      {set.rpe || '-'}
                    </button>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEquipmentSelector({ exerciseIndex, setIndex })}
                    className={`py-3 lg:py-4 px-3 rounded-xl border-2 transition-all text-right ${
                      set.equipment
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="text-xl lg:text-2xl">
                          {set.equipment?.emoji || '🎒'}
                        </span>
                        <span className="font-medium text-sm lg:text-base">
                          {set.equipment?.name || 'ציוד'}
                        </span>
                      </div>
                      {set.equipment && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSet(exerciseIndex, setIndex, 'equipment_id', null);
                            updateSet(exerciseIndex, setIndex, 'equipment', null);
                          }}
                          className="p-1 hover:bg-red-100 rounded-lg text-red-600"
                          aria-label="מחק ציוד"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateSet(exerciseIndex, setIndex, 'failure', !set.failure)}
                    className={`py-3 lg:py-4 px-3 rounded-xl border-2 transition-all ${
                      set.failure
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-red-300 bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                      <span className="text-xl lg:text-2xl">
                        {set.failure ? '🔥' : '💪'}
                      </span>
                      <span className="font-medium text-sm lg:text-base">
                        כשל
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalculatorData({ weight: set.weight, reps: set.reps })}
                    className="py-3 lg:py-4 px-3 rounded-xl border-2 border-gray-300 hover:border-orange-300 bg-white hover:bg-orange-50 transition-all"
                  >
                    <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                      <Calculator className="h-5 w-5 lg:h-6 lg:w-6 text-orange-600" />
                      <span className="font-medium text-sm lg:text-base text-gray-700">
                        1RM
                      </span>
                    </div>
                  </button>
                </div>

                <div className="flex space-x-2 rtl:space-x-reverse">
                  <button
                    type="button"
                    onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'regular')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      set.set_type === 'regular'
                        ? 'bg-green-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    רגיל
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (set.set_type !== 'superset') {
                        updateSet(exerciseIndex, setIndex, 'set_type', 'superset');
                      }
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      set.set_type === 'superset'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    סופר-סט
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'dropset')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      set.set_type === 'dropset'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    דרופ-סט
                  </button>
                </div>

                {set.set_type === 'superset' && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        תרגיל סופר-סט
                      </label>
                      {set.superset_exercise_id ? (
                        <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-500 rounded-lg p-3">
                          <span className="font-medium text-blue-900">{set.superset_exercise_name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              updateSet(exerciseIndex, setIndex, 'superset_exercise_id', null);
                              updateSet(exerciseIndex, setIndex, 'superset_exercise_name', null);
                              updateSet(exerciseIndex, setIndex, 'superset_weight', null);
                              updateSet(exerciseIndex, setIndex, 'superset_reps', null);
                            }}
                            className="p-1 hover:bg-red-100 rounded-lg text-red-600"
                            aria-label="מחק תרגיל סופר-סט"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSupersetSelector({ exerciseIndex, setIndex })}
                          className="w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-blue-600 font-medium transition-all"
                        >
                          + בחר תרגיל לסופר-סט
                        </button>
                      )}
                    </div>
                    {set.superset_exercise_id && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1">
                              משקל (ק״ג)
                            </label>
                            <button
                              type="button"
                              onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_weight', 'משקל סופר-סט (ק״ג)')}
                              className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-all"
                            >
                              {set.superset_weight || '0'}
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1">
                              חזרות
                            </label>
                            <button
                              type="button"
                              onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_reps', 'חזרות סופר-סט')}
                              className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-all"
                            >
                              {set.superset_reps || '0'}
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1">
                              RPE
                            </label>
                            <button
                              type="button"
                              onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_rpe', 'RPE סופר-סט (1-10)')}
                              className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-all"
                            >
                              {set.superset_rpe || '-'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setSupersetEquipmentSelector({ exerciseIndex, setIndex })}
                            className={`w-full py-3 px-4 rounded-xl border-2 transition-all text-right ${
                              set.superset_equipment
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-blue-300 hover:border-blue-500 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <span className="text-2xl">
                                  {set.superset_equipment?.emoji || '🎒'}
                                </span>
                                <span className="font-medium text-base">
                                  {set.superset_equipment?.name || 'הוסף ציוד (אופציונלי)'}
                                </span>
                              </div>
                              {set.superset_equipment && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSet(exerciseIndex, setIndex, 'superset_equipment_id', null);
                                    updateSet(exerciseIndex, setIndex, 'superset_equipment', null);
                                  }}
                                  className="p-1 hover:bg-red-100 rounded-lg text-red-600"
                                  aria-label="מחק ציוד"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-2">
                            דרופ-סט לסופר-סט (אופציונלי)
                          </label>
                          {(set.superset_dropset_weight !== null && set.superset_dropset_weight !== undefined) || (set.superset_dropset_reps !== null && set.superset_dropset_reps !== undefined) ? (
                            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
                              <div className="grid grid-cols-2 gap-3 mb-2">
                                <div>
                                  <label className="block text-xs font-medium text-orange-700 mb-1">
                                    משקל דרופ (ק״ג)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => openSupersetDropsetNumericPad(exerciseIndex, setIndex, 'superset_dropset_weight', 'משקל דרופ-סט סופר (ק״ג)')}
                                    className="w-full px-2 py-2 text-lg font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 active:bg-orange-200 transition-all touch-manipulation"
                                  >
                                    {set.superset_dropset_weight || '0'}
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-orange-700 mb-1">
                                    חזרות דרופ
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => openSupersetDropsetNumericPad(exerciseIndex, setIndex, 'superset_dropset_reps', 'חזרות דרופ-סט סופר')}
                                    className="w-full px-2 py-2 text-lg font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 active:bg-orange-200 transition-all touch-manipulation"
                                  >
                                    {set.superset_dropset_reps || '0'}
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  updateSet(exerciseIndex, setIndex, 'superset_dropset_weight', null);
                                  updateSet(exerciseIndex, setIndex, 'superset_dropset_reps', null);
                                }}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                הסר דרופ-סט
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                updateSet(exerciseIndex, setIndex, 'superset_dropset_weight', 0);
                                updateSet(exerciseIndex, setIndex, 'superset_dropset_reps', 0);
                              }}
                              className="w-full py-2 px-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 text-orange-600 font-medium transition-all text-sm"
                            >
                              + הוסף דרופ-סט
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {set.set_type === 'dropset' && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-300">
                    <div>
                      <label className="block text-sm font-medium text-orange-700 mb-1">
                        משקל דרופ (ק״ג)
                      </label>
                      <button
                        type="button"
                        onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_weight', 'משקל דרופ-סט (ק״ג)')}
                        className="w-full px-3 py-3 text-xl font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 active:bg-orange-200 transition-all touch-manipulation"
                      >
                        {set.dropset_weight || '0'}
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-700 mb-1">
                        חזרות דרופ
                      </label>
                      <button
                        type="button"
                        onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_reps', 'חזרות דרופ-סט')}
                        className="w-full px-3 py-3 text-xl font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 active:bg-orange-200 transition-all touch-manipulation"
                      >
                        {set.dropset_reps || '0'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addSet(exerciseIndex)}
            className="w-full mt-4 py-4 lg:py-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 active:border-green-600 hover:bg-green-50 active:bg-green-100 text-gray-600 hover:text-green-700 font-semibold text-base lg:text-lg transition-all touch-manipulation"
          >
            + הוסף סט
          </button>
              </div>
            )}
          </div>
        );
      })}

      {exercises.length === 0 && !workoutId && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-4">
          <h3 className="text-lg font-bold text-blue-900 mb-2">התחל אימון חדש</h3>
          <p className="text-blue-700 mb-4">בחר תבנית קיימת או התחל אימון ריק</p>
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-lg flex items-center justify-center space-x-2 rtl:space-x-reverse transition-colors font-semibold mb-3"
          >
            <BookMarked className="h-5 w-5" />
            <span>טען תבנית קיימת</span>
          </button>
          <p className="text-center text-sm text-blue-600">או</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowExerciseSelector(true)}
        className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-5 lg:py-6 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all shadow-lg hover:shadow-xl touch-manipulation"
      >
        <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
        <span className="font-semibold text-lg lg:text-xl">{exercises.length === 0 ? 'התחל אימון ריק' : 'הוסף תרגיל'}</span>
      </button>

      {showExerciseSelector && (
        <ExerciseSelector
          traineeId={trainee.id}
          traineeName={trainee.full_name}
          onSelect={addExercise}
          onClose={() => setShowExerciseSelector(false)}
        />
      )}

      {numericPad && (
        <QuickNumericPad
          value={numericPad.value}
          label={numericPad.label}
          onConfirm={handleNumericPadConfirm}
          onClose={() => setNumericPad(null)}
          allowDecimal={numericPad.field === 'weight'}
        />
      )}

      {equipmentSelector && (
        <EquipmentSelector
          currentEquipmentId={
            exercises[equipmentSelector.exerciseIndex]?.sets[equipmentSelector.setIndex]?.equipment_id || null
          }
          onSelect={handleEquipmentSelect}
          onClose={() => setEquipmentSelector(null)}
        />
      )}

      {supersetSelector && (
        <ExerciseSelector
          onSelect={handleSupersetExerciseSelect}
          onClose={() => setSupersetSelector(null)}
        />
      )}

      {supersetNumericPad && (
        <QuickNumericPad
          value={supersetNumericPad.value}
          label={supersetNumericPad.label}
          onConfirm={handleSupersetNumericPadConfirm}
          onClose={() => setSupersetNumericPad(null)}
          allowDecimal={supersetNumericPad.field === 'superset_weight'}
        />
      )}

      {supersetEquipmentSelector && (
        <EquipmentSelector
          currentEquipmentId={
            exercises[supersetEquipmentSelector.exerciseIndex]?.sets[supersetEquipmentSelector.setIndex]?.superset_equipment_id || null
          }
          onSelect={handleSupersetEquipmentSelect}
          onClose={() => setSupersetEquipmentSelector(null)}
        />
      )}

      {dropsetNumericPad && (
        <QuickNumericPad
          value={dropsetNumericPad.value}
          label={dropsetNumericPad.label}
          onConfirm={handleDropsetNumericPadConfirm}
          onClose={() => setDropsetNumericPad(null)}
          allowDecimal={dropsetNumericPad.field === 'dropset_weight'}
        />
      )}

      {supersetDropsetNumericPad && (
        <QuickNumericPad
          value={supersetDropsetNumericPad.value}
          label={supersetDropsetNumericPad.label}
          onConfirm={handleSupersetDropsetNumericPadConfirm}
          onClose={() => setSupersetDropsetNumericPad(null)}
          allowDecimal={supersetDropsetNumericPad.field === 'superset_dropset_weight'}
        />
      )}

      {calculatorData && (
        <WorkingWeightCalculator
          initialWeight={calculatorData.weight}
          initialReps={calculatorData.reps}
          onClose={() => setCalculatorData(null)}
        />
      )}

      {showDraftModal && (
        <DraftModal
          title="נמצאה טיוטה"
          message="נמצאה טיוטת אימון שנשמרה מהפעם הקודמת. האם ברצונך לטעון אותה או להתחיל אימון חדש?"
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {showTemplateModal && (
        <WorkoutTemplates
          onSelectTemplate={handleLoadTemplate}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">שמור כתבנית</h3>
            <p className="text-gray-600 mb-6">שמור את האימון הזה כתבנית לשימוש עתידי מהיר</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם התבנית *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="למשל: אימון רגליים מלא"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תיאור (אופציונלי)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="הוסף תיאור לתבנית..."
                  rows={3}
                />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  <strong>{exercises.length}</strong> תרגילים יישמרו בתבנית
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {savingTemplate ? 'שומר...' : 'שמור תבנית'}
              </button>
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
