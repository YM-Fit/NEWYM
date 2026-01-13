/*
  # Remove Trainee Workouts Policy

  1. Issue
    - The "Trainees can view their workouts" policy causes infinite recursion
    - Trainees don't use Supabase Auth (they use custom phone/password auth)
    - This policy is not applicable since trainees don't access the API directly with auth.uid()

  2. Solution
    - Remove the trainee policy from workouts table
    - Only trainers (who use Supabase Auth) need policies on workouts
    - Trainee data access is handled through the trainer's session
*/

-- מחיקת ה-policy שגורם לרקורסיה אינסופית
DROP POLICY IF EXISTS "Trainees can view their workouts" ON workouts;
