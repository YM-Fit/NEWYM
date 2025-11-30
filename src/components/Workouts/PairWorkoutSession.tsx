import { ArrowRight, Check, X, Plus, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ExerciseSelector from './ExerciseSelector';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
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
            rpe: set.rpe || null,
            set_type: 'regular',
          }));

          await supabase.from('exercise_sets').insert(setsToInsert);
        }
      }

      setSaving(false);
      onComplete({ member1: member1Exercises, member2: member2Exercises });
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('שגיאה בשמירת האימון');
      setSaving(false);
    }
  };

  const renderExerciseColumn = (exercises: WorkoutExercise[], member: 'member_1' | 'member_2', name: string, isBlue: boolean) => (
    <div className={`bg-white rounded-xl shadow-sm border-2 ${isBlue ? 'border-blue-200' : 'border-purple-200'}`}>
      <div className={`${isBlue ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'} border-b-2 p-4`}>
        <h2 className={`text-lg font-bold ${isBlue ? 'text-blue-900' : 'text-purple-900'} text-center`}>
          {name}
        </h2>
      </div>
      <div className="p-4 space-y-4">
        {exercises.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm mb-4">עדיין לא נוספו תרגילים</p>
          </div>
        ) : (
          exercises.map((exercise, exIdx) => (
            <div key={exercise.tempId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{exercise.exercise.name}</h3>
                <button
                  onClick={() => removeExercise(exIdx, member)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {exercise.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-8">#{setIdx + 1}</span>

                    <input
                      type="number"
                      placeholder="משקל"
                      value={set.weight || ''}
                      onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value), member)}
                      className="w-20 p-2 border border-gray-300 rounded text-center"
                    />
                    <span className="text-xs text-gray-500">ק״ג</span>

                    <input
                      type="number"
                      placeholder="חזרות"
                      value={set.reps || ''}
                      onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value), member)}
                      className="w-20 p-2 border border-gray-300 rounded text-center"
                    />
                    <span className="text-xs text-gray-500">חזרות</span>

                    <input
                      type="number"
                      placeholder="RPE"
                      min="1"
                      max="10"
                      value={set.rpe || ''}
                      onChange={(e) => updateSet(exIdx, setIdx, 'rpe', Number(e.target.value), member)}
                      className="w-16 p-2 border border-gray-300 rounded text-center"
                    />

                    <button
                      onClick={() => duplicateSet(exIdx, setIdx, member)}
                      className="text-blue-600 hover:text-blue-700 p-1"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    {exercise.sets.length > 1 && (
                      <button
                        onClick={() => removeSet(exIdx, setIdx, member)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(exIdx, member)}
                className="mt-3 w-full text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                + הוסף סט
              </button>
            </div>
          ))
        )}

        <button
          onClick={() => setShowExerciseSelector(member)}
          className={`w-full ${isBlue ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'} text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 rtl:space-x-reverse transition-colors`}
        >
          <Plus className="h-5 w-5" />
          <span>הוסף תרגיל</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">אימון זוגי</h1>
              <p className="text-sm text-gray-600">{trainee.full_name}</p>
            </div>
          </div>

          <div className="flex space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
            >
              <X className="h-4 w-4" />
              <span>ביטול</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{saving ? 'שומר...' : 'סיים אימון'}</span>
            </button>
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
