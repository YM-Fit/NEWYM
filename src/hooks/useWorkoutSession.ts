import { useState, useMemo, useCallback } from 'react';

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
  // Suggestions for progressive overload
}

interface WorkoutExercise {
  tempId: string;
  exercise: Exercise;
  sets: SetData[];
}

interface UseWorkoutSessionOptions {
  initialExercises?: WorkoutExercise[];
}

export function useWorkoutSession(options: UseWorkoutSessionOptions = {}) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>(options.initialExercises || []);
  const [minimizedExercises, setMinimizedExercises] = useState<string[]>([]);
  const [collapsedSets, setCollapsedSets] = useState<string[]>([]);

  const createEmptySet = (setNumber: number): SetData => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${setNumber}`,
    set_number: setNumber,
    weight: 0,
    reps: 0,
    rpe: null,
    set_type: 'regular',
    failure: false,
    equipment_id: null,
    equipment: null,
  });

  const createSetFromPrevious = (setNumber: number, previousSet: SetData): SetData => {
    return {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${setNumber}`,
      set_number: setNumber,
      // Auto-fill from previous set
      weight: previousSet.weight,
      reps: previousSet.reps,
      rpe: previousSet.rpe,
      set_type: previousSet.set_type,
      failure: previousSet.failure,
      // Superset/Accessories - auto-fill from previous
      superset_exercise_id: previousSet.superset_exercise_id,
      superset_exercise_name: previousSet.superset_exercise_name,
      superset_weight: previousSet.superset_weight,
      superset_reps: previousSet.superset_reps,
      superset_rpe: previousSet.superset_rpe,
      superset_equipment_id: previousSet.superset_equipment_id,
      superset_equipment: previousSet.superset_equipment,
      superset_dropset_weight: previousSet.superset_dropset_weight,
      superset_dropset_reps: previousSet.superset_dropset_reps,
      // Drop set - auto-fill from previous
      dropset_weight: previousSet.dropset_weight,
      dropset_reps: previousSet.dropset_reps,
      // Equipment - auto-fill from previous
      equipment_id: previousSet.equipment_id,
      equipment: previousSet.equipment,
    };
  };

  const addExercise = (exercise: Exercise) => {
    if (exercises.length > 0) {
      const lastExercise = exercises[exercises.length - 1];
      if (!minimizedExercises.includes(lastExercise.tempId)) {
        setMinimizedExercises(prev => [...prev, lastExercise.tempId]);
      }
    }

    // Generate unique tempId with additional randomness to prevent duplicates
    // This ensures uniqueness even if called in rapid succession
    const newExercise: WorkoutExercise = {
      tempId: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      exercise,
      sets: [createEmptySet(1)],
    };
    setExercises([...exercises, newExercise]);
  };

  const removeExercise = (exerciseIndex: number) => {
    const updatedExercises = exercises.filter((_, idx) => idx !== exerciseIndex);
    setExercises(updatedExercises);
  };

  const addSet = (exerciseIndex: number) => {
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[exerciseIndex];
    const existingSetIds = exercise.sets.map(s => s.id);
    setCollapsedSets(prev => [...prev, ...existingSetIds.filter(id => !prev.includes(id))]);
    const newSetNumber = exercise.sets.length + 1;

    const previousSet = exercise.sets[exercise.sets.length - 1];
    const newSet = previousSet && (previousSet.weight > 0 || previousSet.reps > 0)
      ? createSetFromPrevious(newSetNumber, previousSet)
      : createEmptySet(newSetNumber);

    exercise.sets.push(newSet);
    setExercises(updatedExercises);
  };

  const toggleCollapseSet = (setId: string) => {
    setCollapsedSets(prev => {
      // If clicking on a collapsed set, open it and close all others in the same exercise
      if (prev.includes(setId)) {
        // Find which exercise this set belongs to
        const exercise = exercises.find(ex => ex.sets.some(s => s.id === setId));
        if (exercise) {
          // Get all set IDs for this exercise except the one being opened
          const allSetIds = exercise.sets.map(s => s.id).filter(id => id !== setId);
          // Close all other sets in this exercise, open the clicked one
          return [...prev.filter(id => id !== setId), ...allSetIds.filter(id => !prev.includes(id))];
        }
        return prev.filter(id => id !== setId);
      } else {
        // If clicking on an open set, just close it
        return [...prev, setId];
      }
    });
  };

  const expandAllSets = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const setIds = exercise.sets.map(s => s.id);
    setCollapsedSets(prev => prev.filter(id => !setIds.includes(id)));
  };

  const completeSetAndMoveNext = (exerciseIndex: number, setIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const currentSet = exercise.sets[setIndex];
    const nextSet = exercise.sets[setIndex + 1];

    if (nextSet) {
      // Close current set and open next set
      setCollapsedSets(prev => {
        // Add current set to collapsed
        const newCollapsed = prev.includes(currentSet.id) ? prev : [...prev, currentSet.id];
        // Remove next set from collapsed (open it)
        return newCollapsed.filter(id => id !== nextSet.id);
      });
    } else {
      // This is the last set, just collapse it
      setCollapsedSets(prev =>
        prev.includes(currentSet.id) ? prev : [...prev, currentSet.id]
      );
    }
  };


  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    updatedExercises[exerciseIndex].sets.forEach((set, idx) => {
      set.set_number = idx + 1;
    });
    setExercises(updatedExercises);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetData, value: any) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      [field]: value,
    };
    setExercises(updatedExercises);
  };

  const duplicateSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[exerciseIndex];
    const setToCopy = { ...exercise.sets[setIndex] };
    const newSetNumber = exercise.sets.length + 1;
    setToCopy.id = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${newSetNumber}`;
    setToCopy.set_number = newSetNumber;
    exercise.sets.push(setToCopy);
    setExercises(updatedExercises);
  };

  const calculateTotalVolume = useCallback(() => {
    return exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((sum, set) => {
        let setVolume = set.weight * set.reps;

        if (set.superset_weight && set.superset_reps) {
          setVolume += set.superset_weight * set.superset_reps;
        }

        if (set.dropset_weight && set.dropset_reps) {
          setVolume += set.dropset_weight * set.dropset_reps;
        }

        if (set.superset_dropset_weight && set.superset_dropset_reps) {
          setVolume += set.superset_dropset_weight * set.superset_dropset_reps;
        }

        return sum + setVolume;
      }, 0);
    }, 0);
  }, [exercises]);

  const calculateExerciseVolume = useCallback((workoutExercise: WorkoutExercise) => {
    return workoutExercise.sets.reduce((sum, set) => {
      let setVolume = set.weight * set.reps;

      if (set.superset_weight && set.superset_reps) {
        setVolume += set.superset_weight * set.superset_reps;
      }

      if (set.dropset_weight && set.dropset_reps) {
        setVolume += set.dropset_weight * set.dropset_reps;
      }

      if (set.superset_dropset_weight && set.superset_dropset_reps) {
        setVolume += set.superset_dropset_weight * set.superset_dropset_reps;
      }

      return sum + setVolume;
    }, 0);
  }, []);

  const toggleMinimizeExercise = (exerciseId: string) => {
    setMinimizedExercises(prev => {
      if (prev.includes(exerciseId)) {
        return prev.filter(id => id !== exerciseId);
      } else {
        return [...prev, exerciseId];
      }
    });
  };

  const completeExercise = (exerciseId: string) => {
    if (!minimizedExercises.includes(exerciseId)) {
      setMinimizedExercises(prev => [...prev, exerciseId]);
    }
  };

  const getExerciseSummary = useCallback((exercise: WorkoutExercise) => {
    const totalSets = exercise.sets.length;
    const maxWeight = exercise.sets.length > 0 ? Math.max(...exercise.sets.map(s => s.weight), 0) : 0;
    const totalVolume = exercise.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
    return { totalSets, maxWeight, totalVolume };
  }, []);

  return {
    exercises,
    setExercises,
    minimizedExercises,
    collapsedSets,
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
    toggleCollapseSet,
    expandAllSets,
    completeSetAndMoveNext,
  };
}
