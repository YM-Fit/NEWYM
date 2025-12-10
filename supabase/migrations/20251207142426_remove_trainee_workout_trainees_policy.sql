/*
  # Remove Trainee Policy from workout_trainees

  1. Issue
    - The trainee policy on workout_trainees is not applicable
    - Trainees don't use Supabase Auth (custom phone/password auth)
    - They access data through the trainer's authenticated session

  2. Solution
    - Remove the trainee policy
    - Keep only trainer policies who use Supabase Auth
*/

-- מחיקת ה-policy שלא רלוונטי
DROP POLICY IF EXISTS "Trainees can view their own workout_trainees" ON workout_trainees;
