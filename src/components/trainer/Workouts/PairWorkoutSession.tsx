import { ArrowRight, Check, X, Plus, Copy, Trash2, Users, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/logger';
import ExerciseSelector from './ExerciseSelector';
import QuickNumericPad from './QuickNumericPad';
import EquipmentSelector from './EquipmentSelector';

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
  id?: string;
  weight: number;
  reps: number;
  rpe: number | null;
  set_type?: 'regular' | 'superset' | 'dropset';
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

interface PairWorkoutSessionProps {
  trainee: any;
  onBack: () => void;
  onComplete: (workoutData: any) => void;
}

export default function PairWorkoutSession({
  trainee,
  onBack,
  onComplete
}: PairWorkoutSessionProps) {
  const { user } = useAuth();
  const [member1Exercises, setMember1Exercises] = useState<WorkoutExercise[]>([]);
  const [member2Exercises, setMember2Exercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState<'member_1' | 'member_2' | null>(null);
  const [saving, setSaving] = useState(false);
  const [numericPad, setNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'weight' | 'reps' | 'rpe';
    member: 'member_1' | 'member_2';
    value: number;
    label: string;
  } | null>(null);
  const [equipmentSelector, setEquipmentSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
    member: 'member_1' | 'member_2';
  } | null>(null);
  const [supersetSelector, setSupersetSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
    member: 'member_1' | 'member_2';
  } | null>(null);
  const [supersetNumericPad, setSupersetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'superset_weight' | 'superset_reps' | 'superset_rpe';
    member: 'member_1' | 'member_2';
    value: number;
    label: string;
  } | null>(null);
  const [dropsetNumericPad, setDropsetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'dropset_weight' | 'dropset_reps';
    member: 'member_1' | 'member_2';
    value: number;
    label: string;
  } | null>(null);
  const [supersetDropsetNumericPad, setSupersetDropsetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'superset_dropset_weight' | 'superset_dropset_reps';
    member: 'member_1' | 'member_2';
    value: number;
    label: string;
  } | null>(null);
  const [supersetEquipmentSelector, setSupersetEquipmentSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
    member: 'member_1' | 'member_2';
  } | null>(null);
  const [collapsedSets1, setCollapsedSets1] = useState<string[]>([]);
  const [collapsedSets2, setCollapsedSets2] = useState<string[]>([]);

  const addExercise = (exercise: Exercise, member: 'member_1' | 'member_2') => {
    const newExercise: WorkoutExercise = {
      tempId: Date.now().toString(),
      exercise,
      sets: [{ id: `temp-${Date.now()}-1`, weight: 0, reps: 0, rpe: null, set_type: 'regular', failure: false }],
    };

    if (member === 'member_1') {
      setMember1Exercises([...member1Exercises, newExercise]);
    } else {
      setMember2Exercises([...member2Exercises, newExercise]);
    }
    setShowExerciseSelector(null);
  };

  const addSet = (exerciseIndex: number, member: 'member_1' | 'member_2') => {
    if (member === 'member_1') {
      const updated = [...member1Exercises];
      const exercise = updated[exerciseIndex];
      // Collapse all existing sets
      const existingSetIds = exercise.sets.map(s => s.id).filter(Boolean) as string[];
      setCollapsedSets1(prev => [...prev, ...existingSetIds.filter(id => !prev.includes(id))]);
      
      const newSetId = `temp-${Date.now()}-${exercise.sets.length + 1}`;
      exercise.sets.push({ id: newSetId, weight: 0, reps: 0, rpe: null, set_type: 'regular', failure: false });
      setMember1Exercises(updated);
    } else {
      const updated = [...member2Exercises];
      const exercise = updated[exerciseIndex];
      // Collapse all existing sets
      const existingSetIds = exercise.sets.map(s => s.id).filter(Boolean) as string[];
      setCollapsedSets2(prev => [...prev, ...existingSetIds.filter(id => !prev.includes(id))]);
      
      const newSetId = `temp-${Date.now()}-${exercise.sets.length + 1}`;
      exercise.sets.push({ id: newSetId, weight: 0, reps: 0, rpe: null, set_type: 'regular', failure: false });
      setMember2Exercises(updated);
    }
  };

  const duplicateSet = (exerciseIndex: number, setIndex: number, member: 'member_1' | 'member_2') => {
    if (member === 'member_1') {
      const updated = [...member1Exercises];
      const exercise = updated[exerciseIndex];
      const setToCopy = { ...exercise.sets[setIndex] };
      // Collapse all existing sets
      const existingSetIds = exercise.sets.map(s => s.id).filter(Boolean) as string[];
      setCollapsedSets1(prev => [...prev, ...existingSetIds.filter(id => !prev.includes(id))]);
      
      const newSetId = `temp-${Date.now()}-${exercise.sets.length + 1}`;
      setToCopy.id = newSetId;
      exercise.sets.push(setToCopy);
      setMember1Exercises(updated);
    } else {
      const updated = [...member2Exercises];
      const exercise = updated[exerciseIndex];
      const setToCopy = { ...exercise.sets[setIndex] };
      // Collapse all existing sets
      const existingSetIds = exercise.sets.map(s => s.id).filter(Boolean) as string[];
      setCollapsedSets2(prev => [...prev, ...existingSetIds.filter(id => !prev.includes(id))]);
      
      const newSetId = `temp-${Date.now()}-${exercise.sets.length + 1}`;
      setToCopy.id = newSetId;
      exercise.sets.push(setToCopy);
      setMember2Exercises(updated);
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetData, value: any, member: 'member_1' | 'member_2') => {
    if (member === 'member_1') {
      const updated = [...member1Exercises];
      updated[exerciseIndex].sets[setIndex] = {
        ...updated[exerciseIndex].sets[setIndex],
        [field]: value,
      };
      setMember1Exercises(updated);
    } else {
      const updated = [...member2Exercises];
      updated[exerciseIndex].sets[setIndex] = {
        ...updated[exerciseIndex].sets[setIndex],
        [field]: value,
      };
      setMember2Exercises(updated);
    }
  };

  const removeSet = (exerciseIndex: number, setIndex: number, member: 'member_1' | 'member_2') => {
    if (member === 'member_1') {
      const updated = [...member1Exercises];
      updated[exerciseIndex].sets.splice(setIndex, 1);
      setMember1Exercises(updated);
    } else {
      const updated = [...member2Exercises];
      updated[exerciseIndex].sets.splice(setIndex, 1);
      setMember2Exercises(updated);
    }
  };

  const removeExercise = (exerciseIndex: number, member: 'member_1' | 'member_2') => {
    if (member === 'member_1') {
      const updated = [...member1Exercises];
      updated.splice(exerciseIndex, 1);
      setMember1Exercises(updated);
    } else {
      const updated = [...member2Exercises];
      updated.splice(exerciseIndex, 1);
      setMember2Exercises(updated);
    }
  };

  const copyExerciseToOtherMember = (exerciseIndex: number, fromMember: 'member_1' | 'member_2') => {
    const sourceExercises = fromMember === 'member_1' ? member1Exercises : member2Exercises;
    const targetExercises = fromMember === 'member_1' ? member2Exercises : member1Exercises;
    
    const exerciseToCopy = {
      ...sourceExercises[exerciseIndex],
      tempId: Date.now().toString() + Math.random(),
      sets: sourceExercises[exerciseIndex].sets.map((set, idx) => ({
        ...set,
        id: `temp-${Date.now()}-${idx + 1}`,
      })),
    };

    if (fromMember === 'member_1') {
      setMember2Exercises([...targetExercises, exerciseToCopy]);
    } else {
      setMember1Exercises([...targetExercises, exerciseToCopy]);
    }
  };

  const openNumericPad = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', member: 'member_1' | 'member_2') => {
    const exercises = member === 'member_1' ? member1Exercises : member2Exercises;
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    const label = field === 'weight' ? 'משקל (ק״ג)' : field === 'reps' ? 'חזרות' : 'RPE (1-10)';
    setNumericPad({ exerciseIndex, setIndex, field, member, value: currentValue as number, label });
  };

  const handleNumericPadConfirm = (value: number) => {
    if (numericPad) {
      updateSet(numericPad.exerciseIndex, numericPad.setIndex, numericPad.field, value, numericPad.member);
      
      // מילוי אוטומטי לבן הזוג השני
      const otherMember = numericPad.member === 'member_1' ? 'member_2' : 'member_1';
      const otherExercises = otherMember === 'member_1' ? member1Exercises : member2Exercises;
      
      // מצא תרגיל תואם (אותו שם תרגיל) אצל בן הזוג השני
      const currentExercises = numericPad.member === 'member_1' ? member1Exercises : member2Exercises;
      const currentExercise = currentExercises[numericPad.exerciseIndex];
      const matchingExerciseIndex = otherExercises.findIndex(ex => ex.exercise.id === currentExercise.exercise.id);
      
      if (matchingExerciseIndex !== -1 && otherExercises[matchingExerciseIndex].sets.length > numericPad.setIndex) {
        updateSet(matchingExerciseIndex, numericPad.setIndex, numericPad.field, value, otherMember);
      }
      
      setNumericPad(null);
    }
  };

  const handleEquipmentSelect = (equipment: Equipment | null) => {
    if (equipmentSelector) {
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment_id', equipment?.id || null, equipmentSelector.member);
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment', equipment || null, equipmentSelector.member);
      setEquipmentSelector(null);
    }
  };

  const handleSupersetExerciseSelect = (exercise: Exercise) => {
    if (supersetSelector) {
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'set_type', 'superset', supersetSelector.member);
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_id', exercise.id, supersetSelector.member);
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_name', exercise.name, supersetSelector.member);
      setSupersetSelector(null);
    }
  };

  const openSupersetNumericPad = (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', member: 'member_1' | 'member_2') => {
    const exercises = member === 'member_1' ? member1Exercises : member2Exercises;
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    const label = field === 'superset_weight' ? 'משקל סופר-סט (ק״ג)' : field === 'superset_reps' ? 'חזרות סופר-סט' : 'RPE סופר-סט (1-10)';
    setSupersetNumericPad({ exerciseIndex, setIndex, field, member, value: currentValue as number, label });
  };

  const handleSupersetNumericPadConfirm = (value: number) => {
    if (supersetNumericPad) {
      updateSet(supersetNumericPad.exerciseIndex, supersetNumericPad.setIndex, supersetNumericPad.field, value, supersetNumericPad.member);
      setSupersetNumericPad(null);
    }
  };

  const handleSupersetEquipmentSelect = (equipment: Equipment | null) => {
    if (supersetEquipmentSelector) {
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment_id', equipment?.id || null, supersetEquipmentSelector.member);
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment', equipment || null, supersetEquipmentSelector.member);
      setSupersetEquipmentSelector(null);
    }
  };

  const openDropsetNumericPad = (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', member: 'member_1' | 'member_2') => {
    const exercises = member === 'member_1' ? member1Exercises : member2Exercises;
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    const label = field === 'dropset_weight' ? 'משקל דרופ-סט (ק״ג)' : 'חזרות דרופ-סט';
    setDropsetNumericPad({ exerciseIndex, setIndex, field, member, value: currentValue as number, label });
  };

  const handleDropsetNumericPadConfirm = (value: number) => {
    if (dropsetNumericPad) {
      updateSet(dropsetNumericPad.exerciseIndex, dropsetNumericPad.setIndex, dropsetNumericPad.field, value, dropsetNumericPad.member);
      setDropsetNumericPad(null);
    }
  };

  const openSupersetDropsetNumericPad = (exerciseIndex: number, setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps', member: 'member_1' | 'member_2') => {
    const exercises = member === 'member_1' ? member1Exercises : member2Exercises;
    const currentValue = exercises[exerciseIndex].sets[setIndex][field] || 0;
    const label = field === 'superset_dropset_weight' ? 'משקל דרופ-סט סופר-סט (ק״ג)' : 'חזרות דרופ-סט סופר-סט';
    setSupersetDropsetNumericPad({ exerciseIndex, setIndex, field, member, value: currentValue as number, label });
  };

  const handleSupersetDropsetNumericPadConfirm = (value: number) => {
    if (supersetDropsetNumericPad) {
      updateSet(supersetDropsetNumericPad.exerciseIndex, supersetDropsetNumericPad.setIndex, supersetDropsetNumericPad.field, value, supersetDropsetNumericPad.member);
      setSupersetDropsetNumericPad(null);
    }
  };

  const toggleCollapseSet = (setId: string, member: 'member_1' | 'member_2') => {
    if (member === 'member_1') {
      setCollapsedSets1(prev => {
        if (prev.includes(setId)) {
          return prev.filter(id => id !== setId);
        } else {
          return [...prev, setId];
        }
      });
    } else {
      setCollapsedSets2(prev => {
        if (prev.includes(setId)) {
          return prev.filter(id => id !== setId);
        } else {
          return [...prev, setId];
        }
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (member1Exercises.length === 0 && member2Exercises.length === 0) {
      alert('יש להוסיף לפחות תרגיל אחד');
      return;
    }

    setSaving(true);

    try {
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert([
          {
            trainer_id: user.id,
            workout_date: new Date().toISOString().split('T')[0],
            workout_type: 'pair',
            is_completed: true,
          },
        ])
        .select()
        .single();

      if (workoutError || !workout) {
        alert('שגיאה ביצירת אימון');
        setSaving(false);
        return;
      }

      await supabase
        .from('workout_trainees')
        .insert([{ workout_id: workout.id, trainee_id: trainee.id }]);

      const allExercises = [
        ...member1Exercises.map(ex => ({ ...ex, member: 'member_1' as const })),
        ...member2Exercises.map(ex => ({ ...ex, member: 'member_2' as const })),
      ];

      for (let i = 0; i < allExercises.length; i++) {
        const ex = allExercises[i];

        const { data: workoutExercise } = await supabase
          .from('workout_exercises')
          .insert([
            {
              workout_id: workout.id,
              trainee_id: trainee.id,
              exercise_id: ex.exercise.id,
              order_index: i,
              pair_member: ex.member,
            },
          ])
          .select()
          .single();

        if (workoutExercise) {
          const setsToInsert = ex.sets.map((set, idx) => ({
            workout_exercise_id: workoutExercise.id,
            set_number: idx + 1,
            weight: set.weight || 0,
            reps: set.reps || 0,
            rpe: set.rpe >= 1 && set.rpe <= 10 ? set.rpe : null,
            set_type: set.set_type || 'regular',
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
          }));

          await supabase.from('exercise_sets').insert(setsToInsert);
        }
      }

      setSaving(false);
      onComplete({ member1: member1Exercises, member2: member2Exercises });
    } catch (error) {
      logger.error('Error saving workout:', error, 'PairWorkoutSession');
      alert('שגיאה בשמירת האימון');
      setSaving(false);
    }
  };

  const renderExerciseColumn = (exercises: WorkoutExercise[], member: 'member_1' | 'member_2', name: string, isBlue: boolean) => {
    const totalVolume = exercises.reduce((sum, ex) => 
      sum + ex.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0), 0
    );
    const collapsedSets = member === 'member_1' ? collapsedSets1 : collapsedSets2;
    
    return (
    <div className={`bg-zinc-900 rounded-2xl border ${isBlue ? 'border-cyan-500/30' : 'border-emerald-500/30'} overflow-hidden`}>
      <div className={`${isBlue ? 'bg-cyan-500' : 'bg-emerald-500'} p-5`}>
        <h2 className="text-xl font-bold text-white text-center tracking-wide">
          {name}
        </h2>
        <div className="flex items-center justify-center gap-4 mt-2">
          <p className="text-center text-white/80 text-sm">
            {exercises.length} {exercises.length === 1 ? 'תרגיל' : 'תרגילים'}
          </p>
          {totalVolume > 0 && (
            <p className="text-center text-white/90 text-sm font-semibold">
              {totalVolume.toLocaleString()} ק״ג
            </p>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4">
        {exercises.length === 0 ? (
          <div className="text-center text-zinc-500 py-12 bg-zinc-800/50 rounded-xl border-2 border-dashed border-zinc-700">
            <p className="text-base mb-2 font-medium">עדיין לא נוספו תרגילים</p>
            <p className="text-sm text-zinc-500">לחץ על הכפתור למטה להוספה</p>
          </div>
        ) : (
          exercises.map((exercise, exIdx) => (
            <div key={exercise.tempId} className="bg-zinc-800/50 rounded-2xl p-5 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg">{exercise.exercise.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyExerciseToOtherMember(exIdx, member)}
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 p-2 rounded-xl transition-all"
                    title="העתק לבן הזוג השני"
                  >
                    <ArrowLeftRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => removeExercise(exIdx, member)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition-all"
                    title="מחק תרגיל"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {exercise.sets.map((set, setIdx) => {
                  const setId = set.id || `temp-${exIdx}-${setIdx}`;
                  const isCollapsed = collapsedSets.includes(setId);
                  
                  if (isCollapsed) {
                    return (
                      <div
                        key={setId}
                        onClick={() => toggleCollapseSet(setId, member)}
                        className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30 cursor-pointer hover:border-emerald-500/30 hover:bg-zinc-800/50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-sm ${isBlue ? 'text-cyan-400 bg-cyan-500/10' : 'text-emerald-400 bg-emerald-500/10'} px-3 py-1.5 rounded-lg`}>
                              סט #{setIdx + 1}
                            </span>
                            <span className="text-zinc-300 font-medium">{set.weight} ק״ג</span>
                            <span className="text-zinc-500">x</span>
                            <span className="text-zinc-300 font-medium">{set.reps} חזרות</span>
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
                  <div key={setId} className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span 
                        onClick={() => toggleCollapseSet(setId, member)}
                        className={`text-sm font-bold ${isBlue ? 'text-cyan-400 bg-cyan-500/10' : 'text-emerald-400 bg-emerald-500/10'} px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-all`}
                      >
                        סט #{setIdx + 1}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => duplicateSet(exIdx, setIdx, member)}
                          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 p-2 rounded-xl transition-all"
                          title="שכפל סט"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {exercise.sets.length > 1 && (
                          <button
                            onClick={() => removeSet(exIdx, setIdx, member)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition-all"
                            title="מחק סט"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => openNumericPad(exIdx, setIdx, 'weight', member)}
                          className="w-full p-3 border border-emerald-500/30 rounded-xl text-center font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer"
                        >
                          {set.weight || '0'}
                        </button>
                        <span className="text-xs text-zinc-500 block text-center mt-1">ק״ג</span>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => openNumericPad(exIdx, setIdx, 'reps', member)}
                          className="w-full p-3 border border-cyan-500/30 rounded-xl text-center font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all cursor-pointer"
                        >
                          {set.reps || '0'}
                        </button>
                        <span className="text-xs text-zinc-500 block text-center mt-1">חזרות</span>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => openNumericPad(exIdx, setIdx, 'rpe', member)}
                          className="w-full p-3 border border-amber-500/30 rounded-xl text-center font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                        >
                          {set.rpe || '-'}
                        </button>
                        <span className="text-xs text-zinc-500 block text-center mt-1">RPE</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEquipmentSelector({ exerciseIndex: exIdx, setIndex: setIdx, member })}
                        className={`py-2 px-3 rounded-xl border text-sm transition-all ${
                          set.equipment
                            ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                            : 'border-zinc-700/50 hover:border-cyan-500/30 bg-zinc-800/30 hover:bg-cyan-500/10 text-zinc-400'
                        }`}
                      >
                        {set.equipment?.emoji || '🎒'} {set.equipment?.name || 'ציוד'}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateSet(exIdx, setIdx, 'failure', !set.failure, member)}
                        className={`py-2 px-3 rounded-xl border text-sm transition-all ${
                          set.failure
                            ? 'border-red-500/50 bg-red-500/10 text-red-400'
                            : 'border-zinc-700/50 hover:border-red-500/30 bg-zinc-800/30 hover:bg-red-500/10 text-zinc-400'
                        }`}
                      >
                        {set.failure ? '✓ כשל' : 'כשל'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (set.set_type === 'superset') {
                            updateSet(exIdx, setIdx, 'set_type', 'regular', member);
                            updateSet(exIdx, setIdx, 'superset_exercise_id', null, member);
                            updateSet(exIdx, setIdx, 'superset_exercise_name', null, member);
                          } else {
                            setSupersetSelector({ exerciseIndex: exIdx, setIndex: setIdx, member });
                          }
                        }}
                        className={`py-2 px-3 rounded-xl border text-sm transition-all ${
                          set.set_type === 'superset'
                            ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                            : 'border-zinc-700/50 hover:border-cyan-500/30 bg-zinc-800/30 hover:bg-cyan-500/10 text-zinc-400'
                        }`}
                      >
                        {set.set_type === 'superset' ? `✓ סופר-סט${set.superset_exercise_name ? `: ${set.superset_exercise_name}` : ''}` : 'סופר-סט'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (set.set_type === 'dropset') {
                            updateSet(exIdx, setIdx, 'set_type', 'regular', member);
                            updateSet(exIdx, setIdx, 'dropset_weight', null, member);
                            updateSet(exIdx, setIdx, 'dropset_reps', null, member);
                          } else {
                            updateSet(exIdx, setIdx, 'set_type', 'dropset', member);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl border text-sm transition-all ${
                          set.set_type === 'dropset'
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                            : 'border-zinc-700/50 hover:border-amber-500/30 bg-zinc-800/30 hover:bg-amber-500/10 text-zinc-400'
                        }`}
                      >
                        {set.set_type === 'dropset' ? '✓ דרופ-סט' : 'דרופ-סט'}
                      </button>
                    </div>

                    {set.set_type === 'superset' && (
                      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 space-y-2">
                        <div className="text-xs font-semibold text-cyan-400 mb-2">סופר-סט: {set.superset_exercise_name || 'לא נבחר'}</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => openSupersetNumericPad(exIdx, setIdx, 'superset_weight', member)}
                              className="w-full p-2 border border-cyan-500/30 rounded-lg text-center text-sm font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all cursor-pointer"
                            >
                              {set.superset_weight || '0'}
                            </button>
                            <span className="text-xs text-zinc-500 block text-center mt-1">ק״ג</span>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => openSupersetNumericPad(exIdx, setIdx, 'superset_reps', member)}
                              className="w-full p-2 border border-cyan-500/30 rounded-lg text-center text-sm font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all cursor-pointer"
                            >
                              {set.superset_reps || '0'}
                            </button>
                            <span className="text-xs text-zinc-500 block text-center mt-1">חזרות</span>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => openSupersetNumericPad(exIdx, setIdx, 'superset_rpe', member)}
                              className="w-full p-2 border border-cyan-500/30 rounded-lg text-center text-sm font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all cursor-pointer"
                            >
                              {set.superset_rpe || '-'}
                            </button>
                            <span className="text-xs text-zinc-500 block text-center mt-1">RPE</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSupersetEquipmentSelector({ exerciseIndex: exIdx, setIndex: setIdx, member })}
                          className={`w-full py-2 px-3 rounded-lg border text-sm transition-all ${
                            set.superset_equipment
                              ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                              : 'border-zinc-700/50 hover:border-cyan-500/30 bg-zinc-800/30 hover:bg-cyan-500/10 text-zinc-400'
                          }`}
                        >
                          {set.superset_equipment?.emoji || '🎒'} {set.superset_equipment?.name || 'ציוד סופר-סט'}
                        </button>
                        {(set.superset_dropset_weight || set.superset_dropset_reps) ? (
                          <div className="mt-2 pt-2 border-t border-cyan-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-amber-400">דרופ-סט סופר-סט</div>
                              <button
                                type="button"
                                onClick={() => {
                                  updateSet(exIdx, setIdx, 'superset_dropset_weight', null, member);
                                  updateSet(exIdx, setIdx, 'superset_dropset_reps', null, member);
                                }}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                הסר
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => openSupersetDropsetNumericPad(exIdx, setIdx, 'superset_dropset_weight', member)}
                                  className="w-full p-2 border border-amber-500/30 rounded-lg text-center text-sm font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                                >
                                  {set.superset_dropset_weight || '0'}
                                </button>
                                <span className="text-xs text-zinc-500 block text-center mt-1">ק״ג</span>
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => openSupersetDropsetNumericPad(exIdx, setIdx, 'superset_dropset_reps', member)}
                                  className="w-full p-2 border border-amber-500/30 rounded-lg text-center text-sm font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                                >
                                  {set.superset_dropset_reps || '0'}
                                </button>
                                <span className="text-xs text-zinc-500 block text-center mt-1">חזרות</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              updateSet(exIdx, setIdx, 'superset_dropset_weight', 0, member);
                              updateSet(exIdx, setIdx, 'superset_dropset_reps', 0, member);
                            }}
                            className="w-full mt-2 py-2 px-3 rounded-lg border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-sm transition-all"
                          >
                            + הוסף דרופ-סט לסופר-סט
                          </button>
                        )}
                      </div>
                    )}

                    {set.set_type === 'dropset' && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold text-amber-400">דרופ-סט</div>
                          <button
                            type="button"
                            onClick={() => {
                              updateSet(exIdx, setIdx, 'dropset_weight', null, member);
                              updateSet(exIdx, setIdx, 'dropset_reps', null, member);
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            הסר
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => openDropsetNumericPad(exIdx, setIdx, 'dropset_weight', member)}
                              className="w-full p-2 border border-amber-500/30 rounded-lg text-center text-sm font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                            >
                              {set.dropset_weight || '0'}
                            </button>
                            <span className="text-xs text-zinc-500 block text-center mt-1">ק״ג</span>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => openDropsetNumericPad(exIdx, setIdx, 'dropset_reps', member)}
                              className="w-full p-2 border border-amber-500/30 rounded-lg text-center text-sm font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                            >
                              {set.dropset_reps || '0'}
                            </button>
                            <span className="text-xs text-zinc-500 block text-center mt-1">חזרות</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>

              <button
                onClick={() => addSet(exIdx, member)}
                className={`mt-4 w-full text-sm ${isBlue ? 'text-cyan-400 hover:text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10' : 'text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'} py-3 border-2 border-dashed rounded-xl transition-all font-medium`}
              >
                + הוסף סט
              </button>
            </div>
          ))
        )}

        <button
          onClick={() => setShowExerciseSelector(member)}
          className={`w-full ${isBlue ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white py-4 px-4 rounded-xl flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all font-semibold`}
        >
          <Plus className="h-5 w-5" />
          <span>הוסף תרגיל</span>
        </button>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] transition-colors duration-300">
      <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <button
                onClick={onBack}
                className="p-3 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-white"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">אימון זוגי</h1>
                  <p className="text-sm text-zinc-400">{trainee.pairName1 || ''} (1) ו{trainee.pairName2 || ''} (2)</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 rtl:space-x-reverse">
              <button
                onClick={onBack}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-5 py-3 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all font-medium border border-zinc-700"
              >
                <X className="h-5 w-5" />
                <span>ביטול</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all disabled:opacity-50 font-bold"
              >
                <Check className="h-5 w-5" />
                <span>{saving ? 'שומר...' : 'סיים אימון'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showExerciseSelector && (
        <ExerciseSelector
          onSelect={(exercise) => addExercise(exercise, showExerciseSelector)}
          onClose={() => setShowExerciseSelector(null)}
        />
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderExerciseColumn(member1Exercises, 'member_1', `${trainee.pairName1 || ''} (1)`, true)}
          {renderExerciseColumn(member2Exercises, 'member_2', `${trainee.pairName2 || ''} (2)`, false)}
        </div>
      </div>

      {numericPad && (
        <QuickNumericPad
          value={numericPad.value}
          label={numericPad.label}
          onConfirm={handleNumericPadConfirm}
          onClose={() => setNumericPad(null)}
          allowDecimal={numericPad.field === 'weight'}
          minValue={numericPad.field === 'rpe' ? 1 : undefined}
          maxValue={numericPad.field === 'rpe' ? 10 : undefined}
          compact={true}
        />
      )}

      {equipmentSelector && (
        <EquipmentSelector
          selectedEquipmentId={equipmentSelector.member === 'member_1' 
            ? member1Exercises[equipmentSelector.exerciseIndex]?.sets[equipmentSelector.setIndex]?.equipment_id || null
            : member2Exercises[equipmentSelector.exerciseIndex]?.sets[equipmentSelector.setIndex]?.equipment_id || null
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
          compact={true}
        />
      )}

      {supersetEquipmentSelector && (
        <EquipmentSelector
          selectedEquipmentId={supersetEquipmentSelector.member === 'member_1'
            ? member1Exercises[supersetEquipmentSelector.exerciseIndex]?.sets[supersetEquipmentSelector.setIndex]?.superset_equipment_id || null
            : member2Exercises[supersetEquipmentSelector.exerciseIndex]?.sets[supersetEquipmentSelector.setIndex]?.superset_equipment_id || null
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
          compact={true}
        />
      )}

      {supersetDropsetNumericPad && (
        <QuickNumericPad
          value={supersetDropsetNumericPad.value}
          label={supersetDropsetNumericPad.label}
          onConfirm={handleSupersetDropsetNumericPadConfirm}
          onClose={() => setSupersetDropsetNumericPad(null)}
          allowDecimal={supersetDropsetNumericPad.field === 'superset_dropset_weight'}
          compact={true}
        />
      )}
    </div>
  );
}
