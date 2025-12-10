/*
  # Add Trainee Policies for Daily Log
  
  1. Overview
    - Allow trainees to insert/update their own daily_log entries (water tracking)
    
  2. Security
    - Trainees can only modify their own data
    - Uses get_current_trainee_id() to avoid circular dependencies
*/

-- Daily log - trainee can insert their own water tracking
CREATE POLICY "trainee_insert_own_daily_log"
  ON daily_log
  FOR INSERT
  TO authenticated
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Daily log - trainee can update their own water tracking
CREATE POLICY "trainee_update_own_daily_log"
  ON daily_log
  FOR UPDATE
  TO authenticated
  USING (trainee_id = get_current_trainee_id())
  WITH CHECK (trainee_id = get_current_trainee_id());

-- Daily log - trainee can delete their own water tracking
CREATE POLICY "trainee_delete_own_daily_log"
  ON daily_log
  FOR DELETE
  TO authenticated
  USING (trainee_id = get_current_trainee_id());
