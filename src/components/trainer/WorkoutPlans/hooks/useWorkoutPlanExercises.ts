import { useCallback } from 'react';
import type { WorkoutDay, Exercise, PlanExercise } from '../types';
import { createEmptyExercise } from '../types';

export function useWorkoutPlanExercises(
  selectedDay: WorkoutDay | null,
  days: WorkoutDay[],
  setDays: React.Dispatch<React.SetStateAction<WorkoutDay[]>>,
  setSelectedDay: React.Dispatch<React.SetStateAction<WorkoutDay | null>>
) {
  const addExercise = useCallback((exercise: Exercise) => {
    if (!selectedDay) return;

    const newExercise = createEmptyExercise(exercise);

    const updatedDay = {
      ...selectedDay,
      exercises: [...selectedDay.exercises, newExercise],
    };

    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  }, [selectedDay, days, setDays, setSelectedDay]);

  const removeExercise = useCallback((exerciseIndex: number) => {
    if (!selectedDay) return;

    const updatedDay = {
      ...selectedDay,
      exercises: selectedDay.exercises.filter((_, i) => i !== exerciseIndex),
    };

    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  }, [selectedDay, days, setDays, setSelectedDay]);

  const updateExercise = useCallback((exerciseIndex: number, field: keyof PlanExercise, value: any) => {
    if (!selectedDay) return;

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      [field]: value,
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  }, [selectedDay, days, setDays, setSelectedDay]);

  const updateAllExercises = useCallback((updatedExercises: PlanExercise[]) => {
    if (!selectedDay) return;

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  }, [selectedDay, days, setDays, setSelectedDay]);

  return {
    addExercise,
    removeExercise,
    updateExercise,
    updateAllExercises,
  };
}
