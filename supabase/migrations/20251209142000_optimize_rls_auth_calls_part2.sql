/*
  # Optimize RLS Auth Calls - Part 2

  1. Tables Updated
    - trainer_notifications, workout_templates, food_diary
    - food_diary_meals, trainee_auth, trainee_self_weights
    - daily_water_intake, equipment
*/

-- TRAINER_NOTIFICATIONS
DROP POLICY IF EXISTS "Trainers can view own notifications" ON trainer_notifications;
CREATE POLICY "Trainers can view own notifications"
  ON trainer_notifications FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can insert own notifications" ON trainer_notifications;
CREATE POLICY "Trainers can insert own notifications"
  ON trainer_notifications FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can update own notifications" ON trainer_notifications;
CREATE POLICY "Trainers can update own notifications"
  ON trainer_notifications FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can delete own notifications" ON trainer_notifications;
CREATE POLICY "Trainers can delete own notifications"
  ON trainer_notifications FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "מתאמנים יכולים ליצור התראות למאמן" ON trainer_notifications;
CREATE POLICY "מתאמנים יכולים ליצור התראות למאמן"
  ON trainer_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      JOIN trainees t ON t.id = ta.trainee_id
      WHERE ta.auth_user_id = (select auth.uid())
        AND t.trainer_id = trainer_notifications.trainer_id
    )
  );

-- WORKOUT_TEMPLATES
DROP POLICY IF EXISTS "Trainers can view own templates" ON workout_templates;
CREATE POLICY "Trainers can view own templates"
  ON workout_templates FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can create own templates" ON workout_templates;
CREATE POLICY "Trainers can create own templates"
  ON workout_templates FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can update own templates" ON workout_templates;
CREATE POLICY "Trainers can update own templates"
  ON workout_templates FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can delete own templates" ON workout_templates;
CREATE POLICY "Trainers can delete own templates"
  ON workout_templates FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

-- FOOD_DIARY
DROP POLICY IF EXISTS "Trainers can view trainees food diary" ON food_diary;
CREATE POLICY "Trainers can view trainees food diary"
  ON food_diary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = food_diary.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can view own food diary" ON food_diary;
CREATE POLICY "Trainees can view own food diary"
  ON food_diary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can insert own food diary" ON food_diary;
CREATE POLICY "Trainees can insert own food diary"
  ON food_diary FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can update own food diary" ON food_diary;
CREATE POLICY "Trainees can update own food diary"
  ON food_diary FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- FOOD_DIARY_MEALS
DROP POLICY IF EXISTS "Trainers can view trainees meals" ON food_diary_meals;
CREATE POLICY "Trainers can view trainees meals"
  ON food_diary_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = food_diary_meals.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can view own meals" ON food_diary_meals;
CREATE POLICY "Trainees can view own meals"
  ON food_diary_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary_meals.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can insert own meals" ON food_diary_meals;
CREATE POLICY "Trainees can insert own meals"
  ON food_diary_meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary_meals.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can update own meals" ON food_diary_meals;
CREATE POLICY "Trainees can update own meals"
  ON food_diary_meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary_meals.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can delete own meals" ON food_diary_meals;
CREATE POLICY "Trainees can delete own meals"
  ON food_diary_meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary_meals.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainees_manage_own_meals" ON food_diary_meals;
CREATE POLICY "trainees_manage_own_meals"
  ON food_diary_meals
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary_meals.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = food_diary_meals.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- TRAINEE_AUTH
DROP POLICY IF EXISTS "trainers_manage_trainee_auth" ON trainee_auth;
CREATE POLICY "trainers_manage_trainee_auth"
  ON trainee_auth
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_auth.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

-- TRAINEE_SELF_WEIGHTS
DROP POLICY IF EXISTS "Trainees can insert own weights" ON trainee_self_weights;
CREATE POLICY "Trainees can insert own weights"
  ON trainee_self_weights FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = trainee_self_weights.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can view own weights" ON trainee_self_weights;
CREATE POLICY "Trainees can view own weights"
  ON trainee_self_weights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = trainee_self_weights.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can view trainees weights" ON trainee_self_weights;
CREATE POLICY "Trainers can view trainees weights"
  ON trainee_self_weights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_self_weights.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can update seen status" ON trainee_self_weights;
CREATE POLICY "Trainers can update seen status"
  ON trainee_self_weights FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = trainee_self_weights.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainees_manage_own_weights" ON trainee_self_weights;
CREATE POLICY "trainees_manage_own_weights"
  ON trainee_self_weights
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = trainee_self_weights.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = trainee_self_weights.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- DAILY_WATER_INTAKE
DROP POLICY IF EXISTS "Trainees can view own water intake" ON daily_water_intake;
CREATE POLICY "Trainees can view own water intake"
  ON daily_water_intake FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = daily_water_intake.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can insert own water intake" ON daily_water_intake;
CREATE POLICY "Trainees can insert own water intake"
  ON daily_water_intake FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = daily_water_intake.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainees can update own water intake" ON daily_water_intake;
CREATE POLICY "Trainees can update own water intake"
  ON daily_water_intake FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = daily_water_intake.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Trainers can view trainees water intake" ON daily_water_intake;
CREATE POLICY "Trainers can view trainees water intake"
  ON daily_water_intake FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainees
      WHERE trainees.id = daily_water_intake.trainee_id
        AND trainees.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "trainees_manage_own_water" ON daily_water_intake;
CREATE POLICY "trainees_manage_own_water"
  ON daily_water_intake
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = daily_water_intake.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainee_auth
      WHERE trainee_auth.trainee_id = daily_water_intake.trainee_id
        AND trainee_auth.auth_user_id = (select auth.uid())
    )
  );

-- EQUIPMENT
DROP POLICY IF EXISTS "Trainers can view own equipment" ON equipment;
CREATE POLICY "Trainers can view own equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can insert own equipment" ON equipment;
CREATE POLICY "Trainers can insert own equipment"
  ON equipment FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can update own equipment" ON equipment;
CREATE POLICY "Trainers can update own equipment"
  ON equipment FOR UPDATE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trainers can delete own equipment" ON equipment;
CREATE POLICY "Trainers can delete own equipment"
  ON equipment FOR DELETE
  TO authenticated
  USING (trainer_id = (select auth.uid()));

DROP POLICY IF EXISTS "trainee_select_all_equipment" ON equipment;
CREATE POLICY "trainee_select_all_equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainee_auth ta
      JOIN trainees t ON t.id = ta.trainee_id
      WHERE ta.auth_user_id = (select auth.uid())
        AND t.trainer_id = equipment.trainer_id
    )
  );
