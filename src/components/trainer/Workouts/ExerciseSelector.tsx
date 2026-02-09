import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, X, Plus, Clock, PlusCircle, Trash2, Info, Edit2, TrendingUp, Star, Zap, Pencil, History, Heart, Shield, Flame, Dumbbell, Target, Filter, SortAsc, SortDesc, Calendar, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import ExerciseHistory from './ExerciseHistory';
import { useExerciseCache } from '../../../hooks/useExerciseCache';
import { useIsTouchDevice } from '../../../hooks/useIsTouchDevice';
import ExerciseInstructionsModal from '../../common/ExerciseInstructionsModal';
import EditExerciseInstructionsModal from './EditExerciseInstructionsModal';
import { Modal } from '../../ui/Modal';
import { usePagination } from '../../../hooks/usePagination';

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

interface RecentExercise {
  exerciseId: string;
  exerciseName: string;
  lastWeight: number;
  lastReps: number;
  lastDate: string;
  muscleGroupId: string;
  volume?: number;
  frequency?: number; // How many times this exercise was done recently
}

// Muscle group icons and colors mapping
const muscleGroupIcons: Record<string, typeof Dumbbell> = {
  'חזה': Heart,
  'גב': Shield,
  'כתפיים': Zap,
  'רגליים': Flame,
  'זרועות': Dumbbell,
  'בטן': Target,
  'ישבן': Flame,
  'default': Dumbbell,
};

const muscleGroupColors: Record<string, { bg: string; text: string; border: string }> = {
  'חזה': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  'גב': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  'כתפיים': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  'רגליים': { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30' },
  'זרועות': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'בטן': { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  'ישבן': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  'default': { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const getMuscleGroupIcon = (groupName: string) => {
  return muscleGroupIcons[groupName] || muscleGroupIcons['default'];
};

const getMuscleGroupColor = (groupName: string) => {
  return muscleGroupColors[groupName] || muscleGroupColors['default'];
};

interface ExerciseSelectorProps {
  traineeId?: string;
  traineeName?: string;
  onSelect: (exercise: Exercise, loadPreviousData?: boolean) => void;
  onClose: () => void;
  loadingExerciseId?: string | null;
  isTablet?: boolean;
}

export default function ExerciseSelector({ traineeId, traineeName, onSelect, onClose, loadingExerciseId, isTablet }: ExerciseSelectorProps) {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseInstructions, setNewExerciseInstructions] = useState('');
  const [savingExercise, setSavingExercise] = useState(false);
  const [viewingInstructions, setViewingInstructions] = useState<Exercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);
  const [exerciseLastData, setExerciseLastData] = useState<Map<string, { weight: number; reps: number; date: string }>>(new Map());
  const [showRecentSection, setShowRecentSection] = useState(false);
  const [confirmationExercise, setConfirmationExercise] = useState<{ exercise: Exercise; lastData: { weight: number; reps: number; date: string } } | null>(null);
  
  // Advanced search and filtering
  const [searchFilter, setSearchFilter] = useState<'all' | 'name' | 'muscleGroup'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastDate' | 'frequency'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('expanded');

  // Enable on-screen keyboard for specific fields on tablet/touch devices
  const [nameKeyboardEnabled, setNameKeyboardEnabled] = useState(false);
  const [instructionsKeyboardEnabled, setInstructionsKeyboardEnabled] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const instructionsRef = useRef<HTMLTextAreaElement | null>(null);

  const { cachedExercises, isCacheValid, saveToCache } = useExerciseCache();

  // Use touch device detection - prevents keyboard on all touch devices (phones & tablets)
  const isTouchDevice = useIsTouchDevice();
  const preventKeyboard = isTablet || isTouchDevice;

  // Load muscle groups and exercises
  const loadMuscleGroupsAndExercises = useCallback(async () => {
    const { data: groups, error: groupsError } = await supabase
      .from('muscle_groups')
      .select('*')
      .order('name');

    if (groupsError) {
      console.error('[ExerciseSelector] Error loading muscle groups:', groupsError);
      logger.error('Error loading muscle groups:', groupsError, 'ExerciseSelector');
      setLoading(false);
      return;
    }

    if (!groups) {
      console.warn('[ExerciseSelector] No muscle groups returned from database');
      setLoading(false);
      return;
    }

    console.log('[ExerciseSelector] Loaded muscle groups:', groups.length);

    // Always reload exercises from DB to ensure we have the latest data
    // Cache might be stale or incomplete
    if (isCacheValid && cachedExercises) {
      console.log('[ExerciseSelector] Cache found, but reloading from DB to ensure freshness');
      console.log('[ExerciseSelector] Cached exercises count:', cachedExercises.length);
    }

    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, name, muscle_group_id, created_at')
      .order('name');

    if (exercisesError) {
      console.error('[ExerciseSelector] Error loading exercises:', exercisesError);
      logger.error('Error loading exercises:', exercisesError, 'ExerciseSelector');
      setLoading(false);
      return;
    }

    if (!exercises) {
      console.warn('[ExerciseSelector] No exercises returned from database');
      setLoading(false);
      return;
    }

    console.log('[ExerciseSelector] Loaded exercises:', exercises.length);
    console.log('[ExerciseSelector] Exercises sample:', exercises.slice(0, 3));

    // Save to cache
    saveToCache(exercises);

    // Map exercises to groups
    const groupsWithExercises = groups.map((group) => {
      const groupExercises = exercises.filter((ex) => ex.muscle_group_id === group.id);
      console.log(`[ExerciseSelector] Group "${group.name}" has ${groupExercises.length} exercises`);
      return {
        ...group,
        exercises: groupExercises,
      };
    });

    const totalExercisesInGroups = groupsWithExercises.reduce((sum, group) => sum + group.exercises.length, 0);
    console.log('[ExerciseSelector] Total exercises in groups:', totalExercisesInGroups);
    console.log('[ExerciseSelector] Groups with exercises:', groupsWithExercises.length);

    setMuscleGroups(groupsWithExercises);
    setLoading(false);
  }, [isCacheValid, cachedExercises, saveToCache]);

  // Load recent exercises for this trainee with frequency calculation
  const loadRecentExercises = useCallback(async () => {
    if (!traineeId) return;

    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select(`
          exercise_id,
          exercises (id, name, muscle_group_id),
          exercise_sets (weight, reps, set_number),
          workouts!inner (workout_date, is_completed)
        `)
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .order('workouts(workout_date)', { ascending: false })
        .limit(100); // Increased limit to calculate frequency better

      if (error) {
        logger.error('Error loading recent exercises:', error, 'ExerciseSelector');
        return;
      }

      if (data) {
        // Group by exercise and get latest data with frequency
        const exerciseMap = new Map<string, RecentExercise>();
        const lastDataMap = new Map<string, { weight: number; reps: number; date: string }>();
        const frequencyMap = new Map<string, number>();

        data.forEach((item: any) => {
          if (!item.exercises || !item.exercise_sets?.length) return;
          
          const exerciseId = item.exercises.id;
          
          // Count frequency
          frequencyMap.set(exerciseId, (frequencyMap.get(exerciseId) || 0) + 1);
          
          const bestSet = item.exercise_sets.reduce((best: any, set: any) => {
            const volume = (set.weight || 0) * (set.reps || 0);
            const bestVolume = (best?.weight || 0) * (best?.reps || 0);
            return volume > bestVolume ? set : best;
          }, item.exercise_sets[0]);

          const volume = (bestSet?.weight || 0) * (bestSet?.reps || 0);

          if (!exerciseMap.has(exerciseId)) {
            exerciseMap.set(exerciseId, {
              exerciseId,
              exerciseName: item.exercises.name,
              lastWeight: bestSet?.weight || 0,
              lastReps: bestSet?.reps || 0,
              lastDate: item.workouts.workout_date,
              muscleGroupId: item.exercises.muscle_group_id,
              volume,
              frequency: frequencyMap.get(exerciseId) || 1
            });
          } else {
            // Update if this is a more recent workout
            const existing = exerciseMap.get(exerciseId)!;
            const existingDate = new Date(existing.lastDate);
            const newDate = new Date(item.workouts.workout_date);
            if (newDate > existingDate) {
              exerciseMap.set(exerciseId, {
                ...existing,
                lastWeight: bestSet?.weight || 0,
                lastReps: bestSet?.reps || 0,
                lastDate: item.workouts.workout_date,
                volume,
                frequency: frequencyMap.get(exerciseId) || 1
              });
            } else {
              exerciseMap.set(exerciseId, {
                ...existing,
                frequency: frequencyMap.get(exerciseId) || 1
              });
            }
          }

          if (!lastDataMap.has(exerciseId)) {
            lastDataMap.set(exerciseId, {
              weight: bestSet?.weight || 0,
              reps: bestSet?.reps || 0,
              date: item.workouts.workout_date
            });
          }
        });

        // Sort by frequency and recency, then get top exercises
        const recent = Array.from(exerciseMap.values())
          .sort((a, b) => {
            // Sort by frequency first, then by date
            if (b.frequency! !== a.frequency!) {
              return b.frequency! - a.frequency!;
            }
            return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
          })
          .slice(0, 12); // Increased to 12 for better selection
        
        setRecentExercises(recent);
        setExerciseLastData(lastDataMap);
      }
    } catch (error) {
      logger.error('Error loading recent exercises:', error, 'ExerciseSelector');
    }
  }, [traineeId]);

  useEffect(() => {
    loadMuscleGroupsAndExercises();
    if (traineeId) {
      loadRecentExercises();
    }
  }, [traineeId, loadRecentExercises, loadMuscleGroupsAndExercises]);

  const handleAddExercise = async () => {
    if (!newExerciseName.trim() || !selectedGroup) return;

    setSavingExercise(true);
    try {
      // First, verify the muscle group exists and is accessible
      const { data: muscleGroup, error: groupError } = await supabase
        .from('muscle_groups')
        .select('id, name, trainer_id')
        .eq('id', selectedGroup)
        .single();

      if (groupError || !muscleGroup) {
        toast.error('שגיאה: קבוצת השריר לא נמצאה');
        logger.error('Error fetching muscle group:', groupError, 'ExerciseSelector');
        setSavingExercise(false);
        return;
      }

      logger.debug('Adding exercise to muscle group:', { 
        muscleGroupId: selectedGroup, 
        muscleGroupName: muscleGroup.name,
        trainerId: muscleGroup.trainer_id 
      }, 'ExerciseSelector');

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: newExerciseName.trim(),
          muscle_group_id: selectedGroup,
        })
        .select('id, name, muscle_group_id, created_at')
        .single();

      if (error) {
        // Log full error details to console for debugging
        console.error('[ExerciseSelector] Full error details:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          muscleGroupId: selectedGroup,
          exerciseName: newExerciseName.trim(),
          errorStringified: JSON.stringify(error, null, 2),
        });
        
        toast.error(`שגיאה בהוספת התרגיל: ${error.message || 'שגיאה לא ידועה'}`);
        logger.error('Error adding exercise:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          muscleGroupId: selectedGroup,
          exerciseName: newExerciseName.trim(),
        }, 'ExerciseSelector');
      } else if (data) {
        toast.success('התרגיל נוסף בהצלחה');
        // Reload all exercises from DB to ensure we have the latest data
        // This ensures cache is updated and UI shows the new exercise
        console.log('[ExerciseSelector] Exercise added successfully, reloading from DB');
        await loadMuscleGroupsAndExercises();
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
        // עדכון cache
        if (cachedExercises) {
          const updatedExercises = cachedExercises.filter(ex => ex.id !== exerciseId);
          saveToCache(updatedExercises);
        }
      }
    } catch (error) {
      toast.error('שגיאה במחיקת התרגיל');
      logger.error('Error deleting exercise:', error, 'ExerciseSelector');
    }
  };

  const handleSaveInstructions = async (instructions: string) => {
    if (!editingExercise) return;

    try {
      const { data, error } = await supabase
        .from('exercises')
        .update({ instructions: instructions || null })
        .eq('id', editingExercise.id)
        .select()
        .single();

      if (error) {
        toast.error('שגיאה בעדכון ההסבר');
        logger.error('Error updating exercise instructions:', error, 'ExerciseSelector');
        throw error;
      } else if (data) {
        toast.success('ההסבר עודכן בהצלחה');
        
        // עדכון state
        setMuscleGroups(prev => prev.map(group => ({
          ...group,
          exercises: group.exercises.map(ex => 
            ex.id === editingExercise.id ? { ...ex, instructions: data.instructions } : ex
          ),
        })));

        // עדכון cache
        if (cachedExercises) {
          const updatedExercises = cachedExercises.map(ex =>
            ex.id === editingExercise.id ? { ...ex, instructions: data.instructions } : ex
          );
          saveToCache(updatedExercises);
        }
      }
    } catch (error) {
      logger.error('Error saving exercise instructions:', error, 'ExerciseSelector');
      throw error;
    }
  };

  // Enhanced filtering and sorting
  const filteredGroups = useMemo(() => {
    let filtered = muscleGroups.map((group) => {
      let exercises = group.exercises.filter((ex) => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        switch (searchFilter) {
          case 'name':
            return ex.name.toLowerCase().includes(searchLower);
          case 'muscleGroup':
            return group.name.toLowerCase().includes(searchLower);
          default:
            return ex.name.toLowerCase().includes(searchLower) || 
                   group.name.toLowerCase().includes(searchLower);
        }
      });

      // Sort exercises
      exercises = [...exercises].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name, 'he');
            break;
          case 'lastDate':
            const aDate = exerciseLastData.get(a.id)?.date || '';
            const bDate = exerciseLastData.get(b.id)?.date || '';
            comparison = bDate.localeCompare(aDate);
            break;
          case 'frequency':
            const aFreq = recentExercises.find(r => r.exerciseId === a.id)?.frequency || 0;
            const bFreq = recentExercises.find(r => r.exerciseId === b.id)?.frequency || 0;
            comparison = bFreq - aFreq;
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return { ...group, exercises };
    }).filter((group) => group.exercises.length > 0 || !searchTerm);

    return filtered;
  }, [muscleGroups, searchTerm, searchFilter, sortBy, sortOrder, exerciseLastData, recentExercises]);

  // Get exercise object from recent exercise data
  const getExerciseFromRecent = (recent: RecentExercise): Exercise | undefined => {
    for (const group of muscleGroups) {
      const exercise = group.exercises.find(ex => ex.id === recent.exerciseId);
      if (exercise) return exercise;
    }
    return undefined;
  };

  // Format relative date
  const formatRelativeDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'היום';
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  // Handle exercise selection with confirmation if previous data exists
  const handleExerciseSelect = (exercise: Exercise) => {
    if (!traineeId) {
      // No trainee, just select without confirmation
      onSelect(exercise, false);
      onClose();
      return;
    }

    const lastData = exerciseLastData.get(exercise.id);
    if (lastData && lastData.weight > 0 && lastData.reps > 0) {
      // Show confirmation modal
      setConfirmationExercise({ exercise, lastData });
    } else {
      // No previous data, select without confirmation
      onSelect(exercise, false);
      onClose();
    }
  };

  const handleConfirmLoadData = () => {
    if (confirmationExercise) {
      onSelect(confirmationExercise.exercise, true);
      setConfirmationExercise(null);
      onClose();
    }
  };

  const handleConfirmNoData = () => {
    if (confirmationExercise) {
      onSelect(confirmationExercise.exercise, false);
      setConfirmationExercise(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`bg-card border border-border rounded-2xl ${isTablet ? 'max-w-5xl' : 'max-w-4xl'} w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all animate-scale-in`}>
        {/* Header */}
        <div className="bg-surface border-b border-border p-4 lg:p-6 flex items-center justify-between">
          <h2 className="text-xl lg:text-2xl font-bold text-foreground">בחר תרגיל</h2>
          <button
            onClick={onClose}
            className="p-2 lg:p-3 hover:bg-elevated/50 rounded-xl transition-all btn-press-feedback"
          >
            <X className="h-5 w-5 lg:h-6 lg:w-6 text-muted" />
          </button>
        </div>

        {/* Search with Advanced Filters */}
        <div className="p-4 lg:p-6 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted" />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="חפש תרגיל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 pr-12 pl-4 py-3 lg:py-4 bg-surface border border-border rounded-xl text-foreground placeholder-muted focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-base lg:text-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-3 lg:py-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/25 transition-all font-medium"
                >
                  נקה
                </button>
              )}
            </div>
          </div>
          
          {/* Advanced Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-surface/50 rounded-lg p-2 border border-border">
              <Filter className="h-4 w-4 text-muted" />
              <select
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value as 'all' | 'name' | 'muscleGroup')}
                className="bg-transparent border-none text-sm text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">הכל</option>
                <option value="name">שם תרגיל</option>
                <option value="muscleGroup">קבוצת שריר</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-surface/50 rounded-lg p-2 border border-border">
              <Calendar className="h-4 w-4 text-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'lastDate' | 'frequency')}
                className="bg-transparent border-none text-sm text-foreground focus:outline-none cursor-pointer"
              >
                <option value="name">שם</option>
                <option value="lastDate">תאריך אחרון</option>
                <option value="frequency">תדירות</option>
              </select>
            </div>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-surface/50 hover:bg-surface border border-border rounded-lg transition-all"
              title={sortOrder === 'asc' ? 'עולה' : 'יורד'}
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4 text-muted" />
              ) : (
                <SortDesc className="h-4 w-4 text-muted" />
              )}
            </button>
          </div>
        </div>

        {/* Recent Exercises Section - Collapsed by default */}
        {traineeId && recentExercises.length > 0 && !searchTerm && !showRecentSection && (
          <div className="p-2 lg:p-3 border-b border-border bg-gradient-to-b from-emerald-500/5 via-emerald-500/3 to-transparent">
            <button
              onClick={() => setShowRecentSection(true)}
              className="w-full flex items-center justify-between text-right"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <Zap className="h-4 w-4 lg:h-5 lg:w-5 text-amber-400" />
                </div>
                <h3 className="font-bold !text-black text-sm lg:text-base">תרגילים אחרונים ({recentExercises.length})</h3>
              </div>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
          </div>
        )}
        
        {traineeId && recentExercises.length > 0 && !searchTerm && showRecentSection && (
          <div className="p-4 lg:p-6 border-b border-border bg-gradient-to-b from-emerald-500/5 via-emerald-500/3 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <Zap className="h-4 w-4 lg:h-5 lg:w-5 text-amber-400" />
                </div>
                <h3 className="font-bold !text-black text-base lg:text-lg">תרגילים אחרונים</h3>
              </div>
              <button
                onClick={() => setShowRecentSection(false)}
                className="text-xs text-muted hover:text-foreground transition-all px-2 py-1 rounded-lg hover:bg-surface/50"
              >
                הסתר
              </button>
            </div>
            <div className={`grid ${isTablet ? 'grid-cols-3' : 'grid-cols-2'} lg:grid-cols-4 gap-3 lg:gap-4`}>
              {recentExercises.map((recent) => {
                const exercise = getExerciseFromRecent(recent);
                if (!exercise) return null;
                
                const muscleGroup = muscleGroups.find(g => g.id === recent.muscleGroupId);
                const groupName = muscleGroup?.name || '';
                const colors = getMuscleGroupColor(groupName);
                const Icon = getMuscleGroupIcon(groupName);
                
                // Calculate strength indicator (based on volume and frequency)
                const volume = recent.volume || (recent.lastWeight * recent.lastReps);
                const frequency = recent.frequency || 1;
                const strengthScore = volume * (1 + frequency * 0.1);
                const isStrong = strengthScore > 1000; // Threshold for "strong" exercise
                const isWeak = strengthScore < 300; // Threshold for "weak" exercise
                
                return (
                  <button
                    key={recent.exerciseId}
                    onClick={() => {
                      handleExerciseSelect(exercise);
                    }}
                    disabled={loadingExerciseId === exercise.id}
                    className={`p-4 lg:p-5 bg-surface hover:bg-emerald-500/10 border rounded-xl transition-all text-right group btn-press-feedback shadow-sm hover:shadow-md relative overflow-hidden ${
                      isStrong ? 'border-emerald-500/40 hover:border-emerald-500/60' :
                      isWeak ? 'border-amber-500/30 hover:border-amber-500/50' :
                      'border-border hover:border-emerald-500/40'
                    }`}
                  >
                    {/* Strength indicator badge */}
                    {isStrong && (
                      <div className="absolute top-2 left-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full p-1">
                        <Star className="h-3 w-3 text-emerald-400" />
                      </div>
                    )}
                    {isWeak && (
                      <div className="absolute top-2 left-2 bg-amber-500/20 border border-amber-500/40 rounded-full p-1">
                        <TrendingUp className="h-3 w-3 text-amber-400" />
                      </div>
                    )}
                    
                    {/* Muscle group icon */}
                    <div className={`${colors.bg} ${colors.border} border rounded-lg p-2 mb-2 w-fit`}>
                      <Icon className={`h-4 w-4 ${colors.text}`} />
                    </div>
                    
                    <div className="font-semibold !text-black group-hover:text-emerald-400 text-sm lg:text-base truncate mb-2">
                      {recent.exerciseName}
                    </div>
                    <div className="flex items-center gap-2 text-xs lg:text-sm mb-2">
                      <span className="font-bold text-emerald-400">{recent.lastWeight}</span>
                      <span className="!text-black">ק״ג</span>
                      <span className="!text-black">×</span>
                      <span className="font-bold text-blue-400">{recent.lastReps}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] lg:text-xs">
                      <div className="!text-black bg-surface/50 px-2 py-0.5 rounded-md">
                        {formatRelativeDate(recent.lastDate)}
                      </div>
                      {frequency && frequency > 1 && (
                        <div className={`${colors.bg} !text-black px-2 py-0.5 rounded-md`}>
                          {frequency}x
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2.5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-foreground text-base lg:text-lg">קבוצות שרירים</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode(viewMode === 'compact' ? 'expanded' : 'compact')}
                      className="p-2 hover:bg-surface/50 rounded-lg transition-all"
                      title={viewMode === 'compact' ? 'תצוגה מורחבת' : 'תצוגה קומפקטית'}
                    >
                      {viewMode === 'compact' ? <Plus className="h-4 w-4 text-muted" /> : <X className="h-4 w-4 text-muted" />}
                    </button>
                  </div>
                </div>
                {filteredGroups.map((group) => {
                  const Icon = getMuscleGroupIcon(group.name);
                  const colors = getMuscleGroupColor(group.name);
                  const isSelected = selectedGroup === group.id;
                  
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full text-right px-4 lg:px-5 py-3.5 lg:py-4 rounded-xl transition-all font-medium ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-md border-2 border-emerald-600'
                          : `${colors.bg} ${colors.border} border hover:shadow-sm`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                            isSelected ? 'bg-emerald-600/30' : colors.bg
                          }`}>
                            <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : colors.text}`} />
                          </div>
                          <span className={`truncate ${isSelected ? 'text-white' : colors.text}`}>
                            {group.name}
                          </span>
                        </div>
                        <span className={`text-sm px-2 py-0.5 rounded-lg flex-shrink-0 ${
                          isSelected 
                            ? 'bg-emerald-600/30 text-emerald-100' 
                            : `${colors.bg} ${colors.text}`
                        }`}>
                          {group.exercises.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-2">
                {selectedGroup ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-muted">תרגילים</h3>
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
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-emerald-400">
                              שם התרגיל החדש
                            </label>
                            {preventKeyboard && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNameKeyboardEnabled(true);
                                  // קטן timeout כדי לאפשר ל-React לעדכן את ה-readOnly לפני focus
                                  setTimeout(() => {
                                    nameInputRef.current?.focus();
                                  }, 0);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>אפשר כתיבה</span>
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            ref={nameInputRef}
                            value={newExerciseName}
                            onChange={(e) => setNewExerciseName(e.target.value)}
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder-muted focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            placeholder="הזן שם תרגיל..."
                            autoFocus={!preventKeyboard}
                            readOnly={preventKeyboard && !nameKeyboardEnabled}
                            inputMode={preventKeyboard && !nameKeyboardEnabled ? 'none' : 'text'}
                            onFocus={(e) => {
                              if (preventKeyboard && !nameKeyboardEnabled) {
                                e.target.blur();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) handleAddExercise();
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-emerald-400">
                              הוראות ביצוע (אופציונלי)
                            </label>
                            {preventKeyboard && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setInstructionsKeyboardEnabled(true);
                                  setTimeout(() => {
                                    instructionsRef.current?.focus();
                                  }, 0);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>אפשר כתיבה</span>
                              </button>
                            )}
                          </div>
                          <textarea
                            ref={instructionsRef}
                            value={newExerciseInstructions}
                            onChange={(e) => setNewExerciseInstructions(e.target.value)}
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder-muted focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                            placeholder="הזן הוראות ביצוע מפורטות לתרגיל..."
                            rows={4}
                            readOnly={preventKeyboard && !instructionsKeyboardEnabled}
                            inputMode={preventKeyboard && !instructionsKeyboardEnabled ? 'none' : 'text'}
                            onFocus={(e) => {
                              if (preventKeyboard && !instructionsKeyboardEnabled) {
                                e.target.blur();
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddExercise}
                            disabled={savingExercise || !newExerciseName.trim()}
                            className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-elevated disabled:text-muted text-foreground rounded-xl font-medium transition-all disabled:cursor-not-allowed"
                          >
                            {savingExercise ? 'שומר...' : 'הוסף'}
                          </button>
                          <button
                            onClick={() => {
                              setShowAddForm(false);
                              setNewExerciseName('');
                              setNewExerciseInstructions('');
                            }}
                            className="px-4 py-3 bg-surface hover:bg-surface text-foreground rounded-xl font-medium transition-all"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}

                    {filteredGroups
                      .find((g) => g.id === selectedGroup)
                      ?.exercises.map((exercise) => {
                        const lastData = exerciseLastData.get(exercise.id);
                        
                        return (
                          <div key={exercise.id} className="flex items-center gap-2">
                            {/* History button */}
                            {traineeId && (
                              <button
                                onClick={() => setHistoryExercise(exercise)}
                                className="p-3 lg:p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all btn-press-feedback shadow-sm hover:shadow-md"
                                title="היסטוריה"
                              >
                                <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-blue-400" />
                              </button>
                            )}

                            {/* Info button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingInstructions(exercise);
                              }}
                              className="p-3 lg:p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all btn-press-feedback shadow-sm hover:shadow-md"
                              title="הצג הסבר"
                            >
                              <Info className="h-5 w-5 lg:h-6 lg:w-6 text-blue-400" />
                            </button>

                            {/* Edit button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExercise(exercise);
                              }}
                              className="p-3 lg:p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all btn-press-feedback shadow-sm hover:shadow-md"
                              title="ערוך הסבר"
                            >
                              <Edit2 className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-400" />
                            </button>

                            {/* Main exercise button */}
                            <button
                              onClick={() => {
                                handleExerciseSelect(exercise);
                              }}
                              disabled={loadingExerciseId === exercise.id}
                              className="flex-1 text-right px-4 lg:px-6 py-3.5 lg:py-4 bg-surface/50 border border-border hover:border-emerald-500/40 hover:bg-emerald-500/10 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-wait btn-press-feedback shadow-sm hover:shadow-md"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-foreground group-hover:text-emerald-400 text-base lg:text-lg truncate">
                                      {exercise.name}
                                    </span>
                                    {loadingExerciseId === exercise.id && (
                                      <span className="text-xs text-emerald-400 animate-pulse font-medium">טוען...</span>
                                    )}
                                  </div>
                                  
                                  {/* Last workout data preview */}
                                  {lastData && traineeId && (
                                    <div className="flex items-center gap-2 mt-2 text-xs lg:text-sm">
                                      <span className="text-muted">אחרון:</span>
                                      <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                        <span className="font-bold text-emerald-400">{lastData.weight}</span>
                                        <span className="text-muted text-[10px]">ק״ג</span>
                                        <span className="text-muted">×</span>
                                        <span className="font-bold text-blue-400">{lastData.reps}</span>
                                      </div>
                                      <span className="text-muted text-[10px]">({formatRelativeDate(lastData.date)})</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {lastData && (
                                    <div className="hidden lg:flex items-center gap-1 bg-emerald-500/15 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
                                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                                    </div>
                                  )}
                                  <div className="p-2.5 bg-elevated/60 group-hover:bg-emerald-500/20 rounded-lg transition-all">
                                    {loadingExerciseId === exercise.id ? (
                                      <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Plus className="h-5 w-5 text-muted group-hover:text-emerald-400 transition-colors" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExercise(exercise.id, exercise.name);
                              }}
                              className="p-3 lg:p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all btn-press-feedback shadow-sm hover:shadow-md"
                              title="מחק תרגיל"
                            >
                              <Trash2 className="h-5 w-5 lg:h-6 lg:w-6 text-red-400" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8 bg-surface/30 rounded-2xl border border-border">
                      <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-muted" />
                      </div>
                      <p className="text-muted font-medium">בחר קבוצת שרירים מהרשימה</p>
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

      {viewingInstructions && (
        <ExerciseInstructionsModal
          isOpen={!!viewingInstructions}
          onClose={() => setViewingInstructions(null)}
          exerciseName={viewingInstructions.name}
          instructions={viewingInstructions.instructions}
        />
      )}

      {editingExercise && (
        <EditExerciseInstructionsModal
          isOpen={!!editingExercise}
          onClose={() => setEditingExercise(null)}
          exerciseId={editingExercise.id}
          exerciseName={editingExercise.name}
          currentInstructions={editingExercise.instructions}
          onSave={handleSaveInstructions}
        />
      )}

      {/* Confirmation Modal for Loading Previous Data */}
      {confirmationExercise && (
        <Modal
          isOpen={!!confirmationExercise}
          onClose={() => setConfirmationExercise(null)}
          title="טען נתונים קודמים?"
          size="md"
        >
          <div className="space-y-4" dir="rtl">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <History className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{confirmationExercise.exercise.name}</h3>
                  <p className="text-sm text-muted">נתונים מהאימון האחרון</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-surface rounded-lg p-3 border border-border text-center">
                  <div className="text-2xl font-bold text-emerald-400">{confirmationExercise.lastData.weight}</div>
                  <div className="text-xs text-muted mt-1">ק״ג</div>
                </div>
                <div className="bg-surface rounded-lg p-3 border border-border text-center">
                  <div className="text-2xl font-bold text-blue-400">{confirmationExercise.lastData.reps}</div>
                  <div className="text-xs text-muted mt-1">חזרות</div>
                </div>
                <div className="bg-surface rounded-lg p-3 border border-border text-center">
                  <div className="text-sm font-semibold text-foreground">{formatRelativeDate(confirmationExercise.lastData.date)}</div>
                  <div className="text-xs text-muted mt-1">תאריך</div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <p className="text-sm text-muted text-center">
                רק הסט הראשון יטען עם הנתונים הקודמים
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmNoData}
                className="flex-1 px-6 py-3 bg-surface hover:bg-surface/80 border border-border rounded-xl transition-all font-medium text-foreground"
              >
                הוסף ללא נתונים
              </button>
              <button
                onClick={handleConfirmLoadData}
                className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-foreground rounded-xl transition-all font-medium shadow-md"
              >
                טען עם נתונים
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
