/*
  # תיקון אחרון ל-policy של יצירת התראות
  
  ## הבעיה
  כשכותבים `trainee_id` ו-`trainer_id` ב-WITH CHECK,
  PostgreSQL מתבלבל באיזה שדה מדובר
  
  ## הפתרון
  שימוש בגישה ברורה יותר - לבדוק ש:
  1. המתאמן (trainee_id החדש) שייך למשתמש המחובר
  2. המאמן (trainer_id החדש) הוא באמת המאמן של המתאמן הזה
  
  ## אבטחה
  - רק מתאמנים מחוברים יכולים ליצור התראות
  - רק על עצמם ורק למאמן שלהם
*/

-- מחיקת ה-policy הישן
DROP POLICY IF EXISTS "מתאמנים יכולים ליצור התראות למאמן" ON trainer_notifications;

-- יצירת policy חדש עם לוגיקה ברורה
CREATE POLICY "מתאמנים יכולים ליצור התראות למאמן"
  ON trainer_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- בדיקה שה-trainee_id החדש שייך למשתמש המחובר
    -- וש-trainer_id החדש הוא המאמן של המתאמן
    trainee_id IN (
      SELECT ta.trainee_id
      FROM trainee_auth ta
      JOIN trainees t ON t.id = ta.trainee_id
      WHERE ta.auth_user_id = auth.uid()
        AND t.trainer_id = trainer_notifications.trainer_id
    )
  );
