import type { SetData, PlanExercise, WorkoutDay } from '../types';

export function formatRestTime(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}` : `${minutes}`;
  }
  return seconds.toString();
}

export function calculateVolume(set: SetData): number {
  return set.weight * set.reps;
}

export function calculateExerciseVolume(exercise: PlanExercise): number {
  return exercise.sets.reduce((total, set) => total + calculateVolume(set), 0);
}

export function calculateDayVolume(day: WorkoutDay): number {
  return day.exercises.reduce((total, exercise) => total + calculateExerciseVolume(exercise), 0);
}
