/*
  # Add trainer update policy for food_diary

  1. Changes
    - Add UPDATE policy for trainers to update `is_seen_by_trainer` field in food_diary table
    - Trainers can only update food diary entries for their own trainees
  
  2. Security
    - Policy ensures trainers can only access their trainees' data
    - Uses EXISTS check with trainees table to verify trainer ownership
*/

CREATE POLICY "trainer_update_food_diary_seen"
  ON food_diary FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = food_diary.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = food_diary.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );
