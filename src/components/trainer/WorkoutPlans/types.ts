export interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  instructions?: string | null;
  muscle_group?: {
    name: string;
  };
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

export interface PlanExercise {
  tempId: string;
  exercise: Exercise;
  sets: SetData[];
  rest_seconds: number;
  notes: string;
}

export interface WorkoutDay {
  tempId: string;
  day_number: number;
  day_name: string;
  focus: string;
  notes: string;
  exercises: PlanExercise[];
}

export interface WorkoutPlanTemplate {
  id: string;
  name: string;
  description: string | null;
  days: WorkoutDay[];
}

export interface NumericPadState {
  exerciseIndex: number;
  setIndex: number;
  field: 'weight' | 'reps' | 'rpe';
  value: number;
  label: string;
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

export interface SupersetDropsetNumericPadState {
  exerciseIndex: number;
  setIndex: number;
  field: 'superset_dropset_weight' | 'superset_dropset_reps';
  value: number;
  label: string;
}

export interface SelectorState {
  exerciseIndex: number;
  setIndex: number;
}

export interface WorkoutPlanBuilderProps {
  traineeId: string;
  traineeName: string;
  onBack: () => void;
}

export interface WorkoutPlan {
  id: string;
  trainee_id: string;
  trainer_id: string;
  name: string | null;
  description: string | null;
  days_per_week: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export function createEmptySet(setNumber: number): SetData {
  return {
    id: Date.now().toString() + Math.random(),
    set_number: setNumber,
    weight: 0,
    reps: 0,
    rpe: null,
    set_type: 'regular',
  };
}

export function createEmptyDay(dayNumber: number): WorkoutDay {
  return {
    tempId: Date.now().toString() + Math.random(),
    day_number: dayNumber,
    day_name: '',
    focus: '',
    notes: '',
    exercises: [],
  };
}

export function createEmptyExercise(exercise: Exercise): PlanExercise {
  return {
    tempId: Date.now().toString() + Math.random(),
    exercise,
    sets: [createEmptySet(1)],
    rest_seconds: 90,
    notes: '',
  };
}
