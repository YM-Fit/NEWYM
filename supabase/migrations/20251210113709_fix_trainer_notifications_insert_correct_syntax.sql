/*
  # תיקון סופי ל-policy של הוספת התראות
  
  ## הבעיה
  ב-WITH CHECK של INSERT policy, השתמשתי ב-`trainer_notifications.trainee_id`
  אבל צריך להתייחס לשדות ישירות (בלי prefix של שם הטבלה)
  
  ## הפתרון
  שימוש בשמות השדות ישירות: `trainee_id` ו-`trainer_id`
  אלה מתייחסים לערכים שמנסים להכניס
  
  ## אבטחה
  - מתאמן יכול ליצור התראה רק אם הוא מחובר
  - התראה חייבת להיות על המתאמן עצמו (trainee_id)
  - התראה חייבת להיות למאמן שלו (trainer_id)
*/

-- מחיקת ה-policy הקודם
DROP POLICY IF EXISTS "מתאמנים יכולים ליצור התראות למאמן" ON trainer_notifications;

-- יצירת policy עם התחביר הנכון
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
      AND t.id = trainee_id
      AND t.trainer_id = trainer_id
    )
  );
