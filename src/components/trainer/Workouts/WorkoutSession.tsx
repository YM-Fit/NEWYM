import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, BookMarked, Timer, Target, TrendingUp, Zap, Pencil, CheckCircle2, History } from 'lucide-react';
import { supabase, logSupabaseError } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { useWorkoutSession } from '../../../hooks/useWorkoutSession';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { useIsTouchDevice } from '../../../hooks/useIsTouchDevice';
import { saveWorkout } from '../../../api/workoutApi';
import { logger } from '../../../utils/logger';
import ExerciseSelector from './ExerciseSelector';
import QuickNumericPad from './QuickNumericPad';
import EquipmentSelector from '../Equipment/EquipmentSelector';
import WorkoutSummary from './WorkoutSummary';
import DraftModal from '../../common/DraftModal';
import WorkoutTemplates from './WorkoutTemplates';
import { WorkoutHeader } from './WorkoutHeader';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import WorkoutHistoryModal from './WorkoutHistoryModal';
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
  isTablet?: boolean;
  isPrepared?: boolean;
}

export default function WorkoutSession({
  trainee,
  onBack,
  onSave,
  previousWorkout,
  editingWorkout,
  initialSelectedMember,
  isTablet,
  isPrepared = false,
}: WorkoutSessionProps) {
  const { user } = useAuth();
  const { handleError } = useErrorHandler();

  // Use touch device detection - prevents keyboard on all touch devices (phones & tablets)
  const isTouchDevice = useIsTouchDevice();
  const preventKeyboard = isTablet || isTouchDevice;

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
    completeSetAndMoveNext,
  } = useWorkoutSession({ initialExercises: editingWorkout?.exercises });

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [workoutType, setWorkoutType] = useState<'personal' | 'pair'>('personal');
  const [selectedMember] = useState<'member_1' | 'member_2' | null>(
    initialSelectedMember || null
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(editingWorkout?.id || null);
  // Track if this is an editing workout to prevent deletion
  const isEditingWorkout = useRef<boolean>(!!editingWorkout?.id);
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [creatingWorkout, setCreatingWorkout] = useState(false);
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
  const [templateNameKeyboardEnabled, setTemplateNameKeyboardEnabled] = useState(false);
  const [templateDescriptionKeyboardEnabled, setTemplateDescriptionKeyboardEnabled] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [savedWorkout, setSavedWorkout] = useState<Workout | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<{ id: string; name: string }[]>([]);
  const [personalRecords, setPersonalRecords] = useState<{ exerciseName: string; type: 'weight' | 'reps' | 'volume'; oldValue: number; newValue: number }[]>([]);
  const workoutStartTime = useRef(Date.now());
  const exerciseCacheRef = useRef<Map<string, { sets: SetData[]; timestamp: number }>>(new Map());
  const [loadingExercise, setLoadingExercise] = useState<string | null>(null);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(false);
  // Track exercises that are being deleted to prevent auto-save from re-adding them
  const deletedExerciseIdsRef = useRef<Set<string>>(new Set());
  // Track exercises currently being deleted (async operation in progress)
  const deletingExerciseIdsRef = useRef<Set<string>>(new Set());

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

  // Create initial workout when first exercise is added
  const createInitialWorkout = useCallback(async (): Promise<string | null> => {
    // If we already have a workout ID (from editingWorkout), use it
    if (editingWorkout?.id) {
      setWorkoutId(editingWorkout.id);
      isEditingWorkout.current = true; // Mark as editing workout to prevent deletion
      return editingWorkout.id;
    }
    
    if (!user || workoutId || creatingWorkout) return null;

    setCreatingWorkout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return null;
      }

      // First, check if there's an existing scheduled workout (is_completed=false) for this trainee and date
      // This prevents creating duplicate workouts when opening a scheduled workout
      const workoutDateStr = workoutDate.toISOString().split('T')[0]; // Get date part only
      const workoutDateStart = new Date(workoutDateStr);
      workoutDateStart.setHours(0, 0, 0, 0);
      const workoutDateEnd = new Date(workoutDateStr);
      workoutDateEnd.setHours(23, 59, 59, 999);

      const { data: existingScheduledWorkouts } = await supabase
        .from('workout_trainees')
        .select(`
          workout_id,
          workouts!inner (
            id,
            workout_date,
            is_completed,
            trainer_id
          )
        `)
        .eq('trainee_id', trainee.id)
        .eq('workouts.is_completed', false)
        .eq('workouts.trainer_id', user.id)
        .gte('workouts.workout_date', workoutDateStart.toISOString())
        .lte('workouts.workout_date', workoutDateEnd.toISOString())
        .limit(1);

      // If there's an existing scheduled workout, use it instead of creating a new one
      if (existingScheduledWorkouts && existingScheduledWorkouts.length > 0) {
        const workoutData = existingScheduledWorkouts[0];
        // workouts can be an object or array depending on Supabase query structure
        let workout;
        if (Array.isArray(workoutData.workouts)) {
          workout = workoutData.workouts[0];
        } else {
          workout = workoutData.workouts;
        }
        
        if (workout && workout.id) {
          setWorkoutId(workout.id);
          logger.info('Using existing scheduled workout', { workoutId: workout.id }, 'WorkoutSession');
          setCreatingWorkout(false);
          return workout.id;
        }
      }

      // No existing scheduled workout found, create a new one
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert([
          {
            trainer_id: user.id,
            workout_type: workoutType,
            notes: notes || null,
            workout_date: workoutDate.toISOString(),
            is_completed: false, // Mark as incomplete - will be completed when user saves
            is_prepared: isPrepared, // Use the isPrepared prop
          },
        ])
        .select()
        .single();

      if (workoutError || !newWorkout) {
        logger.error('Error creating initial workout', workoutError, 'WorkoutSession');
        toast.error('שגיאה ביצירת אימון. נסה שוב.');
        return null;
      }

      // Link trainee to workout
      const { error: traineeError } = await supabase
        .from('workout_trainees')
        .insert([
          {
            workout_id: newWorkout.id,
            trainee_id: trainee.id,
          },
        ]);

      if (traineeError) {
        logger.error('Error linking trainee to workout', traineeError, 'WorkoutSession');
        // Try to delete the workout we just created to prevent orphaned records
        try {
          await supabase.from('workouts').delete().eq('id', newWorkout.id);
        } catch (deleteError) {
          logger.error('Error deleting orphaned workout', deleteError, 'WorkoutSession');
        }
        toast.error('שגיאה בקישור המתאמן לאימון. נסה שוב.');
        return null;
      }

      setWorkoutId(newWorkout.id);
      logger.info('Created initial workout', { workoutId: newWorkout.id }, 'WorkoutSession');
      return newWorkout.id;
    } catch (err) {
      logger.error('Unexpected error creating initial workout', err, 'WorkoutSession');
      return null;
    } finally {
      setCreatingWorkout(false);
    }
  }, [user, workoutId, creatingWorkout, workoutType, notes, workoutDate, trainee.id]);

  // Delete incomplete workout if user cancels/leaves
  // Only delete workouts that were created during this session (new workouts, not scheduled ones)
  const deleteIncompleteWorkout = useCallback(async () => {
    // Don't delete if this is an editing workout (scheduled workout being edited)
    // Only delete workouts that were created during this session
    if (!workoutId || !user || isEditingWorkout.current) return;
    
    try {
      // Check if workout exists, is not completed, and has exercises
      // Scheduled workouts typically don't have exercises yet, so we only delete workouts with exercises
      const { data: workout } = await supabase
        .from('workouts')
        .select(`
          id, 
          is_completed,
          created_at,
          workout_exercises (id)
        `)
        .eq('id', workoutId)
        .eq('trainer_id', user.id)
        .single();

      if (!workout) return;

      // Only delete if:
      // 1. Workout exists and is not completed
      // 2. Workout has exercises (meaning it was filled during this session, not a scheduled workout)
      // 3. Workout was created recently (within last hour) - this indicates it's a new workout, not a scheduled one
      // 4. Workout date is today or in the past (not a future scheduled workout)
      // This prevents deleting scheduled workouts that don't have exercises yet
      const workoutCreatedAt = new Date(workout.created_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const isRecentWorkout = workoutCreatedAt > oneHourAgo;
      
      // Check if workout date is in the future (scheduled workout)
      const { data: workoutDetails } = await supabase
        .from('workouts')
        .select('workout_date')
        .eq('id', workoutId)
        .single();
      
      const isFutureWorkout = workoutDetails?.workout_date 
        ? new Date(workoutDetails.workout_date) > new Date()
        : false;
      
      // Only delete if it's a recent workout with exercises that's not in the future
      // This ensures scheduled workouts (future dates) are never deleted
      if (!workout.is_completed && 
          workout.workout_exercises && 
          workout.workout_exercises.length > 0 && 
          isRecentWorkout && 
          !isFutureWorkout) {
        await supabase
          .from('workouts')
          .delete()
          .eq('id', workoutId);
        logger.info('Deleted incomplete workout on cancel', { workoutId }, 'WorkoutSession');
      }
    } catch (err) {
      // Log error but don't block - user is leaving anyway
      logger.error('Error deleting incomplete workout', err, 'WorkoutSession');
    }
  }, [workoutId, user, editingWorkout]);

  // Cleanup: delete incomplete workout when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // Only delete if workout is not completed (auto-saved workouts)
      deleteIncompleteWorkout();
    };
  }, [deleteIncompleteWorkout]);

  // Handle back button - delete incomplete workout before leaving
  const handleBackWithCleanup = useCallback(async () => {
    await deleteIncompleteWorkout();
    onBack();
  }, [deleteIncompleteWorkout, onBack]);

  // Auto-save workout in realtime when exercises change
  const autoSaveWorkoutRef = useRef<(() => Promise<void>) | null>(null);
  
  const autoSaveWorkout = useCallback(async () => {
    console.log('[AUTO-SAVE] Starting auto-save check', {
      user: !!user,
      workoutId,
      saving,
      creatingWorkout,
      exercisesCount: exercises.length,
      deletedIds: Array.from(deletedExerciseIdsRef.current),
      deletingIds: Array.from(deletingExerciseIdsRef.current)
    });

    if (!user || !workoutId || saving || creatingWorkout) {
      console.log('[AUTO-SAVE] Skipping - conditions not met');
      return;
    }

    // CRITICAL FIX: Filter out exercises that are being deleted OR currently in deletion process
    // This prevents auto-save from re-adding exercises that were just deleted
    const exercisesToSave = exercises.filter(ex =>
      !deletedExerciseIdsRef.current.has(ex.exercise.id) &&
      !deletingExerciseIdsRef.current.has(ex.exercise.id)
    );

    console.log('[AUTO-SAVE] Filtered exercises', {
      originalCount: exercises.length,
      filteredCount: exercisesToSave.length,
      filteredOutIds: exercises
        .filter(ex => deletedExerciseIdsRef.current.has(ex.exercise.id) || deletingExerciseIdsRef.current.has(ex.exercise.id))
        .map(ex => ex.exercise.id)
    });

    // IMPORTANT: Even if exercisesToSave is empty, we MUST call the edge function
    // to delete all exercises from the database. Only skip if there's nothing to do.
    if (exercisesToSave.length === 0 && exercises.length === 0 &&
        deletedExerciseIdsRef.current.size === 0 && deletingExerciseIdsRef.current.size === 0) {
      console.log('[AUTO-SAVE] Skipping - no exercises and nothing being deleted');
      logger.debug('No exercises and nothing being deleted, skipping auto-save', 'WorkoutSession');
      return;
    }

    // CRITICAL FIX: Check for duplicate exercises before saving
    // This prevents the autosave from creating duplicate exercises in the database
    const exerciseIds = exercisesToSave.map(ex => ex.exercise.id);
    const uniqueExerciseIds = new Set(exerciseIds);

    if (exerciseIds.length !== uniqueExerciseIds.size) {
      logger.error('Duplicate exercises detected in state, skipping autosave to prevent DB corruption', {
        totalExercises: exerciseIds.length,
        uniqueExercises: uniqueExerciseIds.size,
        exerciseIds
      }, 'WorkoutSession');

      // Remove duplicates from state
      const seen = new Set<string>();
      const uniqueExercises = exercisesToSave.filter(ex => {
        if (seen.has(ex.exercise.id)) {
          logger.debug('Removing duplicate exercise from state', {
            exerciseId: ex.exercise.id,
            exerciseName: ex.exercise.name,
            tempId: ex.tempId
          }, 'WorkoutSession');
          return false;
        }
        seen.add(ex.exercise.id);
        return true;
      });

      setExercises(uniqueExercises);
      toast.error('זוהו תרגילים כפולים והוסרו. אנא בדוק את הרשימה.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Validate and fix set numbers before saving
      const exercisesData = exercisesToSave.map((ex, index) => ({
        exercise_id: ex.exercise.id,
        order_index: index,
        sets: ex.sets.map((set, setIndex) => ({
          // Ensure set numbers are sequential (1, 2, 3...) - use setIndex instead of set.set_number
          // This prevents issues with duplicate or invalid set numbers
          set_number: setIndex + 1,
          weight: set.weight || 0,
          reps: set.reps || 0,
          rpe: set.rpe && set.rpe >= 1 && set.rpe <= 10 ? set.rpe : null,
          set_type: set.set_type || 'regular',
          failure: set.failure || false,
          superset_exercise_id: set.superset_exercise_id || null,
          superset_weight: set.superset_weight || null,
          superset_reps: set.superset_reps || null,
          superset_rpe: set.superset_rpe && set.superset_rpe >= 1 && set.superset_rpe <= 10 ? set.superset_rpe : null,
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
        workout_id: workoutId,
        is_auto_save: true, // Mark as auto-save so workout won't be marked as completed
      };

      console.log('[AUTO-SAVE] Sending to edge function', {
        workoutId,
        exercisesCount: exercisesData.length,
        exerciseIds: exercisesData.map(e => e.exercise_id),
        is_auto_save: true
      });

      logger.debug('Auto-saving workout', {
        workoutId,
        exercisesCount: exercisesData.length,
        exerciseIds: exercisesData.map(e => e.exercise_id)
      }, 'WorkoutSession');

      const result = await saveWorkout(requestBody, session.access_token);
      if (result.error) {
        console.error('[AUTO-SAVE] Error from edge function', result.error);
        logger.error('Auto-save error', result.error, 'WorkoutSession');
      } else {
        console.log('[AUTO-SAVE] Success!', { workoutId, exercisesCount: exercisesData.length });
        logger.debug('Auto-save successful', { workoutId }, 'WorkoutSession');
      }
    } catch (err) {
      logger.error('Unexpected error in auto-save', err, 'WorkoutSession');
    }
  }, [user, workoutId, exercises, workoutType, notes, workoutDate, trainee, selectedMember, saving, creatingWorkout, setExercises]);

  // Update ref when function changes
  useEffect(() => {
    autoSaveWorkoutRef.current = autoSaveWorkout;
  }, [autoSaveWorkout]);

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

  // Find the active exercise (first non-minimized) and active set (first non-collapsed)
  const findActiveExerciseAndSet = useCallback((): { exerciseIndex: number; setIndex: number } | null => {
    for (let i = 0; i < exercises.length; i++) {
      if (!minimizedExercises.includes(exercises[i].tempId)) {
        const exercise = exercises[i];
        for (let j = 0; j < exercise.sets.length; j++) {
          if (!collapsedSets.includes(exercise.sets[j].id)) {
            return { exerciseIndex: i, setIndex: j };
          }
        }
        // If no non-collapsed set, return the first set
        if (exercise.sets.length > 0) {
          return { exerciseIndex: i, setIndex: 0 };
        }
      }
    }
    // Fallback to first exercise and first set
    return exercises.length > 0 && exercises[0].sets.length > 0 
      ? { exerciseIndex: 0, setIndex: 0 }
      : null;
  }, [exercises, minimizedExercises, collapsedSets]);

  // Auto-save workout in realtime when exercises change (with debounce)
  // IMPORTANT: Don't skip on empty exercises - we need to save deletions too!
  useEffect(() => {
    if (!workoutId || saving || creatingWorkout) return;

    const timeoutId = setTimeout(() => {
      if (autoSaveWorkoutRef.current) {
        autoSaveWorkoutRef.current();
      }
    }, 2000); // Debounce: wait 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [exercises, workoutId, saving, creatingWorkout]);

  // Enhanced keyboard shortcuts for better UX (especially on tablet with external keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when modals are open or input is focused
      if (showExerciseSelector || numericPad || equipmentSelector || supersetSelector || 
          showDraftModal || showTemplateModal || showSaveTemplateModal || showSummary ||
          document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (exercises.length > 0 && !saving && user) {
          handleSave();
        }
      }
      // Ctrl/Cmd + N or just N to add exercise
      else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowExerciseSelector(true);
      }
      // Just N (without modifier) to add exercise when no exercises
      else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && exercises.length === 0) {
        e.preventDefault();
        setShowExerciseSelector(true);
      }
      // Ctrl/Cmd + T to load template
      else if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        if (exercises.length === 0) {
          setShowTemplateModal(true);
        }
      }
      // Plus key to add set to last exercise
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        if (exercises.length > 0) {
          const lastExerciseIndex = exercises.length - 1;
          addSet(lastExerciseIndex);
          toast.success('סט חדש נוסף', { duration: 1500, position: 'bottom-center' });
        }
      }
      // W key to open weight pad for active exercise and set
      else if (e.key.toLowerCase() === 'w' && !e.ctrlKey && !e.metaKey && exercises.length > 0) {
        e.preventDefault();
        const active = findActiveExerciseAndSet();
        if (active) {
          openNumericPad(active.exerciseIndex, active.setIndex, 'weight', 'משקל (ק״ג)');
        }
      }
      // R key to open reps pad for active exercise and set
      else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && exercises.length > 0) {
        e.preventDefault();
        const active = findActiveExerciseAndSet();
        if (active) {
          openNumericPad(active.exerciseIndex, active.setIndex, 'reps', 'חזרות');
        }
      }
      // E key to open RPE pad for active exercise and set
      else if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey && exercises.length > 0) {
        e.preventDefault();
        const active = findActiveExerciseAndSet();
        if (active) {
          openNumericPad(active.exerciseIndex, active.setIndex, 'rpe', 'RPE (1-10)');
        }
      }
      // Escape to go back (with confirmation if dirty)
      else if (e.key === 'Escape') {
        if (exercises.length > 0 && isDirty) {
          if (confirm('יש שינויים שלא נשמרו. בטוח שברצונך לצאת?')) {
            handleBackWithCleanup();
          }
        } else if (exercises.length === 0) {
          handleBackWithCleanup();
        }
      }
      // Arrow down to expand next collapsed set
      else if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
        const firstCollapsedSet = collapsedSets[0];
        if (firstCollapsedSet) {
          toggleCollapseSet(firstCollapsedSet);
        }
      }
      // Enter to complete current set (first non-collapsed exercise, first non-collapsed set)
      else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        // Find the first non-minimized exercise with a non-collapsed set
        for (let i = 0; i < exercises.length; i++) {
          if (!minimizedExercises.includes(exercises[i].tempId)) {
            const exercise = exercises[i];
            for (let j = 0; j < exercise.sets.length; j++) {
              if (!collapsedSets.includes(exercise.sets[j].id)) {
                // This is the active set - complete it
                completeSetAndMoveNext(i, j);
                toast.success('סט הושלם', { duration: 1500, position: 'bottom-center' });
                break;
              }
            }
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showExerciseSelector, numericPad, equipmentSelector, supersetSelector, 
      showDraftModal, showTemplateModal, showSaveTemplateModal, showSummary, 
      exercises.length, saving, isDirty, collapsedSets, minimizedExercises, findActiveExerciseAndSet]);

  useEffect(() => {
    const loadMuscleGroups = async () => {
      const { data, error } = await supabase.from('muscle_groups').select('id, name');
      if (error) {
        logSupabaseError(error, 'WorkoutSession.loadMuscleGroups', { table: 'muscle_groups' });
      } else if (data) {
        setMuscleGroups(data);
      }
    };
    loadMuscleGroups();
  }, []);

  const handleAddExerciseWithAutoFill = async (exercise: Exercise, loadPreviousData: boolean = false) => {
    // Prevent duplicate additions - check if exercise is already being loaded
    if (loadingExercise === exercise.id) {
      logger.debug('Exercise already being added, skipping duplicate request', { exerciseId: exercise.id }, 'WorkoutSession');
      return;
    }

    // Set loading state IMMEDIATELY to prevent rapid clicks from adding duplicates
    setLoadingExercise(exercise.id);
    logger.debug('Adding exercise:', { exerciseId: exercise.id, exerciseName: exercise.name, loadPreviousData }, 'WorkoutSession');

    try {
      // Create workout if this is the first exercise
      if (exercises.length === 0 && !workoutId && user) {
        const newWorkoutId = await createInitialWorkout();
        if (!newWorkoutId) {
          logger.error('Failed to create workout, cannot add exercise', {}, 'WorkoutSession');
          toast.error('שגיאה ביצירת אימון. נסה שוב.');
          setLoadingExercise(null);
          return;
        }
        // Set workoutId directly to ensure it's available for auto-save
        setWorkoutId(newWorkoutId);
        // Use the returned value directly instead of waiting for state update
        // This prevents race conditions with auto-save
        const currentWorkoutId = newWorkoutId;
        
        // Proceed with the workoutId we just created
        if (!currentWorkoutId) {
          logger.error('Failed to create workout, cannot add exercise', {}, 'WorkoutSession');
          toast.error('שגיאה ביצירת אימון. נסה שוב.');
          setLoadingExercise(null);
          return;
        }
        
        // Continue with the workoutId we have
        // Note: We use currentWorkoutId instead of workoutId state to avoid race conditions
      } else if (!workoutId) {
        // No workout ID and we didn't just create one - this shouldn't happen
        logger.error('Cannot add exercise: no workout ID', {}, 'WorkoutSession');
        toast.error('שגיאה: אין מזהה אימון. נסה שוב.');
        setLoadingExercise(null);
        return;
      }

      if (!user) {
        addExercise(exercise);
        setLoadingExercise(null);
        return;
      }

      // If not loading previous data, just add exercise without data
      if (!loadPreviousData) {
        addExercise(exercise);
        setLoadingExercise(null);
        return;
      }

      // Check cache first (cache valid for 5 minutes)
      const cacheKey = `${trainee.id}-${exercise.id}`;
      const cached = exerciseCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        addExercise(exercise);
        setExercises((prev) => {
          if (!prev.length) return prev;
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          // Only load the first set
          const firstSet = cached.sets[0];
          if (firstSet) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              sets: [{
                ...firstSet,
                id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-0`,
              }],
            };
          }
          return updated;
        });
        setLoadingExercise(null);
        return;
      }

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
        logger.error('Error loading last exercise for autofill:', error, 'WorkoutSession');
        toast.error('שגיאה בטעינת התרגיל הקודם, התרגיל נוסף ללא נתונים');
        addExercise(exercise);
        setLoadingExercise(null);
        return;
      }

      if (!workouts || workouts.length === 0 || !workouts[0].workout_exercises?.length) {
        addExercise(exercise);
        setLoadingExercise(null);
        return;
      }

      const lastExercise = workouts[0].workout_exercises[0] as any;
      const previousSets = lastExercise.exercise_sets || [];

      if (!previousSets.length) {
        addExercise(exercise);
        setLoadingExercise(null);
        return;
      }

      // Sort sets and take only the first one
      const sortedSets = previousSets.sort((a: any, b: any) => (a.set_number || 0) - (b.set_number || 0));
      const firstSet = sortedSets[0];

      if (!firstSet) {
        addExercise(exercise);
        setLoadingExercise(null);
        return;
      }

      // Map only the first set
      const mappedFirstSet: SetData = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-0`,
        set_number: firstSet.set_number || 1,
        weight: firstSet.weight || 0,
        reps: firstSet.reps || 0,
        rpe: firstSet.rpe,
        set_type: firstSet.set_type || 'regular',
        failure: firstSet.failure || false,
        superset_exercise_id: firstSet.superset_exercise_id,
        superset_exercise_name: undefined,
        superset_weight: firstSet.superset_weight,
        superset_reps: firstSet.superset_reps,
        superset_rpe: firstSet.superset_rpe,
        superset_equipment_id: firstSet.superset_equipment_id,
        superset_equipment: null,
        superset_dropset_weight: firstSet.superset_dropset_weight,
        superset_dropset_reps: firstSet.superset_dropset_reps,
        dropset_weight: firstSet.dropset_weight,
        dropset_reps: firstSet.dropset_reps,
        equipment_id: firstSet.equipment_id,
        equipment: null,
      };

      // Cache all sets for future use (in case user wants to see history)
      const allMappedSets: SetData[] = sortedSets.map((set: any, index: number) => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${index}`,
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
      }));

      exerciseCacheRef.current.set(cacheKey, {
        sets: allMappedSets,
        timestamp: Date.now(),
      });

      // Add the exercise using the existing hook logic (minimize previous exercise etc.)
      addExercise(exercise);

      // Replace the just-added exercise's sets with only the first set
      setExercises((prev) => {
        if (!prev.length) return prev;
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          sets: [mappedFirstSet],
        };
        return updated;
      });
      toast.success('התרגיל נטען עם הסט הראשון מהאימון הקודם');
    } catch (err) {
      logger.error('Unexpected error in exercise autofill:', err, 'WorkoutSession');
      toast.error('שגיאה בטעינת התרגיל, התרגיל נוסף ללא נתונים');
      addExercise(exercise);
    } finally {
      setLoadingExercise(null);
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
        logger.error('Error saving template:', error, 'WorkoutSession');
        toast.error('שגיאה בשמירת התבנית');
      } else {
        toast.success('התבנית נשמרה בהצלחה!');
        setShowSaveTemplateModal(false);
        setTemplateName('');
        setTemplateDescription('');
      }
    } catch (error) {
      logger.error('Error saving template:', error, 'WorkoutSession');
      toast.error('שגיאה בשמירת התבנית');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadPrevious = async () => {
    if (!user) return;

    try {
      // If previousWorkout prop is provided, use it directly
      if (previousWorkout && previousWorkout.workout_exercises) {
        const loadedExercises: WorkoutExercise[] = previousWorkout.workout_exercises
          .sort((a: any, b: any) => a.order_index - b.order_index)
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
        toast.success('האימון נטען בהצלחה!');
        return;
      }

      // Otherwise, load from database
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
        logger.error('Error loading previous workout:', workoutsError, 'WorkoutSession');
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
      logger.error('Error loading previous workout:', error, 'WorkoutSession');
      toast.error('שגיאה בטעינת האימון הקודם');
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('נדרשת התחברות');
      return;
    }

    // For new workouts, require at least one exercise
    // For existing workouts, allow empty exercises (to delete all exercises)
    if (!workoutId && exercises.length === 0) {
      toast.error('יש להוסיף לפחות תרגיל אחד לפני שמירה');
      return;
    }

    // Validate that all exercises have valid sets with set numbers
    const hasInvalidSets = exercises.some(ex => {
      return ex.sets.some((set, index) => {
        // Set numbers should be sequential starting from 1
        const expectedSetNumber = index + 1;
        return set.set_number !== expectedSetNumber;
      });
    });

    if (hasInvalidSets) {
      // Fix set numbers before saving
      const fixedExercises = exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map((set, index) => ({
          ...set,
          set_number: index + 1
        }))
      }));
      setExercises(fixedExercises);
      logger.warn('Fixed invalid set numbers before saving', {}, 'WorkoutSession');
    }

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
        sets: ex.sets.map((set, setIndex) => ({
          // Ensure set numbers are sequential (1, 2, 3...)
          set_number: setIndex + 1,
          weight: set.weight || 0,
          reps: set.reps || 0,
          rpe: set.rpe && set.rpe >= 1 && set.rpe <= 10 ? set.rpe : null,
          set_type: set.set_type || 'regular',
          failure: set.failure || false,
          superset_exercise_id: set.superset_exercise_id || null,
          superset_weight: set.superset_weight || null,
          superset_reps: set.superset_reps || null,
          superset_rpe: set.superset_rpe && set.superset_rpe >= 1 && set.superset_rpe <= 10 ? set.superset_rpe : null,
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
        is_prepared: isPrepared,
      };

      const result = await saveWorkout(requestBody, session.access_token);

      if (result.error || !result.data) {
        // Extract error message for better logging
        const errorMessage = result.error || 'Unknown error saving workout';
        const errorDetails = result.error 
          ? { error: result.error, fullResult: result }
          : { message: 'No error message provided', fullResult: result };
        
        logger.error('Save workout error:', errorDetails, 'WorkoutSession');
        
        // Provide user-friendly error messages based on error type
        const errorStr = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
        
        let userMessage = 'שגיאה בשמירת האימון. נסה שוב.';
        
        if (errorStr.includes('כבר קיים') || errorStr.includes('already exists') || errorStr.includes('409')) {
          userMessage = 'שגיאה: אימון כבר קיים. אם יש אימון מתוזמן, תוכל ליצור אימון חדש.';
        } else if (errorStr.includes('Unauthorized') || errorStr.includes('401')) {
          userMessage = 'נדרשת התחברות מחדש. אנא התחבר שוב.';
        } else if (errorStr.includes('Forbidden') || errorStr.includes('403')) {
          userMessage = 'אין הרשאה לשמור אימון זה. אנא בדוק את ההרשאות.';
        } else if (errorStr.includes('Not Found') || errorStr.includes('404')) {
          userMessage = 'המתאמן לא נמצא. אנא בדוק את הפרטים.';
        } else if (errorStr.includes('Missing required fields') || errorStr.includes('400')) {
          userMessage = 'חסרים שדות נדרשים. אנא בדוק שכל השדות מולאו.';
        } else if (typeof errorMessage === 'string' && errorMessage.length > 0) {
          // Use the error message if it's a meaningful string
          userMessage = errorMessage;
        }
        
        toast.error(userMessage);
        setSaving(false);
        return;
      }

      const workoutResult = result.data;

      // Update workout to completed only if it wasn't already completed
      // This preserves the is_completed status when editing a completed workout
      if (workoutId && workoutResult.workout.id === workoutId) {
        const { data: existingWorkout } = await supabase
          .from('workouts')
          .select('is_completed')
          .eq('id', workoutId)
          .single();
        
        // Only update to completed if it wasn't already completed
        // This allows editing completed workouts without changing their status
        if (existingWorkout?.is_completed !== true) {
          await supabase
            .from('workouts')
            .update({ is_completed: true })
            .eq('id', workoutId);
        }
      }

      clearSaved();

      // Sync to Google Calendar if enabled (already handled in save-workout Edge Function)
      // But we can show a confirmation message
      try {
        const { getGoogleCalendarStatus } = await import('../../../api/googleCalendarApi');
        const statusResult = await getGoogleCalendarStatus(user.id);
        if (statusResult.success && statusResult.data?.connected) {
          // Calendar sync is handled automatically by the Edge Function
        }
      } catch (error) {
        // Ignore calendar sync errors - workout is already saved
      }

      const newPRs = await checkAndUpdatePersonalRecords(workoutResult.workout.id);
      setPersonalRecords(newPRs);
      setSavedWorkout(workoutResult.workout);
      setShowSummary(true);
    } catch (error) {
      logger.error('Error saving workout:', error, 'WorkoutSession');
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
        const { error: weightError } = await supabase.from('personal_records').upsert({
          trainee_id: trainee.id,
          exercise_id: ex.exercise.id,
          record_type: 'max_weight',
          weight: maxWeight,
          achieved_at: new Date().toISOString(),
          workout_id: workoutId,
          pair_member: selectedMember || null,
        }, { onConflict: 'trainee_id,exercise_id,record_type,pair_member' });
        if (weightError) {
          logSupabaseError(weightError, 'WorkoutSession.savePersonalRecord.max_weight', { 
            table: 'personal_records',
            trainee_id: trainee.id,
            exercise_id: ex.exercise.id,
          });
        }
      }

      if (!repsRecord || maxReps > (repsRecord.reps || 0)) {
        if (repsRecord) {
          newRecords.push({ exerciseName: ex.exercise.name, type: 'reps', oldValue: repsRecord.reps || 0, newValue: maxReps });
        }
        const { error: repsError } = await supabase.from('personal_records').upsert({
          trainee_id: trainee.id,
          exercise_id: ex.exercise.id,
          record_type: 'max_reps',
          reps: maxReps,
          achieved_at: new Date().toISOString(),
          workout_id: workoutId,
          pair_member: selectedMember || null,
        }, { onConflict: 'trainee_id,exercise_id,record_type,pair_member' });
        if (repsError) {
          logSupabaseError(repsError, 'WorkoutSession.savePersonalRecord.max_reps', { 
            table: 'personal_records',
            trainee_id: trainee.id,
            exercise_id: ex.exercise.id,
          });
        }
      }

      if (!volumeRecord || maxVolume > (volumeRecord.volume || 0)) {
        if (volumeRecord) {
          newRecords.push({ exerciseName: ex.exercise.name, type: 'volume', oldValue: volumeRecord.volume || 0, newValue: maxVolume });
        }
        const { error: volumeError } = await supabase.from('personal_records').upsert({
          trainee_id: trainee.id,
          exercise_id: ex.exercise.id,
          record_type: 'max_volume',
          volume: maxVolume,
          achieved_at: new Date().toISOString(),
          workout_id: workoutId,
          pair_member: selectedMember || null,
        }, { onConflict: 'trainee_id,exercise_id,record_type,pair_member' });
        if (volumeError) {
          logSupabaseError(volumeError, 'WorkoutSession.savePersonalRecord.max_volume', { 
            table: 'personal_records',
            trainee_id: trainee.id,
            exercise_id: ex.exercise.id,
          });
        }
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

  // Calculate workout progress stats
  const workoutProgress = useMemo(() => {
    let totalSets = 0;
    let completedSets = 0;
    
    exercises.forEach(ex => {
      totalSets += ex.sets.length;
      ex.sets.forEach(set => {
        if (set.weight > 0 && set.reps > 0) {
          completedSets++;
        }
      });
    });
    
    const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    
    return {
      totalSets,
      completedSets,
      progressPercent,
      totalExercises: exercises.length,
      completedExercises: minimizedExercises.length,
    };
  }, [exercises, minimizedExercises]);

  // Workout timer display
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - workoutStartTime.current) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div
      className={`trainer-workout-session min-h-screen bg-[var(--color-bg-base)] p-4 lg:p-6 transition-colors duration-300 ${
        isTablet ? 'tablet-padding' : ''
      }`}
    >
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
        selectedMember={selectedMember}
        onBack={handleBackWithCleanup}
        onSave={handleSave}
        onSaveTemplate={() => setShowSaveTemplateModal(true)}
        onLoadPrevious={handleLoadPrevious}
        onDateChange={setWorkoutDate}
        onWorkoutTypeChange={setWorkoutType}
        isTablet={isTablet}
      />

      {/* Workout Progress Bar - Only show when workout has exercises */}
      {exercises.length > 0 && (
        <div className="premium-card-static p-3 lg:p-4 mb-4 animate-fade-in">
          {/* Progress bar */}
          <div className="relative h-2 bg-surface rounded-full overflow-hidden mb-3">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${workoutProgress.progressPercent}%` }}
            />
          </div>
          
          {/* Stats row */}
          <div className="flex items-center justify-between flex-wrap gap-2 lg:gap-4">
            {/* Timer */}
            <div className="flex items-center gap-2 bg-surface/50 px-3 py-1.5 rounded-lg">
              <Timer className="h-4 w-4 text-amber-400" />
              <span className="font-mono font-semibold text-foreground text-sm lg:text-base">{formatTime(elapsedTime)}</span>
            </div>
            
            {/* Sets progress */}
            <div className="flex items-center gap-2 bg-surface/50 px-3 py-1.5 rounded-lg">
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-sm lg:text-base">
                <span className="font-semibold text-cyan-400">{workoutProgress.completedSets}</span>
                <span className="text-muted">/{workoutProgress.totalSets}</span>
                <span className="text-muted mr-1">סטים</span>
              </span>
            </div>
            
            {/* Volume */}
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-emerald-400 text-sm lg:text-base">{totalVolume.toLocaleString()}</span>
              <span className="text-emerald-400/70 text-xs">ק״ג</span>
            </div>
            
            {/* Exercises progress */}
            <div className="flex items-center gap-2 bg-surface/50 px-3 py-1.5 rounded-lg">
              <Zap className="h-4 w-4 text-purple-400" />
              <span className="text-sm lg:text-base">
                <span className="font-semibold text-purple-400">{workoutProgress.completedExercises}</span>
                <span className="text-muted">/{workoutProgress.totalExercises}</span>
                <span className="text-muted mr-1">תרגילים</span>
              </span>
            </div>
            
            {/* Progress percentage */}
            <div className="flex items-center gap-1">
              <span className="text-lg lg:text-xl font-bold text-foreground">{workoutProgress.progressPercent}%</span>
              <span className="text-xs text-muted">הושלמו</span>
            </div>
          </div>
        </div>
      )}

      <div className={isTablet ? 'trainer-workout-layout grid gap-4' : 'space-y-4'}>
        {exercises.map((workoutExercise, exerciseIndex) => (
          <WorkoutExerciseCard
            key={workoutExercise.tempId}
            workoutExercise={workoutExercise}
            exerciseIndex={exerciseIndex}
            isMinimized={minimizedExercises.includes(workoutExercise.tempId)}
            collapsedSets={collapsedSets}
            summary={getExerciseSummary(workoutExercise)}
            totalVolume={calculateExerciseVolume(workoutExercise)}
            onRemove={() => {
              const exercise = exercises[exerciseIndex];
              const exerciseId = exercise.exercise.id;
              const exerciseTempId = exercise.tempId;

              console.log('[DELETE] Starting exercise deletion', {
                exerciseIndex,
                exerciseName: exercise.exercise.name,
                exerciseId,
                tempId: exerciseTempId,
                workoutId,
                totalExercises: exercises.length,
                currentDeletedIds: Array.from(deletedExerciseIdsRef.current),
                currentDeletingIds: Array.from(deletingExerciseIdsRef.current)
              });

              logger.debug('Removing exercise', {
                exerciseIndex,
                exerciseName: exercise.exercise.name,
                exerciseId,
                tempId: exerciseTempId,
                workoutId,
                totalExercises: exercises.length
              }, 'WorkoutSession');

              // Mark exercise as "deleting" (async operation in progress)
              deletingExerciseIdsRef.current.add(exerciseId);
              // Also mark as "deleted" to prevent auto-save from re-adding it
              deletedExerciseIdsRef.current.add(exerciseId);

              console.log('[DELETE] Added to tracking refs', {
                deletedIds: Array.from(deletedExerciseIdsRef.current),
                deletingIds: Array.from(deletingExerciseIdsRef.current)
              });

              // IMMEDIATELY remove from local state for responsive UI
              removeExercise(exerciseIndex);
              toast.success('התרגיל הוסר');
              logger.debug('Exercise removed from local state', {
                exerciseIndex,
                remainingExercises: exercises.length - 1
              }, 'WorkoutSession');

              // Then delete from database in the background (if workoutId exists)
              if (workoutId) {
                logger.debug('Deleting exercise from database in background', {
                  workoutId,
                  exerciseId
                }, 'WorkoutSession');

                // Run DB deletion asynchronously without blocking UI
                (async () => {
                  try {
                    // Find the workout_exercise by workout_id and exercise_id
                    const { data: workoutExercises, error: findError } = await supabase
                      .from('workout_exercises')
                      .select('id')
                      .eq('workout_id', workoutId)
                      .eq('exercise_id', exerciseId);

                    if (findError) {
                      logger.error('Error finding exercise in database:', findError, 'WorkoutSession');
                      // Remove from "deleting" but keep in "deleted" to be safe
                      deletingExerciseIdsRef.current.delete(exerciseId);
                      return;
                    }

                    if (workoutExercises && workoutExercises.length > 0) {
                      // Delete all sets for these workout_exercises
                      const workoutExerciseIds = workoutExercises.map(we => we.id);

                      const { error: setsDeleteError } = await supabase
                        .from('exercise_sets')
                        .delete()
                        .in('workout_exercise_id', workoutExerciseIds);

                      if (setsDeleteError) {
                        logger.error('Error deleting exercise sets from database:', setsDeleteError, 'WorkoutSession');
                      }

                      // Delete the workout_exercises
                      const { error: exerciseDeleteError } = await supabase
                        .from('workout_exercises')
                        .delete()
                        .in('id', workoutExerciseIds);

                      if (exerciseDeleteError) {
                        logger.error('Error deleting exercise from database:', exerciseDeleteError, 'WorkoutSession');
                        // Remove from "deleting" but keep in "deleted" to be safe
                        deletingExerciseIdsRef.current.delete(exerciseId);
                      } else {
                        logger.debug('Deleted exercise from database successfully', { workoutExerciseIds }, 'WorkoutSession');
                        // Remove from "deleting" - DB deletion completed
                        deletingExerciseIdsRef.current.delete(exerciseId);
                        // Keep in "deleted" set for much longer to ensure auto-save doesn't re-add it
                        setTimeout(() => {
                          deletedExerciseIdsRef.current.delete(exerciseId);
                          logger.debug('Removed exercise from deleted tracking', { exerciseId }, 'WorkoutSession');
                        }, 60000); // 60 seconds - much safer than 5 seconds
                      }
                    } else {
                      // Exercise not in DB, remove from tracking
                      deletingExerciseIdsRef.current.delete(exerciseId);
                      // Keep in "deleted" for safety
                      setTimeout(() => {
                        deletedExerciseIdsRef.current.delete(exerciseId);
                      }, 60000);
                    }
                  } catch (error) {
                    logger.error('Error deleting exercise from database:', error, 'WorkoutSession');
                    // Remove from "deleting" but keep in "deleted" to be safe
                    deletingExerciseIdsRef.current.delete(exerciseId);
                  }
                })();
              } else {
                // No workoutId - new workout, just remove from tracking
                deletingExerciseIdsRef.current.delete(exerciseId);
                // Keep in "deleted" briefly in case workout gets created
                setTimeout(() => {
                  deletedExerciseIdsRef.current.delete(exerciseId);
                }, 10000);
              }
            }}
            onToggleMinimize={() => toggleMinimizeExercise(workoutExercise.tempId)}
            onComplete={() => completeExercise(workoutExercise.tempId)}
            onAddSet={() => addSet(exerciseIndex)}
            onDuplicateSet={(setIndex) => duplicateSet(exerciseIndex, setIndex)}
            onRemoveSet={(setIndex) => removeSet(exerciseIndex, setIndex)}
            onToggleCollapseSet={toggleCollapseSet}
            onCompleteSet={(setIndex) => completeSetAndMoveNext(exerciseIndex, setIndex)}
            onOpenNumericPad={(setIndex, field) =>
              openNumericPad(
                exerciseIndex,
                setIndex,
                field,
                field === 'weight'
                  ? 'משקל (ק״ג)'
                  : field === 'reps'
                  ? 'חזרות'
                  : 'RPE (1-10)'
              )
            }
            onOpenEquipmentSelector={(setIndex) => setEquipmentSelector({ exerciseIndex, setIndex })}
            onOpenSupersetSelector={(setIndex) => setSupersetSelector({ exerciseIndex, setIndex })}
            onOpenSupersetNumericPad={(setIndex, field) =>
              openSupersetNumericPad(
                exerciseIndex,
                setIndex,
                field,
                field === 'superset_weight'
                  ? 'משקל סופר-סט (ק״ג)'
                  : field === 'superset_reps'
                  ? 'חזרות סופר-סט'
                  : 'RPE סופר-סט (1-10)'
              )
            }
            onOpenSupersetEquipmentSelector={(setIndex) =>
              setSupersetEquipmentSelector({ exerciseIndex, setIndex })
            }
            onOpenDropsetNumericPad={(setIndex, field) =>
              openDropsetNumericPad(
                exerciseIndex,
                setIndex,
                field,
                field === 'dropset_weight' ? 'משקל דרופ-סט (ק״ג)' : 'חזרות דרופ-סט'
              )
            }
            onOpenSupersetDropsetNumericPad={(setIndex, field) =>
              openSupersetDropsetNumericPad(
                exerciseIndex,
                setIndex,
                field,
                field === 'superset_dropset_weight'
                  ? 'משקל דרופ-סט סופר (ק״ג)'
                  : 'חזרות דרופ-סט סופר'
              )
            }
            onUpdateSet={(setIndex, field, value) => updateSet(exerciseIndex, setIndex, field, value)}
          />
        ))}
      </div>

      {exercises.length === 0 && !workoutId && (
        <div className="premium-card-static p-6 mb-4">
          <h3 className="text-lg font-bold text-foreground mb-2">התחל אימון חדש</h3>
          <p className="text-muted mb-4">בחר תבנית קיימת או התחל אימון ריק</p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowTemplateModal(true);
            }}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-foreground py-4 rounded-xl flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all font-semibold mb-3 cursor-pointer"
          >
            <BookMarked className="h-5 w-5" />
            <span>טען תבנית קיימת</span>
          </button>
          <p className="text-center text-sm text-muted">או</p>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowExerciseSelector(true);
        }}
        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-foreground py-5 lg:py-6 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all touch-manipulation font-bold cursor-pointer"
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
          loadingExerciseId={loadingExercise}
          isTablet={isTablet}
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
          isTablet={isTablet}
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
          isTablet={isTablet}
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
          isTablet={isTablet}
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
          isTablet={isTablet}
        />
      )}

      {supersetDropsetNumericPad && (
        <QuickNumericPad
          value={supersetDropsetNumericPad.value}
          label={supersetDropsetNumericPad.label}
          onConfirm={handleSupersetDropsetNumericPadConfirm}
          onClose={() => setSupersetDropsetNumericPad(null)}
          allowDecimal={supersetDropsetNumericPad.field === 'superset_dropset_weight'}
          isTablet={isTablet}
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
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-500/15">
                <BookMarked className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">שמור כתבנית</h3>
                <p className="text-muted text-sm">שמור את האימון הזה כתבנית לשימוש עתידי מהיר</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-muted">
                    שם התבנית *
                  </label>
                  {preventKeyboard && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTemplateNameKeyboardEnabled(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>אפשר כתיבה</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface/50 border border-border rounded-xl text-foreground placeholder-muted focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="למשל: אימון רגליים מלא"
                  autoFocus={!preventKeyboard}
                  readOnly={preventKeyboard && !templateNameKeyboardEnabled}
                  inputMode={preventKeyboard && !templateNameKeyboardEnabled ? 'none' : 'text'}
                  onFocus={(e) => {
                    if (preventKeyboard && !templateNameKeyboardEnabled) {
                      e.target.blur();
                    }
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-muted">
                    תיאור (אופציונלי)
                  </label>
                  {preventKeyboard && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTemplateDescriptionKeyboardEnabled(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>אפשר כתיבה</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-surface/50 border border-border rounded-xl text-foreground placeholder-muted focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="הוסף תיאור לתבנית..."
                  rows={3}
                  readOnly={preventKeyboard && !templateDescriptionKeyboardEnabled}
                  inputMode={preventKeyboard && !templateDescriptionKeyboardEnabled ? 'none' : 'text'}
                  onFocus={(e) => {
                    if (preventKeyboard && !templateDescriptionKeyboardEnabled) {
                      e.target.blur();
                    }
                  }}
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveAsTemplate();
                }}
                disabled={savingTemplate || !templateName.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-elevated disabled:text-muted disabled:cursor-not-allowed text-foreground px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer"
              >
                {savingTemplate ? 'שומר...' : 'שמור תבנית'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
                className="flex-1 bg-surface/50 hover:bg-surface border border-border text-foreground px-6 py-3 rounded-xl font-semibold transition-all cursor-pointer"
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
          exercises={exercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(set => ({
              ...set,
              rpe: set.rpe === null ? undefined : set.rpe
            }))
          }))}
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

      {showWorkoutHistory && (
        <WorkoutHistoryModal
          traineeId={trainee.id}
          exercises={exercises}
          onClose={() => setShowWorkoutHistory(false)}
        />
      )}

      {/* Floating Action Buttons for tablet - Quick actions + finish + history */}
      {isTablet && exercises.length > 0 && !showExerciseSelector && !numericPad && !showSummary && (
        <>
          {/* Left side - Main actions */}
          <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-3 animate-fade-in">
            {/* Finish workout */}
            <button
              type="button"
              onClick={() => {
                if (!saving) {
                  handleSave();
                }
              }}
              className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-foreground rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback disabled:opacity-60"
              title="סיים אימון"
              disabled={saving || exercises.length === 0}
            >
              <CheckCircle2 className="h-6 w-6" />
            </button>

            {/* Workout history */}
            <button
              type="button"
              onClick={() => setShowWorkoutHistory(true)}
              className="w-14 h-14 bg-cyan-500 hover:bg-cyan-600 text-foreground rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
              title="היסטוריית אימונים לתרגילים"
            >
              <History className="h-6 w-6" />
            </button>
            
            {/* Add exercise */}
            <button
              type="button"
              onClick={() => setShowExerciseSelector(true)}
              className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-foreground rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
              title="הוסף תרגיל (קיצור: Ctrl+N)"
            >
              <BookMarked className="h-6 w-6" />
            </button>
          </div>

          {/* Right side - Quick shortcuts for weight, reps, RPE, sets */}
          {exercises.length > 0 && exercises[0].sets.length > 0 && (
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 animate-fade-in">
              {/* Quick Weight - Open weight pad for active exercise and set */}
              <button
                type="button"
                onClick={() => {
                  const active = findActiveExerciseAndSet();
                  if (active) {
                    openNumericPad(active.exerciseIndex, active.setIndex, 'weight', 'משקל (ק״ג)');
                  }
                }}
                className="w-16 h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
                title="משקל"
              >
                <span className="text-xs font-bold leading-tight text-center">משקל</span>
              </button>

              {/* Quick Reps - Open reps pad for active exercise and set */}
              <button
                type="button"
                onClick={() => {
                  const active = findActiveExerciseAndSet();
                  if (active) {
                    openNumericPad(active.exerciseIndex, active.setIndex, 'reps', 'חזרות');
                  }
                }}
                className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
                title="חזרות"
              >
                <span className="text-xs font-bold leading-tight text-center">חזרות</span>
              </button>

              {/* Quick RPE - Open RPE pad for active exercise and set */}
              <button
                type="button"
                onClick={() => {
                  const active = findActiveExerciseAndSet();
                  if (active) {
                    openNumericPad(active.exerciseIndex, active.setIndex, 'rpe', 'RPE (1-10)');
                  }
                }}
                className="w-16 h-16 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
                title="RPE"
              >
                <span className="text-xs font-bold leading-tight text-center">RPE</span>
              </button>

              {/* Quick Sets - Add set to last exercise */}
              <button
                type="button"
                onClick={() => {
                  const lastExerciseIndex = exercises.length - 1;
                  addSet(lastExerciseIndex);
                  toast.success('סט חדש נוסף', { duration: 1500, position: 'bottom-center' });
                }}
                className="w-16 h-16 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
                title="סט"
              >
                <span className="text-xs font-bold leading-tight text-center">סט</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
