/*
  # Restore Critical SELECT Policies

  1. Changes
    - Restore SELECT policies that were accidentally removed during cleanup
    - Allows trainers to view their trainees
    - Allows trainers to view workouts
    
  2. Tables Fixed
    - trainees - trainers can now see their trainees again
    - workouts - ensure trainers can see workouts they created
*/

-- TRAINEES - Add back trainer SELECT policy
CREATE POLICY "מאמנים יכולים לראות את המתאמנים של"
  ON trainees FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));

-- WORKOUTS - Add back trainer SELECT policy  
CREATE POLICY "מאמנים יכולים לראות את האימונים של"
  ON workouts FOR SELECT
  TO authenticated
  USING (trainer_id = (select auth.uid()));
