import { ArrowRight, Check, X, Plus, Copy, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/logger';
import ExerciseSelector from './ExerciseSelector';

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

  const renderExerciseColumn = (exercises: WorkoutExercise[], member: 'member_1' | 'member_2', name: string, isBlue: boolean) => (
    <div className={`bg-zinc-900 rounded-2xl border ${isBlue ? 'border-cyan-500/30' : 'border-emerald-500/30'} overflow-hidden`}>
      <div className={`${isBlue ? 'bg-cyan-500' : 'bg-emerald-500'} p-5`}>
        <h2 className="text-xl font-bold text-white text-center tracking-wide">
          {name}
        </h2>
        <p className="text-center text-white/80 text-sm mt-1">
          {exercises.length} {exercises.length === 1 ? 'תרגיל' : 'תרגילים'}
        </p>
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
                <button
                  onClick={() => removeExercise(exIdx, member)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition-all"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                {exercise.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2 bg-zinc-900/50 rounded-xl p-3 border border-zinc-700/30">
                    <span className={`text-sm font-bold ${isBlue ? 'text-cyan-400 bg-cyan-500/10' : 'text-emerald-400 bg-emerald-500/10'} w-10 h-10 flex items-center justify-center rounded-xl`}>
                      #{setIdx + 1}
                    </span>

                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="משקל"
                          value={set.weight || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value), member)}
                          className="w-full p-3 border border-emerald-500/30 rounded-xl text-center font-bold text-emerald-400 bg-emerald-500/10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        />
                        <span className="text-xs text-zinc-500 block text-center mt-1">ק״ג</span>
                      </div>

                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="חזרות"
                          value={set.reps || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value), member)}
                          className="w-full p-3 border border-cyan-500/30 rounded-xl text-center font-bold text-cyan-400 bg-cyan-500/10 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                        />
                        <span className="text-xs text-zinc-500 block text-center mt-1">חזרות</span>
                      </div>

                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="RPE"
                          min="1"
                          max="10"
                          value={set.rpe || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'rpe', Number(e.target.value), member)}
                          className="w-full p-3 border border-amber-500/30 rounded-xl text-center font-bold text-amber-400 bg-amber-500/10 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                        />
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
                  <p className="text-sm text-zinc-400">{trainee.full_name}</p>
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
          {renderExerciseColumn(member1Exercises, 'member_1', trainee.pair_name_1, true)}
          {renderExerciseColumn(member2Exercises, 'member_2', trainee.pair_name_2, false)}
        </div>
      </div>
    </div>
  );
}
