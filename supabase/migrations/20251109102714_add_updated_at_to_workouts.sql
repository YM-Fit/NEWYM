/*
  # הוספת עמודת updated_at לטבלת workouts

  1. שינויים
    - הוספת עמודה `updated_at` לטבלת `workouts`
    - ברירת מחדל: created_at (לאימונים קיימים)
    - מתעדכנת אוטומטית בכל עדכון

  2. תיקון
    - פותר שגיאה "Could not find the 'updated_at' column"
*/

-- הוסף עמודת updated_at
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- עדכן אימונים קיימים
UPDATE workouts 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- הוסף trigger לעדכון אוטומטי
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;

CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON workouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN workouts.updated_at IS 'תאריך ושעת העדכון האחרון של האימון';
