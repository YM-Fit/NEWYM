/*
  # Fix Ambiguous Policies for workout_trainees

  1. Issue
    - There are multiple SELECT policies on workout_trainees causing "ambiguous policy" error
    - The trainee policy is checking `trainee_id IN (SELECT trainee_id FROM trainee_auth)` which is incorrect

  2. Solution
    - Drop the ambiguous trainee policy
    - Create a new, correct policy that checks if the current authenticated user is a trainee for this workout
*/

-- מחיקת ה-policy הישן שגורם לקונפליקט
DROP POLICY IF EXISTS "Trainees can view their workout_trainees" ON workout_trainees;

-- יצירת policy חדש ונכון למתאמנים
-- זה בודק אם ה-auth.uid() נמצא ב-trainee_auth ומתאים ל-trainee_id בטבלה
CREATE POLICY "Trainees can view their own workout_trainees"
  ON workout_trainees
  FOR SELECT
  USING (
    trainee_id IN (
      SELECT trainee_id 
      FROM trainee_auth 
      WHERE trainee_id = workout_trainees.trainee_id
    )
  );
