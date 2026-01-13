/*
  # תיקון policy ליצירת התראות - גישה פשוטה יותר
  
  ## הבעיה
  השימוש ב-`trainer_notifications.trainer_id` ב-policy לא עובד
  כי זה מנסה לגשת לשורה שעדיין לא קיימת
  
  ## הפתרון
  שתי בדיקות נפרדות ופשוטות:
  1. ה-trainee_id שמכניסים הוא של המשתמש המחובר
  2. ה-trainer_id שמכניסים הוא המאמן של המתאמן הזה
  
  ## אבטחה
  - מתאמן יכול ליצור התראה רק על עצמו
  - ההתראה הולכת רק למאמן שלו
*/

-- מחיקת ה-policy הקודם
DROP POLICY IF EXISTS "מתאמנים יכולים ליצור התראות למאמן" ON trainer_notifications;

-- יצירת policy עם לוגיקה פשוטה וברורה
CREATE POLICY "מתאמנים יכולים ליצור התראות למאמן"
  ON trainer_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- בדיקה 1: ה-trainee_id שייך למשתמש המחובר
    trainee_id IN (
      SELECT trainee_id 
      FROM trainee_auth 
      WHERE auth_user_id = auth.uid()
    )
    AND
    -- בדיקה 2: ה-trainer_id הוא המאמן של המתאמן
    trainer_id IN (
      SELECT trainer_id 
      FROM trainees 
      WHERE id = trainee_id
    )
  );
