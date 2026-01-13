/*
  # Update Trainee Login to Plain Text Password

  This migration updates the trainee_login function to use
  simple string comparison instead of pgcrypto crypt().

  ## Changes
  - Modified password verification from crypt() to direct comparison
  - This is a temporary solution for development
  
  ## Security Note
  - Plain text passwords are NOT secure for production
  - This should be replaced with proper hashing in the future
*/

DROP FUNCTION IF EXISTS trainee_login(text, text);

CREATE OR REPLACE FUNCTION trainee_login(phone_input text, password_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trainee_auth_record RECORD;
BEGIN
  SELECT ta.*, t.full_name, t.trainer_id
  INTO trainee_auth_record
  FROM trainee_auth ta
  JOIN trainees t ON t.id = ta.trainee_id
  WHERE ta.phone = phone_input
    AND ta.is_active = true
  LIMIT 1;

  IF trainee_auth_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'מספר טלפון או סיסמה שגויים'
    );
  END IF;

  IF trainee_auth_record.password != password_input THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'מספר טלפון או סיסמה שגויים'
    );
  END IF;

  UPDATE trainee_auth
  SET last_login = now()
  WHERE id = trainee_auth_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'trainee_id', trainee_auth_record.trainee_id,
    'trainee_name', trainee_auth_record.full_name,
    'trainer_id', trainee_auth_record.trainer_id,
    'phone', trainee_auth_record.phone
  );
END;
$$;

GRANT EXECUTE ON FUNCTION trainee_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION trainee_login(text, text) TO authenticated;