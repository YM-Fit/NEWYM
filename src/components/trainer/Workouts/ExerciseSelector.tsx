import { useState, useEffect } from 'react';
import { Search, X, Plus, Clock, PlusCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import ExerciseHistory from './ExerciseHistory';
import { useExerciseCache } from '../../../hooks/useExerciseCache';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  instructions?: string | null;
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
  loadingExerciseId?: string | null;
}

export default function ExerciseSelector({ traineeId, traineeName, onSelect, onClose, loadingExerciseId }: ExerciseSelectorProps) {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseInstructions, setNewExerciseInstructions] = useState('');
  const [savingExercise, setSavingExercise] = useState(false);

  const { cachedExercises, isCacheValid, saveToCache } = useExerciseCache();

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

    if (isCacheValid && cachedExercises) {
      const groupsWithExercises = groups.map((group) => ({
        ...group,
        exercises: cachedExercises.filter((ex) => ex.muscle_group_id === group.id),
      }));

      setMuscleGroups(groupsWithExercises);
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

    saveToCache(exercises);

    const groupsWithExercises = groups.map((group) => ({
      ...group,
      exercises: exercises.filter((ex) => ex.muscle_group_id === group.id),
    }));

    setMuscleGroups(groupsWithExercises);
    setLoading(false);
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim() || !selectedGroup) return;

    setSavingExercise(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: newExerciseName.trim(),
          muscle_group_id: selectedGroup,
          instructions: newExerciseInstructions.trim() || null,
        })
        .select()
        .single();

      if (error) {
        toast.error('שגיאה בהוספת התרגיל');
        logger.error('Error adding exercise:', error, 'ExerciseSelector');
      } else if (data) {
        toast.success('התרגיל נוסף בהצלחה');
        setMuscleGroups(prev => prev.map(group => {
          if (group.id === selectedGroup) {
            return {
              ...group,
              exercises: [...group.exercises, data].sort((a, b) => a.name.localeCompare(b.name)),
            };
          }
          return group;
        }));
        setNewExerciseName('');
        setNewExerciseInstructions('');
        setShowAddForm(false);
      }
    } catch (error) {
      toast.error('שגיאה בהוספת התרגיל');
      logger.error('Error adding exercise:', error, 'ExerciseSelector');
    } finally {
      setSavingExercise(false);
    }
  };

  const handleDeleteExercise = async (exerciseId: string, exerciseName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את התרגיל "${exerciseName}"?`)) return;

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) {
        toast.error('שגיאה במחיקת התרגיל');
        logger.error('Error deleting exercise:', error, 'ExerciseSelector');
      } else {
        toast.success('התרגיל נמחק בהצלחה');
        setMuscleGroups(prev => prev.map(group => ({
          ...group,
          exercises: group.exercises.filter(ex => ex.id !== exerciseId),
        })));
      }
    } catch (error) {
      toast.error('שגיאה במחיקת התרגיל');
      logger.error('Error deleting exercise:', error, 'ExerciseSelector');
    }
  };

  const filteredGroups = muscleGroups.map((group) => ({
    ...group,
    exercises: group.exercises.filter((ex) =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((group) => group.exercises.length > 0 || !searchTerm);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all">
        <div className="bg-zinc-800/50 border-b border-zinc-700/50 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">בחר תרגיל</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-700/50 rounded-xl transition-all"
          >
            <X className="h-6 w-6 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 border-b border-zinc-700/30">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="חפש תרגיל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <h3 className="font-semibold text-zinc-400 mb-3">קבוצות שרירים</h3>
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group.id)}
                    className={`w-full text-right px-4 py-3 rounded-xl transition-all ${
                      selectedGroup === group.id
                        ? 'bg-emerald-500 text-white font-medium'
                        : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/30 hover:border-zinc-600/50'
                    }`}
                  >
                    {group.name}
                    <span className={`mr-2 text-sm ${selectedGroup === group.id ? 'text-emerald-100' : 'text-zinc-500'}`}>
                      ({group.exercises.length})
                    </span>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-2">
                {selectedGroup ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-zinc-400">תרגילים</h3>
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all text-sm font-medium"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>תרגיל חדש</span>
                      </button>
                    </div>

                    {showAddForm && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-emerald-400 mb-2">
                            שם התרגיל החדש
                          </label>
                          <input
                            type="text"
                            value={newExerciseName}
                            onChange={(e) => setNewExerciseName(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            placeholder="הזן שם תרגיל..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) handleAddExercise();
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-emerald-400 mb-2">
                            הוראות ביצוע (אופציונלי)
                          </label>
                          <textarea
                            value={newExerciseInstructions}
                            onChange={(e) => setNewExerciseInstructions(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                            placeholder="הזן הוראות ביצוע מפורטות לתרגיל..."
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddExercise}
                            disabled={savingExercise || !newExerciseName.trim()}
                            className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-medium transition-all disabled:cursor-not-allowed"
                          >
                            {savingExercise ? 'שומר...' : 'הוסף'}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddForm(false);
                              setNewExerciseName('');
                              setNewExerciseInstructions('');
                            }}
                            className="px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 rounded-xl font-medium transition-all"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}

                    {filteredGroups
                      .find((g) => g.id === selectedGroup)
                      ?.exercises.map((exercise) => (
                        <div key={exercise.id} className="flex items-center gap-2">
                          {traineeId && (
                            <button
                              onClick={() => setHistoryExercise(exercise)}
                              className="flex items-center gap-2 px-4 py-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl transition-all"
                              title="היסטוריה"
                            >
                              <Clock className="h-5 w-5 text-cyan-400" />
                              <span className="text-sm font-medium text-cyan-400">היסטוריה</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onSelect(exercise);
                              onClose();
                            }}
                            disabled={loadingExerciseId === exercise.id}
                            className="flex-1 text-right px-6 py-4 bg-zinc-800/30 border border-zinc-700/30 hover:border-emerald-500/30 hover:bg-emerald-500/10 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-wait"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-zinc-200 group-hover:text-emerald-400">
                                {exercise.name}
                                {loadingExerciseId === exercise.id && (
                                  <span className="mr-2 text-xs text-emerald-400">טוען...</span>
                                )}
                              </span>
                              <div className="p-2 bg-zinc-700/50 group-hover:bg-emerald-500/20 rounded-lg transition-all">
                                {loadingExerciseId === exercise.id ? (
                                  <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Plus className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400" />
                                )}
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExercise(exercise.id, exercise.name);
                            }}
                            className="p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all"
                            title="מחק תרגיל"
                          >
                            <Trash2 className="h-5 w-5 text-red-400" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                      <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-zinc-600" />
                      </div>
                      <p className="text-zinc-500 font-medium">בחר קבוצת שרירים מהרשימה</p>
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
