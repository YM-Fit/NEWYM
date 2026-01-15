export interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  instructions?: string | null;
}

export interface Equipment {
  id: string;
  name: string;
  emoji: string | null;
}

export interface SetData {
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

export interface WorkoutExercise {
  tempId: string;
  exercise: Exercise;
  sets: SetData[];
}

export interface SelfWorkoutSessionProps {
  traineeId: string;
  traineeName: string;
  trainerId: string;
  onBack: () => void;
  onSave: () => void;
}

export interface NumericPadState {
  exerciseIndex: number;
  setIndex: number;
  field: 'weight' | 'reps' | 'rpe';
  value: number;
  label: string;
}

export interface EquipmentSelectorState {
  exerciseIndex: number;
  setIndex: number;
}

export interface SupersetSelectorState {
  exerciseIndex: number;
  setIndex: number;
}

export interface SupersetNumericPadState {
  exerciseIndex: number;
  setIndex: number;
  field: 'superset_weight' | 'superset_reps' | 'superset_rpe';
  value: number;
  label: string;
}

export interface DropsetNumericPadState {
  exerciseIndex: number;
  setIndex: number;
  field: 'dropset_weight' | 'dropset_reps';
  value: number;
  label: string;
}

export interface DraftData {
  exercises: WorkoutExercise[];
  notes: string;
  workoutDate: string;
  startTime: number;
}

export interface InstructionsExerciseState {
  name: string;
  instructions: string | null;
}
