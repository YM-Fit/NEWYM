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
          is_prepared: boolean;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          workout_date?: string;
          workout_type?: 'personal' | 'pair';
          notes?: string;
          created_at?: string;
          is_prepared?: boolean;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          workout_date?: string;
          workout_type?: 'personal' | 'pair';
          notes?: string;
          created_at?: string;
          is_prepared?: boolean;
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
          failure: boolean;
          superset_exercise_id: string | null;
          superset_weight: number | null;
          superset_reps: number | null;
          superset_rpe: number | null;
          superset_equipment_id: string | null;
          superset_dropset_weight: number | null;
          superset_dropset_reps: number | null;
          dropset_weight: number | null;
          dropset_reps: number | null;
          equipment_id: string | null;
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
      trainer_google_credentials: {
        Row: {
          id: string;
          trainer_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          primary_calendar_id: string | null;
          default_calendar_id: string | null;
          auto_sync_enabled: boolean;
          sync_frequency: 'realtime' | 'hourly' | 'daily';
          sync_direction: 'to_google' | 'from_google' | 'bidirectional';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          primary_calendar_id?: string | null;
          default_calendar_id?: string | null;
          auto_sync_enabled?: boolean;
          sync_frequency?: 'realtime' | 'hourly' | 'daily';
          sync_direction?: 'to_google' | 'from_google' | 'bidirectional';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string;
          primary_calendar_id?: string | null;
          default_calendar_id?: string | null;
          auto_sync_enabled?: boolean;
          sync_frequency?: 'realtime' | 'hourly' | 'daily';
          sync_direction?: 'to_google' | 'from_google' | 'bidirectional';
          created_at?: string;
          updated_at?: string;
        };
      };
      google_calendar_sync: {
        Row: {
          id: string;
          trainer_id: string;
          trainee_id: string | null;
          workout_id: string | null;
          google_event_id: string;
          google_calendar_id: string;
          sync_status: 'synced' | 'pending' | 'failed' | 'conflict';
          sync_direction: 'to_google' | 'from_google' | 'bidirectional';
          last_synced_at: string | null;
          event_start_time: string;
          event_end_time: string | null;
          event_summary: string | null;
          event_description: string | null;
          conflict_resolution: 'system_wins' | 'google_wins' | 'manual' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          trainee_id?: string | null;
          workout_id?: string | null;
          google_event_id: string;
          google_calendar_id: string;
          sync_status?: 'synced' | 'pending' | 'failed' | 'conflict';
          sync_direction?: 'to_google' | 'from_google' | 'bidirectional';
          last_synced_at?: string | null;
          event_start_time: string;
          event_end_time?: string | null;
          event_summary?: string | null;
          event_description?: string | null;
          conflict_resolution?: 'system_wins' | 'google_wins' | 'manual' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          trainee_id?: string | null;
          workout_id?: string | null;
          google_event_id?: string;
          google_calendar_id?: string;
          sync_status?: 'synced' | 'pending' | 'failed' | 'conflict';
          sync_direction?: 'to_google' | 'from_google' | 'bidirectional';
          last_synced_at?: string | null;
          event_start_time?: string;
          event_end_time?: string | null;
          event_summary?: string | null;
          event_description?: string | null;
          conflict_resolution?: 'system_wins' | 'google_wins' | 'manual' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      google_calendar_clients: {
        Row: {
          id: string;
          trainer_id: string;
          trainee_id: string | null;
          google_client_identifier: string;
          client_name: string;
          client_email: string | null;
          client_phone: string | null;
          first_event_date: string | null;
          last_event_date: string | null;
          total_events_count: number;
          upcoming_events_count: number;
          completed_events_count: number;
          extra_data: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          trainee_id?: string | null;
          google_client_identifier: string;
          client_name: string;
          client_email?: string | null;
          client_phone?: string | null;
          first_event_date?: string | null;
          last_event_date?: string | null;
          total_events_count?: number;
          upcoming_events_count?: number;
          completed_events_count?: number;
          extra_data?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          trainee_id?: string | null;
          google_client_identifier?: string;
          client_name?: string;
          client_email?: string | null;
          client_phone?: string | null;
          first_event_date?: string | null;
          last_event_date?: string | null;
          total_events_count?: number;
          upcoming_events_count?: number;
          completed_events_count?: number;
          extra_data?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      trainee_goals: {
        Row: {
          id: string;
          trainee_id: string;
          goal_type: string;
          target_value: number;
          current_value: number;
          target_date: string | null;
          status: 'active' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainee_id: string;
          goal_type: string;
          target_value: number;
          current_value?: number;
          target_date?: string | null;
          status?: 'active' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainee_id?: string;
          goal_type?: string;
          target_value?: number;
          current_value?: number;
          target_date?: string | null;
          status?: 'active' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trainer_notifications: {
        Row: {
          id: string;
          trainer_id: string;
          trainee_id: string;
          notification_type: string;
          title: string;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          trainee_id: string;
          notification_type: string;
          title: string;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          trainee_id?: string;
          notification_type?: string;
          title?: string;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      trainee_workout_plans: {
        Row: {
          id: string;
          trainer_id: string;
          trainee_id: string;
          name: string;
          description: string | null;
          days_per_week: number;
          is_active: boolean;
          program_type: string | null;
          difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'elite' | null;
          duration_weeks: number | null;
          start_date: string | null;
          end_date: string | null;
          progression_type: 'linear' | 'nonlinear' | 'rpe_based' | 'double_progression' | 'wave' | 'none' | null;
          auto_progression: boolean;
          last_modified_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          trainee_id: string;
          name: string;
          description?: string | null;
          days_per_week?: number;
          is_active?: boolean;
          program_type?: string | null;
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'elite' | null;
          duration_weeks?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          progression_type?: 'linear' | 'nonlinear' | 'rpe_based' | 'double_progression' | 'wave' | 'none' | null;
          auto_progression?: boolean;
          last_modified_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          trainee_id?: string;
          name?: string;
          description?: string | null;
          days_per_week?: number;
          is_active?: boolean;
          program_type?: string | null;
          difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'elite' | null;
          duration_weeks?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          progression_type?: 'linear' | 'nonlinear' | 'rpe_based' | 'double_progression' | 'wave' | 'none' | null;
          auto_progression?: boolean;
          last_modified_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_plan_history: {
        Row: {
          id: string;
          plan_id: string;
          changed_by_user_id: string;
          changed_by_type: 'trainer' | 'trainee';
          change_type: string;
          change_description: string;
          previous_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          changed_by_user_id: string;
          changed_by_type: 'trainer' | 'trainee';
          change_type: string;
          change_description: string;
          previous_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          changed_by_user_id?: string;
          changed_by_type?: 'trainer' | 'trainee';
          change_type?: string;
          change_description?: string;
          previous_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
      workout_plan_day_exercises: {
        Row: {
          id: string;
          day_id: string;
          exercise_id: string;
          sets_count: number;
          reps_target: string;
          weight_notes: string | null;
          rest_seconds: number;
          notes: string | null;
          order_index: number;
          target_weight: number | null;
          target_rpe: number | null;
          equipment_id: string | null;
          set_type: 'regular' | 'superset' | 'dropset';
          failure: boolean;
          superset_exercise_id: string | null;
          superset_weight: number | null;
          superset_reps: number | null;
          superset_rpe: number | null;
          superset_equipment_id: string | null;
          superset_dropset_weight: number | null;
          superset_dropset_reps: number | null;
          dropset_weight: number | null;
          dropset_reps: number | null;
          trainee_notes: string | null;
          trainee_target_weight: number | null;
          trainee_modified_at: string | null;
        };
        Insert: {
          id?: string;
          day_id: string;
          exercise_id: string;
          sets_count?: number;
          reps_target?: string;
          weight_notes?: string | null;
          rest_seconds?: number;
          notes?: string | null;
          order_index?: number;
          target_weight?: number | null;
          target_rpe?: number | null;
          equipment_id?: string | null;
          set_type?: 'regular' | 'superset' | 'dropset';
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
          trainee_notes?: string | null;
          trainee_target_weight?: number | null;
          trainee_modified_at?: string | null;
        };
        Update: {
          id?: string;
          day_id?: string;
          exercise_id?: string;
          sets_count?: number;
          reps_target?: string;
          weight_notes?: string | null;
          rest_seconds?: number;
          notes?: string | null;
          order_index?: number;
          target_weight?: number | null;
          target_rpe?: number | null;
          equipment_id?: string | null;
          set_type?: 'regular' | 'superset' | 'dropset';
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
          trainee_notes?: string | null;
          trainee_target_weight?: number | null;
          trainee_modified_at?: string | null;
        };
      };
    };
    Functions: {
      create_trainee_workout: {
        Args: {
          p_trainer_id: string;
          p_workout_type?: string;
          p_notes?: string;
          p_workout_date?: string;
          p_is_completed?: boolean;
          p_is_self_recorded?: boolean;
        };
        Returns: string;
      };
    };
  };
};
