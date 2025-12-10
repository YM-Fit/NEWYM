/*
  # Cleanup Duplicate and Incorrect Trainee Policies
  
  1. Changes
    - Remove old incorrect policies that use trainee_id = auth.uid()
    - Keep only the correct policies that use trainee_auth lookup
  
  2. Security
    - Ensures trainees can only access data via trainee_auth table
    - Maintains trainer access to their trainees' data
*/

-- Remove incorrect meal_plans policy
DROP POLICY IF EXISTS "trainees_view_own_meal_plans" ON meal_plans;

-- Remove incorrect mental_tools policy
DROP POLICY IF EXISTS "trainees_view_own_mental_tools" ON mental_tools;

-- Remove incorrect food_diary policy
DROP POLICY IF EXISTS "trainees_manage_own_diary" ON food_diary;

-- Ensure trainee can view their mental tools
DROP POLICY IF EXISTS "Trainees can view their mental tools" ON mental_tools;
CREATE POLICY "Trainees can view their mental tools"
  ON mental_tools
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = mental_tools.trainee_id
        AND ta.auth_user_id = auth.uid()
    )
  );
