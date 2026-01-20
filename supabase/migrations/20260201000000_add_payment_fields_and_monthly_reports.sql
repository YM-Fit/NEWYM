-- Add payment fields to trainees table if they don't exist
DO $$ 
BEGIN
  -- Add payment_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainees' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE trainees ADD COLUMN payment_method TEXT;
  END IF;
  
  -- Update payment_method constraint to include all payment methods
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trainees_payment_method_check'
  ) THEN
    ALTER TABLE trainees DROP CONSTRAINT trainees_payment_method_check;
  END IF;
  
  ALTER TABLE trainees ADD CONSTRAINT trainees_payment_method_check 
    CHECK (payment_method IS NULL OR payment_method IN (
      'standing_order', 
      'credit', 
      'monthly_count', 
      'card_ticket', 
      'bit', 
      'paybox', 
      'cash'
    ));

  -- Add monthly_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainees' AND column_name = 'monthly_price'
  ) THEN
    ALTER TABLE trainees ADD COLUMN monthly_price NUMERIC DEFAULT 0;
  END IF;

  -- Add card_sessions_total column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainees' AND column_name = 'card_sessions_total'
  ) THEN
    ALTER TABLE trainees ADD COLUMN card_sessions_total INTEGER DEFAULT 0;
  END IF;

  -- Add card_sessions_used column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trainees' AND column_name = 'card_sessions_used'
  ) THEN
    ALTER TABLE trainees ADD COLUMN card_sessions_used INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add payment_method to workouts table for tracking payment per workout
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workouts' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE workouts ADD COLUMN payment_method TEXT 
      CHECK (payment_method IN ('standing_order', 'credit', 'monthly_count', 'card_ticket', 'bit', 'paybox', 'cash'));
  END IF;
END $$;

-- Create monthly_reports table for storing monthly report snapshots
CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  report_month DATE NOT NULL, -- First day of the month
  total_income NUMERIC DEFAULT 0,
  total_workouts INTEGER DEFAULT 0,
  income_goal NUMERIC DEFAULT 0,
  payment_distribution JSONB DEFAULT '{}', -- {bit: 0, paybox: 0, cash: 0, ...}
  report_data JSONB DEFAULT '[]', -- Full report data snapshot
  is_auto_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainer_id, report_month)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_monthly_reports_trainer_month 
  ON monthly_reports(trainer_id, report_month DESC);

-- Enable RLS
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monthly_reports
CREATE POLICY "מאמנים יכולים לראות את הדוחות החודשיים שלהם"
  ON monthly_reports FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים להוסיף דוחות חודשיים"
  ON monthly_reports FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים לעדכן את הדוחות החודשיים שלהם"
  ON monthly_reports FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים למחוק את הדוחות החודשיים שלהם"
  ON monthly_reports FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- Add workout_number tracking per trainee
-- This will be calculated dynamically, but we can add a helper function
CREATE OR REPLACE FUNCTION get_trainee_workout_number(
  p_trainee_id UUID,
  p_workout_date TIMESTAMPTZ
) RETURNS INTEGER AS $$
DECLARE
  workout_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO workout_count
  FROM workouts w
  JOIN workout_trainees wt ON w.id = wt.workout_id
  WHERE wt.trainee_id = p_trainee_id
    AND w.workout_date < p_workout_date
    AND w.trainer_id = (SELECT trainer_id FROM trainees WHERE id = p_trainee_id);
  
  RETURN workout_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
