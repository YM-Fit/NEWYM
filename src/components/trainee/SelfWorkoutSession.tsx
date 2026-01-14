import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Plus, Save, Copy, Trash2, Clock, Dumbbell, CheckCircle, Info, BookMarked, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { logger } from '../../utils/logger';
import ExerciseSelector from '../trainer/Workouts/ExerciseSelector';
import QuickNumericPad from '../trainer/Workouts/QuickNumericPad';
import EquipmentSelector from '../trainer/Equipment/EquipmentSelector';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import DraftModal from '../common/DraftModal';
import ExerciseInstructionsModal from '../common/ExerciseInstructionsModal';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  instructions?: string | null;
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

interface SelfWorkoutSessionProps {
  traineeId: string;
  traineeName: string;
  trainerId: string;
  onBack: () => void;
  onSave: () => void;
}

export default function SelfWorkoutSession({ traineeId, traineeName, trainerId, onBack, onSave }: SelfWorkoutSessionProps) {
  const {
    exercises,
    setExercises,
    minimizedExercises,
    collapsedSets,
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
    // getExerciseSummary is used for the summary modal at the end of the workout
    getExerciseSummary,
    toggleCollapseSet,
    completeSetAndMoveNext,
  } = useWorkoutSession();

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [workoutDate] = useState(new Date());
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
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
  const [supersetEquipmentSelector, setSupersetEquipmentSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<{
    exercises: WorkoutExercise[];
    notes: string;
    workoutDate: string;
    startTime: number;
  } | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [instructionsExercise, setInstructionsExercise] = useState<{
    name: string;
    instructions: string | null;
  } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const workoutData = {
    exercises,
    notes,
    workoutDate: workoutDate.toISOString(),
    startTime,
  };

  const { lastSaved, isDirty, clearSaved, loadSaved } = useAutoSave({
    data: workoutData,
    localStorageKey: `self_workout_draft_${traineeId}`,
    enabled: true,
  });

  useEffect(() => {
    const saved = loadSaved();
    if (saved && saved.exercises && saved.exercises.length > 0) {
      setDraftData(saved);
      setShowDraftModal(true);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);

      if (elapsed >= 7200 && !autoSaved && exercises.length > 0) {
        handleAutoSave();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, autoSaved, exercises.length]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRestoreDraft = () => {
    if (draftData) {
      setExercises(draftData.exercises);
      setNotes(draftData.notes || '');
      setShowDraftModal(false);
      setDraftData(null);
    }
  };

  const handleDiscardDraft = () => {
    clearSaved();
    setShowDraftModal(false);
    setDraftData(null);
  };

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

  const handleAutoSave = async () => {
    if (exercises.length === 0) return;

    setAutoSaved(true);
    toast.success('האימון נשמר אוטומטית אחרי שעתיים');
    await handleSave(true);
  };

  const handleLoadLastWorkout = async () => {
    if (!traineeId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('יש להתחבר מחדש');
        return;
      }

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          workout_date,
          is_self_recorded,
          workout_trainees!inner (
            trainee_id
          ),
          workout_exercises (
            id,
            order_index,
            exercise_id,
            exercises (
              id,
              name,
              muscle_group_id
            ),
            exercise_sets (
              set_number,
              weight,
              reps,
              rpe,
              set_type,
              failure,
              superset_exercise_id,
              superset_weight,
              superset_reps,
              superset_rpe,
              superset_equipment_id,
              superset_dropset_weight,
              superset_dropset_reps,
              dropset_weight,
              dropset_reps,
              equipment_id
            )
          )
        `)
        .eq('workout_trainees.trainee_id', traineeId)
        .eq('is_self_recorded', true)
        .order('workout_date', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('Error loading last self workout:', error, 'SelfWorkoutSession');
        toast.error('שגיאה בטעינת האימון האחרון');
        return;
      }

      if (!workouts || workouts.length === 0) {
        toast.error('לא נמצא אימון עצמאי קודם');
        return;
      }

      const lastWorkout = workouts[0] as any;
      if (!lastWorkout.workout_exercises || lastWorkout.workout_exercises.length === 0) {
        toast.error('לא נמצאו תרגילים באימון האחרון');
        return;
      }

      const loadedExercises: WorkoutExercise[] = lastWorkout.workout_exercises
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        .map((we: any) => ({
          tempId: `${Date.now()}-${Math.random()}`,
          exercise: {
            id: we.exercises.id,
            name: we.exercises.name,
            muscle_group_id: we.exercises.muscle_group_id,
          },
          sets: (we.exercise_sets || [])
            .sort((a: any, b: any) => (a.set_number || 0) - (b.set_number || 0))
            .map((set: any, index: number) => ({
              id: `temp-${Date.now()}-${index}`,
              set_number: set.set_number || index + 1,
              weight: set.weight || 0,
              reps: set.reps || 0,
              rpe: set.rpe,
              set_type: set.set_type || 'regular',
              failure: set.failure || false,
              superset_exercise_id: set.superset_exercise_id,
              superset_exercise_name: undefined,
              superset_weight: set.superset_weight,
              superset_reps: set.superset_reps,
              superset_rpe: set.superset_rpe,
              superset_equipment_id: set.superset_equipment_id,
              superset_equipment: null,
              superset_dropset_weight: set.superset_dropset_weight,
              superset_dropset_reps: set.superset_dropset_reps,
              dropset_weight: set.dropset_weight,
              dropset_reps: set.dropset_reps,
              equipment_id: set.equipment_id,
              equipment: null,
            })),
        }));

      setExercises(loadedExercises);
      toast.success('האימון האחרון נטען בהצלחה');
    } catch (error) {
      logger.error('Unexpected error loading last self workout:', error, 'SelfWorkoutSession');
      toast.error('שגיאה בטעינת האימון האחרון');
    }
  };

  const handleSaveTemplate = async () => {
    if (!traineeId || !trainerId) return;
    if (!templateName.trim() || exercises.length === 0) {
      toast.error('נא למלא שם תבנית ולהוסיף תרגילים');
      return;
    }

    try {
      setSavingTemplate(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('יש להתחבר מחדש');
        setSavingTemplate(false);
        return;
      }

      const templateExercises = exercises.map(ex => ({
        exerciseId: ex.exercise.id,
        exerciseName: ex.exercise.name,
        setsCount: ex.sets.length,
        targetReps: ex.sets[0]?.reps || undefined,
        targetWeight: ex.sets[0]?.weight || undefined,
      }));

      const { error } = await supabase
        .from('workout_templates')
        .insert({
          trainer_id: trainerId,
          trainee_id: traineeId,
          trainee_name: traineeName,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          exercises: templateExercises,
        } as any);

      if (error) {
        logger.error('Error saving trainee template:', error, 'SelfWorkoutSession');
        toast.error('שגיאה בשמירת התבנית');
      } else {
        toast.success('התבנית נשמרה למאמן שלך');
        setShowTemplateModal(false);
        setTemplateName('');
        setTemplateDescription('');
      }
    } catch (error) {
      logger.error('Error saving trainee template:', error, 'SelfWorkoutSession');
      toast.error('שגיאה בשמירת התבנית');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (exercises.length === 0) return;

    if (!trainerId) {
      toast.error('לא ניתן לשמור אימון ללא מאמן');
      setSaving(false);
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        logger.error('No authenticated user found', undefined, 'SelfWorkoutSession');
        toast.error('יש להתחבר מחדש');
        setSaving(false);
        return;
      }

      const { data: workoutIdResult, error: workoutError } = await supabase
        // @ts-ignore - RPC function typed as any in generated types
        .rpc('create_trainee_workout', {
          p_trainer_id: trainerId,
          p_workout_type: 'personal',
          p_notes: notes,
          p_workout_date: workoutDate.toISOString().split('T')[0],
          p_is_completed: true,
        });

      if (workoutError || !workoutIdResult) {
        logger.error('Workout error:', workoutError, 'SelfWorkoutSession');
        toast.error('שגיאה בשמירת האימון');
        setSaving(false);
        return;
      }

      const newWorkout = { id: workoutIdResult as string };

      const { error: traineeError } = await supabase
        // @ts-ignore - inserting into workout_trainees without generated types
        .from('workout_trainees')
        .insert({
          workout_id: newWorkout.id,
          trainee_id: traineeId,
        } as any);

      if (traineeError) {
        logger.error('Trainee link error:', traineeError, 'SelfWorkoutSession');
        toast.error('שגיאה בקישור המתאמן לאימון');
        setSaving(false);
        return;
      }

      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];

        const { data: workoutExercise, error: exerciseError } = await supabase
          // @ts-ignore - inserting into workout_exercises without generated types
          .from('workout_exercises')
          .insert({
            workout_id: newWorkout.id,
            trainee_id: traineeId,
            exercise_id: exercise.exercise.id,
            order_index: i,
            pair_member: null,
          } as any)
          .select()
          .single();

        if (exerciseError || !workoutExercise) {
          logger.error('Exercise error:', exerciseError, 'SelfWorkoutSession');
          toast.error('שגיאה בשמירת התרגיל');
          setSaving(false);
          return;
        }

        // We trust Supabase to return a valid id for workout_exercises; TS typing is looser than runtime
        const workoutExerciseId = (workoutExercise as any).id as string | null;
        const setsToInsert: any[] = exercise.sets.map((set) => ({
          workout_exercise_id: workoutExerciseId,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe && set.rpe >= 1 && set.rpe <= 10 ? set.rpe : null,
          set_type: set.set_type,
          failure: set.failure || false,
          superset_exercise_id: set.superset_exercise_id || null,
          superset_weight: set.superset_weight ?? null,
          superset_reps: set.superset_reps ?? null,
          superset_rpe:
            set.superset_rpe && set.superset_rpe >= 1 && set.superset_rpe <= 10
              ? set.superset_rpe
              : null,
          superset_equipment_id: set.superset_equipment_id ?? null,
          superset_dropset_weight: set.superset_dropset_weight ?? null,
          superset_dropset_reps: set.superset_dropset_reps ?? null,
          dropset_weight: set.dropset_weight ?? null,
          dropset_reps: set.dropset_reps ?? null,
          equipment_id: set.equipment_id ?? null,
        }));

        const { error: setsError } = await supabase
          // @ts-ignore - inserting into exercise_sets without generated types
          .from('exercise_sets')
          .insert(setsToInsert as any);

        if (setsError) {
          logger.error('Sets error:', setsError, 'SelfWorkoutSession');
          toast.error('שגיאה בשמירת הסטים');
          setSaving(false);
          return;
        }
      }

      if (trainerId) {
        await supabase
          // @ts-ignore - inserting into trainer_notifications without generated types
          .from('trainer_notifications')
          .insert({
            trainer_id: trainerId,
            trainee_id: traineeId,
            notification_type: 'self_workout',
            title: 'אימון עצמאי חדש',
            message: `${traineeName} סיים אימון עצמאי`,
            is_read: false,
          } as any);
      }

      clearSaved();
      if (!isAutoSave) {
        setShowSummary(true);
      }
    } catch (error) {
      logger.error('Error saving workout:', error, 'SelfWorkoutSession');
      toast.error('שגיאה בשמירת האימון');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark transition-colors duration-300 p-3 md:p-4">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 mb-3 md:mb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 md:p-2.5 hover:bg-white/20 rounded-lg transition-all text-white flex-shrink-0"
              aria-label="חזור"
            >
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <div className="text-white flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-bold truncate">אימון עצמאי</h1>
              <p className="text-xs md:text-sm text-emerald-100 truncate">{traineeName}</p>
              {exercises.length > 0 && (
                <p className="text-xs text-white/90 font-semibold mt-1 bg-white/15 px-2 py-0.5 rounded-md inline-block">
                  נפח: {calculateTotalVolume().toLocaleString()} ק"ג
                </p>
              )}
              <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || exercises.length === 0}
            className="bg-white text-emerald-600 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl flex items-center space-x-1.5 rtl:space-x-reverse transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm md:text-base flex-shrink-0 ml-2"
          >
            <Save className="h-4 w-4 md:h-5 md:w-5" />
            <span className="font-semibold md:font-bold hidden sm:inline">{saving ? 'שומר...' : 'סיים'}</span>
          </button>
        </div>

        <div className="flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-lg md:rounded-xl p-2.5 md:p-3">
          <Clock className="h-4 w-4 md:h-5 md:w-5 text-white ml-1.5 md:ml-2" />
          <span className="text-lg md:text-xl font-bold text-white">{formatTime(elapsedTime)}</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {exercises.length === 0 && (
              <button
                type="button"
                onClick={handleLoadLastWorkout}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-50 text-xs md:text-sm font-semibold border border-emerald-500/40 hover:bg-emerald-500/30 transition-all"
              >
                טען אימון עצמאי אחרון
              </button>
            )}
            {exercises.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-50 text-xs md:text-sm font-semibold border border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <BookMarked className="h-3.5 w-3.5" />
                שמור כתבנית
              </button>
            )}
          </div>
        </div>
      </div>

      {exercises.map((workoutExercise, exerciseIndex) => {
        const isMinimized = minimizedExercises.includes(workoutExercise.tempId);
        const summary = getExerciseSummary(workoutExercise);

        return (
          <div
            key={workoutExercise.tempId}
            className={`bg-[var(--color-bg-surface)] rounded-xl md:rounded-2xl shadow-md md:shadow-lg mb-3 md:mb-4 transition-all border ${
              isMinimized ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[var(--color-border)]'
            }`}
            style={{
              height: isMinimized ? '64px' : 'auto',
              overflow: isMinimized ? 'hidden' : 'visible',
            }}
          >
            {isMinimized ? (
              <div
                className="h-full flex items-center justify-between px-3 md:px-4 cursor-pointer hover:bg-emerald-500/10 transition-all"
                onClick={() => toggleMinimizeExercise(workoutExercise.tempId)}
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 min-w-0">
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-white text-sm md:text-base font-bold">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-bold text-[var(--color-text-primary)] truncate">{workoutExercise.exercise.name}</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {summary.totalSets} סטים | {summary.maxWeight} ק״ג | {summary.totalVolume.toLocaleString()} ק״ג
                    </p>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 flex-shrink-0 mr-2">ערוך</span>
              </div>
            ) : (
              <div className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-bold text-[var(--color-text-primary)]">{workoutExercise.exercise.name}</h3>
                    {workoutExercise.sets.length > 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-md inline-block border border-[var(--color-border)]">
                        נפח: {calculateExerciseVolume(workoutExercise).toLocaleString()} ק"ג
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setInstructionsExercise({
                        name: workoutExercise.exercise.name,
                        instructions: workoutExercise.exercise.instructions,
                      })}
                      className="p-1.5 md:p-2 hover:bg-cyan-500/10 text-cyan-400 rounded-lg transition-all"
                      aria-label="איך לבצע"
                      title="איך לבצע"
                    >
                      <Info className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMinimizeExercise(workoutExercise.tempId)}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all text-xs font-semibold border border-emerald-500/30"
                    >
                      מינימום
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExercise(exerciseIndex)}
                      className="p-1.5 md:p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                      aria-label="מחק תרגיל"
                    >
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {workoutExercise.sets.map((set, setIndex) => {
                    const isCollapsed = collapsedSets.includes(set.id);

                    if (isCollapsed) {
                      return (
                        <div
                          key={set.id}
                          onClick={() => toggleCollapseSet(set.id)}
                          className="bg-[var(--color-bg-surface)] rounded-xl p-3 border border-[var(--color-border)] cursor-pointer hover:border-emerald-500/50 hover:bg-[var(--color-bg-elevated)] transition-all duration-300 animate-fade-in"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm text-[var(--color-text-primary)] bg-emerald-500 px-3 py-1.5 rounded-lg shadow-sm">סט {set.set_number}</span>
                              <span className="text-[var(--color-text-primary)] font-medium">{set.weight} ק״ג</span>
                              <span className="text-[var(--color-text-muted)]">x</span>
                              <span className="text-[var(--color-text-primary)] font-medium">{set.reps} חזרות</span>
                              {set.rpe && <span className="text-amber-400 text-sm">RPE {set.rpe}</span>}
                              {set.set_type !== 'regular' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  set.set_type === 'superset' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-amber-500/15 text-amber-400'
                                }`}>
                                  {set.set_type === 'superset' ? 'סופר-סט' : 'דרופ-סט'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-emerald-400 font-medium">לחץ לעריכה</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                    <div
                      key={set.id}
                      className="bg-[var(--color-bg-surface)] rounded-lg md:rounded-xl p-3 md:p-4 border border-[var(--color-border)] transition-all duration-300 animate-fade-in"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm md:text-base text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] px-2 py-1 rounded-md border border-[var(--color-border)]">סט {set.set_number}</span>
                        <div className="flex space-x-1.5 rtl:space-x-reverse">
                          <button
                            type="button"
                            onClick={() => duplicateSet(exerciseIndex, setIndex)}
                            className="p-1.5 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-all"
                            title="שכפל סט"
                            aria-label="שכפל סט"
                          >
                            <Copy className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                          </button>
                          {workoutExercise.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSet(exerciseIndex, setIndex)}
                              className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                              aria-label="מחק סט"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">משקל</label>
                          <button
                            type="button"
                            onClick={() => openNumericPad(exerciseIndex, setIndex, 'weight', 'משקל (ק״ג)')}
                            className="w-full px-2 py-3 md:py-3.5 text-lg md:text-xl font-bold border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-400 rounded-lg md:rounded-xl hover:bg-emerald-500/20 transition-all"
                          >
                            {set.weight || '0'}
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">חזרות</label>
                          <button
                            type="button"
                            onClick={() => openNumericPad(exerciseIndex, setIndex, 'reps', 'חזרות')}
                            className="w-full px-2 py-3 md:py-3.5 text-lg md:text-xl font-bold border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-lg md:rounded-xl hover:bg-cyan-500/20 transition-all"
                          >
                            {set.reps || '0'}
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">RPE</label>
                          <button
                            type="button"
                            onClick={() => openNumericPad(exerciseIndex, setIndex, 'rpe', 'RPE (1-10)')}
                            className="w-full px-2 py-3 md:py-3.5 text-lg md:text-xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-lg md:rounded-xl hover:bg-amber-500/20 transition-all"
                          >
                            {set.rpe || '-'}
                          </button>
                        </div>
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setEquipmentSelector({ exerciseIndex, setIndex })}
                          className={`py-3 px-3 rounded-xl border-2 transition-all text-right ${
                            set.equipment ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-[var(--color-border)] hover:border-cyan-500/50 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <span className="text-xl">{set.equipment?.emoji || '🎒'}</span>
                              <span className="font-bold text-sm text-[var(--color-text-primary)]">{set.equipment?.name || 'ציוד'}</span>
                            </div>
                            {set.equipment && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSet(exerciseIndex, setIndex, 'equipment_id', null);
                                  updateSet(exerciseIndex, setIndex, 'equipment', null);
                                }}
                                className="p-1 hover:bg-red-500/10 rounded-lg text-red-400"
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
                          className={`py-3 px-3 rounded-xl border-2 transition-all ${
                            set.failure ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-[var(--color-border)] hover:border-red-500/50 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                          }`}
                        >
                          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                            <span className="text-xl">{set.failure ? '🔥' : '💪'}</span>
                            <span className="font-bold text-sm">כשל</span>
                          </div>
                        </button>
                      </div>

                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <button
                          type="button"
                          onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'regular')}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                            set.set_type === 'regular' ? 'bg-emerald-500 text-white' : 'bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
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
                          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                            set.set_type === 'superset' ? 'bg-cyan-500 text-white' : 'bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                          }`}
                        >
                          סופר-סט
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'dropset')}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                            set.set_type === 'dropset' ? 'bg-amber-500 text-white' : 'bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                          }`}
                        >
                          דרופ-סט
                        </button>
                      </div>

                      {set.set_type === 'superset' && (
                        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                          <div className="mb-4">
                            <label className="block text-sm font-bold text-cyan-400 mb-2">תרגיל סופר-סט</label>
                            {set.superset_exercise_id ? (
                              <div className="flex items-center justify-between bg-cyan-500/10 border-2 border-cyan-500/50 rounded-xl p-4">
                                <span className="font-bold text-cyan-300">{set.superset_exercise_name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateSet(exerciseIndex, setIndex, 'superset_exercise_id', null);
                                    updateSet(exerciseIndex, setIndex, 'superset_exercise_name', null);
                                    updateSet(exerciseIndex, setIndex, 'superset_weight', null);
                                    updateSet(exerciseIndex, setIndex, 'superset_reps', null);
                                  }}
                                  className="p-1 hover:bg-red-500/10 rounded-lg text-red-400"
                                  aria-label="מחק תרגיל סופר-סט"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSupersetSelector({ exerciseIndex, setIndex })}
                                className="w-full py-4 px-4 border-2 border-dashed border-cyan-500/50 rounded-xl hover:border-cyan-500 hover:bg-cyan-500/10 text-cyan-400 font-bold transition-all"
                              >
                                + בחר תרגיל לסופר-סט
                              </button>
                            )}
                          </div>
                          {set.superset_exercise_id && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-sm font-bold text-cyan-400 mb-2">משקל (ק״ג)</label>
                                  <button
                                    type="button"
                                    onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_weight', 'משקל סופר-סט (ק״ג)')}
                                    className="w-full px-3 py-3 text-xl font-bold border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all"
                                  >
                                    {set.superset_weight || '0'}
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-sm font-bold text-cyan-400 mb-2">חזרות</label>
                                  <button
                                    type="button"
                                    onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_reps', 'חזרות סופר-סט')}
                                    className="w-full px-3 py-3 text-xl font-bold border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all"
                                  >
                                    {set.superset_reps || '0'}
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-sm font-bold text-cyan-400 mb-2">RPE</label>
                                  <button
                                    type="button"
                                    onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_rpe', 'RPE סופר-סט (1-10)')}
                                    className="w-full px-3 py-3 text-xl font-bold border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all"
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
                                    set.superset_equipment ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-cyan-500/30 hover:border-cyan-500/50 bg-[var(--color-bg-surface)] hover:bg-cyan-500/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                      <span className="text-2xl">{set.superset_equipment?.emoji || '🎒'}</span>
                                      <span className="font-bold text-base text-[var(--color-text-primary)]">{set.superset_equipment?.name || 'הוסף ציוד (אופציונלי)'}</span>
                                    </div>
                                    {set.superset_equipment && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateSet(exerciseIndex, setIndex, 'superset_equipment_id', null);
                                          updateSet(exerciseIndex, setIndex, 'superset_equipment', null);
                                        }}
                                        className="p-1 hover:bg-red-500/10 rounded-lg text-red-400"
                                        aria-label="מחק ציוד"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {set.set_type === 'dropset' && (
                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
                          <div>
                            <label className="block text-sm font-bold text-amber-400 mb-2">משקל דרופ (ק״ג)</label>
                            <button
                              type="button"
                              onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_weight', 'משקל דרופ-סט (ק״ג)')}
                              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all"
                            >
                              {set.dropset_weight || '0'}
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-amber-400 mb-2">חזרות דרופ</label>
                            <button
                              type="button"
                              onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_reps', 'חזרות דרופ-סט')}
                              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all"
                            >
                              {set.dropset_reps || '0'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Complete Set Button */}
                      <button
                        type="button"
                        onClick={() => completeSetAndMoveNext(exerciseIndex, setIndex)}
                        className="w-full mt-3 py-2.5 md:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold md:font-bold text-sm md:text-base rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                        <span>סיים סט</span>
                      </button>
                    </div>
                  );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => addSet(exerciseIndex)}
                  className="w-full mt-4 py-4 border-2 border-dashed border-[var(--color-border)] rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 text-[var(--color-text-muted)] hover:text-emerald-400 font-bold text-base transition-all"
                >
                  + הוסף סט
                </button>
              </div>
            )}
          </div>
        );
      })}

      {exercises.length === 0 && (
        <div className="premium-card-static p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Dumbbell className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">התחל אימון עצמאי</h3>
          <p className="text-[var(--color-text-muted)] mb-4">הוסף תרגילים ורשום את הסטים שלך</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowExerciseSelector(true)}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 md:py-4 rounded-lg md:rounded-xl flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all shadow-md hover:shadow-lg text-sm md:text-base font-semibold md:font-bold"
      >
        <Plus className="h-5 w-5 md:h-6 md:w-6" />
        <span>{exercises.length === 0 ? 'התחל אימון' : 'הוסף תרגיל'}</span>
      </button>

      {showExerciseSelector && (
        <ExerciseSelector
          traineeId={traineeId}
          traineeName={traineeName}
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
          currentEquipmentId={exercises[equipmentSelector.exerciseIndex]?.sets[equipmentSelector.setIndex]?.equipment_id || null}
          onSelect={handleEquipmentSelect}
          onClose={() => setEquipmentSelector(null)}
        />
      )}

      {supersetSelector && (
        <ExerciseSelector
          traineeId={traineeId}
          traineeName={traineeName}
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

      {showDraftModal && (
        <DraftModal
          title="נמצאה טיוטה"
          message="נמצאה טיוטת אימון שנשמרה מהפעם הקודמת. האם ברצונך לטעון אותה או להתחיל אימון חדש?"
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {instructionsExercise && (
        <ExerciseInstructionsModal
          isOpen={!!instructionsExercise}
          onClose={() => setInstructionsExercise(null)}
          exerciseName={instructionsExercise.name}
          instructions={instructionsExercise.instructions}
        />
      )}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                שמור כתבנית למאמן
              </h2>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-bg-surface)]"
              >
                <X className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              התבנית תישמר למאמן שלך ותופיע אצלו ברשימת התבניות עם השם שלך.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                  שם התבנית *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="glass-input w-full px-3 py-2.5"
                  placeholder="למשל: אימון עליון קצר"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                  תיאור (אופציונלי)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                  className="glass-input w-full px-3 py-2.5 resize-none"
                  placeholder="למשל: אימון עליון לימים עמוסים..."
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !templateName.trim() || exercises.length === 0}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-[var(--color-bg-surface)] disabled:text-[var(--color-text-muted)] text-white font-semibold transition-all"
            >
              {savingTemplate ? 'שומר...' : 'שמור כתבנית'}
            </button>
          </div>
        </div>
      )}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                סיכום אימון
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">סה\"כ נפח</span>
                <span className="font-bold text-emerald-400">
                  {calculateTotalVolume().toLocaleString()} ק\"ג
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">משך האימון (משוער)</span>
                <span className="font-bold text-[var(--color-text-primary)]">
                  {formatTime(elapsedTime)}
                </span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-3 space-y-2 max-h-40 overflow-y-auto">
                {exercises.map((ex) => {
                  const summary = getExerciseSummary(ex);
                  return (
                    <div
                      key={ex.tempId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[var(--color-text-secondary)] truncate mr-2">
                        {ex.exercise.name}
                      </span>
                      <span className="text-[var(--color-text-muted)] text-xs">
                        {summary.totalSets} סטים • מקס {summary.maxWeight} ק\"ג
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSummary(false);
                toast.success('האימון נשמר בהצלחה!');
                onSave();
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all"
            >
              סיום וחזרה למסך אימונים
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
