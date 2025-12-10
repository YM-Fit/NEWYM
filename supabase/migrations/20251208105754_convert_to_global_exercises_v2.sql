/*
  # Convert to Global Exercises System

  This migration converts the system from trainer-specific muscle groups and exercises
  to a global shared database that all trainers use.

  ## Changes Made

  1. **Modify Schema**
     - Make muscle_groups.trainer_id nullable (NULL = global)
     - Update RLS policies to allow access to global exercises (trainer_id IS NULL)
  
  2. **Delete All Existing Data**
     - Removes all exercises (cascades to workout_exercises)
     - Removes all muscle groups
  
  3. **Create Global Muscle Groups** (trainer_id = NULL)
     - חזה (Chest)
     - גב (Back)
     - כתפיים (Shoulders)
     - רגליים (Legs)
     - דו ראשי / יד קדמית (Biceps)
     - תלת ראשי / יד אחורית (Triceps)
     - בטן וליבה (Abs/Core)
     - עכוז (Glutes)

  4. **Create Global Exercises**
     - 6 chest exercises
     - 7 back exercises
     - 6 shoulder exercises
     - 7 leg exercises
     - 4 biceps exercises
     - 4 triceps exercises
     - 5 abs exercises
     - 4 glutes exercises

  ## Security
     - RLS policies updated to allow all trainers to read global exercises
     - Trainers can still create their own custom exercises
*/

-- Step 1: Modify schema - make trainer_id nullable
ALTER TABLE muscle_groups ALTER COLUMN trainer_id DROP NOT NULL;

-- Step 2: Update RLS policies for muscle_groups to include global (trainer_id IS NULL)
DROP POLICY IF EXISTS "מאמנים יכולים לראות את קבוצות השריר שלהם" ON muscle_groups;
CREATE POLICY "מאמנים יכולים לראות קבוצות שריר"
  ON muscle_groups FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid() OR trainer_id IS NULL);

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף קבוצות שריר" ON muscle_groups;
CREATE POLICY "מאמנים יכולים להוסיף קבוצות שריר"
  ON muscle_groups FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן קבוצות שריר" ON muscle_groups;
CREATE POLICY "מאמנים יכולים לעדכן קבוצות שריר שלהם"
  ON muscle_groups FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS "מאמנים יכולים למחוק קבוצות שריר" ON muscle_groups;
CREATE POLICY "מאמנים יכולים למחוק קבוצות שריר שלהם"
  ON muscle_groups FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- Step 3: Update RLS policies for exercises to include global
DROP POLICY IF EXISTS "מאמנים יכולים לראות תרגילים של קבוצות השריר שלהם" ON exercises;
CREATE POLICY "מאמנים יכולים לראות תרגילים"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id
      AND (muscle_groups.trainer_id = auth.uid() OR muscle_groups.trainer_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף תרגילים" ON exercises;
CREATE POLICY "מאמנים יכולים להוסיף תרגילים"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id
      AND muscle_groups.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן תרגילים" ON exercises;
CREATE POLICY "מאמנים יכולים לעדכן תרגילים שלהם"
  ON exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id
      AND muscle_groups.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id
      AND muscle_groups.trainer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים למחוק תרגילים" ON exercises;
CREATE POLICY "מאמנים יכולים למחוק תרגילים שלהם"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id
      AND muscle_groups.trainer_id = auth.uid()
    )
  );

-- Step 4: Delete all existing exercises (cascades to workout_exercises)
DELETE FROM exercises;

-- Step 5: Delete all existing muscle groups
DELETE FROM muscle_groups;

-- Step 6: Create global muscle groups (trainer_id = NULL means global)
INSERT INTO muscle_groups (id, trainer_id, name) VALUES
  (gen_random_uuid(), NULL, 'חזה'),
  (gen_random_uuid(), NULL, 'גב'),
  (gen_random_uuid(), NULL, 'כתפיים'),
  (gen_random_uuid(), NULL, 'רגליים'),
  (gen_random_uuid(), NULL, 'דו ראשי (יד קדמית)'),
  (gen_random_uuid(), NULL, 'תלת ראשי (יד אחורית)'),
  (gen_random_uuid(), NULL, 'בטן וליבה'),
  (gen_random_uuid(), NULL, 'עכוז');

-- Step 7: Create global exercises
DO $$
DECLARE
  chest_id uuid;
  back_id uuid;
  shoulders_id uuid;
  legs_id uuid;
  biceps_id uuid;
  triceps_id uuid;
  abs_id uuid;
  glutes_id uuid;
BEGIN
  -- Get muscle group IDs
  SELECT id INTO chest_id FROM muscle_groups WHERE name = 'חזה' AND trainer_id IS NULL;
  SELECT id INTO back_id FROM muscle_groups WHERE name = 'גב' AND trainer_id IS NULL;
  SELECT id INTO shoulders_id FROM muscle_groups WHERE name = 'כתפיים' AND trainer_id IS NULL;
  SELECT id INTO legs_id FROM muscle_groups WHERE name = 'רגליים' AND trainer_id IS NULL;
  SELECT id INTO biceps_id FROM muscle_groups WHERE name = 'דו ראשי (יד קדמית)' AND trainer_id IS NULL;
  SELECT id INTO triceps_id FROM muscle_groups WHERE name = 'תלת ראשי (יד אחורית)' AND trainer_id IS NULL;
  SELECT id INTO abs_id FROM muscle_groups WHERE name = 'בטן וליבה' AND trainer_id IS NULL;
  SELECT id INTO glutes_id FROM muscle_groups WHERE name = 'עכוז' AND trainer_id IS NULL;

  -- חזה (Chest) - 6 exercises
  INSERT INTO exercises (muscle_group_id, name) VALUES
    (chest_id, 'לחיצת חזה כנגד מוט'),
    (chest_id, 'לחיצת חזה בשיפוע חיובי'),
    (chest_id, 'לחיצת חזה כנגד משקולות יד'),
    (chest_id, 'פרפר במכונה'),
    (chest_id, 'קרוס אובר כבלים עליון'),
    (chest_id, 'מקבילים');

  -- גב (Back) - 7 exercises
  INSERT INTO exercises (muscle_group_id, name) VALUES
    (back_id, 'מתח'),
    (back_id, 'פולי עליון אחיזה רחבה'),
    (back_id, 'חתירה כנגד מוט בהטיית גו'),
    (back_id, 'חתירה כבלים בישיבה'),
    (back_id, 'מסור (חתירה יד אחת)'),
    (back_id, 'דדליפט קלאסי'),
    (back_id, 'פשיטת גו');

  -- כתפיים (Shoulders) - 6 exercises
  INSERT INTO exercises (muscle_group_id, name) VALUES
    (shoulders_id, 'לחיצת כתפיים כנגד מוט'),
    (shoulders_id, 'לחיצת כתפיים משקולות יד'),
    (shoulders_id, 'הרחקה לצדדים'),
    (shoulders_id, 'כפיפה מלפנים'),
    (shoulders_id, 'חתירה אנכית'),
    (shoulders_id, 'פייס פול');

  -- רגליים (Legs) - 7 exercises
  INSERT INTO exercises (muscle_group_id, name) VALUES
    (legs_id, 'סקוואט'),
    (legs_id, 'לחיצת רגליים'),
    (legs_id, 'מכרעים'),
    (legs_id, 'פשיטת ברכיים במכונה'),
    (legs_id, 'כפיפת ברכיים במכונה'),
    (legs_id, 'דדליפט רומני'),
    (legs_id, 'תאומים בעמידה');

  -- יד קדמית (Biceps) - 4 exercises
  INSERT INTO exercises (muscle_group_id, name) VALUES
    (biceps_id, 'כפיפת מרפקים כנגד מוט'),
    (biceps_id, 'כפיפת מרפקים משקולות יד'),
    (biceps_id, 'כפיפת מרפקים פטישים'),
    (biceps_id, 'כפיפת מרפקים בכיסא כומר');

  -- יד אחורית (Triceps) - 4 exercises
  INSERT INTO exercises (muscle_group_id, name) VALUES
    (triceps_id, 'פשיטת מרפקים כבל עליון'),
    (triceps_id, 'לחיצת חזה אחיזה צרה'),
    (triceps_id, 'לחיצה צרפתית'),
    (triceps_id, 'פשיטה מאחורי הראש');

  -- בטן (Abs) - 5 exercises
  INSERT INTO exercises (muscle_group_id, name) VALUES
    (abs_id, 'כפיפות בטן'),
    (abs_id, 'פלאנק'),
    (abs_id, 'הנפות רגליים בתלייה'),
    (abs_id, 'גלגל בטן'),
    (abs_id, 'כפיפות בטן בשיפוע שלילי');

  -- עכוז (Glutes) - 4 exercises
  INSERT INTO exercises (muscle_group_id, name) VALUES
    (glutes_id, 'היפ תראסט'),
    (glutes_id, 'גשר ירכיים'),
    (glutes_id, 'היפ אבדקשן'),
    (glutes_id, 'קיקבק בכבל');

END $$;
