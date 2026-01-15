export interface Trainee {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  age?: number;
  gender: 'male' | 'female' | null;
  height: number | null;
  birth_date?: string | null;
  start_date: string;
  notes: string;
  created_at: string;
  trainer_id: string;
  lastWorkout?: string;
  is_pair?: boolean;
  pair_name_1?: string;
  pair_name_2?: string;
  pair_phone_1?: string;
  pair_phone_2?: string;
  pair_email_1?: string;
  pair_email_2?: string;
  pair_gender_1?: 'male' | 'female';
  pair_gender_2?: 'male' | 'female';
  pair_birth_date_1?: string;
  pair_birth_date_2?: string;
  pair_height_1?: number;
  pair_height_2?: number;
  // CRM fields
  google_calendar_client_id?: string;
  crm_status?: 'lead' | 'qualified' | 'active' | 'inactive' | 'churned' | 'on_hold';
  client_since?: string;
  last_contact_date?: string;
  next_followup_date?: string;
  contract_type?: 'monthly' | 'package' | 'session' | 'trial';
  contract_value?: number;
  payment_status?: 'paid' | 'pending' | 'overdue' | 'free';
  tags?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
}

export interface WorkoutSet {
  weight: number;
  reps: number;
  rpe: number; // Rate of Perceived Exertion 1-10
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  previousSets?: WorkoutSet[];
  pairMember?: 'member_1' | 'member_2' | null;
}

export interface Workout {
  id: string;
  traineeId: string;
  date: string;
  type: 'personal' | 'duo';
  exercises: WorkoutExercise[];
  totalVolume: number;
  averageRpe: number;
  duration: number;
  notes?: string;
}

export interface WorkoutTemplateExercise {
  exerciseId: string;
  exerciseName: string;
  setsCount: number;
  targetReps?: number;
  targetWeight?: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  trainerId: string;
  traineeId?: string | null;
  traineeName?: string | null;
  name: string;
  description?: string;
  exercises: WorkoutTemplateExercise[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface BodyMeasurement {
  id: string;
  traineeId: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  waterPercentage?: number;
  bmr?: number;
  bmi?: number;
  metabolicAge?: number;
  source: 'tanita' | 'manual';
  notes?: string;
  pairMember?: 'member_1' | 'member_2' | null;
  measurements?: {
    chestBack?: number;
    belly?: number;
    glutes?: number;
    thigh?: number;
    rightArm?: number;
    leftArm?: number;
  };
}

export interface DashboardStats {
  activeTrainees: number;
  workoutsThisWeek: number;
  totalWorkoutsThisMonth: number;
  avgWeightLossPercentage: number;
  avgMuscleMassIncrease: number;
}