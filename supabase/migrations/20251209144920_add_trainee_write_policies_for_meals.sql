/*
  # Add Trainee Write Policies for Meals and Related Tables

  1. Overview
    - Allow trainees to insert/update/delete their own meals
    - Allow trainees to manage their own food diary
    - Allow trainees to manage their own self-weights
    
  2. Security
    - Trainees can only modify their own data
    - Uses get_current_trainee_id() to avoid circular dependencies
*/

-- Meals - trainee can insert their own meals
CREATE POLICY "trainee_insert_own_meals"
  ON meals
  FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Meals - trainee can update their own meals
CREATE POLICY "trainee_update_own_meals"
  ON meals
  FOR UPDATE
  TO authenticated
  USING (trainee_id = get_current_trainee_id())
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Meals - trainee can delete their own meals
CREATE POLICY "trainee_delete_own_meals"
  ON meals
  FOR DELETE
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Food diary - trainee can insert
CREATE POLICY "trainee_insert_own_food_diary"
  ON food_diary
  FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Food diary - trainee can update
CREATE POLICY "trainee_update_own_food_diary"
  ON food_diary
  FOR UPDATE
  TO authenticated
  USING (trainee_id = get_current_trainee_id())
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Food diary - trainee can delete
CREATE POLICY "trainee_delete_own_food_diary"
  ON food_diary
  FOR DELETE
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Food diary meals - trainee can insert
CREATE POLICY "trainee_insert_own_food_diary_meals"
  ON food_diary_meals
  FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Food diary meals - trainee can update
CREATE POLICY "trainee_update_own_food_diary_meals"
  ON food_diary_meals
  FOR UPDATE
  TO authenticated
  USING (trainee_id = get_current_trainee_id())
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Food diary meals - trainee can delete
CREATE POLICY "trainee_delete_own_food_diary_meals"
  ON food_diary_meals
  FOR DELETE
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Trainee self weights - trainee can insert
CREATE POLICY "trainee_insert_own_self_weights"
  ON trainee_self_weights
  FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Trainee self weights - trainee can update
CREATE POLICY "trainee_update_own_self_weights"
  ON trainee_self_weights
  FOR UPDATE
  TO authenticated
  USING (trainee_id = get_current_trainee_id())
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Trainee self weights - trainee can delete
CREATE POLICY "trainee_delete_own_self_weights"
  ON trainee_self_weights
  FOR DELETE
  TO authenticated
  USING (trainee_id = get_current_trainee_id());

-- Mental tools - trainee can update (mark as completed)
CREATE POLICY "trainee_update_own_mental_tools"
  ON mental_tools
  FOR UPDATE
  TO authenticated
  USING (trainee_id = get_current_trainee_id())
  WITH CHECK (trainee_id = get_current_trainee_id());
