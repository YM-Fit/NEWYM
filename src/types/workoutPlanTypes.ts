/**
 * Professional Workout Plan Types
 * 
 * This file contains TypeScript types for the enhanced workout plan system
 * including periodization, progression, volume tracking, and advanced training methods.
 */

// ============================================
// Program Types & Enums
// ============================================

export type ProgramType = 
  | 'push/pull/legs'
  | 'upper/lower'
  | 'full_body'
  | 'bro_split'
  | 'custom'
  | null;

export type DifficultyLevel = 
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'elite'
  | null;

export type ProgressionType = 
  | 'linear'
  | 'nonlinear'
  | 'rpe_based'
  | 'double_progression'
  | 'wave'
  | 'none'
  | null;

export type CycleType = 
  | 'volume'
  | 'intensity'
  | 'deload'
  | 'peak'
  | 'maintenance';

export type AdvancedSetType = 
  | 'rest-pause'
  | 'cluster'
  | 'amrap'
  | 'emom'
  | 'pyramid'
  | 'reverse_pyramid'
  | 'wave'
  | 'myo-reps'
  | 'regular';

export type PyramidType = 
  | 'ascending'
  | 'descending'
  | 'triangle'
  | 'diamond'
  | null;

export type DifficultyComparison = 
  | 'easier'
  | 'similar'
  | 'harder'
  | null;

// ============================================
// Enhanced Workout Plan
// ============================================

export interface EnhancedWorkoutPlan {
  id: string;
  trainer_id: string;
  trainee_id: string;
  name: string;
  description: string | null;
  days_per_week: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_modified_by: string | null;
  
  // New fields
  program_type?: ProgramType;
  difficulty_level?: DifficultyLevel;
  duration_weeks?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  progression_type?: ProgressionType;
  auto_progression?: boolean;
}

// ============================================
// Enhanced Plan Exercise
// ============================================

export interface ProgressionRule {
  type: ProgressionType;
  increment?: number; // weight increment in kg
  increment_percentage?: number; // percentage increment
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  reps_increment?: number; // for double progression
  max_reps?: number; // max reps before increasing weight
  rpe_threshold?: number; // RPE threshold for progression
  volume_threshold?: number; // volume threshold for progression
}

export interface EnhancedPlanExercise {
  id: string;
  day_id: string;
  exercise_id: string | null;
  exercise_name?: string | null;
  sets_count: number;
  reps_range: string;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  
  // Existing advanced fields
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
  
  // New fields
  progression_rule?: ProgressionRule | null;
  base_weight?: number | null;
  base_reps?: number | null;
  target_rpe_range?: string | null; // e.g., "7-9"
  tempo?: string | null; // e.g., "3-0-1-0"
  time_under_tension?: number | null;
  is_amrap?: boolean;
}

// ============================================
// Training Cycles
// ============================================

export interface TrainingCycle {
  id: string;
  plan_id: string;
  cycle_number: number;
  week_number: number;
  cycle_type: CycleType;
  volume_multiplier: number;
  intensity_multiplier: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Volume Metrics
// ============================================

export interface WorkoutVolumeMetrics {
  id: string;
  plan_id: string | null;
  day_id: string | null;
  exercise_id: string | null;
  total_volume: number;
  volume_per_set: number | null;
  relative_volume: number | null;
  sets_count: number | null;
  reps_count: number | null;
  avg_weight: number | null;
  calculated_at: string;
}

// ============================================
// Training Load Metrics
// ============================================

export interface TrainingLoadMetrics {
  id: string;
  trainee_id: string;
  date: string;
  sessional_rpe: number | null;
  volume_load: number | null;
  cumulative_weekly_load: number | null;
  fatigue_score: number | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// Advanced Set Configuration
// ============================================

export interface TempoConfig {
  eccentric: number;
  pause1: number;
  concentric: number;
  pause2: number;
}

export interface PyramidPattern {
  set: number;
  reps: number;
  weight?: number;
}

export interface WavePattern {
  wave_number: number;
  sets: Array<{
    set: number;
    reps: number;
    weight?: number;
  }>;
}

export interface AdvancedSetConfig {
  id: string;
  exercise_id: string;
  set_type: AdvancedSetType;
  
  // Tempo
  tempo_eccentric?: number;
  tempo_pause1?: number;
  tempo_concentric?: number;
  tempo_pause2?: number;
  target_tut?: number | null;
  
  // AMRAP
  amrap?: boolean;
  amrap_target_reps?: number | null;
  
  // EMOM
  emom?: boolean;
  emom_interval?: number | null;
  emom_duration?: number | null;
  
  // Pyramid
  pyramid_type?: PyramidType;
  pyramid_pattern?: PyramidPattern[] | null;
  
  // Wave loading
  wave_pattern?: WavePattern[] | null;
  
  // Rest-pause
  rest_pause_duration?: number | null;
  rest_pause_sets?: number | null;
  
  // Cluster
  cluster_rest_duration?: number | null;
  cluster_reps_per_mini_set?: number | null;
  
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Exercise Alternatives
// ============================================

export interface ExerciseAlternative {
  id: string;
  primary_exercise_id: string;
  alternative_exercise_id: string;
  substitution_reason: string | null;
  priority: number; // 1-10, 1 = highest
  equipment_requirement: string | null;
  difficulty_comparison: DifficultyComparison;
  muscle_group_similarity: number; // 0-1
  created_at: string;
  
  // Populated fields
  primary_exercise?: {
    id: string;
    name: string;
  };
  alternative_exercise?: {
    id: string;
    name: string;
  };
}

// ============================================
// Plan Performance Tracking
// ============================================

export interface PlanPerformanceTracking {
  id: string;
  plan_id: string;
  day_id: string | null;
  exercise_id: string;
  workout_id: string | null;
  
  // Planned values
  planned_weight: number | null;
  planned_reps: number | null;
  planned_sets: number | null;
  planned_rpe: number | null;
  
  // Actual values
  actual_weight: number | null;
  actual_reps: number | null;
  actual_sets: number | null;
  actual_rpe: number | null;
  
  // Performance metrics
  volume_planned: number | null;
  volume_actual: number | null;
  completion_percentage: number | null;
  was_completed: boolean;
  was_skipped: boolean;
  skip_reason: string | null;
  
  // Additional data
  performance_data: Record<string, any> | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

// ============================================
// Enhanced Template
// ============================================

export interface EnhancedWorkoutPlanTemplate {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  days: any; // JSONB
  created_at: string;
  
  // New fields
  program_type?: ProgramType;
  difficulty_level?: DifficultyLevel;
  target_audience?: string | null;
  tags?: string[] | null;
  usage_count?: number;
}

// ============================================
// Utility Types
// ============================================

export interface VolumeAnalysis {
  total_volume: number;
  volume_per_muscle_group: Record<string, number>;
  volume_per_day: Record<string, number>;
  relative_volume: number | null; // per kg bodyweight
  average_volume_per_set: number;
}

export interface ProgressionCalculation {
  new_weight?: number;
  new_reps?: number;
  progression_applied: boolean;
  reason: string;
}

export interface CyclePlan {
  cycles: TrainingCycle[];
  total_weeks: number;
  volume_trend: 'increasing' | 'decreasing' | 'stable';
  intensity_trend: 'increasing' | 'decreasing' | 'stable';
}
