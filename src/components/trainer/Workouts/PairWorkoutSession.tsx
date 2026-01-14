import { ArrowRight, Check, X, Plus, Copy, Trash2, Users, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/logger';
import ExerciseSelector from './ExerciseSelector';
import QuickNumericPad from './QuickNumericPad';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  instructions?: string | null;
}

interface SetData {
  weight: number;
  reps: number;
  rpe: number | null;
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

  const addExercise = (exercise: Exercise, member: 'member_1' | 'member_2') => {
    const newExercise: WorkoutExercise = {
      tempId: Date.now().toString(),
      exercise,
      sets: [{ weight: 0, reps: 0, rpe: null }],
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
      updated[exerciseIndex].sets.push({ weight: 0, reps: 0, rpe: null });
      setMember1Exercises(updated);
    } else {
      const updated = [...member2Exercises];
      updated[exerciseIndex].sets.push({ weight: 0, reps: 0, rpe: null });
      setMember2Exercises(updated);
    }
  };

  const duplicateSet = (exerciseIndex: number, setIndex: number, member: 'member_1' | 'member_2') => {
    if (member === 'member_1') {
      const updated = [...member1Exercises];
      const setToCopy = { ...updated[exerciseIndex].sets[setIndex] };
      updated[exerciseIndex].sets.push(setToCopy);
      setMember1Exercises(updated);
    } else {
      const updated = [...member2Exercises];
      const setToCopy = { ...updated[exerciseIndex].sets[setIndex] };
      updated[exerciseIndex].sets.push(setToCopy);
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
            set_type: 'regular',
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
                {exercise.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2 bg-zinc-900/50 rounded-xl p-3 border border-zinc-700/30">
                    <span className={`text-sm font-bold ${isBlue ? 'text-cyan-400 bg-cyan-500/10' : 'text-emerald-400 bg-emerald-500/10'} w-10 h-10 flex items-center justify-center rounded-xl`}>
                      #{setIdx + 1}
                    </span>

                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => openNumericPad(exIdx, setIdx, 'weight', member)}
                          className="w-full p-3 border border-emerald-500/30 rounded-xl text-center font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer"
                        >
                          {set.weight || 'משקל'}
                        </button>
                        <span className="text-xs text-zinc-500 block text-center mt-1">ק״ג</span>
                      </div>

                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => openNumericPad(exIdx, setIdx, 'reps', member)}
                          className="w-full p-3 border border-cyan-500/30 rounded-xl text-center font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all cursor-pointer"
                        >
                          {set.reps || 'חזרות'}
                        </button>
                        <span className="text-xs text-zinc-500 block text-center mt-1">חזרות</span>
                      </div>

                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => openNumericPad(exIdx, setIdx, 'rpe', member)}
                          className="w-full p-3 border border-amber-500/30 rounded-xl text-center font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer"
                        >
                          {set.rpe || 'RPE'}
                        </button>
                        <span className="text-xs text-zinc-500 block text-center mt-1">RPE</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => duplicateSet(exIdx, setIdx, member)}
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 p-2 rounded-xl transition-all"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      {exercise.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(exIdx, setIdx, member)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
