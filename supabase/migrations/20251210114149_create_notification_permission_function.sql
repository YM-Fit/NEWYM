/*
  # יצירת פונקציה לבדיקת הרשאות הכנסת התראות
  
  ## הבעיה
  PostgreSQL policies עם ambiguity בשמות עמודות לא עובדים
  המערכת מוסיפה prefix של שם הטבלה בצורה לא נכונה
  
  ## הפתרון
  יצירת פונקציה עזר שמקבלת פרמטרים ברורים
  ובודקת אם המשתמש המחובר רשאי ליצור התראה
  
  ## פרמטרים
  - p_trainee_id: ה-ID של המתאמן שעליו ההתראה
  - p_trainer_id: ה-ID של המאמן שיקבל את ההתראה
  
  ## החזרה
  - true אם המשתמש המחובר הוא המתאמן והמאמן נכון
  - false אחרת
*/

-- יצירת פונקציה לבדיקת הרשאות
CREATE OR REPLACE FUNCTION can_trainee_create_notification(
  p_trainee_id uuid,
  p_trainer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- בדיקה שהמשתמש המחובר הוא המתאמן
  -- והמאמן הוא המאמן של המתאמן
  RETURN EXISTS (
    SELECT 1
    FROM trainee_auth ta
    JOIN trainees t ON t.id = ta.trainee_id
    WHERE ta.auth_user_id = auth.uid()
      AND t.id = p_trainee_id
      AND t.trainer_id = p_trainer_id
  );
END;
$$;

-- מחיקת ה-policy הקודם
DROP POLICY IF EXISTS "מתאמנים יכולים ליצור התראות למאמן" ON trainer_notifications;

-- יצירת policy חדש שמשתמש בפונקציה
CREATE POLICY "מתאמנים יכולים ליצור התראות למאמן"
  ON trainer_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    can_trainee_create_notification(trainee_id, trainer_id)
  );
