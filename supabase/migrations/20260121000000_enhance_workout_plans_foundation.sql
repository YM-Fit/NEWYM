/*
  # Enhance Workout Plans - Foundation Phase 1
  
  ## Overview
  This migration is the first phase of the professional workout plan system overhaul.
  It adds foundational fields to support advanced features like periodization, 
  progression tracking, volume analysis, and more.
  
  ## Changes
  
  1. Enhance trainee_workout_plans table
     - Add program_type (push/pull/legs, upper/lower, full_body, etc.)
     - Add difficulty_level
     - Add duration_weeks
     - Add start_date and end_date
     - Add progression_type (linear, nonlinear, rpe_based, etc.)
     - Add auto_progression flag
     
  2. Enhance workout_plan_day_exercises table
     - Add progression_rule (JSONB for auto-progression rules)
     - Add base_weight and base_reps
     - Add target_rpe_range
     - Add tempo (e.g., "3-0-1-0")
     - Add time_under_tension
     - Add is_amrap flag
     
  3. Create training_cycles table
     - Support for periodization cycles
     - Volume/intensity/deload weeks
     
  4. Create workout_volume_metrics table
     - Track volume calculations per exercise/day
     
  5. Create training_load_metrics table
     - Track training load over time
*/

-- ============================================
-- 1. ENHANCE trainee_workout_plans
-- ============================================

DO $$
BEGIN
  -- Program type (split type)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'program_type'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN program_type TEXT;
    
    COMMENT ON COLUMN trainee_workout_plans.program_type IS 'Type of program split: push/pull/legs, upper/lower, full_body, custom, etc.';
  END IF;
  
  -- Difficulty level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'difficulty_level'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'elite'));
    
    COMMENT ON COLUMN trainee_workout_plans.difficulty_level IS 'Difficulty level: beginner, intermediate, advanced, elite';
  END IF;
  
  -- Duration in weeks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'duration_weeks'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN duration_weeks INT CHECK (duration_weeks > 0);
    
    COMMENT ON COLUMN trainee_workout_plans.duration_weeks IS 'Program duration in weeks';
  END IF;
  
  -- Start and end dates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN start_date DATE;
    
    COMMENT ON COLUMN trainee_workout_plans.start_date IS 'Program start date';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN end_date DATE;
    
    COMMENT ON COLUMN trainee_workout_plans.end_date IS 'Program end date';
  END IF;
  
  -- Progression type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'progression_type'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN progression_type TEXT CHECK (progression_type IN ('linear', 'nonlinear', 'rpe_based', 'double_progression', 'wave', 'none'));
    
    COMMENT ON COLUMN trainee_workout_plans.progression_type IS 'Progression method: linear, nonlinear, rpe_based, double_progression, wave, none';
  END IF;
  
  -- Auto progression flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trainee_workout_plans' AND column_name = 'auto_progression'
  ) THEN
    ALTER TABLE trainee_workout_plans 
    ADD COLUMN auto_progression BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN trainee_workout_plans.auto_progression IS 'Enable automatic progression based on performance';
  END IF;
END $$;

-- ============================================
-- 2. ENHANCE workout_plan_day_exercises
-- ============================================

DO $$
BEGIN
  -- Progression rule (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'progression_rule'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN progression_rule JSONB;
    
    COMMENT ON COLUMN workout_plan_day_exercises.progression_rule IS 'JSONB object with progression rules (e.g., {"type": "linear", "increment": 2.5, "frequency": "weekly"})';
  END IF;
  
  -- Base weight and reps (for progression calculations)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'base_weight'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN base_weight DECIMAL(5,2);
    
    COMMENT ON COLUMN workout_plan_day_exercises.base_weight IS 'Base weight for progression calculations';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'base_reps'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN base_reps INT;
    
    COMMENT ON COLUMN workout_plan_day_exercises.base_reps IS 'Base reps for progression calculations';
  END IF;
  
  -- Target RPE range
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'target_rpe_range'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN target_rpe_range TEXT;
    
    COMMENT ON COLUMN workout_plan_day_exercises.target_rpe_range IS 'Target RPE range (e.g., "7-9" or "8-10")';
  END IF;
  
  -- Tempo (eccentric-pause1-concentric-pause2)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'tempo'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN tempo TEXT;
    
    COMMENT ON COLUMN workout_plan_day_exercises.tempo IS 'Tempo prescription (e.g., "3-0-1-0" for eccentric-pause-concentric-pause seconds)';
  END IF;
  
  -- Time under tension
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'time_under_tension'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN time_under_tension INT;
    
    COMMENT ON COLUMN workout_plan_day_exercises.time_under_tension IS 'Target time under tension in seconds per rep';
  END IF;
  
  -- AMRAP flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_day_exercises' AND column_name = 'is_amrap'
  ) THEN
    ALTER TABLE workout_plan_day_exercises 
    ADD COLUMN is_amrap BOOLEAN DEFAULT false;
    
    COMMENT ON COLUMN workout_plan_day_exercises.is_amrap IS 'As Many Reps As Possible set';
  END IF;
END $$;

-- ============================================
-- 3. CREATE training_cycles TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS training_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES trainee_workout_plans(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL,
  week_number INT NOT NULL,
  cycle_type TEXT NOT NULL CHECK (cycle_type IN ('volume', 'intensity', 'deload', 'peak', 'maintenance')),
  volume_multiplier DECIMAL(5,2) DEFAULT 1.0 CHECK (volume_multiplier >= 0),
  intensity_multiplier DECIMAL(5,2) DEFAULT 1.0 CHECK (intensity_multiplier >= 0),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, cycle_number, week_number)
);

CREATE INDEX IF NOT EXISTS idx_training_cycles_plan_id ON training_cycles(plan_id);
CREATE INDEX IF NOT EXISTS idx_training_cycles_dates ON training_cycles(start_date, end_date);

COMMENT ON TABLE training_cycles IS 'Training cycles for periodization (volume/intensity/deload weeks)';
COMMENT ON COLUMN training_cycles.cycle_type IS 'Type of cycle: volume, intensity, deload, peak, maintenance';
COMMENT ON COLUMN training_cycles.volume_multiplier IS 'Multiplier for volume (e.g., 1.2 for 20% increase)';
COMMENT ON COLUMN training_cycles.intensity_multiplier IS 'Multiplier for intensity (e.g., 0.9 for deload)';

-- ============================================
-- 4. CREATE workout_volume_metrics TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workout_volume_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES trainee_workout_plans(id) ON DELETE CASCADE,
  day_id UUID REFERENCES workout_plan_days(id) ON DELETE SET NULL,
  exercise_id UUID REFERENCES workout_plan_day_exercises(id) ON DELETE SET NULL,
  total_volume DECIMAL(10,2) NOT NULL,
  volume_per_set DECIMAL(10,2),
  relative_volume DECIMAL(10,2), -- volume per kg bodyweight
  sets_count INT,
  reps_count INT,
  avg_weight DECIMAL(5,2),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, day_id, exercise_id, calculated_at)
);

CREATE INDEX IF NOT EXISTS idx_volume_metrics_plan_id ON workout_volume_metrics(plan_id);
CREATE INDEX IF NOT EXISTS idx_volume_metrics_day_id ON workout_volume_metrics(day_id);
CREATE INDEX IF NOT EXISTS idx_volume_metrics_exercise_id ON workout_volume_metrics(exercise_id);
CREATE INDEX IF NOT EXISTS idx_volume_metrics_calculated_at ON workout_volume_metrics(calculated_at DESC);

COMMENT ON TABLE workout_volume_metrics IS 'Volume metrics for workout plans (sets × reps × weight)';
COMMENT ON COLUMN workout_volume_metrics.relative_volume IS 'Volume relative to bodyweight (volume / bodyweight_kg)';

-- ============================================
-- 5. CREATE training_load_metrics TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS training_load_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sessional_rpe DECIMAL(3,1) CHECK (sessional_rpe >= 1 AND sessional_rpe <= 10),
  volume_load DECIMAL(10,2),
  cumulative_weekly_load DECIMAL(10,2),
  fatigue_score DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trainee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_load_metrics_trainee_id ON training_load_metrics(trainee_id);
CREATE INDEX IF NOT EXISTS idx_load_metrics_date ON training_load_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_load_metrics_trainee_date ON training_load_metrics(trainee_id, date DESC);

COMMENT ON TABLE training_load_metrics IS 'Training load metrics for tracking cumulative load and fatigue';
COMMENT ON COLUMN training_load_metrics.sessional_rpe IS 'Session RPE (1-10 scale)';
COMMENT ON COLUMN training_load_metrics.volume_load IS 'Volume load (sets × reps × weight)';
COMMENT ON COLUMN training_load_metrics.cumulative_weekly_load IS 'Cumulative weekly training load';
COMMENT ON COLUMN training_load_metrics.fatigue_score IS 'Calculated fatigue score based on load and RPE';

-- ============================================
-- 6. ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE training_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_volume_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_load_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES FOR training_cycles
-- ============================================

-- Trainers can manage cycles for their plans
CREATE POLICY "trainers_manage_cycles"
  ON training_cycles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = training_cycles.plan_id
        AND twp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = training_cycles.plan_id
        AND twp.trainer_id = auth.uid()
    )
  );

-- Trainees can view cycles for their plans
CREATE POLICY "trainees_view_cycles"
  ON training_cycles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = training_cycles.plan_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 8. RLS POLICIES FOR workout_volume_metrics
-- ============================================

-- Trainers can manage volume metrics for their plans
CREATE POLICY "trainers_manage_volume_metrics"
  ON workout_volume_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_volume_metrics.plan_id
        AND twp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = workout_volume_metrics.plan_id
        AND twp.trainer_id = auth.uid()
    )
  );

-- Trainees can view volume metrics for their plans
CREATE POLICY "trainees_view_volume_metrics"
  ON workout_volume_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = workout_volume_metrics.plan_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 9. RLS POLICIES FOR training_load_metrics
-- ============================================

-- Trainers can manage load metrics for their trainees
CREATE POLICY "trainers_manage_load_metrics"
  ON training_load_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = training_load_metrics.trainee_id
        AND t.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees t
      WHERE t.id = training_load_metrics.trainee_id
        AND t.trainer_id = auth.uid()
    )
  );

-- Trainees can view their own load metrics
CREATE POLICY "trainees_view_own_load_metrics"
  ON training_load_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = training_load_metrics.trainee_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- Trainees can insert/update their own load metrics
CREATE POLICY "trainees_manage_own_load_metrics"
  ON training_load_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = training_load_metrics.trainee_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 10. CREATE TRIGGER FOR training_cycles updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_training_cycle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_training_cycle_timestamp ON training_cycles;
CREATE TRIGGER trigger_update_training_cycle_timestamp
  BEFORE UPDATE ON training_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_training_cycle_timestamp();
