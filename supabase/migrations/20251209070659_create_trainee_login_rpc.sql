/*
  # Create Trainee Login RPC Function

  This migration creates a database function for trainee authentication
  using phone number and password.

  ## Function: trainee_login(phone_input, password_input)
  
  **Purpose:** Authenticates a trainee by phone number and password
  
  **Parameters:**
  - phone_input: The trainee's phone number
  - password_input: The trainee's password (plaintext, will be compared against hash)
  
  **Returns:** JSON object containing:
  - success: boolean
  - trainee_id: uuid (if successful)
  - trainee_name: text (if successful)
  - trainer_id: uuid (if successful)
  - error: text (if failed)

  ## Security
  - Function is accessible to anonymous users (for login)
  - Uses pgcrypto for password verification
  - Updates last_login timestamp on successful login
*/

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS trainee_login(text, text);

-- Create trainee login function
CREATE OR REPLACE FUNCTION trainee_login(phone_input text, password_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trainee_auth_record RECORD;
  trainee_record RECORD;
BEGIN
  -- Find trainee_auth record by phone
  SELECT ta.*, t.full_name, t.trainer_id
  INTO trainee_auth_record
  FROM trainee_auth ta
  JOIN trainees t ON t.id = ta.trainee_id
  WHERE ta.phone = phone_input
    AND ta.is_active = true
  LIMIT 1;

  -- Check if record exists
  IF trainee_auth_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'מספר טלפון או סיסמה שגויים'
    );
  END IF;

  -- Verify password using crypt
  IF trainee_auth_record.password != crypt(password_input, trainee_auth_record.password) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'מספר טלפון או סיסמה שגויים'
    );
  END IF;

  -- Update last_login timestamp
  UPDATE trainee_auth
  SET last_login = now()
  WHERE id = trainee_auth_record.id;

  -- Return success with trainee data
  RETURN jsonb_build_object(
    'success', true,
    'trainee_id', trainee_auth_record.trainee_id,
    'trainee_name', trainee_auth_record.full_name,
    'trainer_id', trainee_auth_record.trainer_id,
    'phone', trainee_auth_record.phone
  );
END;
$$;

-- Grant execute permission to anonymous users (needed for login)
GRANT EXECUTE ON FUNCTION trainee_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION trainee_login(text, text) TO authenticated;
