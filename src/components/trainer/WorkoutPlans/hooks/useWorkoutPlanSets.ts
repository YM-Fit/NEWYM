import { useCallback } from 'react';
import type { WorkoutDay, SetData } from '../types';
import { createEmptySet } from '../types';

export function useWorkoutPlanSets(
  selectedDay: WorkoutDay | null,
  days: WorkoutDay[],
  setDays: React.Dispatch<React.SetStateAction<WorkoutDay[]>>,
  setSelectedDay: React.Dispatch<React.SetStateAction<WorkoutDay | null>>
) {
  const addSet = useCallback((exerciseIndex: number) => {
    if (!selectedDay) return;

    const exercise = selectedDay.exercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];

    const newSet: SetData = {
      ...createEmptySet(exercise.sets.length + 1),
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
      rpe: lastSet?.rpe && lastSet.rpe >= 1 && lastSet.rpe <= 10 ? lastSet.rpe : null,
      equipment_id: lastSet?.equipment_id || null,
      equipment: lastSet?.equipment || null,
    };

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: [...exercise.sets, newSet],
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  }, [selectedDay, days, setDays, setSelectedDay]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    if (!selectedDay) return;

    const exercise = selectedDay.exercises[exerciseIndex];
    if (exercise.sets.length === 1) return;

    const updatedSets = exercise.sets
      .filter((_, i) => i !== setIndex)
      .map((set, i) => ({ ...set, set_number: i + 1 }));

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: updatedSets,
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  }, [selectedDay, days, setDays, setSelectedDay]);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: string, value: any) => {
    if (!selectedDay) return;

    const exercise = selectedDay.exercises[exerciseIndex];
    const updatedSets = [...exercise.sets];
    updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: updatedSets,
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  }, [selectedDay, days, setDays, setSelectedDay]);

  const duplicateSet = useCallback((exerciseIndex: number, setIndex: number) => {
    if (!selectedDay) return;

    const exercise = selectedDay.exercises[exerciseIndex];
    const setToDuplicate = exercise.sets[setIndex];

    const newSet: SetData = {
      ...setToDuplicate,
      id: Date.now().toString() + Math.random(),
      set_number: exercise.sets.length + 1,
    };

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: [...exercise.sets, newSet],
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  }, [selectedDay, days, setDays, setSelectedDay]);

  return {
    addSet,
    removeSet,
    updateSet,
    duplicateSet,
  };
}
