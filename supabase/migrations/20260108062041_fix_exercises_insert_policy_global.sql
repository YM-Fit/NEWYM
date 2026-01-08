/*
  # Fix exercises insert policy for global muscle groups

  1. Changes
    - Update exercises INSERT policy to allow trainers to add exercises to global muscle groups
    - Ensure trainers can add exercises to any authenticated muscle group (global or their own)
  
  2. Security
    - Maintains restriction that only trainers (authenticated users with trainer table entry) can add exercises
    - Allows adding exercises to global muscle groups (trainer_id IS NULL)
*/

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף תרגילים" ON exercises;
CREATE POLICY "מאמנים יכולים להוסיף תרגילים"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainers
      WHERE trainers.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id
    )
  );