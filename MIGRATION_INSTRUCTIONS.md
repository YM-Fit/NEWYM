# הוראות להרצת המיגרציה

## המיגרציה שיצרתי

המיגרציה `20260123000000_fix_trainee_goals_and_habits_rls.sql` תיצור ותתקן:

1. ✅ טבלת `food_diary` (חסרה!)
2. ✅ טבלת `food_diary_meals` (חסרה!)
3. ✅ הוספת INSERT policy למתאמנים על `trainee_goals`
4. ✅ הוספת INSERT policy למתאמנים על `trainee_habits`
5. ✅ וידוא קיום `trainee_habits` ו-`habit_logs` עם RLS נכון

## איך להריץ את המיגרציה

### שיטה 1: Supabase Dashboard (הכי קל - 2 דקות)

1. פתח את הקישור הזה:
   **https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new**

2. העתק את כל התוכן מהקובץ:
   `supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql`

3. הדבק ב-SQL Editor

4. לחץ על "Run" (או Ctrl+Enter)

5. ✅ סיימת!

### שיטה 2: Supabase CLI (אם מותקן)

```bash
# התקן Supabase CLI אם לא מותקן
npm install -g supabase

# התחבר לפרויקט
supabase link --project-ref vqvczpxmvrwfkecpwovc

# הרץ את המיגרציה
supabase db push
```

### שיטה 3: דרך קובץ SQL

אם אתה מעדיף להריץ דרך קובץ:

1. פתח את הקובץ: `supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql`
2. העתק את כל התוכן
3. פתח Supabase Dashboard → SQL Editor
4. הדבק והרץ

## מה המיגרציה עושה?

### 1. יוצרת טבלת `food_diary`
```sql
CREATE TABLE IF NOT EXISTS food_diary (
  id UUID PRIMARY KEY,
  trainee_id UUID NOT NULL,
  diary_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_seen_by_trainer BOOLEAN DEFAULT false,
  ...
);
```

### 2. יוצרת טבלת `food_diary_meals`
```sql
CREATE TABLE IF NOT EXISTS food_diary_meals (
  id UUID PRIMARY KEY,
  diary_id UUID NOT NULL,
  trainee_id UUID,
  meal_type VARCHAR(20) NOT NULL,
  ...
);
```

### 3. מוסיפה RLS Policies
- מתאמנים יכולים לראות/להוסיף/לעדכן את ה-food_diary שלהם
- מאמנים יכולים לראות את ה-food_diary של המתאמנים שלהם

### 4. מתקנת `trainee_goals`
- מוסיפה INSERT policy למתאמנים
- מוסיפה UPDATE policy למתאמנים

### 5. מתקנת `trainee_habits` ו-`habit_logs`
- יוצרת את הטבלאות אם לא קיימות
- מוסיפה RLS policies נכונים

## אחרי הרצת המיגרציה

השגיאות הבאות אמורות להיפתר:

- ✅ 404 עבור `trainee_habits` - הטבלה תיווצר
- ✅ 404 עבור `habit_logs` - הטבלה תיווצר  
- ✅ 404 עבור `food_diary_entries` - הקוד כבר תוקן להשתמש ב-`meals`
- ✅ 403 עבור `trainee_goals` - יוסף INSERT policy למתאמנים
- ✅ 400 עבור `meals` - אמור להיפתר אחרי שהמיגרציות יופעלו

## בדיקה

אחרי הרצת המיגרציה, בדוק שהטבלאות קיימות:

```sql
-- בדוק שהטבלאות קיימות
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('food_diary', 'food_diary_meals', 'trainee_habits', 'habit_logs');
```

אם כל הטבלאות מופיעות - המיגרציה הצליחה! 🎉
