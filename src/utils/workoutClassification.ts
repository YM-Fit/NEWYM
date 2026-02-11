/**
 * Workout classification: studio, program, or independent (self).
 * Used to filter and display workouts in history/graphs.
 */

export type WorkoutSource = 'studio' | 'program' | 'self';

export interface WorkoutWithSource {
  id: string;
  source: WorkoutSource;
}

/** Classify a single workout. Priority: self > program > studio. */
export function classifyWorkout(workout: {
  id: string;
  is_self_recorded?: boolean | null;
  in_workout_plan?: boolean;
  in_google_calendar?: boolean;
}): WorkoutSource {
  if (workout.is_self_recorded) return 'self';
  if (workout.in_workout_plan) return 'program';
  if (workout.in_google_calendar) return 'studio';
  return 'studio'; // default: trainer-created studio workout
}

export const WORKOUT_SOURCE_LABELS: Record<WorkoutSource, string> = {
  studio: 'אימון סטודיו',
  program: 'אימון תוכנית',
  self: 'אימון עצמאי',
};

export const WORKOUT_SOURCE_FILTER_OPTIONS: { value: WorkoutSource | 'all'; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'studio', label: 'סטודיו' },
  { value: 'program', label: 'תוכנית' },
  { value: 'self', label: 'אימון עצמאי' },
];
