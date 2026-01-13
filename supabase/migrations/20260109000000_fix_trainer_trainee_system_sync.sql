/*
  # Fix Trainer-Trainee System Synchronization Issues
  
  ## Problems Fixed:
  1. Missing `meal_plan_meals` table - code uses it but table doesn't exist
  2. Ensure `trainee_workout_plans` exists (or create alias if needed)
  3. Add missing RLS policies for meal_plan_meals
  
  ## Changes:
  1. Create `meal_plan_meals` table with all required columns
  2. Create `trainee_workout_plans` table if it doesn't exist (or rename workout_plans)
  3. Add RLS policies for meal_plan_meals
  4. Add indexes for performance
*/

-- Check if trainee_workout_plans exists, if not create it from workout_plans structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'trainee_workout_plans'
  ) THEN
    -- Create trainee_workout_plans table with same structure as workout_plans
    CREATE TABLE trainee_workout_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
      trainee_id UUID REFERENCES trainees(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      days_per_week INT DEFAULT 3,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_modified_by TEXT DEFAULT 'trainer'
    );
    
    -- Migrate data from workout_plans if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'workout_plans'
    ) THEN
      INSERT INTO trainee_workout_plans (
        id, trainer_id, trainee_id, name, description, 
        is_active, created_at, updated_at
      )
      SELECT 
        id, trainer_id, trainee_id, name, description,
        is_active, created_at, updated_at
      FROM workout_plans
      ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_trainee_workout_plans_trainer_id 
      ON trainee_workout_plans(trainer_id);
    CREATE INDEX IF NOT EXISTS idx_trainee_workout_plans_trainee_id 
      ON trainee_workout_plans(trainee_id);
    CREATE INDEX IF NOT EXISTS idx_trainee_workout_plans_active 
      ON trainee_workout_plans(trainee_id, is_active) WHERE is_active = true;
  END IF;
END $$;

-- Create meal_plan_meals table if it doesn't exist
CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  meal_time VARCHAR(10) NOT NULL DEFAULT '08:00',
  meal_name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  alternatives TEXT DEFAULT '',
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  notes TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for meal_plan_meals
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_plan_id 
  ON meal_plan_meals(plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_order 
  ON meal_plan_meals(plan_id, order_index);

-- Enable RLS on meal_plan_meals
ALTER TABLE meal_plan_meals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trainers can manage meal_plan_meals for their trainees
DROP POLICY IF EXISTS "trainers_manage_meal_plan_meals" ON meal_plan_meals;
CREATE POLICY "trainers_manage_meal_plan_meals"
  ON meal_plan_meals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_meals.plan_id
        AND mp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_meals.plan_id
        AND mp.trainer_id = auth.uid()
    )
  );

-- RLS Policy: Trainees can view their own meal_plan_meals
DROP POLICY IF EXISTS "trainees_view_own_meal_plan_meals" ON meal_plan_meals;
CREATE POLICY "trainees_view_own_meal_plan_meals"
  ON meal_plan_meals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN trainee_auth ta ON ta.trainee_id = mp.trainee_id
      WHERE mp.id = meal_plan_meals.plan_id
        AND ta.auth_user_id = auth.uid()
    )
  );

-- Ensure trainee_workout_plans has RLS enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'trainee_workout_plans'
  ) THEN
    ALTER TABLE trainee_workout_plans ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE meal_plan_meals IS 'Meals within a meal plan - used by MealPlanBuilder and MyMealPlan components';
COMMENT ON TABLE trainee_workout_plans IS 'Workout plans for trainees - renamed from workout_plans for clarity';
