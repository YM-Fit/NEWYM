/*
  # Add Equipment Support

  ## Overview
  This migration adds support for training equipment (bands, bars, TRX, etc.)
  that trainers can use during workouts.

  ## New Tables

  ### `equipment`
  Stores all equipment items available to trainers.
  - `id` (uuid, primary key)
  - `trainer_id` (uuid, references trainers) - owner of the equipment
  - `name` (text) - display name (e.g., "גומיה אדומה - קשה")
  - `category` (text) - equipment category (band, bar, pulley_attachment, other)
  - `emoji` (text) - visual indicator
  - `weight_kg` (numeric) - weight in kg for bars, null for bands/TRX
  - `resistance_level` (int) - 1-5 for bands (1=very_light, 5=very_heavy)
  - `color` (text) - color for visual identification
  - `is_bodyweight` (boolean) - true for TRX, false for weighted equipment
  - `created_at` (timestamptz)

  ## Modified Tables

  ### `exercise_sets`
  - Added `equipment_id` (uuid, nullable) - references equipment used in this set

  ## Security
  - Enable RLS on equipment table
  - Trainers can only view/manage their own equipment
  - Equipment can be referenced in exercise_sets by the owning trainer

  ## Default Data
  Pre-populate equipment for all existing trainers based on the provided list.
*/

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('resistance_band', 'leg_band', 'bar', 'pulley_attachment', 'suspension', 'balance', 'ball', 'other')),
  emoji text,
  weight_kg numeric(5,2),
  resistance_level int CHECK (resistance_level BETWEEN 1 AND 5),
  color text,
  is_bodyweight boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add equipment_id to exercise_sets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercise_sets' AND column_name = 'equipment_id'
  ) THEN
    ALTER TABLE exercise_sets ADD COLUMN equipment_id uuid REFERENCES equipment(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment
CREATE POLICY "Trainers can view own equipment"
  ON equipment
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own equipment"
  ON equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own equipment"
  ON equipment
  FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own equipment"
  ON equipment
  FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_trainer_id ON equipment(trainer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_equipment_id ON exercise_sets(equipment_id);

-- Insert default equipment for all existing trainers
DO $$
DECLARE
  trainer_record RECORD;
BEGIN
  FOR trainer_record IN SELECT id FROM trainers LOOP
    -- Resistance Bands (גומיות התנגדות)
    INSERT INTO equipment (trainer_id, name, category, emoji, resistance_level, color) VALUES
      (trainer_record.id, 'גומיה ירוקה - קלה מאוד', 'resistance_band', '🟢', 1, 'green'),
      (trainer_record.id, 'גומיה כחולה - קלה', 'resistance_band', '🔵', 2, 'blue'),
      (trainer_record.id, 'גומיה כתומה - בינונית', 'resistance_band', '🟠', 3, 'orange'),
      (trainer_record.id, 'גומיה אדומה - קשה', 'resistance_band', '🔴', 4, 'red'),
      (trainer_record.id, 'גומיה סגולה - קשה מאוד', 'resistance_band', '🟣', 5, 'purple');

    -- Leg/Glute Bands (גומיות לרגליים/ישבן)
    INSERT INTO equipment (trainer_id, name, category, emoji, resistance_level, color) VALUES
      (trainer_record.id, 'גומיה לבנה - קלה', 'leg_band', '⚪', 1, 'white'),
      (trainer_record.id, 'גומיה אפורה - בינונית', 'leg_band', '⚫', 2, 'gray'),
      (trainer_record.id, 'גומיה שחורה - קשה', 'leg_band', '⚫', 3, 'black');

    -- Bars (מוטות)
    INSERT INTO equipment (trainer_id, name, category, emoji, weight_kg) VALUES
      (trainer_record.id, 'מוט קצר 5 ק״ג', 'bar', '━', 5.0),
      (trainer_record.id, 'מוט קצר 10 ק״ג', 'bar', '━', 10.0),
      (trainer_record.id, 'מוט קצר 12.5 ק״ג', 'bar', '━', 12.5),
      (trainer_record.id, 'מוט W', 'bar', '〰️', NULL);

    -- Suspension/Balance/Balls
    INSERT INTO equipment (trainer_id, name, category, emoji, is_bodyweight) VALUES
      (trainer_record.id, 'TRX', 'suspension', '🔗', true),
      (trainer_record.id, 'בוסו', 'balance', '⚪', false),
      (trainer_record.id, 'פיתה', 'ball', '⚪', false),
      (trainer_record.id, 'פיט בול M', 'ball', '🔵', false),
      (trainer_record.id, 'פיט בול L', 'ball', '🔵', false);

    -- Pulley Attachments (אביזרים לפולי)
    INSERT INTO equipment (trainer_id, name, category, emoji) VALUES
      (trainer_record.id, 'חבל', 'pulley_attachment', '🪢', NULL),
      (trainer_record.id, 'מוט קצר לפולי', 'pulley_attachment', '━', NULL),
      (trainer_record.id, 'מוט ארוך לפולי', 'pulley_attachment', '━━', NULL),
      (trainer_record.id, 'משולש', 'pulley_attachment', '▼', NULL),
      (trainer_record.id, 'משולש משיכה רחב', 'pulley_attachment', '▼', NULL),
      (trainer_record.id, 'מוט איחוד', 'pulley_attachment', '┃', NULL),
      (trainer_record.id, 'ידיות', 'pulley_attachment', '🤲', NULL),
      (trainer_record.id, 'חובק קרסול', 'pulley_attachment', '⭕', NULL);
  END LOOP;
END $$;
