/*
  # תיקון policy להוספת מאמנים
  
  1. Security
    - הוספת policy חדש לאפשר למשתמשים חדשים להוסיף את עצמם לטבלת trainers
    - המשתמש יכול להוסיף רק את עצמו (id = auth.uid())
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trainers' 
    AND policyname = 'משתמשים יכולים להרשם כמאמנים'
  ) THEN
    CREATE POLICY "משתמשים יכולים להרשם כמאמנים"
      ON trainers
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
