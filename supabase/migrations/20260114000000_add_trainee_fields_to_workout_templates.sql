/*
  # Add trainee fields to workout_templates

  1. Changes
    - Add nullable trainee_id and trainee_name to workout_templates
    - Allow trainees to create and view their own templates
      when trainer_id matches their trainer and trainee_id matches them

  2. Notes
    - Keeps existing trainer-only policies intact
    - Trainers continue לראות רק את התבניות שלהם, אבל כעת יכולים
      לדעת לאיזה מתאמן תבנית שייכת (אם היא תבנית מתאמן)
*/

-- Add trainee fields (nullable, backwards compatible)
ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS trainee_id uuid REFERENCES trainees(id),
  ADD COLUMN IF NOT EXISTS trainee_name text;

-- Allow trainees to create their own templates (linked to their trainer)
CREATE POLICY "Trainees can create own templates"
  ON workout_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      JOIN trainees t ON t.id = ta.trainee_id
      WHERE ta.auth_user_id = (select auth.uid())
        AND t.id = workout_templates.trainee_id
        AND t.trainer_id = workout_templates.trainer_id
    )
  );

-- Allow trainees to view their own templates
CREATE POLICY "Trainees can view own templates"
  ON workout_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      WHERE ta.trainee_id = workout_templates.trainee_id
        AND ta.auth_user_id = (select auth.uid())
    )
  );

