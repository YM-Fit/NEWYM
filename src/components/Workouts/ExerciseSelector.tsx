import { useState, useEffect } from 'react';
import { Search, X, Plus, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ExerciseHistory from './ExerciseHistory';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
}

interface MuscleGroup {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface ExerciseSelectorProps {
  traineeId?: string;
  traineeName?: string;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export default function ExerciseSelector({ traineeId, traineeName, onSelect, onClose }: ExerciseSelectorProps) {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);

  console.log('ExerciseSelector props:', { traineeId, traineeName });

  useEffect(() => {
    loadMuscleGroupsAndExercises();
  }, []);

  const loadMuscleGroupsAndExercises = async () => {
    const { data: groups, error: groupsError } = await supabase
      .from('muscle_groups')
      .select('*')
      .order('name');

    if (groupsError || !groups) {
      setLoading(false);
      return;
    }

    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .order('name');

    if (exercisesError || !exercises) {
      setLoading(false);
      return;
    }

    const groupsWithExercises = groups.map((group) => ({
      ...group,
      exercises: exercises.filter((ex) => ex.muscle_group_id === group.id),
    }));

    setMuscleGroups(groupsWithExercises);
    setLoading(false);
  };

  const filteredGroups = muscleGroups.map((group) => ({
    ...group,
    exercises: group.exercises.filter((ex) =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((group) => group.exercises.length > 0 || !searchTerm);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">בחר תרגיל</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="חפש תרגיל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">טוען תרגילים...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <h3 className="font-semibold text-gray-700 mb-3">קבוצות שריר</h3>
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    className={`w-full text-right px-4 py-3 rounded-lg transition-colors ${
                      selectedGroup === group.id
                        ? 'bg-green-500 text-white font-medium'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {group.name}
                    <span className="mr-2 text-sm opacity-75">({group.exercises.length})</span>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-2">
                {selectedGroup ? (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 mb-3">תרגילים</h3>
                    {filteredGroups
                      .find((g) => g.id === selectedGroup)
                      ?.exercises.map((exercise) => (
                        <div key={exercise.id} className="flex items-center gap-2">
                          {traineeId && (
                            <button
                              onClick={() => setHistoryExercise(exercise)}
                              className="flex items-center gap-2 px-4 py-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition-all"
                              title="היסטוריה"
                            >
                              <Clock className="h-5 w-5 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">היסטוריה</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onSelect(exercise);
                              onClose();
                            }}
                            className="flex-1 text-right px-6 py-4 bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 rounded-xl transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 group-hover:text-green-700">
                                {exercise.name}
                              </span>
                              <Plus className="h-5 w-5 text-gray-400 group-hover:text-green-600" />
                            </div>
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>בחר קבוצת שריר מהרשימה</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {historyExercise && traineeId && (
        <ExerciseHistory
          traineeId={traineeId}
          traineeName={traineeName || 'מתאמן'}
          exerciseId={historyExercise.id}
          exerciseName={historyExercise.name}
          onClose={() => setHistoryExercise(null)}
        />
      )}
    </div>
  );
}
