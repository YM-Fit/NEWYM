/*
  # Update Measurements Fields

  ## Overview
  This migration updates the measurements table to reflect new body measurement fields
  and replaces visceral fat with BMR (Basal Metabolic Rate) calculation.

  ## Changes to `measurements` table

  ### Fields to rename/replace:
  - `chest` -> `chest_back` (חזה/גב)
  - `waist` -> `belly` (פופיק)
  - `hips` -> `glutes` (ישבן)
  - `right_thigh` + `left_thigh` -> `thigh` (ירך - single field)
  - `right_arm` and `left_arm` - keep as is (יד ימין, יד שמאל)
  - `visceral_fat` -> `bmr` (BMR instead of visceral fat)

  ## New fields:
  - `chest_back` (numeric) - combined chest/back measurement
  - `belly` (numeric) - belly measurement (replacing waist)
  - `glutes` (numeric) - glutes measurement (replacing hips)
  - `thigh` (numeric) - thigh measurement (single field)
  - `bmr` (numeric) - Basal Metabolic Rate (calculated field)

  ## Data Migration
  - Existing data will be preserved where possible
*/

-- Add new columns
DO $$
BEGIN
  -- Add chest_back
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'chest_back'
  ) THEN
    ALTER TABLE measurements ADD COLUMN chest_back numeric(5,1);
  END IF;

  -- Add belly
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'belly'
  ) THEN
    ALTER TABLE measurements ADD COLUMN belly numeric(5,1);
  END IF;

  -- Add glutes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'glutes'
  ) THEN
    ALTER TABLE measurements ADD COLUMN glutes numeric(5,1);
  END IF;

  -- Add thigh (single field)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'thigh'
  ) THEN
    ALTER TABLE measurements ADD COLUMN thigh numeric(5,1);
  END IF;

  -- Add bmr (replacing visceral_fat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'bmr'
  ) THEN
    ALTER TABLE measurements ADD COLUMN bmr numeric(6,1);
  END IF;
END $$;

-- Migrate existing data
UPDATE measurements
SET
  chest_back = COALESCE(chest_back, chest),
  belly = COALESCE(belly, waist),
  glutes = COALESCE(glutes, hips),
  thigh = COALESCE(thigh, GREATEST(right_thigh, left_thigh))
WHERE chest IS NOT NULL OR waist IS NOT NULL OR hips IS NOT NULL OR right_thigh IS NOT NULL OR left_thigh IS NOT NULL;

-- Drop old columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'chest'
  ) THEN
    ALTER TABLE measurements DROP COLUMN chest;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'waist'
  ) THEN
    ALTER TABLE measurements DROP COLUMN waist;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'hips'
  ) THEN
    ALTER TABLE measurements DROP COLUMN hips;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'right_thigh'
  ) THEN
    ALTER TABLE measurements DROP COLUMN right_thigh;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'left_thigh'
  ) THEN
    ALTER TABLE measurements DROP COLUMN left_thigh;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'visceral_fat'
  ) THEN
    ALTER TABLE measurements DROP COLUMN visceral_fat;
  END IF;
END $$;
