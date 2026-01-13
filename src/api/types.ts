/**
 * Common API types and interfaces
 */

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success?: boolean;
}

export interface TraineeLoginRequest {
  phone: string;
  password: string;
}

export interface TraineeLoginResponse {
  session: {
    access_token: string;
    refresh_token: string;
  };
  trainee: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    gender: 'male' | 'female' | null;
    birth_date: string | null;
    height: number | null;
    status: 'active' | 'inactive' | 'vacation' | 'new';
    is_pair: boolean;
    pair_name_1?: string;
    pair_name_2?: string;
    trainer_id: string;
  };
}

export interface SaveWorkoutRequest {
  trainee_id: string;
  trainer_id: string;
  workout_type: 'personal' | 'pair';
  notes: string | null;
  workout_date: string;
  exercises: Array<{
    exercise_id: string;
    order_index: number;
    sets: Array<{
      set_number: number;
      weight: number;
      reps: number;
      rpe: number | null;
      set_type: 'regular' | 'superset' | 'dropset';
      failure?: boolean;
      superset_exercise_id?: string | null;
      superset_weight?: number | null;
      superset_reps?: number | null;
      superset_rpe?: number | null;
      superset_equipment_id?: string | null;
      superset_dropset_weight?: number | null;
      superset_dropset_reps?: number | null;
      dropset_weight?: number | null;
      dropset_reps?: number | null;
      equipment_id?: string | null;
    }>;
  }>;
  pair_member?: 'member_1' | 'member_2' | null;
  workout_id?: string;
}

export interface SaveWorkoutResponse {
  success: boolean;
  workout: {
    id: string;
    workout_date: string;
    workout_type: 'personal' | 'pair';
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
}
