/*
  # תיקון policy להוספת התראות למאמנים
  
  ## הבעיה
  ה-INSERT policy הנוכחי היה עם שגיאת תחביר:
  `AND t.trainer_id = trainer_id` משווה את השדה לעצמו
  
  ## הפתרון
  תיקון התחביר כך שיבדוק נכון:
  - המתאמן מחובר (auth.uid)
  - המתאמן קיים ב-trainee_auth
  - ה-trainer_id של המתאמן תואם ל-trainer_id בהתראה החדשה
  - ה-trainee_id בהתראה החדשה תואם את ה-trainee_id
  
  ## אבטחה
  - מתאמנים יכולים ליצור התראות רק למאמן שלהם
  - מתאמנים יכולים ליצור התראות רק על עצמם
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
      AND t.id = trainer_notifications.trainee_id
      AND t.trainer_id = trainer_notifications.trainer_id
    )
  );
