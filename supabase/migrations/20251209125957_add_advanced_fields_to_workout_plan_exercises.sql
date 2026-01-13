/*
  # הוספת שדות מתקדמים לתרגילים בתוכנית אימון

  1. שינויים
    - הוספת שדות משקל יעד, RPE, ציוד
    - הוספת תמיכה בסופר-סט ודרופ-סט
    - הוספת שדה failure (כשל שרירי)
    
  2. שדות חדשים
    - target_weight: משקל יעד לתרגיל
    - target_rpe: RPE יעד
    - equipment_id: ציוד מומלץ
    - set_type: סוג הסט (regular/superset/dropset)
    - failure: כשל שרירי
    - superset_exercise_id: תרגיל לסופר-סט
    - superset_weight: משקל לתרגיל סופר-סט
    - superset_reps: חזרות לתרגיל סופר-סט
    - superset_rpe: RPE לתרגיל סופר-סט
    - superset_equipment_id: ציוד לתרגיל סופר-סט
    - superset_dropset_weight: משקל דרופ-סט לסופר-סט
    - superset_dropset_reps: חזרות דרופ-סט לסופר-סט
    - dropset_weight: משקל דרופ-סט
    - dropset_reps: חזרות דרופ-סט
*/

-- הוספת שדות משקל ו-RPE יעד
ALTER TABLE workout_plan_day_exercises
ADD COLUMN IF NOT EXISTS target_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS target_rpe INTEGER CHECK (target_rpe >= 1 AND target_rpe <= 10);

-- הוספת ציוד
ALTER TABLE workout_plan_day_exercises
ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL;

-- הוספת סוג סט וכשל
ALTER TABLE workout_plan_day_exercises
ADD COLUMN IF NOT EXISTS set_type TEXT DEFAULT 'regular' CHECK (set_type IN ('regular', 'superset', 'dropset')),
ADD COLUMN IF NOT EXISTS failure BOOLEAN DEFAULT false;

-- הוספת שדות סופר-סט
ALTER TABLE workout_plan_day_exercises
ADD COLUMN IF NOT EXISTS superset_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS superset_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS superset_reps INTEGER,
ADD COLUMN IF NOT EXISTS superset_rpe INTEGER CHECK (superset_rpe >= 1 AND superset_rpe <= 10),
ADD COLUMN IF NOT EXISTS superset_equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS superset_dropset_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS superset_dropset_reps INTEGER;

-- הוספת שדות דרופ-סט
ALTER TABLE workout_plan_day_exercises
ADD COLUMN IF NOT EXISTS dropset_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS dropset_reps INTEGER;

-- יצירת אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_equipment ON workout_plan_day_exercises(equipment_id);
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_superset_exercise ON workout_plan_day_exercises(superset_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_superset_equipment ON workout_plan_day_exercises(superset_equipment_id);
