import WorkoutSession from './WorkoutSession';
import { Trainee, Workout } from '../../../types';

interface PreparedWorkoutSessionProps {
  trainee: Trainee;
  onBack: () => void;
  onSave: (workout: Workout) => void;
  previousWorkout?: Workout | null;
  editingWorkout?: {
    id: string;
    exercises: any[];
  };
  initialSelectedMember?: 'member_1' | 'member_2' | null;
  isTablet?: boolean;
  scheduledWorkoutId?: string;
}

/**
 * PreparedWorkoutSession - A wrapper around WorkoutSession for creating prepared workouts
 * (workouts that are filled in advance, not during the actual workout)
 */
export default function PreparedWorkoutSession({
  trainee,
  onBack,
  onSave,
  previousWorkout,
  editingWorkout,
  initialSelectedMember,
  isTablet,
  scheduledWorkoutId,
}: PreparedWorkoutSessionProps) {
  return (
    <WorkoutSession
      trainee={trainee}
      onBack={onBack}
      onSave={onSave}
      previousWorkout={previousWorkout}
      editingWorkout={editingWorkout}
      initialSelectedMember={initialSelectedMember}
      isTablet={isTablet}
      isPrepared={true}
    />
  );
}
