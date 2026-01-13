/*
  # Fix Trainees Security Breach

  1. Issue
    - Policy "Allow trainees read for auth" uses USING (true)
    - This allows ALL trainers to see ALL trainees from ALL trainers
    - Major security breach - trainers can see each other's clients

  2. Solution
    - Remove the insecure policy
    - The existing policy "מאמנים יכולים לראות את המתאמנים שלהם" is sufficient
    - It properly restricts trainers to see only their own trainees
*/

-- מחיקת ה-policy המסוכן שמאפשר לכולם לראות הכל
DROP POLICY IF EXISTS "Allow trainees read for auth" ON trainees;
