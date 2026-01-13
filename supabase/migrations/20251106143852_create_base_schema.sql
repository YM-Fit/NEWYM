/*
  # יצירת מבנה בסיס נתונים למערכת YM Coach

  ## טבלאות חדשות
  
  ### 1. `trainers` - מאמנים
    - `id` (uuid, primary key)
    - `email` (text, unique)
    - `full_name` (text)
    - `created_at` (timestamp)

  ### 2. `trainees` - מתאמנים
    - `id` (uuid, primary key) 
    - `trainer_id` (uuid, foreign key -> trainers)
    - `full_name` (text)
    - `phone` (text)
    - `email` (text)
    - `gender` (text: male/female)
    - `birth_date` (date)
    - `height` (numeric - בס״מ)
    - `status` (text: active/inactive/vacation/new)
    - `start_date` (date)
    - `notes` (text - הערות מאמן)
    - `created_at` (timestamp)

  ### 3. `muscle_groups` - קבוצות שריר
    - `id` (uuid, primary key)
    - `trainer_id` (uuid, foreign key)
    - `name` (text - שם הקבוצה בעברית)
    - `created_at` (timestamp)

  ### 4. `exercises` - תרגילים
    - `id` (uuid, primary key)
    - `muscle_group_id` (uuid, foreign key)
    - `name` (text - שם התרגיל בעברית)
    - `created_at` (timestamp)

  ### 5. `workouts` - אימונים
    - `id` (uuid, primary key)
    - `trainer_id` (uuid, foreign key)
    - `workout_date` (date)
    - `workout_type` (text: personal/pair)
    - `notes` (text)
    - `created_at` (timestamp)

  ### 6. `workout_trainees` - קישור מתאמנים לאימון
    - `id` (uuid, primary key)
    - `workout_id` (uuid, foreign key)
    - `trainee_id` (uuid, foreign key)

  ### 7. `workout_exercises` - תרגילים באימון
    - `id` (uuid, primary key)
    - `workout_id` (uuid, foreign key)
    - `trainee_id` (uuid, foreign key)
    - `exercise_id` (uuid, foreign key)
    - `order_index` (integer - סדר התרגיל)
    - `created_at` (timestamp)

  ### 8. `exercise_sets` - סטים של תרגיל
    - `id` (uuid, primary key)
    - `workout_exercise_id` (uuid, foreign key)
    - `set_number` (integer)
    - `weight` (numeric)
    - `reps` (integer)
    - `rpe` (numeric - 1-10)
    - `set_type` (text: regular/superset/dropset)
    - `superset_exercise_id` (uuid, nullable - אם זה סופר-סט)
    - `superset_weight` (numeric, nullable)
    - `superset_reps` (integer, nullable)
    - `dropset_weight` (numeric, nullable)
    - `dropset_reps` (integer, nullable)
    - `created_at` (timestamp)

  ### 9. `measurements` - מדידות ושקילות
    - `id` (uuid, primary key)
    - `trainee_id` (uuid, foreign key)
    - `measurement_date` (date)
    - `weight` (numeric - קילוגרמים)
    - `body_fat_percentage` (numeric)
    - `muscle_mass` (numeric)
    - `water_percentage` (numeric)
    - `visceral_fat` (numeric)
    - `bmi` (numeric)
    - `source` (text: tanita/manual)
    - `chest` (numeric - היקף חזה בס״מ)
    - `waist` (numeric - היקף מותניים)
    - `hips` (numeric - היקף ירכיים)
    - `right_arm` (numeric - היקף זרוע ימין)
    - `left_arm` (numeric - היקף זרוע שמאל)
    - `right_thigh` (numeric - היקף ירך ימין)
    - `left_thigh` (numeric - היקף ירך שמאל)
    - `notes` (text)
    - `created_at` (timestamp)

  ## אבטחה
  - הפעלת RLS על כל הטבלאות
  - מדיניות גישה: מאמן יכול לגשת רק לנתונים שלו
*/

-- יצירת טבלת מאמנים
CREATE TABLE IF NOT EXISTS trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות את הפרופיל שלהם"
  ON trainers FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "מאמנים יכולים לעדכן את הפרופיל שלהם"
  ON trainers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- יצירת טבלת מתאמנים
CREATE TABLE IF NOT EXISTS trainees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  gender text CHECK (gender IN ('male', 'female')),
  birth_date date,
  height numeric,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vacation', 'new')),
  start_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trainees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות את המתאמנים שלהם"
  ON trainees FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים להוסיף מתאמנים"
  ON trainees FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים לעדכן את המתאמנים שלהם"
  ON trainees FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים למחוק את המתאמנים שלהם"
  ON trainees FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- יצירת טבלת קבוצות שריר
CREATE TABLE IF NOT EXISTS muscle_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE muscle_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות את קבוצות השריר שלהם"
  ON muscle_groups FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים להוסיף קבוצות שריר"
  ON muscle_groups FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים לעדכן קבוצות שריר"
  ON muscle_groups FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים למחוק קבוצות שריר"
  ON muscle_groups FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- יצירת טבלת תרגילים
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muscle_group_id uuid REFERENCES muscle_groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות תרגילים של קבוצות השריר שלהם"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id
      AND muscle_groups.trainer_id = auth.uid()
    )
  );

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

CREATE POLICY "מאמנים יכולים לעדכן תרגילים"
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

CREATE POLICY "מאמנים יכולים למחוק תרגילים"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id
      AND muscle_groups.trainer_id = auth.uid()
    )
  );

-- יצירת טבלת אימונים
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES trainers(id) ON DELETE CASCADE NOT NULL,
  workout_date date DEFAULT CURRENT_DATE,
  workout_type text DEFAULT 'personal' CHECK (workout_type IN ('personal', 'pair')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות את האימונים שלהם"
  ON workouts FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים להוסיף אימונים"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים לעדכן אימונים"
  ON workouts FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "מאמנים יכולים למחוק אימונים"
  ON workouts FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- יצירת טבלת קישור מתאמנים לאימון
CREATE TABLE IF NOT EXISTS workout_trainees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  trainee_id uuid REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(workout_id, trainee_id)
);

ALTER TABLE workout_trainees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות קישורי מתאמנים-אימונים"
  ON workout_trainees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_trainees.workout_id
      AND workouts.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים להוסיף קישורי מתאמנים-אימונים"
  ON workout_trainees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_trainees.workout_id
      AND workouts.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים למחוק קישורי מתאמנים-אימונים"
  ON workout_trainees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_trainees.workout_id
      AND workouts.trainer_id = auth.uid()
    )
  );

-- יצירת טבלת תרגילים באימון
CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  trainee_id uuid REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות תרגילים באימונים שלהם"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים להוסיף תרגילים לאימונים"
  ON workout_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים לעדכן תרגילים באימונים"
  ON workout_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים למחוק תרגילים מאימונים"
  ON workout_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.trainer_id = auth.uid()
    )
  );

-- יצירת טבלת סטים
CREATE TABLE IF NOT EXISTS exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number integer NOT NULL,
  weight numeric DEFAULT 0,
  reps integer DEFAULT 0,
  rpe numeric CHECK (rpe >= 1 AND rpe <= 10),
  set_type text DEFAULT 'regular' CHECK (set_type IN ('regular', 'superset', 'dropset')),
  superset_exercise_id uuid REFERENCES exercises(id),
  superset_weight numeric,
  superset_reps integer,
  dropset_weight numeric,
  dropset_reps integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות סטים באימונים שלהם"
  ON exercise_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
      AND w.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים להוסיף סטים לאימונים"
  ON exercise_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
      AND w.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים לעדכן סטים באימונים"
  ON exercise_sets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
      AND w.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
      AND w.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים למחוק סטים מאימונים"
  ON exercise_sets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = exercise_sets.workout_exercise_id
      AND w.trainer_id = auth.uid()
    )
  );

-- יצירת טבלת מדידות
CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid REFERENCES trainees(id) ON DELETE CASCADE NOT NULL,
  measurement_date date DEFAULT CURRENT_DATE,
  weight numeric,
  body_fat_percentage numeric,
  muscle_mass numeric,
  water_percentage numeric,
  visceral_fat numeric,
  bmi numeric,
  source text DEFAULT 'manual' CHECK (source IN ('tanita', 'manual')),
  chest numeric,
  waist numeric,
  hips numeric,
  right_arm numeric,
  left_arm numeric,
  right_thigh numeric,
  left_thigh numeric,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "מאמנים יכולים לראות מדידות של המתאמנים שלהם"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים להוסיף מדידות"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים לעדכן מדידות"
  ON measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

CREATE POLICY "מאמנים יכולים למחוק מדידות"
  ON measurements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = measurements.trainee_id
      AND trainees.trainer_id = auth.uid()
    )
  );

-- יצירת אינדקסים לשיפור ביצועים
CREATE INDEX IF NOT EXISTS idx_trainees_trainer ON trainees(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainees_status ON trainees(status);
CREATE INDEX IF NOT EXISTS idx_workouts_trainer_date ON workouts(trainer_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_trainee_date ON measurements(trainee_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_muscle_groups_trainer ON muscle_groups(trainer_id);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_workout_exercise ON exercise_sets(workout_exercise_id);
