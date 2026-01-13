import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, BookMarked } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { useWorkoutSession } from '../../../hooks/useWorkoutSession';
import { saveWorkout } from '../../../api/workoutApi';
import ExerciseSelector from './ExerciseSelector';
import QuickNumericPad from './QuickNumericPad';
import EquipmentSelector from '../Equipment/EquipmentSelector';
import WorkingWeightCalculator from '../Tools/WorkingWeightCalculator';
import WorkoutSummary from './WorkoutSummary';
import DraftModal from '../../common/DraftModal';
import WorkoutTemplates from './WorkoutTemplates';
import { WorkoutHeader } from './WorkoutHeader';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { WorkoutTemplate, WorkoutTemplateExercise, Trainee, Workout } from '../../../types';

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
  suggested_weight?: number | null;
  suggested_reps?: number | null;
  suggested_superset_weight?: number | null;
  suggested_superset_reps?: number | null;
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
    getExerciseSummary,
    toggleCollapseSet,
    applySuggestion,
    completeSetAndMoveNext,
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
  const [showSummary, setShowSummary] = useState(false);
  const [savedWorkout, setSavedWorkout] = useState<Workout | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<{ id: string; name: string }[]>([]);
  const [personalRecords, setPersonalRecords] = useState<{ exerciseName: string; type: 'weight' | 'reps' | 'volume'; oldValue: number; newValue: number }[]>([]);
  const workoutStartTime = useRef(Date.now());

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

  useEffect(() => {
    const loadMuscleGroups = async () => {
      const { data } = await supabase.from('muscle_groups').select('id, name');
      if (data) setMuscleGroups(data);
    };
    loadMuscleGroups();
  }, []);

  const handleAddExerciseWithAutoFill = async (exercise: Exercise) => {
    if (!user) {
      addExercise(exercise);
      return;
    }

    try {
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          workout_date,
          workout_trainees!inner (
            trainee_id
          ),
          workout_exercises!inner (
            id,
            order_index,
            exercise_id,
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
        .eq('trainer_id', user.id)
        .eq('workout_trainees.trainee_id', trainee.id)
        .eq('workout_exercises.exercise_id', exercise.id)
        .order('workout_date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading last exercise for autofill:', error);
        addExercise(exercise);
        return;
      }

      if (!workouts || workouts.length === 0 || !workouts[0].workout_exercises?.length) {
        addExercise(exercise);
        return;
      }

      const lastExercise = workouts[0].workout_exercises[0] as any;
      const previousSets = lastExercise.exercise_sets || [];

      if (!previousSets.length) {
        addExercise(exercise);
        return;
      }

      const mappedSets: SetData[] = previousSets
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
          suggested_weight: null,
          suggested_reps: null,
          suggested_superset_weight: null,
          suggested_superset_reps: null,
        }));

      // Add the exercise using the existing hook logic (minimize previous exercise etc.)
      addExercise(exercise);

      // Replace the just-added exercise's sets with the auto-filled ones
      setExercises((prev) => {
        if (!prev.length) return prev;
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          sets: mappedSets,
        };
        return updated;
      });
    } catch (err) {
      console.error('Unexpected error in exercise autofill:', err);
      addExercise(exercise);
    }
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

  const handleLoadPrevious = async () => {
    if (!user) return;

    try {
      // First get all workouts for this trainer and trainee
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          id,
          workout_date,
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
        .eq('trainer_id', user.id)
        .eq('workout_trainees.trainee_id', trainee.id)
        .order('workout_date', { ascending: false })
        .limit(10);

      if (workoutsError) {
        console.error('Error loading previous workout:', workoutsError);
        toast.error('שגיאה בטעינת האימון הקודם');
        return;
      }

      if (!workouts || workouts.length === 0) {
        toast.error('לא נמצא אימון קודם');
        return;
      }

      // Filter workouts that have this trainee and have exercises
      const filteredWorkouts = workouts.filter(w =>
        w.workout_trainees.some((wt: any) => wt.trainee_id === trainee.id) &&
        w.workout_exercises &&
        w.workout_exercises.length > 0
      );

      if (filteredWorkouts.length === 0) {
        toast.error('לא נמצא אימון קודם');
        return;
      }

      const previousWorkout = filteredWorkouts[0];

      const loadedExercises: WorkoutExercise[] = previousWorkout.workout_exercises
        .sort((a, b) => a.order_index - b.order_index)
        .map((we: any) => ({
          tempId: Date.now().toString() + Math.random(),
          exercise: {
            id: we.exercises.id,
            name: we.exercises.name,
            muscle_group_id: we.exercises.muscle_group_id,
          },
          sets: we.exercise_sets
            .sort((a: any, b: any) => a.set_number - b.set_number)
            .map((set: any, index: number) => ({
              id: `temp-${Date.now()}-${index}`,
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
              equipment: null,
              superset_equipment: null,
            })),
        }));

      setExercises(loadedExercises);
      toast.success('האימון הקודם נטען בהצלחה!');
    } catch (error) {
      console.error('Error loading previous workout:', error);
      toast.error('שגיאה בטעינת האימון הקודם');
    }
  };

  const handleSave = async () => {
    if (!user || exercises.length === 0) return;

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('נדרשת התחברות מחדש');
        setSaving(false);
        return;
      }

      const exercisesData = exercises.map((ex, index) => ({
        exercise_id: ex.exercise.id,
        order_index: index,
        sets: ex.sets.map((set) => ({
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          set_type: set.set_type,
          failure: set.failure || false,
          superset_exercise_id: set.superset_exercise_id || null,
          superset_weight: set.superset_weight || null,
          superset_reps: set.superset_reps || null,
          superset_rpe: set.superset_rpe || null,
          superset_equipment_id: set.superset_equipment_id || null,
          superset_dropset_weight: set.superset_dropset_weight || null,
          superset_dropset_reps: set.superset_dropset_reps || null,
          dropset_weight: set.dropset_weight || null,
          dropset_reps: set.dropset_reps || null,
          equipment_id: set.equipment_id || null,
        })),
      }));

      const requestBody = {
        trainee_id: trainee.id,
        trainer_id: user.id,
        workout_type: workoutType,
        notes: notes || null,
        workout_date: workoutDate.toISOString(),
        exercises: exercisesData,
        pair_member: trainee.is_pair ? selectedMember : null,
        workout_id: workoutId || undefined,
      };

      const result = await saveWorkout(requestBody, session.access_token);

      if (result.error || !result.data) {
        console.error('Save workout error:', result);
        toast.error(result.error || 'שגיאה בשמירת האימון');
        setSaving(false);
        return;
      }

      const workoutResult = result.data;

      clearSaved();

      const newPRs = await checkAndUpdatePersonalRecords(workoutResult.workout.id);
      setPersonalRecords(newPRs);
      setSavedWorkout(workoutResult.workout);
      setShowSummary(true);
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('שגיאה בשמירת האימון');
    } finally {
      setSaving(false);
    }
  };

  const checkAndUpdatePersonalRecords = async (workoutId: string): Promise<{ exerciseName: string; type: 'weight' | 'reps' | 'volume'; oldValue: number; newValue: number }[]> => {
    const newRecords: { exerciseName: string; type: 'weight' | 'reps' | 'volume'; oldValue: number; newValue: number }[] = [];

    for (const ex of exercises) {
      const maxWeight = Math.max(...ex.sets.map(s => s.weight));
      const maxReps = Math.max(...ex.sets.map(s => s.reps));
      const maxVolume = Math.max(...ex.sets.map(s => s.weight * s.reps));

      const { data: existingRecords } = await supabase
        .from('personal_records')
        .select('*')
        .eq('trainee_id', trainee.id)
        .eq('exercise_id', ex.exercise.id)
        .eq('pair_member', selectedMember || '');

      const weightRecord = existingRecords?.find(r => r.record_type === 'max_weight');
      const repsRecord = existingRecords?.find(r => r.record_type === 'max_reps');
      const volumeRecord = existingRecords?.find(r => r.record_type === 'max_volume');

      if (!weightRecord || maxWeight > (weightRecord.weight || 0)) {
        if (weightRecord) {
          newRecords.push({ exerciseName: ex.exercise.name, type: 'weight', oldValue: weightRecord.weight || 0, newValue: maxWeight });
        }
        await supabase.from('personal_records').upsert({
          trainee_id: trainee.id,
          exercise_id: ex.exercise.id,
          record_type: 'max_weight',
          weight: maxWeight,
          achieved_at: new Date().toISOString(),
          workout_id: workoutId,
          pair_member: selectedMember || null,
        }, { onConflict: 'trainee_id,exercise_id,record_type,pair_member' });
      }

      if (!repsRecord || maxReps > (repsRecord.reps || 0)) {
        if (repsRecord) {
          newRecords.push({ exerciseName: ex.exercise.name, type: 'reps', oldValue: repsRecord.reps || 0, newValue: maxReps });
        }
        await supabase.from('personal_records').upsert({
          trainee_id: trainee.id,
          exercise_id: ex.exercise.id,
          record_type: 'max_reps',
          reps: maxReps,
          achieved_at: new Date().toISOString(),
          workout_id: workoutId,
          pair_member: selectedMember || null,
        }, { onConflict: 'trainee_id,exercise_id,record_type,pair_member' });
      }

      if (!volumeRecord || maxVolume > (volumeRecord.volume || 0)) {
        if (volumeRecord) {
          newRecords.push({ exerciseName: ex.exercise.name, type: 'volume', oldValue: volumeRecord.volume || 0, newValue: maxVolume });
        }
        await supabase.from('personal_records').upsert({
          trainee_id: trainee.id,
          exercise_id: ex.exercise.id,
          record_type: 'max_volume',
          volume: maxVolume,
          achieved_at: new Date().toISOString(),
          workout_id: workoutId,
          pair_member: selectedMember || null,
        }, { onConflict: 'trainee_id,exercise_id,record_type,pair_member' });
      }
    }

    return newRecords;
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    toast.success(workoutId ? 'האימון עודכן בהצלחה!' : 'האימון נשמר בהצלחה!');
    if (savedWorkout) {
      onSave(savedWorkout);
    }
  };

  const totalVolume = useMemo(() => calculateTotalVolume(), [exercises]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-6 transition-colors duration-300">
      <WorkoutHeader
        trainee={trainee}
        workoutId={workoutId}
        totalVolume={totalVolume}
        lastSaved={lastSaved}
        isDirty={isDirty}
        workoutDate={workoutDate}
        workoutType={workoutType}
        exercisesCount={exercises.length}
        saving={saving}
        onBack={onBack}
        onSave={handleSave}
        onSaveTemplate={() => setShowSaveTemplateModal(true)}
        onLoadPrevious={handleLoadPrevious}
        onDateChange={setWorkoutDate}
        onWorkoutTypeChange={setWorkoutType}
      />

      {exercises.map((workoutExercise, exerciseIndex) => (
        <WorkoutExerciseCard
          key={workoutExercise.tempId}
          workoutExercise={workoutExercise}
          exerciseIndex={exerciseIndex}
          isMinimized={minimizedExercises.includes(workoutExercise.tempId)}
          collapsedSets={collapsedSets}
          summary={getExerciseSummary(workoutExercise)}
          totalVolume={calculateExerciseVolume(workoutExercise)}
          onRemove={() => removeExercise(exerciseIndex)}
          onToggleMinimize={() => toggleMinimizeExercise(workoutExercise.tempId)}
          onComplete={() => completeExercise(workoutExercise.tempId)}
          onAddSet={() => addSet(exerciseIndex)}
          onDuplicateSet={(setIndex) => duplicateSet(exerciseIndex, setIndex)}
          onRemoveSet={(setIndex) => removeSet(exerciseIndex, setIndex)}
          onToggleCollapseSet={toggleCollapseSet}
          onCompleteSet={(setIndex) => completeSetAndMoveNext(exerciseIndex, setIndex)}
          onOpenNumericPad={(setIndex, field) => openNumericPad(exerciseIndex, setIndex, field, field === 'weight' ? 'משקל (ק״ג)' : field === 'reps' ? 'חזרות' : 'RPE (1-10)')}
          onOpenEquipmentSelector={(setIndex) => setEquipmentSelector({ exerciseIndex, setIndex })}
          onOpenSupersetSelector={(setIndex) => setSupersetSelector({ exerciseIndex, setIndex })}
          onOpenSupersetNumericPad={(setIndex, field) => openSupersetNumericPad(exerciseIndex, setIndex, field, field === 'superset_weight' ? 'משקל סופר-סט (ק״ג)' : field === 'superset_reps' ? 'חזרות סופר-סט' : 'RPE סופר-סט (1-10)')}
          onOpenSupersetEquipmentSelector={(setIndex) => setSupersetEquipmentSelector({ exerciseIndex, setIndex })}
          onOpenDropsetNumericPad={(setIndex, field) => openDropsetNumericPad(exerciseIndex, setIndex, field, field === 'dropset_weight' ? 'משקל דרופ-סט (ק״ג)' : 'חזרות דרופ-סט')}
          onOpenSupersetDropsetNumericPad={(setIndex, field) => openSupersetDropsetNumericPad(exerciseIndex, setIndex, field, field === 'superset_dropset_weight' ? 'משקל דרופ-סט סופר (ק״ג)' : 'חזרות דרופ-סט סופר')}
          onUpdateSet={(setIndex, field, value) => updateSet(exerciseIndex, setIndex, field, value)}
          onOpenCalculator={(setIndex) => setCalculatorData({ weight: exercises[exerciseIndex].sets[setIndex].weight, reps: exercises[exerciseIndex].sets[setIndex].reps })}
          onApplySuggestion={(setIndex) => applySuggestion(exerciseIndex, setIndex)}
        />
      ))}

      {exercises.length === 0 && !workoutId && (
        <div className="premium-card-static p-6 mb-4">
          <h3 className="text-lg font-bold text-white mb-2">התחל אימון חדש</h3>
          <p className="text-zinc-400 mb-4">בחר תבנית קיימת או התחל אימון ריק</p>
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-4 rounded-xl flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all font-semibold mb-3"
          >
            <BookMarked className="h-5 w-5" />
            <span>טען תבנית קיימת</span>
          </button>
          <p className="text-center text-sm text-zinc-500">או</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowExerciseSelector(true)}
        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white py-5 lg:py-6 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all touch-manipulation font-bold"
      >
        <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
        <span className="text-lg lg:text-xl">{exercises.length === 0 ? 'התחל אימון ריק' : 'הוסף תרגיל'}</span>
      </button>

      {showExerciseSelector && (
        <ExerciseSelector
          traineeId={trainee.id}
          traineeName={trainee.full_name}
          onSelect={handleAddExerciseWithAutoFill}
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
          minValue={numericPad.field === 'rpe' ? 1 : undefined}
          maxValue={numericPad.field === 'rpe' ? 10 : undefined}
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
          minValue={supersetNumericPad.field === 'superset_rpe' ? 1 : undefined}
          maxValue={supersetNumericPad.field === 'superset_rpe' ? 10 : undefined}
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
        <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-500/15">
                <BookMarked className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">שמור כתבנית</h3>
                <p className="text-zinc-500 text-sm">שמור את האימון הזה כתבנית לשימוש עתידי מהיר</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  שם התבנית *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="למשל: אימון רגליים מלא"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  תיאור (אופציונלי)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="הוסף תיאור לתבנית..."
                  rows={3}
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-sm text-amber-400">
                  <strong>{exercises.length}</strong> תרגילים יישמרו בתבנית
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                {savingTemplate ? 'שומר...' : 'שמור תבנית'}
              </button>
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
                className="flex-1 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 px-6 py-3 rounded-xl font-semibold transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummary && (
        <WorkoutSummary
          onClose={handleCloseSummary}
          exercises={exercises}
          muscleGroups={muscleGroups}
          duration={Math.floor((Date.now() - workoutStartTime.current) / 1000)}
          traineeName={trainee.full_name}
          previousWorkout={previousWorkout ? {
            totalVolume: previousWorkout.totalVolume,
            exerciseCount: previousWorkout.exercises?.length || 0,
            averageRpe: previousWorkout.averageRpe || 0,
          } : null}
          personalRecords={personalRecords}
        />
      )}
    </div>
  );
}
