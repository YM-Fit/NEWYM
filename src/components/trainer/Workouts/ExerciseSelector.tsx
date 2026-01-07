import { useState, useEffect } from 'react';
import { Search, X, Plus, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl transition-all duration-300">
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Select Exercise</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search exercise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg bg-white shadow-sm transition-all duration-300"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Loading exercises...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Muscle Groups */}
              <div className="lg:col-span-1 space-y-2">
                <h3 className="font-semibold text-gray-700 mb-3">Muscle Groups</h3>
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    className={`w-full text-right px-4 py-3 rounded-xl transition-all duration-300 ${
                      selectedGroup === group.id
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-medium shadow-lg hover:shadow-xl'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-100 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {group.name}
                    <span className={`mr-2 text-sm ${selectedGroup === group.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                      ({group.exercises.length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Exercises */}
              <div className="lg:col-span-2">
                {selectedGroup ? (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 mb-3">Exercises</h3>
                    {filteredGroups
                      .find((g) => g.id === selectedGroup)
                      ?.exercises.map((exercise) => (
                        <div key={exercise.id} className="flex items-center gap-2">
                          {traineeId && (
                            <button
                              onClick={() => setHistoryExercise(exercise)}
                              className="flex items-center gap-2 px-4 py-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
                              title="History"
                            >
                              <Clock className="h-5 w-5 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">History</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onSelect(exercise);
                              onClose();
                            }}
                            className="flex-1 text-right px-6 py-4 bg-white border border-gray-100 hover:border-emerald-300 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 group-hover:text-emerald-700">
                                {exercise.name}
                              </span>
                              <div className="p-2 bg-gray-100 group-hover:bg-emerald-100 rounded-lg transition-all duration-300">
                                <Plus className="h-5 w-5 text-gray-400 group-hover:text-emerald-600" />
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">Select a muscle group from the list</p>
                    </div>
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
          traineeName={traineeName || 'Trainee'}
          exerciseId={historyExercise.id}
          exerciseName={historyExercise.name}
          onClose={() => setHistoryExercise(null)}
        />
      )}
    </div>
  );
}
