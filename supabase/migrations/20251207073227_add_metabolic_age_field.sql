/*
  # Add Metabolic Age Support

  1. Changes
    - Add `metabolic_age` column to `measurements` table
      - Type: integer
      - Nullable: true (existing records won't have this value)
      - Description: Calculated metabolic age based on BMR and actual age
  
  2. Notes
    - Metabolic age is calculated based on BMR compared to average BMR for age/gender
    - Lower metabolic age indicates better metabolic health
    - Value is clamped between 18-80 years for realistic results
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'metabolic_age'
  ) THEN
    ALTER TABLE measurements ADD COLUMN metabolic_age integer;
  END IF;
END $$;