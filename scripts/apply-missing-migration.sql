-- Migration: Add Meal Plan Food Items Table
-- This migration creates the meal_plan_food_items table

-- Create meal_plan_food_items table
CREATE TABLE IF NOT EXISTS meal_plan_food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  food_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) NOT NULL DEFAULT 'g', -- 'g', 'unit', 'ml', 'cup', 'tbsp', 'tsp', etc.
  calories INTEGER,
  protein INTEGER, -- in grams
  carbs INTEGER, -- in grams
  fat INTEGER, -- in grams
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_food_items_meal_id 
  ON meal_plan_food_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_food_items_order 
  ON meal_plan_food_items(meal_id, order_index);

-- Enable RLS
ALTER TABLE meal_plan_food_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trainers can manage food items for their trainees' meal plans
DROP POLICY IF EXISTS "trainers_manage_meal_plan_food_items" ON meal_plan_food_items;
CREATE POLICY "trainers_manage_meal_plan_food_items"
  ON meal_plan_food_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mp.id = mpm.plan_id
      WHERE mpm.id = meal_plan_food_items.meal_id
        AND mp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mp.id = mpm.plan_id
      WHERE mpm.id = meal_plan_food_items.meal_id
        AND mp.trainer_id = auth.uid()
    )
  );

-- RLS Policy: Trainees can view their own food items
DROP POLICY IF EXISTS "trainees_view_own_meal_plan_food_items" ON meal_plan_food_items;
CREATE POLICY "trainees_view_own_meal_plan_food_items"
  ON meal_plan_food_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mp.id = mpm.plan_id
      WHERE mpm.id = meal_plan_food_items.meal_id
        AND mp.trainee_id = auth.uid()
    )
  );
