/*
  # Fix Workouts Table Recursion for Trainee Access

  1. Problem
    - trainees_view_own_workouts policy on workouts table
    - Policy checks workout_trainees table
    - When trainee queries workout_trainees with inner join to workouts
    - workouts policy checks workout_trainees again
    - Creates infinite recursion
    
  2. Solution
    - Remove trainee access policy from workouts table
    - Trainees access workouts ONLY through workout_trainees table
    - workout_trainees has trainee_select_workout_trainees policy
    - This policy directly checks trainee_id without recursion
    - Trainers still have direct access to workouts via trainer_id = auth.uid()
    
  3. Security
    - Trainers: Direct access to workouts (trainer_id = auth.uid())
    - Trainees: Access through workout_trainees table only
    - workout_trainees ensures trainees only see their own workout associations
    - No circular dependencies
*/

-- Remove the circular trainee policy from workouts table
DROP POLICY IF EXISTS "trainees_view_own_workouts" ON workouts;

-- Verify trainer policies remain (these are non-recursive):
-- מאמנים יכולים לראות את האימונים של - uses trainer_id = auth.uid()
-- מאמנים יכולים להוסיף אימונים - uses trainer_id = auth.uid()
-- מאמנים יכולים לעדכן אימונים - uses trainer_id = auth.uid()
-- מאמנים יכולים למחוק אימונים - uses trainer_id = auth.uid()

-- Also fix any other tables that might cause similar issues
-- Check workout_trainees policies - these should be safe now

-- The workout_trainees policies:
-- trainee_select_workout_trainees: Direct trainee_id check (safe)
-- trainer_select_workout_trainees: Checks workouts.trainer_id (safe when workouts has no trainee policy)
-- trainer_insert/update/delete_workout_trainees: Check workouts.trainer_id (safe)
