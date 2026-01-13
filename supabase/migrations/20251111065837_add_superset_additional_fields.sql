/*
  # הוספת שדות נוספים לסופר-סט
  
  1. שינויים
    - הוספת שדה superset_rpe לטבלת exercise_sets
    - הוספת שדה superset_equipment_id לטבלת exercise_sets
    - הוספת שדה superset_dropset_weight לטבלת exercise_sets
    - הוספת שדה superset_dropset_reps לטבלת exercise_sets
  
  2. תיאור
    - השדות החדשים מאפשרים להוסיף RPE, ציוד, ודרופ-סט גם לתרגיל השני בסופר-סט
    - כל השדות הם אופציונליים (nullable)
  
  3. אבטחה
    - RLS מוחל אוטומטית דרך הטבלה הקיימת
*/

-- הוספת שדות נוספים לסופר-סט
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercise_sets' AND column_name = 'superset_rpe'
  ) THEN
    ALTER TABLE exercise_sets ADD COLUMN superset_rpe numeric CHECK (superset_rpe >= 1 AND superset_rpe <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercise_sets' AND column_name = 'superset_equipment_id'
  ) THEN
    ALTER TABLE exercise_sets ADD COLUMN superset_equipment_id uuid REFERENCES equipment(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercise_sets' AND column_name = 'superset_dropset_weight'
  ) THEN
    ALTER TABLE exercise_sets ADD COLUMN superset_dropset_weight numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercise_sets' AND column_name = 'superset_dropset_reps'
  ) THEN
    ALTER TABLE exercise_sets ADD COLUMN superset_dropset_reps integer;
  END IF;
END $$;
