# סטטוס עדכון מסד הנתונים

## ✅ מה בוצע

1. **התחברות למסד הנתונים** - הצלחתי להתחבר בהצלחה!
2. **בדיקת טבלאות** - בדקתי את כל הטבלאות:
   - ✅ 26 מתוך 27 טבלאות קיימות
   - ❌ טבלה אחת חסרה: `meal_plan_food_items`

## 📊 מצב נוכחי

### טבלאות קיימות (26):
- ✅ trainers, trainees
- ✅ muscle_groups, exercises
- ✅ workouts, workout_trainees, workout_exercises, exercise_sets
- ✅ measurements
- ✅ cardio_types, cardio_activities
- ✅ trainer_notifications, trainee_auth
- ✅ workout_plans, trainee_workout_plans
- ✅ workout_plan_days, workout_plan_day_exercises
- ✅ meal_plans, meal_plan_meals
- ✅ daily_log, meals
- ✅ scale_readings, scale_heartbeats
- ✅ trainee_self_weights, personal_records, trainee_goals

### טבלאות חסרות (1):
- ❌ meal_plan_food_items

## 🔧 מה צריך לעשות

כדי ליצור את הטבלה החסרה, יש שתי אפשרויות:

### אפשרות 1: דרך Supabase Dashboard (הכי קל)

1. היכנס ל-[Supabase Dashboard](https://app.supabase.com/project/vqvczpxmvrwfkecpwovc)
2. לך ל-**SQL Editor**
3. העתק והדבק את התוכן של `supabase/migrations/20260122000000_add_meal_plan_food_items.sql`
4. לחץ על **Run**

### אפשרות 2: דרך Service Role Key

אם יש לך Service Role Key, הרץ:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key npx tsx scripts/apply-migration-via-api.ts
```

את ה-Service Role Key תוכל למצוא ב:
- Supabase Dashboard → Settings → API → service_role key

## 📝 SQL להרצה

הקובץ המלא נמצא ב: `supabase/migrations/20260122000000_add_meal_plan_food_items.sql`

או תוכל להריץ את זה:

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

-- RLS Policies
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

## ✨ אחרי ההרצה

לאחר שתריץ את המיגרציה, כל הטבלאות יהיו קיימות והמסד הנתונים יהיה מעודכן!
