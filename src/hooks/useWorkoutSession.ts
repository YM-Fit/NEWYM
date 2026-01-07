import { useState } from 'react';

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

interface UseWorkoutSessionOptions {
  initialExercises?: WorkoutExercise[];
}

export function useWorkoutSession(options: UseWorkoutSessionOptions = {}) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>(options.initialExercises || []);
  const [minimizedExercises, setMinimizedExercises] = useState<string[]>([]);
  const [collapsedSets, setCollapsedSets] = useState<string[]>([]);

  const createEmptySet = (setNumber: number): SetData => ({
    id: `temp-${Date.now()}-${setNumber}`,
    set_number: setNumber,
    weight: 0,
    reps: 0,
    rpe: null,
    set_type: 'regular',
    failure: false,
    equipment_id: null,
    equipment: null,
  });

  const addExercise = (exercise: Exercise) => {
    if (exercises.length > 0) {
      const lastExercise = exercises[exercises.length - 1];
      if (!minimizedExercises.includes(lastExercise.tempId)) {
        setMinimizedExercises(prev => [...prev, lastExercise.tempId]);
      }
    }

    const newExercise: WorkoutExercise = {
      tempId: Date.now().toString(),
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
    exercise.sets.push(createEmptySet(newSetNumber));
    setExercises(updatedExercises);
  };

  const toggleCollapseSet = (setId: string) => {
    setCollapsedSets(prev =>
      prev.includes(setId) ? prev.filter(id => id !== setId) : [...prev, setId]
    );
  };

  const expandAllSets = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex];
    const setIds = exercise.sets.map(s => s.id);
    setCollapsedSets(prev => prev.filter(id => !setIds.includes(id)));
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
    setToCopy.id = `temp-${Date.now()}-${newSetNumber}`;
    setToCopy.set_number = newSetNumber;
    exercise.sets.push(setToCopy);
    setExercises(updatedExercises);
  };

  const calculateTotalVolume = () => {
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
  };

  const calculateExerciseVolume = (workoutExercise: WorkoutExercise) => {
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
  };

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

  const getExerciseSummary = (exercise: WorkoutExercise) => {
    const totalSets = exercise.sets.length;
    const maxWeight = Math.max(...exercise.sets.map(s => s.weight), 0);
    const totalVolume = exercise.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
    return { totalSets, maxWeight, totalVolume };
  };

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
  };
}
