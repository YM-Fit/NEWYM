/*
  # Cleanup Duplicate Trainee Policies

  1. Changes
    - Remove old incorrect policies that check trainee_id = auth.uid()
    - Keep only the correct policies that use trainee_auth table
    
  2. Security
    - No security regression - only removing duplicate/incorrect policies
*/

-- Remove old incorrect policy from workout_exercises
DROP POLICY IF EXISTS "trainees_view_own_workout_exercises" ON workout_exercises;

-- Remove old incorrect policy from exercise_sets
DROP POLICY IF EXISTS "trainees_view_own_exercise_sets" ON exercise_sets;
