/*
  # יצירת טבלה לתבניות תוכניות אימון של מאמנים
  
  ## תיאור
  טבלה זו מאפשרת למאמנים לשמור תבניות תוכניות אימון מותאמות אישית
  שניתן לטעון מאוחר יותר בעת יצירת תוכניות חדשות
  
  ## טבלה חדשה
  - `workout_plan_templates` - תבניות תוכניות אימון
    - `id` (uuid, מפתח ראשי)
    - `trainer_id` (uuid, קישור למאמן)
    - `name` (text, שם התבנית)
    - `description` (text, תיאור)
    - `days` (jsonb, נתוני הימים והתרגילים)
    - `created_at` (timestamptz)
  
  ## אבטחה
  - מאמנים יכולים לראות ולערוך רק תבניות משלהם
  - RLS מופעל עם policies מתאימים
*/

-- יצירת הטבלה
CREATE TABLE IF NOT EXISTS workout_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) > 0),
  description text,
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- הוספת אינדקס
CREATE INDEX IF NOT EXISTS idx_workout_plan_templates_trainer_id 
  ON workout_plan_templates(trainer_id);

-- הפעלת RLS
ALTER TABLE workout_plan_templates ENABLE ROW LEVEL SECURITY;

-- Policy לקריאה - מאמן רואה רק תבניות משלו
CREATE POLICY "מאמנים רואים תבניות משלהם"
  ON workout_plan_templates
  FOR SELECT
  TO authenticated
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE id = auth.uid()
    )
  );

-- Policy ליצירה - מאמן יכול ליצור תבניות
CREATE POLICY "מאמנים יכולים ליצור תבניות"
  ON workout_plan_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id IN (
      SELECT id FROM trainers WHERE id = auth.uid()
    )
  );

-- Policy לעדכון - מאמן יכול לעדכן תבניות משלו
CREATE POLICY "מאמנים יכולים לעדכן תבניות משלהם"
  ON workout_plan_templates
  FOR UPDATE
  TO authenticated
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    trainer_id IN (
      SELECT id FROM trainers WHERE id = auth.uid()
    )
  );

-- Policy למחיקה - מאמן יכול למחוק תבניות משלו
CREATE POLICY "מאמנים יכולים למחוק תבניות משלהם"
  ON workout_plan_templates
  FOR DELETE
  TO authenticated
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE id = auth.uid()
    )
  );
