import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import type { WorkoutExercise } from '../types/selfWorkoutTypes';

interface UseSelfWorkoutSaveProps {
  exercises: WorkoutExercise[];
  notes: string;
  workoutDate: Date;
  traineeId: string;
  traineeName: string;
  trainerId: string;
  setExercises: (exercises: WorkoutExercise[]) => void;
  setShowSummary: (show: boolean) => void;
  clearSaved: () => void;
  setAutoSaved: (saved: boolean) => void;
  setShowTemplateModal: (show: boolean) => void;
  setTemplateName: (name: string) => void;
  setTemplateDescription: (desc: string) => void;
  templateName: string;
  templateDescription: string;
  setSavingTemplate: (saving: boolean) => void;
}

export function useSelfWorkoutSave({
  exercises,
  notes,
  workoutDate,
  traineeId,
  traineeName,
  trainerId,
  setExercises,
  setShowSummary,
  clearSaved,
  setAutoSaved,
  setShowTemplateModal,
  setTemplateName,
  setTemplateDescription,
  templateName,
  templateDescription,
  setSavingTemplate,
}: UseSelfWorkoutSaveProps) {
  const [saving, setSaving] = useState(false);

  const handleAutoSave = async (handleSave: (isAutoSave: boolean) => Promise<void>) => {
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

  return {
    saving,
    handleSave,
    handleAutoSave,
    handleLoadLastWorkout,
    handleSaveTemplate,
  };
}
