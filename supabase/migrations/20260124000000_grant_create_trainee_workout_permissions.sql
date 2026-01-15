/*
  # Grant execute permissions to create_trainee_workout function
  
  1. Problem
    - The function create_trainee_workout was recreated but lost its GRANT EXECUTE permissions
    - This prevents trainees from creating workouts in the journal
    
  2. Solution
    - Grant EXECUTE permission to authenticated users
*/

-- Grant execute to authenticated users
-- Using the function signature with all parameters
GRANT EXECUTE ON FUNCTION create_trainee_workout(uuid, text, text, date, boolean, boolean) TO authenticated;
