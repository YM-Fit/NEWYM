/*
  # הוספת הרשאות כתיבה למתאמנים
  
  1. פוליסיות חדשות
    - מתאמנים יכולים להוסיף מדידות
    - מתאמנים יכולים להוסיף ולעדכן יומן יומי
    - מתאמנים יכולים לנהל ארוחות (להוסיף, לעדכן, למחוק)
    - מתאמנים יכולים ליצור התראות למאמן
  
  2. פונקציות עזר
    - `is_trainee_owner` - מוודא שהמשתמש הוא המתאמן הנכון
    - `get_trainer_id_for_trainee` - מקבלת את ה-trainer_id עבור מתאמן
  
  3. הערות חשובות
    - כל הפוליסיות משתמשות ב-`is_trainee_owner` כדי לוודא שהמתאמן גש רק לנתונים שלו
    - התראות נוצרות רק למאמן המתאים של המתאמן
*/

-- יצירת הפונקציה is_trainee_owner אם היא לא קיימת
CREATE OR REPLACE FUNCTION is_trainee_owner(check_trainee_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM trainee_auth 
    WHERE trainee_id = check_trainee_id 
      AND auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- מתאמנים יכולים להוסיף מדידות
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'measurements' 
    AND policyname = 'מתאמנים יכולים להוסיף מדידות'
  ) THEN
    CREATE POLICY "מתאמנים יכולים להוסיף מדידות"
      ON measurements FOR INSERT TO authenticated
      WITH CHECK (is_trainee_owner(trainee_id));
  END IF;
END $$;

-- מתאמנים יכולים להוסיף יומן יומי
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_log' 
    AND policyname = 'מתאמנים יכולים להוסיף יומן יומי'
  ) THEN
    CREATE POLICY "מתאמנים יכולים להוסיף יומן יומי"
      ON daily_log FOR INSERT TO authenticated
      WITH CHECK (is_trainee_owner(trainee_id));
  END IF;
END $$;

-- מתאמנים יכולים לעדכן יומן יומי
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_log' 
    AND policyname = 'מתאמנים יכולים לעדכן יומן יומי'
  ) THEN
    CREATE POLICY "מתאמנים יכולים לעדכן יומן יומי"
      ON daily_log FOR UPDATE TO authenticated
      USING (is_trainee_owner(trainee_id))
      WITH CHECK (is_trainee_owner(trainee_id));
  END IF;
END $$;

-- מתאמנים יכולים להוסיף ארוחות
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meals' 
    AND policyname = 'מתאמנים יכולים להוסיף ארוחות'
  ) THEN
    CREATE POLICY "מתאמנים יכולים להוסיף ארוחות"
      ON meals FOR INSERT TO authenticated
      WITH CHECK (is_trainee_owner(trainee_id));
  END IF;
END $$;

-- מתאמנים יכולים לעדכן ארוחות
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meals' 
    AND policyname = 'מתאמנים יכולים לעדכן ארוחות'
  ) THEN
    CREATE POLICY "מתאמנים יכולים לעדכן ארוחות"
      ON meals FOR UPDATE TO authenticated
      USING (is_trainee_owner(trainee_id))
      WITH CHECK (is_trainee_owner(trainee_id));
  END IF;
END $$;

-- מתאמנים יכולים למחוק ארוחות
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meals' 
    AND policyname = 'מתאמנים יכולים למחוק ארוחות'
  ) THEN
    CREATE POLICY "מתאמנים יכולים למחוק ארוחות"
      ON meals FOR DELETE TO authenticated
      USING (is_trainee_owner(trainee_id));
  END IF;
END $$;

-- פונקציה עזר לקבלת trainer_id עבור מתאמן
CREATE OR REPLACE FUNCTION get_trainer_id_for_trainee(check_trainee_id uuid)
RETURNS uuid AS $$
  SELECT trainer_id FROM trainees WHERE id = check_trainee_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- מתאמנים יכולים ליצור התראות למאמן
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trainer_notifications' 
    AND policyname = 'מתאמנים יכולים ליצור התראות למאמן'
  ) THEN
    CREATE POLICY "מתאמנים יכולים ליצור התראות למאמן"
      ON trainer_notifications FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM trainee_auth WHERE auth_user_id = auth.uid())
        AND trainer_id = get_trainer_id_for_trainee(
          (SELECT trainee_id FROM trainee_auth WHERE auth_user_id = auth.uid() LIMIT 1)
        )
      );
  END IF;
END $$;
