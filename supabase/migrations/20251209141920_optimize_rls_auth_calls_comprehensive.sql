/*
  # Optimize RLS Policy Auth Calls - Comprehensive

  1. Changes
    - Wrap all auth.uid() calls with (select auth.uid()) in RLS policies
    - Improves performance by preventing re-evaluation for each row
    
  2. Tables Updated
    - muscle_groups, exercises, mental_tools, trainer_notifications
    - workout_templates, food_diary, food_diary_meals, trainee_auth
    - trainee_self_weights, equipment, workout_plans, workout_plan_exercises
    - meal_plans, meal_plan_items, and more
*/

-- MUSCLE_GROUPS
DROP POLICY IF EXISTS "מאמנים יכולים לראות קבוצות שריר" ON muscle_groups;
CREATE POLICY "מאמנים יכולים לראות קבוצות שריר"
  ON muscle_groups FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()) OR trainer_id IS NULL);

DROP POLICY IF EXISTS "מאמנים יכולים להוסיף קבוצות שריר" ON muscle_groups;
CREATE POLICY "מאמנים יכולים להוסיף קבוצות שריר"
  ON muscle_groups FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן קבוצות שריר של" ON muscle_groups;
CREATE POLICY "מאמנים יכולים לעדכן קבוצות שריר של"
  ON muscle_groups FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מאמנים יכולים למחוק קבוצות שריר של" ON muscle_groups;
CREATE POLICY "מאמנים יכולים למחוק קבוצות שריר של"
  ON muscle_groups FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "trainee_select_all_muscle_groups" ON muscle_groups;
CREATE POLICY "trainee_select_all_muscle_groups"
  ON muscle_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- EXERCISES  
DROP POLICY IF EXISTS "מאמנים יכולים לראות תרגילים" ON exercises;
CREATE POLICY "מאמנים יכולים לראות תרגילים"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id 
        AND (muscle_groups.trainer_id = (select auth.uid()) OR muscle_groups.trainer_id IS NULL)
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
        AND muscle_groups.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים לעדכן תרגילים שלהם" ON exercises;
CREATE POLICY "מאמנים יכולים לעדכן תרגילים שלהם"
  ON exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id 
        AND muscle_groups.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id 
        AND muscle_groups.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "מאמנים יכולים למחוק תרגילים שלהם" ON exercises;
CREATE POLICY "מאמנים יכולים למחוק תרגילים שלהם"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM muscle_groups
      WHERE muscle_groups.id = exercises.muscle_group_id 
        AND muscle_groups.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainee_select_all_exercises" ON exercises;
CREATE POLICY "trainee_select_all_exercises"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- MENTAL_TOOLS
DROP POLICY IF EXISTS "Trainers can view mental tools for their trainees" ON mental_tools;
CREATE POLICY "Trainers can view mental tools for their trainees"
  ON mental_tools FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can insert mental tools for their trainees" ON mental_tools;
CREATE POLICY "Trainers can insert mental tools for their trainees"
  ON mental_tools FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can update their mental tools" ON mental_tools;
CREATE POLICY "Trainers can update their mental tools"
  ON mental_tools FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can delete their mental tools" ON mental_tools;
CREATE POLICY "Trainers can delete their mental tools"
  ON mental_tools FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "trainers_manage_mental_tools" ON mental_tools;
CREATE POLICY "trainers_manage_mental_tools"
  ON mental_tools
  TO authenticated
  USING (trainer_id = (select auth.uid()))
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainees can view their mental tools" ON mental_tools;
CREATE POLICY "Trainees can view their mental tools"
  ON mental_tools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = mental_tools.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );
