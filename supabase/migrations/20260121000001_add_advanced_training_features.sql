/*
  # Add Advanced Training Features - Foundation Phase 2
  
  ## Overview
  This migration adds advanced training features including:
  - Advanced set configurations (rest-pause, cluster, tempo, etc.)
  - Exercise alternatives system
  - Plan performance tracking
  - Enhanced template system
  
  ## Changes
  
  1. Create advanced_set_config table
     - Support for rest-pause, cluster sets, AMRAP, EMOM, pyramid sets
     - Tempo training configurations
     
  2. Create exercise_alternatives table
     - Alternative exercises for substitution
     
  3. Create plan_performance_tracking table
     - Track planned vs actual performance
     
  4. Enhance workout_plan_templates table
     - Add program_type, difficulty_level, tags, etc.
*/

-- ============================================
-- 1. CREATE advanced_set_config TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS advanced_set_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES workout_plan_day_exercises(id) ON DELETE CASCADE,
  set_type TEXT NOT NULL CHECK (set_type IN ('rest-pause', 'cluster', 'amrap', 'emom', 'pyramid', 'reverse_pyramid', 'wave', 'myo-reps', 'regular')),
  -- Tempo configuration
  tempo_eccentric INT DEFAULT 0,
  tempo_pause1 INT DEFAULT 0,
  tempo_concentric INT DEFAULT 0,
  tempo_pause2 INT DEFAULT 0,
  target_tut INT, -- time under tension in seconds
  -- AMRAP configuration
  amrap BOOLEAN DEFAULT false,
  amrap_target_reps INT, -- target minimum reps for AMRAP
  -- EMOM configuration
  emom BOOLEAN DEFAULT false,
  emom_interval INT, -- interval in seconds (e.g., 60 for every minute)
  emom_duration INT, -- total duration in seconds
  -- Pyramid configuration
  pyramid_type TEXT CHECK (pyramid_type IN ('ascending', 'descending', 'triangle', 'diamond')),
  pyramid_pattern JSONB, -- e.g., [{"set": 1, "reps": 12}, {"set": 2, "reps": 10}, ...]
  -- Wave loading
  wave_pattern JSONB, -- wave loading pattern
  -- Rest-pause configuration
  rest_pause_duration INT, -- rest duration in seconds between mini-sets
  rest_pause_sets INT, -- number of mini-sets
  -- Cluster configuration
  cluster_rest_duration INT, -- rest between clusters in seconds
  cluster_reps_per_mini_set INT, -- reps per mini-set in cluster
  -- Notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_advanced_set_config_exercise_id ON advanced_set_config(exercise_id);
CREATE INDEX IF NOT EXISTS idx_advanced_set_config_set_type ON advanced_set_config(set_type);

COMMENT ON TABLE advanced_set_config IS 'Advanced set configurations for training methods (rest-pause, cluster, tempo, AMRAP, EMOM, etc.)';
COMMENT ON COLUMN advanced_set_config.set_type IS 'Type of advanced set: rest-pause, cluster, amrap, emom, pyramid, reverse_pyramid, wave, myo-reps, regular';
COMMENT ON COLUMN advanced_set_config.tempo_eccentric IS 'Eccentric phase duration in seconds';
COMMENT ON COLUMN advanced_set_config.tempo_pause1 IS 'First pause duration in seconds (after eccentric)';
COMMENT ON COLUMN advanced_set_config.tempo_concentric IS 'Concentric phase duration in seconds';
COMMENT ON COLUMN advanced_set_config.tempo_pause2 IS 'Second pause duration in seconds (after concentric)';

-- ============================================
-- 2. CREATE exercise_alternatives TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  substitution_reason TEXT,
  priority INT DEFAULT 1 CHECK (priority >= 1 AND priority <= 10), -- 1 = highest priority
  equipment_requirement TEXT, -- required equipment for alternative
  difficulty_comparison TEXT CHECK (difficulty_comparison IN ('easier', 'similar', 'harder')),
  muscle_group_similarity DECIMAL(3,2) DEFAULT 1.0 CHECK (muscle_group_similarity >= 0 AND muscle_group_similarity <= 1),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (primary_exercise_id != alternative_exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_primary ON exercise_alternatives(primary_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_alternative ON exercise_alternatives(alternative_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_priority ON exercise_alternatives(primary_exercise_id, priority);

COMMENT ON TABLE exercise_alternatives IS 'Alternative exercises for substitution when primary exercise is unavailable';
COMMENT ON COLUMN exercise_alternatives.priority IS 'Priority for substitution (1 = highest, 10 = lowest)';
COMMENT ON COLUMN exercise_alternatives.muscle_group_similarity IS 'Similarity score between muscle groups (0-1, 1 = identical)';

-- ============================================
-- 3. CREATE plan_performance_tracking TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS plan_performance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES trainee_workout_plans(id) ON DELETE CASCADE,
  day_id UUID REFERENCES workout_plan_days(id) ON DELETE SET NULL,
  exercise_id UUID NOT NULL REFERENCES workout_plan_day_exercises(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL, -- link to actual workout
  -- Planned values
  planned_weight DECIMAL(5,2),
  planned_reps INT,
  planned_sets INT,
  planned_rpe DECIMAL(3,1) CHECK (planned_rpe >= 1 AND planned_rpe <= 10),
  -- Actual values
  actual_weight DECIMAL(5,2),
  actual_reps INT,
  actual_sets INT,
  actual_rpe DECIMAL(3,1) CHECK (actual_rpe >= 1 AND actual_rpe <= 10),
  -- Performance metrics
  volume_planned DECIMAL(10,2),
  volume_actual DECIMAL(10,2),
  completion_percentage DECIMAL(5,2) CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  was_completed BOOLEAN DEFAULT false,
  was_skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  -- Additional data
  performance_data JSONB, -- additional performance metrics
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_tracking_plan_id ON plan_performance_tracking(plan_id);
CREATE INDEX IF NOT EXISTS idx_performance_tracking_day_id ON plan_performance_tracking(day_id);
CREATE INDEX IF NOT EXISTS idx_performance_tracking_exercise_id ON plan_performance_tracking(exercise_id);
CREATE INDEX IF NOT EXISTS idx_performance_tracking_workout_id ON plan_performance_tracking(workout_id);
CREATE INDEX IF NOT EXISTS idx_performance_tracking_completed_at ON plan_performance_tracking(completed_at DESC);

COMMENT ON TABLE plan_performance_tracking IS 'Track planned vs actual performance for workout plan exercises';
COMMENT ON COLUMN plan_performance_tracking.completion_percentage IS 'Percentage of planned volume/completion achieved';
COMMENT ON COLUMN plan_performance_tracking.performance_data IS 'Additional performance metrics (JSONB)';

-- ============================================
-- 4. ENHANCE workout_plan_templates TABLE
-- ============================================

DO $$
BEGIN
  -- Program type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_templates' AND column_name = 'program_type'
  ) THEN
    ALTER TABLE workout_plan_templates 
    ADD COLUMN program_type TEXT;
    
    COMMENT ON COLUMN workout_plan_templates.program_type IS 'Type of program: push/pull/legs, upper/lower, full_body, custom, etc.';
  END IF;
  
  -- Difficulty level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_templates' AND column_name = 'difficulty_level'
  ) THEN
    ALTER TABLE workout_plan_templates 
    ADD COLUMN difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'elite'));
    
    COMMENT ON COLUMN workout_plan_templates.difficulty_level IS 'Difficulty level: beginner, intermediate, advanced, elite';
  END IF;
  
  -- Target audience
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_templates' AND column_name = 'target_audience'
  ) THEN
    ALTER TABLE workout_plan_templates 
    ADD COLUMN target_audience TEXT;
    
    COMMENT ON COLUMN workout_plan_templates.target_audience IS 'Target audience (e.g., "beginners", "powerlifters", "bodybuilders")';
  END IF;
  
  -- Tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_templates' AND column_name = 'tags'
  ) THEN
    ALTER TABLE workout_plan_templates 
    ADD COLUMN tags TEXT[];
    
    COMMENT ON COLUMN workout_plan_templates.tags IS 'Tags for categorization and search';
  END IF;
  
  -- Usage count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_plan_templates' AND column_name = 'usage_count'
  ) THEN
    ALTER TABLE workout_plan_templates 
    ADD COLUMN usage_count INT DEFAULT 0 CHECK (usage_count >= 0);
    
    COMMENT ON COLUMN workout_plan_templates.usage_count IS 'Number of times this template has been used';
  END IF;
END $$;

-- ============================================
-- 5. ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE advanced_set_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_performance_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES FOR advanced_set_config
-- ============================================

-- Trainers can manage configs for their exercises
CREATE POLICY "trainers_manage_set_configs"
  ON advanced_set_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plan_day_exercises wpde
      JOIN workout_plan_days wpd ON wpd.id = wpde.day_id
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      WHERE wpde.id = advanced_set_config.exercise_id
        AND twp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_plan_day_exercises wpde
      JOIN workout_plan_days wpd ON wpd.id = wpde.day_id
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      WHERE wpde.id = advanced_set_config.exercise_id
        AND twp.trainer_id = auth.uid()
    )
  );

-- Trainees can view configs for their exercises
CREATE POLICY "trainees_view_set_configs"
  ON advanced_set_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plan_day_exercises wpde
      JOIN workout_plan_days wpd ON wpd.id = wpde.day_id
      JOIN trainee_workout_plans twp ON twp.id = wpd.plan_id
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE wpde.id = advanced_set_config.exercise_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 7. RLS POLICIES FOR exercise_alternatives
-- ============================================

-- Everyone can view exercise alternatives (global data)
CREATE POLICY "anyone_view_exercise_alternatives"
  ON exercise_alternatives
  FOR SELECT
  TO authenticated
  USING (true);

-- Trainers can manage alternatives
CREATE POLICY "trainers_manage_exercise_alternatives"
  ON exercise_alternatives
  FOR ALL
  TO authenticated
  USING (true) -- Allow all trainers to manage alternatives (shared resource)
  WITH CHECK (true);

-- ============================================
-- 8. RLS POLICIES FOR plan_performance_tracking
-- ============================================

-- Trainers can manage performance tracking for their plans
CREATE POLICY "trainers_manage_performance_tracking"
  ON plan_performance_tracking
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = plan_performance_tracking.plan_id
        AND twp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      WHERE twp.id = plan_performance_tracking.plan_id
        AND twp.trainer_id = auth.uid()
    )
  );

-- Trainees can view their own performance tracking
CREATE POLICY "trainees_view_own_performance_tracking"
  ON plan_performance_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = plan_performance_tracking.plan_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- Trainees can insert/update their own performance tracking
CREATE POLICY "trainees_manage_own_performance_tracking"
  ON plan_performance_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = plan_performance_tracking.plan_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 9. CREATE TRIGGER FOR advanced_set_config updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_advanced_set_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_advanced_set_config_timestamp ON advanced_set_config;
CREATE TRIGGER trigger_update_advanced_set_config_timestamp
  BEFORE UPDATE ON advanced_set_config
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_set_config_timestamp();
