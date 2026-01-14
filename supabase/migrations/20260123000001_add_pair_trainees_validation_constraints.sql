/*
  # הוספת ולידציה למתאמנים זוגיים
  
  הוספת constraints לוודא שכאשר is_pair = true, כל השדות הנדרשים מלאים
  והוספת ולידציה למדידות ואימונים של מתאמנים זוגיים
*/

-- Constraint לוודא שמתאמן זוגי מכיל את כל הנתונים הנדרשים
ALTER TABLE trainees DROP CONSTRAINT IF EXISTS check_pair_complete;
ALTER TABLE trainees ADD CONSTRAINT check_pair_complete 
  CHECK (
    (is_pair = false) OR 
    (is_pair = true AND 
     pair_name_1 IS NOT NULL AND 
     pair_name_2 IS NOT NULL AND
     pair_phone_1 IS NOT NULL AND
     pair_phone_2 IS NOT NULL AND
     pair_height_1 IS NOT NULL AND
     pair_height_2 IS NOT NULL AND
     pair_height_1 > 0 AND
     pair_height_2 > 0 AND
     pair_height_1 <= 250 AND
     pair_height_2 <= 250)
  );

-- Constraint לוודא שכאשר is_pair = false, כל השדות הזוגיים הם NULL
ALTER TABLE trainees DROP CONSTRAINT IF EXISTS check_pair_fields_null_when_not_pair;
ALTER TABLE trainees ADD CONSTRAINT check_pair_fields_null_when_not_pair
  CHECK (
    (is_pair = true) OR
    (is_pair = false AND
     pair_name_1 IS NULL AND
     pair_name_2 IS NULL AND
     pair_phone_1 IS NULL AND
     pair_phone_2 IS NULL AND
     pair_email_1 IS NULL AND
     pair_email_2 IS NULL AND
     pair_gender_1 IS NULL AND
     pair_gender_2 IS NULL AND
     pair_birth_date_1 IS NULL AND
     pair_birth_date_2 IS NULL AND
     pair_height_1 IS NULL AND
     pair_height_2 IS NULL)
  );

-- Function לבדיקה אם מתאמן הוא זוגי
CREATE OR REPLACE FUNCTION is_pair_trainee(trainee_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trainees 
    WHERE id = trainee_id_param AND is_pair = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Constraint לוודא שמדידה למתאמן זוגי כוללת pair_member
ALTER TABLE measurements DROP CONSTRAINT IF EXISTS check_pair_member_for_pair_trainee;
ALTER TABLE measurements ADD CONSTRAINT check_pair_member_for_pair_trainee
  CHECK (
    -- אם המתאמן לא זוגי, pair_member חייב להיות NULL
    (NOT is_pair_trainee(trainee_id) AND pair_member IS NULL) OR
    -- אם המתאמן זוגי, pair_member חייב להיות 'member_1' או 'member_2'
    (is_pair_trainee(trainee_id) AND pair_member IN ('member_1', 'member_2'))
  );

-- הערה: Constraint על workout_exercises דורש join מורכב יותר
-- נשתמש ב-trigger במקום זה

-- Trigger function לוודא ש-workout_exercises למתאמן זוגי כולל pair_member
CREATE OR REPLACE FUNCTION check_workout_exercise_pair_member()
RETURNS TRIGGER AS $$
BEGIN
  -- בדוק אם המתאמן הוא זוגי
  IF EXISTS (SELECT 1 FROM trainees WHERE id = NEW.trainee_id AND is_pair = true) THEN
    -- אם המתאמן זוגי, pair_member חייב להיות 'member_1' או 'member_2'
    IF NEW.pair_member IS NULL OR NEW.pair_member NOT IN ('member_1', 'member_2') THEN
      RAISE EXCEPTION 'workout_exercises למתאמן זוגי חייב לכלול pair_member (member_1 או member_2)';
    END IF;
  ELSE
    -- אם המתאמן לא זוגי, pair_member חייב להיות NULL
    IF NEW.pair_member IS NOT NULL THEN
      RAISE EXCEPTION 'workout_exercises למתאמן לא זוגי לא יכול לכלול pair_member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger אם קיים
DROP TRIGGER IF EXISTS trigger_check_workout_exercise_pair_member ON workout_exercises;

-- יצירת trigger
CREATE TRIGGER trigger_check_workout_exercise_pair_member
  BEFORE INSERT OR UPDATE ON workout_exercises
  FOR EACH ROW
  EXECUTE FUNCTION check_workout_exercise_pair_member();
