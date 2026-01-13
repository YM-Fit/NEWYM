/*
  # Optimize All RLS Policies for Performance

  ## Changes Made

  Replace all `auth.uid()` calls with `(select auth.uid())` in RLS policies.
  This prevents re-evaluation of auth.uid() for each row, significantly improving query performance.

  ## Tables Updated
  - trainers (3 policies) - uses id directly
  - muscle_groups (4 policies) - references trainers.id
  - exercises (4 policies) - references muscle_groups -> trainers
  - trainees (4 policies) - references trainers.id
  - workouts (4 policies) - references trainers.id
  - workout_trainees (3 policies) - references workouts
  - workout_exercises (4 policies) - references workouts
  - exercise_sets (4 policies) - references workout_exercises -> workouts
  - measurements (4 policies) - references trainees

  Total: 34 policies optimized
*/

-- =====================================================
-- TRAINERS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "משתמשים יכולים להרשם כמאמנים" ON trainers;
CREATE POLICY "משתמשים יכולים להרשם כמאמנים"
  ON trainers FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "מאמנים יכולים לראות את הפרופיל שלהם" ON trainers;
CREATE POLICY "מאמנים יכולים לראות את הפרופיל שלהם"
  ON trainers FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן את הפרופיל שלהם" ON trainers;
CREATE POLICY "מאמנים יכולים לעדכן את הפרופיל שלהם"
  ON trainers FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- =====================================================
-- MUSCLE_GROUPS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "מאמנים יכולים לראות את קבוצות השרירים שלהם" ON muscle_groups;
CREATE POLICY "מאמנים יכולים לראות את קבוצות השרירים שלהם"
  ON muscle_groups FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף קבוצות שריר" ON muscle_groups;
CREATE POLICY "מאמנים יכולים להוסיף קבוצות שריר"
  ON muscle_groups FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן קבוצות שריר" ON muscle_groups;
CREATE POLICY "מאמנים יכולים לעדכן קבוצות שריר"
  ON muscle_groups FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים למחוק קבוצות שריר" ON muscle_groups;
CREATE POLICY "מאמנים יכולים למחוק קבוצות שריר"
  ON muscle_groups FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

-- =====================================================
-- EXERCISES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "מאמנים יכולים לראות תרגילים של קבוצות השרירים שלהם" ON exercises;
CREATE POLICY "מאמנים יכולים לראות תרגילים של קבוצות השרירים שלהם"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    muscle_group_id IN (
      SELECT id FROM muscle_groups WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף תרגילים" ON exercises;
CREATE POLICY "מאמנים יכולים להוסיף תרגילים"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    muscle_group_id IN (
      SELECT id FROM muscle_groups WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן תרגילים" ON exercises;
CREATE POLICY "מאמנים יכולים לעדכן תרגילים"
  ON exercises FOR UPDATE
  TO authenticated
  USING (
    muscle_group_id IN (
      SELECT id FROM muscle_groups WHERE trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    muscle_group_id IN (
      SELECT id FROM muscle_groups WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים למחוק תרגילים" ON exercises;
CREATE POLICY "מאמנים יכולים למחוק תרגילים"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    muscle_group_id IN (
      SELECT id FROM muscle_groups WHERE trainer_id = (select auth.uid())
    )
  );

-- =====================================================
-- TRAINEES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "מאמנים יכולים לראות את המתאמנים שלהם" ON trainees;
CREATE POLICY "מאמנים יכולים לראות את המתאמנים שלהם"
  ON trainees FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף מתאמנים" ON trainees;
CREATE POLICY "מאמנים יכולים להוסיף מתאמנים"
  ON trainees FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן את המתאמנים שלהם" ON trainees;
CREATE POLICY "מאמנים יכולים לעדכן את המתאמנים שלהם"
  ON trainees FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים למחוק את המתאמנים שלהם" ON trainees;
CREATE POLICY "מאמנים יכולים למחוק את המתאמנים שלהם"
  ON trainees FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

-- =====================================================
-- WORKOUTS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "מאמנים יכולים לראות את האימונים של המתאמנים שלהם" ON workouts;
CREATE POLICY "מאמנים יכולים לראות את האימונים של המתאמנים שלהם"
  ON workouts FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף אימונים" ON workouts;
CREATE POLICY "מאמנים יכולים להוסיף אימונים"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן אימונים" ON workouts;
CREATE POLICY "מאמנים יכולים לעדכן אימונים"
  ON workouts FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים למחוק אימונים" ON workouts;
CREATE POLICY "מאמנים יכולים למחוק אימונים"
  ON workouts FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

-- =====================================================
-- WORKOUT_TRAINEES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "מאמנים יכולים לראות קישורי מתאמנים לאימונים" ON workout_trainees;
CREATE POLICY "מאמנים יכולים לראות קישורי מתאמנים לאימונים"
  ON workout_trainees FOR SELECT
  TO authenticated
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף קישורי מתאמנים לאימונים" ON workout_trainees;
CREATE POLICY "מאמנים יכולים להוסיף קישורי מתאמנים לאימונים"
  ON workout_trainees FOR INSERT
  TO authenticated
  WITH CHECK (
    workout_id IN (
      SELECT id FROM workouts WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים למחוק קישורי מתאמנים מאימונים" ON workout_trainees;
CREATE POLICY "מאמנים יכולים למחוק קישורי מתאמנים מאימונים"
  ON workout_trainees FOR DELETE
  TO authenticated
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE trainer_id = (select auth.uid())
    )
  );

-- =====================================================
-- WORKOUT_EXERCISES TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "מאמנים יכולים לראות תרגילים באימונים שלהם" ON workout_exercises;
CREATE POLICY "מאמנים יכולים לראות תרגילים באימונים שלהם"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף תרגילים לאימונים" ON workout_exercises;
CREATE POLICY "מאמנים יכולים להוסיף תרגילים לאימונים"
  ON workout_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    workout_id IN (
      SELECT id FROM workouts WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן תרגילים באימונים" ON workout_exercises;
CREATE POLICY "מאמנים יכולים לעדכן תרגילים באימונים"
  ON workout_exercises FOR UPDATE
  TO authenticated
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    workout_id IN (
      SELECT id FROM workouts WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים למחוק תרגילים מאימונים" ON workout_exercises;
CREATE POLICY "מאמנים יכולים למחוק תרגילים מאימונים"
  ON workout_exercises FOR DELETE
  TO authenticated
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE trainer_id = (select auth.uid())
    )
  );

-- =====================================================
-- EXERCISE_SETS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "מאמנים יכולים לראות סטים באימונים שלהם" ON exercise_sets;
CREATE POLICY "מאמנים יכולים לראות סטים באימונים שלהם"
  ON exercise_sets FOR SELECT
  TO authenticated
  USING (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף סטים לאימונים" ON exercise_sets;
CREATE POLICY "מאמנים יכולים להוסיף סטים לאימונים"
  ON exercise_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן סטים באימונים" ON exercise_sets;
CREATE POLICY "מאמנים יכולים לעדכן סטים באימונים"
  ON exercise_sets FOR UPDATE
  TO authenticated
  USING (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים למחוק סטים מאימונים" ON exercise_sets;
CREATE POLICY "מאמנים יכולים למחוק סטים מאימונים"
  ON exercise_sets FOR DELETE
  TO authenticated
  USING (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.trainer_id = (select auth.uid())
    )
  );

-- =====================================================
-- MEASUREMENTS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "מאמנים יכולים לראות מדידות של המתאמנים שלהם" ON measurements;
CREATE POLICY "מאמנים יכולים לראות מדידות של המתאמנים שלהם"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    trainee_id IN (
      SELECT id FROM trainees WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף מדידות" ON measurements;
CREATE POLICY "מאמנים יכולים להוסיף מדידות"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    trainee_id IN (
      SELECT id FROM trainees WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן מדידות" ON measurements;
CREATE POLICY "מאמנים יכולים לעדכן מדידות"
  ON measurements FOR UPDATE
  TO authenticated
  USING (
    trainee_id IN (
      SELECT id FROM trainees WHERE trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    trainee_id IN (
      SELECT id FROM trainees WHERE trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים למחוק מדידות" ON measurements;
CREATE POLICY "מאמנים יכולים למחוק מדידות"
  ON measurements FOR DELETE
  TO authenticated
  USING (
    trainee_id IN (
      SELECT id FROM trainees WHERE trainer_id = (select auth.uid())
    )
  );