export type Database = {
  public: {
    Tables: {
      trainers: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          created_at?: string;
        };
      };
      trainees: {
        Row: {
          id: string;
          trainer_id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          gender: 'male' | 'female' | null;
          birth_date: string | null;
          height: number | null;
          status: 'active' | 'inactive' | 'vacation' | 'new';
          start_date: string;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          gender?: 'male' | 'female' | null;
          birth_date?: string | null;
          height?: number | null;
          status?: 'active' | 'inactive' | 'vacation' | 'new';
          start_date?: string;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          gender?: 'male' | 'female' | null;
          birth_date?: string | null;
          height?: number | null;
          status?: 'active' | 'inactive' | 'vacation' | 'new';
          start_date?: string;
          notes?: string;
          created_at?: string;
        };
      };
      muscle_groups: {
        Row: {
          id: string;
          trainer_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      exercises: {
        Row: {
          id: string;
          muscle_group_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          muscle_group_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          muscle_group_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      workouts: {
        Row: {
          id: string;
          trainer_id: string;
          workout_date: string;
          workout_type: 'personal' | 'pair';
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          workout_date?: string;
          workout_type?: 'personal' | 'pair';
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          workout_date?: string;
          workout_type?: 'personal' | 'pair';
          notes?: string;
          created_at?: string;
        };
      };
      workout_trainees: {
        Row: {
          id: string;
          workout_id: string;
          trainee_id: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          trainee_id: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          trainee_id?: string;
        };
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          trainee_id: string;
          exercise_id: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          trainee_id: string;
          exercise_id: string;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          trainee_id?: string;
          exercise_id?: string;
          order_index?: number;
          created_at?: string;
        };
      };
      exercise_sets: {
        Row: {
          id: string;
          workout_exercise_id: string;
          set_number: number;
          weight: number;
          reps: number;
          rpe: number | null;
          set_type: 'regular' | 'superset' | 'dropset';
          superset_exercise_id: string | null;
          superset_weight: number | null;
          superset_reps: number | null;
          dropset_weight: number | null;
          dropset_reps: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_exercise_id: string;
          set_number: number;
          weight?: number;
          reps?: number;
          rpe?: number | null;
          set_type?: 'regular' | 'superset' | 'dropset';
          superset_exercise_id?: string | null;
          superset_weight?: number | null;
          superset_reps?: number | null;
          dropset_weight?: number | null;
          dropset_reps?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_exercise_id?: string;
          set_number?: number;
          weight?: number;
          reps?: number;
          rpe?: number | null;
          set_type?: 'regular' | 'superset' | 'dropset';
          superset_exercise_id?: string | null;
          superset_weight?: number | null;
          superset_reps?: number | null;
          dropset_weight?: number | null;
          dropset_reps?: number | null;
          created_at?: string;
        };
      };
      measurements: {
        Row: {
          id: string;
          trainee_id: string;
          measurement_date: string;
          weight: number | null;
          body_fat_percentage: number | null;
          muscle_mass: number | null;
          water_percentage: number | null;
          visceral_fat: number | null;
          bmi: number | null;
          source: 'tanita' | 'manual';
          chest: number | null;
          waist: number | null;
          hips: number | null;
          right_arm: number | null;
          left_arm: number | null;
          right_thigh: number | null;
          left_thigh: number | null;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainee_id: string;
          measurement_date?: string;
          weight?: number | null;
          body_fat_percentage?: number | null;
          muscle_mass?: number | null;
          water_percentage?: number | null;
          visceral_fat?: number | null;
          bmi?: number | null;
          source?: 'tanita' | 'manual';
          chest?: number | null;
          waist?: number | null;
          hips?: number | null;
          right_arm?: number | null;
          left_arm?: number | null;
          right_thigh?: number | null;
          left_thigh?: number | null;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainee_id?: string;
          measurement_date?: string;
          weight?: number | null;
          body_fat_percentage?: number | null;
          muscle_mass?: number | null;
          water_percentage?: number | null;
          visceral_fat?: number | null;
          bmi?: number | null;
          source?: 'tanita' | 'manual';
          chest?: number | null;
          waist?: number | null;
          hips?: number | null;
          right_arm?: number | null;
          left_arm?: number | null;
          right_thigh?: number | null;
          left_thigh?: number | null;
          notes?: string;
          created_at?: string;
        };
      };
    };
  };
};
