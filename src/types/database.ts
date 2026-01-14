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
          instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          muscle_group_id: string;
          name: string;
          instructions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          muscle_group_id?: string;
          name?: string;
          instructions?: string | null;
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
      cardio_types: {
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
      cardio_activities: {
        Row: {
          id: string;
          trainee_id: string;
          trainer_id: string;
          cardio_type_id: string;
          date: string;
          avg_weekly_steps: number;
          distance: number;
          duration: number;
          frequency: number;
          weekly_goal_steps: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainee_id: string;
          trainer_id: string;
          cardio_type_id: string;
          date?: string;
          avg_weekly_steps?: number;
          distance?: number;
          duration?: number;
          frequency?: number;
          weekly_goal_steps?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainee_id?: string;
          trainer_id?: string;
          cardio_type_id?: string;
          date?: string;
          avg_weekly_steps?: number;
          distance?: number;
          duration?: number;
          frequency?: number;
          weekly_goal_steps?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      meal_plan_food_items: {
        Row: {
          id: string;
          meal_id: string;
          food_name: string;
          quantity: number;
          unit: string;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_id: string;
          food_name: string;
          quantity?: number;
          unit?: string;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          meal_id?: string;
          food_name?: string;
          quantity?: number;
          unit?: string;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          order_index?: number;
          created_at?: string;
        };
      };
    };
  };
};
