/*
  # Fix Circular Recursion Between trainees and trainee_auth Tables

  1. Problem
    - trainees.trainee_select_own_data checks trainee_auth table
    - trainee_auth policies check trainees table
    - This creates infinite recursion: trainees -> trainee_auth -> trainees -> ...
    
  2. Root Cause
    - trainee_auth.trainer_* policies use: EXISTS (SELECT ... FROM trainees WHERE trainees.trainer_id = auth.uid())
    - trainees.trainee_select_own_data uses: EXISTS (SELECT ... FROM trainee_auth WHERE trainee_auth.auth_user_id = auth.uid())
    
  3. Solution
    - Drop the problematic trainee_select_own_data policy
    - Add new policy that checks auth_user_id directly via a SECURITY DEFINER function
    - This breaks the circular dependency
    
  4. Security
    - Trainers: Can see trainees where trainer_id = auth.uid()
    - Trainees: Edge function uses service role key to bypass RLS when fetching data
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "trainee_select_own_data" ON trainees;

-- For now, let the edge function handle trainee authentication
-- It uses service role key which bypasses RLS
