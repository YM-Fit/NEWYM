/*
  # Fix find_trainee_by_weight function

  1. Changes
    - Fix column reference from `t.name` to `t.full_name`
    - The trainees table uses `full_name` not `name`

  2. Notes
    - This was causing the function to fail when trying to identify trainees by weight
*/

CREATE OR REPLACE FUNCTION find_trainee_by_weight(
  p_weight numeric,
  p_body_fat numeric DEFAULT NULL,
  p_trainer_id uuid DEFAULT NULL,
  p_weight_tolerance numeric DEFAULT 5.0,
  p_fat_tolerance numeric DEFAULT 5.0
)
RETURNS TABLE (
  trainee_id uuid,
  trainee_name text,
  last_weight numeric,
  last_body_fat numeric,
  weight_diff numeric,
  confidence_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS trainee_id,
    t.full_name AS trainee_name,
    t.last_known_weight AS last_weight,
    t.last_known_body_fat AS last_body_fat,
    ABS(t.last_known_weight - p_weight) AS weight_diff,
    CASE 
      WHEN t.last_known_weight IS NULL THEN 0
      WHEN ABS(t.last_known_weight - p_weight) <= 0.5 THEN 100
      WHEN ABS(t.last_known_weight - p_weight) <= 1.0 THEN 90
      WHEN ABS(t.last_known_weight - p_weight) <= 2.0 THEN 70
      WHEN ABS(t.last_known_weight - p_weight) <= p_weight_tolerance THEN 50
      ELSE 0
    END::numeric AS confidence_score
  FROM trainees t
  WHERE 
    (p_trainer_id IS NULL OR t.trainer_id = p_trainer_id)
    AND t.last_known_weight IS NOT NULL
    AND ABS(t.last_known_weight - p_weight) <= p_weight_tolerance
    AND (
      p_body_fat IS NULL 
      OR t.last_known_body_fat IS NULL 
      OR ABS(t.last_known_body_fat - p_body_fat) <= p_fat_tolerance
    )
  ORDER BY 
    ABS(t.last_known_weight - p_weight) ASC,
    confidence_score DESC
  LIMIT 5;
END;
$$;