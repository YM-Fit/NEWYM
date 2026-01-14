# שלב אחרון - הרצת המיגרציה

## ✅ מה כבר בוצע

1. ✅ התחברתי למסד הנתונים בהצלחה
2. ✅ בדקתי את כל הטבלאות - 26 מתוך 27 קיימות
3. ✅ זיהיתי את הטבלה החסרה: `meal_plan_food_items`

## 🚀 מה צריך לעשות עכשיו

Supabase לא מאפשר הרצת SQL ישירות דרך REST API. יש שתי אפשרויות:

### אפשרות 1: דרך Supabase Dashboard (הכי קל - 2 דקות)

1. פתח את הקישור הזה:
   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new

2. העתק והדבק את ה-SQL הזה:

```sql
-- Create meal_plan_food_items table
CREATE TABLE IF NOT EXISTS meal_plan_food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  food_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) NOT NULL DEFAULT 'g',
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
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

-- RLS Policy: Trainers can manage food items
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
```

3. לחץ על **Run** (או Cmd/Ctrl + Enter)

4. ✅ סיימת! הטבלה נוצרה בהצלחה.

### אפשרות 2: דרך Supabase CLI

אם יש לך Supabase CLI מותקן ומחובר:

```bash
npx supabase db push
```

## ✅ אחרי ההרצה

לאחר שתריץ את המיגרציה, אני יכול לבדוק שוב שהכל עובד:

```bash
VITE_SUPABASE_URL=https://vqvczpxmvrwfkecpwovc.supabase.co VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDMyNjQsImV4cCI6MjA3NzkxOTI2NH0.mobaB1eh0qnhc5ygQTHvbx5eKseredG84_98y2SuEls npm run db:connect
```

זה יבדוק שהטבלה נוצרה בהצלחה!
