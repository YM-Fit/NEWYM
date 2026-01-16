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
      // CRM Tables
      pipeline_movements: {
        Row: {
          id: string;
          trainee_id: string;
          trainer_id: string;
          from_status: string | null;
          to_status: string;
          reason: string | null;
          moved_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainee_id: string;
          trainer_id: string;
          from_status?: string | null;
          to_status: string;
          reason?: string | null;
          moved_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainee_id?: string;
          trainer_id?: string;
          from_status?: string | null;
          to_status?: string;
          reason?: string | null;
          moved_at?: string;
          created_at?: string;
        };
      };
      crm_automation_rules: {
        Row: {
          id: string;
          trainer_id: string;
          rule_type: 'reminder' | 'alert' | 'workflow' | 'notification';
          name: string;
          description: string | null;
          enabled: boolean;
          conditions: any;
          actions: any;
          schedule: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          rule_type: 'reminder' | 'alert' | 'workflow' | 'notification';
          name: string;
          description?: string | null;
          enabled?: boolean;
          conditions?: any;
          actions?: any;
          schedule?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          rule_type?: 'reminder' | 'alert' | 'workflow' | 'notification';
          name?: string;
          description?: string | null;
          enabled?: boolean;
          conditions?: any;
          actions?: any;
          schedule?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      crm_automation_tasks: {
        Row: {
          id: string;
          rule_id: string | null;
          trainee_id: string;
          trainer_id: string;
          task_type: string;
          due_date: string;
          completed: boolean;
          completed_at: string | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          rule_id?: string | null;
          trainee_id: string;
          trainer_id: string;
          task_type: string;
          due_date: string;
          completed?: boolean;
          completed_at?: string | null;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          rule_id?: string | null;
          trainee_id?: string;
          trainer_id?: string;
          task_type?: string;
          due_date?: string;
          completed?: boolean;
          completed_at?: string | null;
          metadata?: any;
          created_at?: string;
        };
      };
      crm_communication_templates: {
        Row: {
          id: string;
          trainer_id: string;
          template_type: 'email' | 'sms' | 'whatsapp';
          name: string;
          subject: string | null;
          body: string;
          variables: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          template_type: 'email' | 'sms' | 'whatsapp';
          name: string;
          subject?: string | null;
          body: string;
          variables?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          template_type?: 'email' | 'sms' | 'whatsapp';
          name?: string;
          subject?: string | null;
          body?: string;
          variables?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      crm_communication_messages: {
        Row: {
          id: string;
          trainee_id: string;
          trainer_id: string;
          message_type: 'email' | 'sms' | 'whatsapp' | 'in_app';
          subject: string | null;
          body: string;
          sent_at: string;
          status: 'sent' | 'failed' | 'pending';
          error_message: string | null;
          template_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainee_id: string;
          trainer_id: string;
          message_type: 'email' | 'sms' | 'whatsapp' | 'in_app';
          subject?: string | null;
          body: string;
          sent_at?: string;
          status?: 'sent' | 'failed' | 'pending';
          error_message?: string | null;
          template_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainee_id?: string;
          trainer_id?: string;
          message_type?: 'email' | 'sms' | 'whatsapp' | 'in_app';
          subject?: string | null;
          body?: string;
          sent_at?: string;
          status?: 'sent' | 'failed' | 'pending';
          error_message?: string | null;
          template_id?: string | null;
          created_at?: string;
        };
      };
      crm_contracts: {
        Row: {
          id: string;
          trainee_id: string;
          trainer_id: string;
          contract_type: 'monthly' | 'package' | 'session' | 'trial';
          start_date: string;
          end_date: string | null;
          value: number;
          terms: string | null;
          status: 'active' | 'expired' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainee_id: string;
          trainer_id: string;
          contract_type: 'monthly' | 'package' | 'session' | 'trial';
          start_date: string;
          end_date?: string | null;
          value: number;
          terms?: string | null;
          status?: 'active' | 'expired' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainee_id?: string;
          trainer_id?: string;
          contract_type?: 'monthly' | 'package' | 'session' | 'trial';
          start_date?: string;
          end_date?: string | null;
          value?: number;
          terms?: string | null;
          status?: 'active' | 'expired' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
      };
      crm_payments: {
        Row: {
          id: string;
          contract_id: string | null;
          trainee_id: string;
          trainer_id: string;
          amount: number;
          due_date: string;
          paid_date: string | null;
          payment_method: 'cash' | 'credit_card' | 'bank_transfer' | 'other' | null;
          status: 'pending' | 'paid' | 'overdue' | 'cancelled';
          notes: string | null;
          invoice_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id?: string | null;
          trainee_id: string;
          trainer_id: string;
          amount: number;
          due_date: string;
          paid_date?: string | null;
          payment_method?: 'cash' | 'credit_card' | 'bank_transfer' | 'other' | null;
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
          notes?: string | null;
          invoice_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string | null;
          trainee_id?: string;
          trainer_id?: string;
          amount?: number;
          due_date?: string;
          paid_date?: string | null;
          payment_method?: 'cash' | 'credit_card' | 'bank_transfer' | 'other' | null;
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
          notes?: string | null;
          invoice_number?: string | null;
          created_at?: string;
        };
      };
      crm_segments: {
        Row: {
          id: string;
          trainer_id: string;
          name: string;
          description: string | null;
          filter_criteria: any;
          auto_update: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          name: string;
          description?: string | null;
          filter_criteria?: any;
          auto_update?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          name?: string;
          description?: string | null;
          filter_criteria?: any;
          auto_update?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      crm_documents: {
        Row: {
          id: string;
          trainee_id: string;
          trainer_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          category: 'contract' | 'photo' | 'before_after' | 'other';
          description: string | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainee_id: string;
          trainer_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          category?: 'contract' | 'photo' | 'before_after' | 'other';
          description?: string | null;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainee_id?: string;
          trainer_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          category?: 'contract' | 'photo' | 'before_after' | 'other';
          description?: string | null;
          metadata?: any;
          created_at?: string;
        };
      };
    };
  };
};
