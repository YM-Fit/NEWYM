/*
  # תמיכה במתאמנים זוגיים
  
  1. שינויים בטבלת trainees
    - הוספת שדה `is_pair` (boolean) - האם זה מתאמן זוגי
    - הוספת שדה `pair_name_1` (text) - שם המתאמן הראשון בזוג
    - הוספת שדה `pair_name_2` (text) - שם המתאמן השני בזוג
    - הוספת שדה `pair_phone_1` (text) - טלפון מתאמן ראשון
    - הוספת שדה `pair_phone_2` (text) - טלפון מתאמן שני
    - הוספת שדה `pair_email_1` (text) - אימייל מתאמן ראשון
    - הוספת שדה `pair_email_2` (text) - אימייל מתאמן שני
    - הוספת שדה `pair_gender_1` (text) - מין מתאמן ראשון
    - הוספת שדה `pair_gender_2` (text) - מין מתאמן שני
    - הוספת שדה `pair_birth_date_1` (date) - תאריך לידה מתאמן ראשון
    - הוספת שדה `pair_birth_date_2` (date) - תאריך לידה מתאמן שני
    - הוספת שדה `pair_height_1` (numeric) - גובה מתאמן ראשון
    - הוספת שדה `pair_height_2` (numeric) - גובה מתאמן שני
    
  2. שינויים בטבלת measurements
    - הוספת שדה `pair_member` (text) - 'member_1' או 'member_2' (לזוגות)
    
  3. שינויים בטבלת workout_exercises
    - הוספת שדה `pair_member` (text) - 'member_1' או 'member_2' (לזוגות)
    
  4. הערות
    - כאשר is_pair = true, השדה full_name יכיל את השם המשולב (לדוגמה: "שרון ושירלי")
    - כאשר is_pair = false, כל השדות pair_* יהיו NULL
    - בגרפים ומדידות - כל אחת מהזוג תקבל רשומות נפרדות עם pair_member
*/

-- הוספת שדות חדשים לטבלת trainees
ALTER TABLE trainees 
  ADD COLUMN IF NOT EXISTS is_pair boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pair_name_1 text,
  ADD COLUMN IF NOT EXISTS pair_name_2 text,
  ADD COLUMN IF NOT EXISTS pair_phone_1 text,
  ADD COLUMN IF NOT EXISTS pair_phone_2 text,
  ADD COLUMN IF NOT EXISTS pair_email_1 text,
  ADD COLUMN IF NOT EXISTS pair_email_2 text,
  ADD COLUMN IF NOT EXISTS pair_gender_1 text,
  ADD COLUMN IF NOT EXISTS pair_gender_2 text,
  ADD COLUMN IF NOT EXISTS pair_birth_date_1 date,
  ADD COLUMN IF NOT EXISTS pair_birth_date_2 date,
  ADD COLUMN IF NOT EXISTS pair_height_1 numeric,
  ADD COLUMN IF NOT EXISTS pair_height_2 numeric;

-- הוספת CHECK constraints לשדות הזוג
ALTER TABLE trainees DROP CONSTRAINT IF EXISTS check_pair_gender_1;
ALTER TABLE trainees ADD CONSTRAINT check_pair_gender_1 
  CHECK (pair_gender_1 IS NULL OR pair_gender_1 IN ('male', 'female'));

ALTER TABLE trainees DROP CONSTRAINT IF EXISTS check_pair_gender_2;
ALTER TABLE trainees ADD CONSTRAINT check_pair_gender_2 
  CHECK (pair_gender_2 IS NULL OR pair_gender_2 IN ('male', 'female'));

-- הוספת שדה pair_member לטבלת measurements
ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS pair_member text;

ALTER TABLE measurements DROP CONSTRAINT IF EXISTS check_pair_member_measurements;
ALTER TABLE measurements ADD CONSTRAINT check_pair_member_measurements
  CHECK (pair_member IS NULL OR pair_member IN ('member_1', 'member_2'));

-- הוספת שדה pair_member לטבלת workout_exercises
ALTER TABLE workout_exercises
  ADD COLUMN IF NOT EXISTS pair_member text;

ALTER TABLE workout_exercises DROP CONSTRAINT IF EXISTS check_pair_member_exercises;
ALTER TABLE workout_exercises ADD CONSTRAINT check_pair_member_exercises
  CHECK (pair_member IS NULL OR pair_member IN ('member_1', 'member_2'));

-- יצירת אינדקס לחיפושים מהירים
CREATE INDEX IF NOT EXISTS idx_trainees_is_pair ON trainees(is_pair);
CREATE INDEX IF NOT EXISTS idx_measurements_pair_member ON measurements(trainee_id, pair_member);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_pair_member ON workout_exercises(trainee_id, pair_member);
