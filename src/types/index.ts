export interface Trainee {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: 'male' | 'female';
  height: number;
  startDate: string;
  status: 'active' | 'inactive' | 'vacation' | 'new';
  notes: string;
  lastWorkout?: string;
  isPair?: boolean;
  pairName1?: string;
  pairName2?: string;
  pairPhone1?: string;
  pairPhone2?: string;
  pairEmail1?: string;
  pairEmail2?: string;
  pairGender1?: 'male' | 'female';
  pairGender2?: 'male' | 'female';
  pairBirthDate1?: string;
  pairBirthDate2?: string;
  pairHeight1?: number;
  pairHeight2?: number;
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
  source: 'tanita' | 'manual';
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