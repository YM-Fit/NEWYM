-- ============================================
-- Create ONLY the missing tables: trainee_habits and habit_logs
-- ============================================

-- Create trainee_habits table if it doesn't exist
CREATE TABLE IF NOT EXISTS trainee_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  habit_name VARCHAR(100) NOT NULL,
  habit_type VARCHAR(50) NOT NULL CHECK (habit_type IN ('water', 'steps', 'sleep', 'nutrition', 'custom')),
  target_value DECIMAL(10,2),
  unit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainee_habits_trainee_id ON trainee_habits(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_habits_is_active ON trainee_habits(is_active);

-- Enable RLS
ALTER TABLE trainee_habits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Trainers can manage their trainees habits" ON trainee_habits;
DROP POLICY IF EXISTS "Trainees can view their own habits" ON trainee_habits;
DROP POLICY IF EXISTS "Trainees can update their own habits" ON trainee_habits;
DROP POLICY IF EXISTS "Trainees can insert their own habits" ON trainee_habits;

-- Trainers can manage their trainees habits
CREATE POLICY "Trainers can manage their trainees habits"
  ON trainee_habits FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_habits.trainee_id AND t.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_habits.trainee_id AND t.trainer_id = auth.uid())
  );

-- Trainees can view their own habits
CREATE POLICY "Trainees can view their own habits"
  ON trainee_habits FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  );

-- Trainees can insert their own habits
CREATE POLICY "Trainees can insert their own habits"
  ON trainee_habits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  );

-- Trainees can update their own habits
CREATE POLICY "Trainees can update their own habits"
  ON trainee_habits FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  );

-- ============================================
-- Create habit_logs table
-- ============================================

-- Create habit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES trainee_habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  actual_value DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_log_date ON habit_logs(log_date);

-- Enable RLS
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Trainers can view their trainees habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Trainers can insert habit logs for their trainees" ON habit_logs;
DROP POLICY IF EXISTS "Trainees can manage their own habit logs" ON habit_logs;

-- Trainers can view their trainees habit logs
CREATE POLICY "Trainers can view their trainees habit logs"
  ON habit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainees t ON t.id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND t.trainer_id = auth.uid()
    )
  );

-- Trainers can insert habit logs for their trainees
CREATE POLICY "Trainers can insert habit logs for their trainees"
  ON habit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainees t ON t.id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND t.trainer_id = auth.uid()
    )
  );

-- Trainees can manage their own habit logs
CREATE POLICY "Trainees can manage their own habit logs"
  ON habit_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainee_auth ta ON ta.trainee_id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainee_auth ta ON ta.trainee_id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND ta.auth_user_id = auth.uid()
    )
  );
