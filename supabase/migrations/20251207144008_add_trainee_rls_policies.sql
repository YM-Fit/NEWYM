/*
  # Add RLS Policies for Authenticated Trainees

  1. Changes
    - Add SELECT policy for trainees to view their own data
    - Add UPDATE policy for trainees to update their own data (limited fields)
    
  2. Security
    - Trainees can only access their own data through auth.uid()
    - Uses trainee_auth table to link auth.users to trainees
    - Trainees cannot access other trainees' data
*/

-- Policy: Trainees can view their own data
CREATE POLICY "מתאמנים יכולים לראות את הנתונים שלהם"
  ON trainees
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trainee_id 
      FROM trainee_auth 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Policy: Trainees can update limited fields of their own data
CREATE POLICY "מתאמנים יכולים לעדכן את הנתונים שלהם"
  ON trainees
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT trainee_id 
      FROM trainee_auth 
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT trainee_id 
      FROM trainee_auth 
      WHERE auth_user_id = auth.uid()
    )
  );