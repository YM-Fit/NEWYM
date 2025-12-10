/*
  # Fix Trainee Workout Visibility

  1. Changes
    - Drop incorrect trainee workout policy
    - Create correct policy that checks through trainee_auth table
    
  2. Security
    - Trainees can only view workouts linked to them through workout_trainees
    - Trainers can view all their workouts
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "trainees_view_own_workouts" ON workouts;

-- Create correct policy for trainees to view their workouts
CREATE POLICY "trainees_view_own_workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (
    -- Trainers can see their own workouts
    trainer_id = auth.uid()
    OR
    -- Trainees can see workouts linked to them
    EXISTS (
      SELECT 1
      FROM workout_trainees wt
      JOIN trainee_auth ta ON ta.trainee_id = wt.trainee_id
      WHERE wt.workout_id = workouts.id
        AND ta.auth_user_id = auth.uid()
    )
  );
