/*
  # תיקון policy להוספת התראות - גרסה 2

  ## שינויים
  1. מחיקת ה-policy הקודם
  2. יצירת policy חדש עם תחביר נכון (ללא trainer_notifications prefix)

  ## אבטחה
  - מתאמנים מחוברים יכולים ליצור התראות למאמן שלהם בלבד
  - בדיקה מתבצעת באמצעות trainee_auth.auth_user_id = auth.uid()
*/

-- מחיקת ה-policy הישן
DROP POLICY IF EXISTS "מתאמנים יכולים ליצור התראות למאמן" ON trainer_notifications;

-- יצירת policy חדש עם תחביר נכון
CREATE POLICY "מתאמנים יכולים ליצור התראות למאמן"
  ON trainer_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM trainee_auth ta 
      JOIN trainees t ON t.id = ta.trainee_id
      WHERE ta.auth_user_id = auth.uid() 
      AND t.trainer_id = trainer_id
    )
  );
