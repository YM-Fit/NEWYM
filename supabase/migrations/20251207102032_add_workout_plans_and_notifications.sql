/*
  # Add Workout Plans, Meal Plans, Notifications and Trainee Access

  1. New Tables
    - `trainer_notifications` - התראות למאמן
      - `id` (uuid, primary key)
      - `trainer_id` (uuid, foreign key)
      - `trainee_id` (uuid, foreign key)
      - `notification_type` (varchar)
      - `title` (text)
      - `message` (text)
      - `is_read` (boolean)
      - `created_at` (timestamp)
    
    - `trainee_auth` - גישת מתאמנים
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, foreign key, unique)
      - `phone` (varchar, unique)
      - `password` (text)
      - `is_active` (boolean)
      - `last_login` (timestamp)
      - `created_at` (timestamp)
    
    - `workout_plans` - תוכניות אימון
      - `id` (uuid, primary key)
      - `trainer_id` (uuid, foreign key)
      - `trainee_id` (uuid, foreign key)
      - `name` (varchar)
      - `description` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `workout_plan_exercises` - תרגילים בתוכנית
      - `id` (uuid, primary key)
      - `plan_id` (uuid, foreign key)
      - `exercise_id` (uuid, foreign key)
      - `day_number` (int)
      - `order_index` (int)
      - `sets_count` (int)
      - `reps_target` (varchar)
      - `weight_notes` (text)
      - `rest_seconds` (int)
      - `notes` (text)
    
    - `meal_plans` - תפריט מהמאמן
      - `id` (uuid, primary key)
      - `trainer_id` (uuid, foreign key)
      - `trainee_id` (uuid, foreign key)
      - `name` (varchar)
      - `is_active` (boolean)
      - `created_at` (timestamp)
    
    - `meal_plan_items` - פריטים בתפריט
      - `id` (uuid, primary key)
      - `plan_id` (uuid, foreign key)
      - `day_of_week` (int)
      - `meal_type` (varchar)
      - `description` (text)
      - `notes` (text)
    
    - `daily_log` - יומן יומי של המתאמן
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, foreign key)
      - `log_date` (date)
      - `water_ml` (int)
      - `steps` (int)
      - `sleep_hours` (decimal)
      - `sleep_quality` (int)
      - `mood` (int)
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `meals` - ארוחות
      - `id` (uuid, primary key)
      - `trainee_id` (uuid, foreign key)
      - `meal_date` (date)
      - `meal_type` (varchar)
      - `meal_time` (time)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `plan_executions` - ביצוע תוכנית אימון
      - `id` (uuid, primary key)
      - `plan_id` (uuid, foreign key)
      - `trainee_id` (uuid, foreign key)
      - `execution_date` (date)
      - `day_number` (int)
      - `is_completed` (boolean)
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `plan_execution_exercises` - תרגילים שבוצעו
      - `id` (uuid, primary key)
      - `execution_id` (uuid, foreign key)
      - `original_exercise_id` (uuid, foreign key)
      - `actual_exercise_id` (uuid, foreign key)
      - `was_swapped` (boolean)
      - `swap_reason` (text)
      - `sets_data` (jsonb)
      - `notes` (text)
      - `created_at` (timestamp)

  2. Indexes
    - Index on trainer_notifications (trainer_id, is_read)
    - Index on workout_plans (trainee_id)
    - Index on daily_log (trainee_id, log_date)
    - Index on meals (trainee_id, meal_date)

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated trainers to access their data
*/

-- התראות למאמן
CREATE TABLE IF NOT EXISTS trainer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- גישת מתאמנים
CREATE TABLE IF NOT EXISTS trainee_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- תוכניות אימון
CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- תרגילים בתוכנית
CREATE TABLE IF NOT EXISTS workout_plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  day_number INT NOT NULL,
  order_index INT DEFAULT 0,
  sets_count INT DEFAULT 3,
  reps_target VARCHAR(20) DEFAULT '10-12',
  weight_notes TEXT,
  rest_seconds INT DEFAULT 90,
  notes TEXT
);

-- תפריט מהמאמן
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- פריטים בתפריט
CREATE TABLE IF NOT EXISTS meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_of_week INT,
  meal_type VARCHAR(20),
  description TEXT,
  notes TEXT
);

-- יומן יומי של המתאמן
CREATE TABLE IF NOT EXISTS daily_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  log_date DATE DEFAULT CURRENT_DATE,
  water_ml INT DEFAULT 0,
  steps INT DEFAULT 0,
  sleep_hours DECIMAL(3,1),
  sleep_quality INT,
  mood INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(trainee_id, log_date)
);

-- ארוחות
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  meal_date DATE DEFAULT CURRENT_DATE,
  meal_type VARCHAR(20) NOT NULL,
  meal_time TIME,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ביצוע תוכנית אימון
CREATE TABLE IF NOT EXISTS plan_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
  trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
  execution_date DATE DEFAULT CURRENT_DATE,
  day_number INT,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- תרגילים שבוצעו
CREATE TABLE IF NOT EXISTS plan_execution_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES plan_executions(id) ON DELETE CASCADE,
  original_exercise_id UUID REFERENCES exercises(id),
  actual_exercise_id UUID REFERENCES exercises(id),
  was_swapped BOOLEAN DEFAULT false,
  swap_reason TEXT,
  sets_data JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- אינדקסים
CREATE INDEX IF NOT EXISTS idx_trainer_notifications_trainer ON trainer_notifications(trainer_id, is_read);
CREATE INDEX IF NOT EXISTS idx_workout_plans_trainee ON workout_plans(trainee_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_trainee_date ON daily_log(trainee_id, log_date);
CREATE INDEX IF NOT EXISTS idx_meals_trainee_date ON meals(trainee_id, meal_date);

-- RLS
ALTER TABLE trainer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainee_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_execution_exercises ENABLE ROW LEVEL SECURITY;

-- Policies for trainer_notifications
CREATE POLICY "Trainers can view own notifications"
  ON trainer_notifications FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own notifications"
  ON trainer_notifications FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own notifications"
  ON trainer_notifications FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own notifications"
  ON trainer_notifications FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- Policies for trainee_auth
CREATE POLICY "Trainers can view trainee auth"
  ON trainee_auth FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert trainee auth"
  ON trainee_auth FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update trainee auth"
  ON trainee_auth FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete trainee auth"
  ON trainee_auth FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

-- Policies for workout_plans
CREATE POLICY "Trainers can view own workout plans"
  ON workout_plans FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own workout plans"
  ON workout_plans FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own workout plans"
  ON workout_plans FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own workout plans"
  ON workout_plans FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- Policies for workout_plan_exercises
CREATE POLICY "Trainers can view workout plan exercises"
  ON workout_plan_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
      AND workout_plans.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert workout plan exercises"
  ON workout_plan_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
      AND workout_plans.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update workout plan exercises"
  ON workout_plan_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
      AND workout_plans.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
      AND workout_plans.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete workout plan exercises"
  ON workout_plan_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_exercises.plan_id
      AND workout_plans.trainer_id = auth.uid()
    )
  );

-- Policies for meal_plans
CREATE POLICY "Trainers can view own meal plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own meal plans"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- Policies for meal_plan_items
CREATE POLICY "Trainers can view meal plan items"
  ON meal_plan_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_items.plan_id
      AND meal_plans.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert meal plan items"
  ON meal_plan_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_items.plan_id
      AND meal_plans.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update meal plan items"
  ON meal_plan_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_items.plan_id
      AND meal_plans.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_items.plan_id
      AND meal_plans.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete meal plan items"
  ON meal_plan_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_items.plan_id
      AND meal_plans.trainer_id = auth.uid()
    )
  );

-- Policies for daily_log
CREATE POLICY "Trainers can view trainee logs"
  ON daily_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert trainee logs"
  ON daily_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update trainee logs"
  ON daily_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete trainee logs"
  ON daily_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_log.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

-- Policies for meals
CREATE POLICY "Trainers can view trainee meals"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert trainee meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update trainee meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete trainee meals"
  ON meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = meals.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

-- Policies for plan_executions
CREATE POLICY "Trainers can view plan executions"
  ON plan_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert plan executions"
  ON plan_executions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update plan executions"
  ON plan_executions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete plan executions"
  ON plan_executions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = plan_executions.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

-- Policies for plan_execution_exercises
CREATE POLICY "Trainers can view execution exercises"
  ON plan_execution_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plan_executions
      JOIN trainees ON trainees.id = plan_executions.trainee_id
      WHERE plan_executions.id = plan_execution_exercises.execution_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert execution exercises"
  ON plan_execution_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_executions
      JOIN trainees ON trainees.id = plan_executions.trainee_id
      WHERE plan_executions.id = plan_execution_exercises.execution_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update execution exercises"
  ON plan_execution_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plan_executions
      JOIN trainees ON trainees.id = plan_executions.trainee_id
      WHERE plan_executions.id = plan_execution_exercises.execution_id
      AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_executions
      JOIN trainees ON trainees.id = plan_executions.trainee_id
      WHERE plan_executions.id = plan_execution_exercises.execution_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete execution exercises"
  ON plan_execution_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM plan_executions
      JOIN trainees ON trainees.id = plan_executions.trainee_id
      WHERE plan_executions.id = plan_execution_exercises.execution_id
      AND trainees.trainer_id = auth.uid()
    )
  );