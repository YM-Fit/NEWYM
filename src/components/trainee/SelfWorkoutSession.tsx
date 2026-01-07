import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Plus, Save, Copy, Trash2, Clock, Dumbbell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import ExerciseSelector from '../trainer/Workouts/ExerciseSelector';
import QuickNumericPad from '../trainer/Workouts/QuickNumericPad';
import EquipmentSelector from '../trainer/Equipment/EquipmentSelector';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import DraftModal from '../common/DraftModal';

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
      console.log('Current auth user:', user?.id);
      console.log('Trainer ID being saved:', trainerId);
      console.log('Trainee ID:', traineeId);

      if (!user) {
        console.error('No authenticated user found');
        toast.error('יש להתחבר מחדש');
        setSaving(false);
        return;
      }

      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert([
          {
            trainer_id: trainerId,
            workout_type: 'personal',
            notes,
            workout_date: workoutDate.toISOString(),
            is_completed: true,
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
            trainee_id: traineeId,
          },
        ]);

      if (traineeError) {
        console.error('Trainee link error:', traineeError);
        toast.error('שגיאה בקישור המתאמן לאימון');
        setSaving(false);
        return;
      }

      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];

        const { data: workoutExercise, error: exerciseError } = await supabase
          .from('workout_exercises')
          .insert([
            {
              workout_id: newWorkout.id,
              trainee_id: traineeId,
              exercise_id: exercise.exercise.id,
              order_index: i,
              pair_member: null,
            },
          ])
          .select()
          .single();

        if (exerciseError || !workoutExercise) {
          console.error('Exercise error:', exerciseError);
          toast.error('שגיאה בשמירת התרגיל');
          setSaving(false);
          return;
        }

        const setsToInsert = exercise.sets.map((set) => ({
          workout_exercise_id: workoutExercise.id,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe >= 1 && set.rpe <= 10 ? set.rpe : null,
          set_type: set.set_type,
          failure: set.failure || false,
          superset_exercise_id: set.superset_exercise_id,
          superset_weight: set.superset_weight,
          superset_reps: set.superset_reps,
          superset_rpe: set.superset_rpe >= 1 && set.superset_rpe <= 10 ? set.superset_rpe : null,
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
          toast.error('שגיאה בשמירת הסטים');
          setSaving(false);
          return;
        }
      }

      if (trainerId) {
        await supabase.from('trainer_notifications').insert({
          trainer_id: trainerId,
          trainee_id: traineeId,
          type: 'self_workout',
          title: 'אימון עצמאי חדש',
          message: `${traineeName} סיים אימון עצמאי`,
          is_read: false,
        });
      }

      clearSaved();
      if (!isAutoSave) {
        toast.success('האימון נשמר בהצלחה!');
        onSave();
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('שגיאה בשמירת האימון');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              type="button"
              onClick={onBack}
              className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="חזור"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">אימון עצמאי</h1>
              <p className="text-base text-gray-600">{traineeName}</p>
              {exercises.length > 0 && (
                <p className="text-sm text-green-600 font-semibold mt-1">
                  נפח כולל: {calculateTotalVolume().toLocaleString()} ק"ג
                </p>
              )}
              <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || exercises.length === 0}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Save className="h-5 w-5" />
            <span className="font-semibold">{saving ? 'שומר...' : 'סיים אימון'}</span>
          </button>
        </div>

        <div className="flex items-center justify-center bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
          <Clock className="h-5 w-5 text-blue-600 ml-2" />
          <span className="text-lg font-bold text-blue-900">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      {exercises.map((workoutExercise, exerciseIndex) => {
        const isMinimized = minimizedExercises.includes(workoutExercise.tempId);
        const summary = getExerciseSummary(workoutExercise);

        return (
          <div
            key={workoutExercise.tempId}
            className={`bg-white rounded-xl shadow-sm mb-4 transition-all ${
              isMinimized ? 'bg-green-50 border-r-4 border-green-500' : ''
            }`}
            style={{
              height: isMinimized ? '64px' : 'auto',
              overflow: isMinimized ? 'hidden' : 'visible',
            }}
          >
            {isMinimized ? (
              <div
                className="h-full flex items-center justify-between px-4 cursor-pointer hover:bg-green-100 transition-colors"
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
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{workoutExercise.exercise.name}</h3>
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
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      aria-label="מחק תרגיל"
                    >
                      <Trash2 className="h-5 w-5" />
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
                        <span className="font-semibold text-base text-gray-700">סט {set.set_number}</span>
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <button
                            type="button"
                            onClick={() => duplicateSet(exerciseIndex, setIndex)}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                            title="שכפל סט"
                            aria-label="שכפל סט"
                          >
                            <Copy className="h-4 w-4 text-gray-600" />
                          </button>
                          {workoutExercise.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSet(exerciseIndex, setIndex)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              aria-label="מחק סט"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">משקל (ק״ג)</label>
                          <button
                            type="button"
                            onClick={() => openNumericPad(exerciseIndex, setIndex, 'weight', 'משקל (ק״ג)')}
                            className="w-full px-3 py-4 text-2xl font-bold border-2 border-green-500 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all"
                          >
                            {set.weight || '0'}
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">חזרות</label>
                          <button
                            type="button"
                            onClick={() => openNumericPad(exerciseIndex, setIndex, 'reps', 'חזרות')}
                            className="w-full px-3 py-4 text-2xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
                          >
                            {set.reps || '0'}
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">RPE</label>
                          <button
                            type="button"
                            onClick={() => openNumericPad(exerciseIndex, setIndex, 'rpe', 'RPE (1-10)')}
                            className="w-full px-3 py-4 text-2xl font-bold border-2 border-purple-500 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all"
                          >
                            {set.rpe || '-'}
                          </button>
                        </div>
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEquipmentSelector({ exerciseIndex, setIndex })}
                          className={`py-3 px-3 rounded-xl border-2 transition-all text-right ${
                            set.equipment ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <span className="text-xl">{set.equipment?.emoji || '🎒'}</span>
                              <span className="font-medium text-sm">{set.equipment?.name || 'ציוד'}</span>
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
                          className={`py-3 px-3 rounded-xl border-2 transition-all ${
                            set.failure ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 hover:border-red-300 bg-white text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                            <span className="text-xl">{set.failure ? '🔥' : '💪'}</span>
                            <span className="font-medium text-sm">כשל</span>
                          </div>
                        </button>
                      </div>

                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <button
                          type="button"
                          onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'regular')}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            set.set_type === 'regular' ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                            set.set_type === 'superset' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          סופר-סט
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'dropset')}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            set.set_type === 'dropset' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          דרופ-סט
                        </button>
                      </div>

                      {set.set_type === 'superset' && (
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-blue-700 mb-2">תרגיל סופר-סט</label>
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
                                  <label className="block text-sm font-medium text-blue-700 mb-1">משקל (ק״ג)</label>
                                  <button
                                    type="button"
                                    onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_weight', 'משקל סופר-סט (ק״ג)')}
                                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
                                  >
                                    {set.superset_weight || '0'}
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-blue-700 mb-1">חזרות</label>
                                  <button
                                    type="button"
                                    onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_reps', 'חזרות סופר-סט')}
                                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
                                  >
                                    {set.superset_reps || '0'}
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-blue-700 mb-1">RPE</label>
                                  <button
                                    type="button"
                                    onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_rpe', 'RPE סופר-סט (1-10)')}
                                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
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
                                    set.superset_equipment ? 'border-blue-500 bg-blue-50' : 'border-blue-300 hover:border-blue-500 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                      <span className="text-2xl">{set.superset_equipment?.emoji || '🎒'}</span>
                                      <span className="font-medium text-base">{set.superset_equipment?.name || 'הוסף ציוד (אופציונלי)'}</span>
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
                            </div>
                          )}
                        </div>
                      )}

                      {set.set_type === 'dropset' && (
                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-300">
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-1">משקל דרופ (ק״ג)</label>
                            <button
                              type="button"
                              onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_weight', 'משקל דרופ-סט (ק״ג)')}
                              className="w-full px-3 py-3 text-xl font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-all"
                            >
                              {set.dropset_weight || '0'}
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-1">חזרות דרופ</label>
                            <button
                              type="button"
                              onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_reps', 'חזרות דרופ-סט')}
                              className="w-full px-3 py-3 text-xl font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-all"
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
                  className="w-full mt-4 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 text-gray-600 hover:text-green-700 font-semibold text-base transition-all"
                >
                  + הוסף סט
                </button>
              </div>
            )}
          </div>
        );
      })}

      {exercises.length === 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
          <Dumbbell className="mx-auto h-16 w-16 text-blue-400 mb-4" />
          <h3 className="text-lg font-bold text-blue-900 mb-2">התחל אימון עצמאי</h3>
          <p className="text-blue-700 mb-4">הוסף תרגילים ורשום את הסטים שלך</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowExerciseSelector(true)}
        className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all shadow-lg"
      >
        <Plus className="h-6 w-6" />
        <span className="font-semibold text-lg">{exercises.length === 0 ? 'התחל אימון' : 'הוסף תרגיל'}</span>
      </button>

      {showExerciseSelector && (
        <ExerciseSelector
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
    </div>
  );
}
