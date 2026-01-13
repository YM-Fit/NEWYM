/*
  # הוספת הרשאות למאמנים לטבלת התראות

  ## שינויים
  1. הוספת policy למאמנים לצפייה בהתראות שלהם (SELECT)
  2. הוספת policy למאמנים לעדכון התראות (UPDATE) - לסימון כנקראו
  3. הוספת policy למאמנים למחיקת התראות שלהם (DELETE)

  ## אבטחה
  - מאמנים יכולים לראות רק התראות ששייכות אליהם (trainer_id = auth.uid())
  - מאמנים יכולים לעדכן ולמחוק רק את ההתראות שלהם
*/

-- מאמנים יכולים לצפות בהתראות שלהם
CREATE POLICY "Trainers can view own notifications"
  ON trainer_notifications
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

-- מאמנים יכולים לעדכן התראות שלהם (לסמן כנקראו)
CREATE POLICY "Trainers can update own notifications"
  ON trainer_notifications
  FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- מאמנים יכולים למחוק התראות שלהם
CREATE POLICY "Trainers can delete own notifications"
  ON trainer_notifications
  FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());
