/*
  # Add Trainee DELETE Policy for Weekly Executions

  1. Security Changes
    - Add DELETE policy on `workout_plan_weekly_executions` for trainees
    - Allows trainees to unmark/delete their own weekly execution records
    - Policy checks trainee ownership via trainee_auth join

  2. Important Notes
    - Previously only trainers could delete executions, preventing trainees from unmarking completed days
    - This fixes the toggle-complete functionality in the trainee workout plan view
*/

CREATE POLICY "trainees_delete_own_weekly_executions"
  ON workout_plan_weekly_executions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_workout_plans twp
      JOIN trainee_auth ta ON ta.trainee_id = twp.trainee_id
      WHERE twp.id = workout_plan_weekly_executions.plan_id
      AND ta.auth_user_id = auth.uid()
    )
  );
