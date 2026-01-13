/*
  # Advanced Features - Goals, Habits, Tasks, Communication, Analytics
  
  This migration adds:
  1. Habits tracking system
  2. Weekly tasks/assignments
  3. Trainer-trainee communication
  4. Workout feedback
  5. Analytics cache for performance
*/

-- ============================================
-- 1. HABITS TRACKING SYSTEM
-- ============================================

-- Habit definitions (what habits to track)
CREATE TABLE IF NOT EXISTS trainee_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  habit_name VARCHAR(100) NOT NULL,
  habit_type VARCHAR(50) NOT NULL CHECK (habit_type IN ('water', 'steps', 'sleep', 'nutrition', 'custom')),
  target_value DECIMAL(10,2), -- e.g., 2.5 liters, 10000 steps, 8 hours
  unit VARCHAR(20), -- 'liters', 'steps', 'hours', 'times', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainee_habits_trainee_id ON trainee_habits(trainee_id);
CREATE INDEX IF NOT EXISTS idx_trainee_habits_is_active ON trainee_habits(is_active);

-- Daily habit logs (actual tracking)
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

-- ============================================
-- 2. WEEKLY TASKS/ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('workout_focus', 'nutrition', 'habit', 'measurement', 'custom')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_trainee_id ON weekly_tasks(trainee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_trainer_id ON weekly_tasks(trainer_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_week_start ON weekly_tasks(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_is_completed ON weekly_tasks(is_completed);

-- ============================================
-- 3. TRAINER-TRAINEE COMMUNICATION
-- ============================================

CREATE TABLE IF NOT EXISTS trainer_trainee_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('trainer', 'trainee')),
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  related_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  related_measurement_id UUID REFERENCES measurements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_trainee_id ON trainer_trainee_messages(trainee_id);
CREATE INDEX IF NOT EXISTS idx_messages_trainer_id ON trainer_trainee_messages(trainer_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON trainer_trainee_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON trainer_trainee_messages(created_at);

-- ============================================
-- 4. WORKOUT FEEDBACK
-- ============================================

CREATE TABLE IF NOT EXISTS workout_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  overall_rpe DECIMAL(3,1) CHECK (overall_rpe >= 1 AND overall_rpe <= 10),
  energy_level VARCHAR(20) CHECK (energy_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  fatigue_level VARCHAR(20) CHECK (fatigue_level IN ('none', 'light', 'moderate', 'high', 'extreme')),
  sleep_hours DECIMAL(3,1),
  nutrition_quality VARCHAR(20) CHECK (nutrition_quality IN ('poor', 'fair', 'good', 'excellent')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workout_id, trainee_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_feedback_workout_id ON workout_feedback(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_trainee_id ON workout_feedback(trainee_id);

-- ============================================
-- 5. ANALYTICS CACHE (for performance)
-- ============================================

CREATE TABLE IF NOT EXISTS trainee_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value JSONB NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trainee_id, metric_name, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_trainee_id ON trainee_analytics_cache(trainee_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_metric_name ON trainee_analytics_cache(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_period ON trainee_analytics_cache(period_start, period_end);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Habits
ALTER TABLE trainee_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their trainees habits"
  ON trainee_habits FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_habits.trainee_id AND t.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_habits.trainee_id AND t.trainer_id = auth.uid())
  );

CREATE POLICY "Trainees can view their own habits"
  ON trainee_habits FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  );

CREATE POLICY "Trainees can update their own habits"
  ON trainee_habits FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = trainee_habits.trainee_id AND ta.auth_user_id = auth.uid())
  );

-- Habit Logs
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their trainees habit logs"
  ON habit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainees t ON t.id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert habit logs for their trainees"
  ON habit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_habits th
      JOIN trainees t ON t.id = th.trainee_id
      WHERE th.id = habit_logs.habit_id AND t.trainer_id = auth.uid()
    )
  );

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

-- Weekly Tasks
ALTER TABLE weekly_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage tasks for their trainees"
  ON weekly_tasks FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = weekly_tasks.trainee_id AND t.trainer_id = auth.uid())
  );

CREATE POLICY "Trainees can view and update their own tasks"
  ON weekly_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = weekly_tasks.trainee_id AND ta.auth_user_id = auth.uid())
  );

CREATE POLICY "Trainees can update their own tasks completion"
  ON weekly_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = weekly_tasks.trainee_id AND ta.auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainee_auth ta WHERE ta.trainee_id = weekly_tasks.trainee_id AND ta.auth_user_id = auth.uid())
  );

-- Messages
ALTER TABLE trainer_trainee_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view messages with their trainees"
  ON trainer_trainee_messages FOR SELECT TO authenticated
  USING (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = trainer_trainee_messages.trainee_id
      AND ta.auth_user_id = auth.uid()
      AND trainer_trainee_messages.sender_type = 'trainer'
    )
  );

CREATE POLICY "Trainers can send messages to their trainees"
  ON trainer_trainee_messages FOR INSERT TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    sender_type = 'trainer' AND
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainer_trainee_messages.trainee_id AND t.trainer_id = auth.uid())
  );

CREATE POLICY "Trainees can view and send messages"
  ON trainer_trainee_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = trainer_trainee_messages.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can insert messages"
  ON trainer_trainee_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'trainee' AND
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = trainer_trainee_messages.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update read status of their messages"
  ON trainer_trainee_messages FOR UPDATE TO authenticated
  USING (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = trainer_trainee_messages.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    trainer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = trainer_trainee_messages.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- Workout Feedback
ALTER TABLE workout_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view feedback for their trainees workouts"
  ON workout_feedback FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      JOIN trainees t ON t.id = workout_feedback.trainee_id
      WHERE w.id = workout_feedback.workout_id AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can manage their own workout feedback"
  ON workout_feedback FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = workout_feedback.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = workout_feedback.trainee_id
      AND ta.auth_user_id = auth.uid()
    )
  );

-- Analytics Cache
ALTER TABLE trainee_analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view analytics for their trainees"
  ON trainee_analytics_cache FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_analytics_cache.trainee_id AND t.trainer_id = auth.uid())
  );

CREATE POLICY "Trainers can manage analytics cache"
  ON trainee_analytics_cache FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_analytics_cache.trainee_id AND t.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM trainees t WHERE t.id = trainee_analytics_cache.trainee_id AND t.trainer_id = auth.uid())
  );

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_trainee_habits_updated_at
  BEFORE UPDATE ON trainee_habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_tasks_updated_at
  BEFORE UPDATE ON weekly_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
