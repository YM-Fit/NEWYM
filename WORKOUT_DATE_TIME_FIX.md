# תיקון שמירת זמן ב-workout_date

## הבעיה
השדה `workout_date` לא שמר את השעה כשמשמרים אימון. הוא שמר רק את התאריך ללא זמן.

## הפתרון
שינינו את השדה מ-`date` ל-`timestamptz` כדי לשמור גם את השעה של השמירה.

## מה תוקן

### 1. Migration: שינוי סוג השדה
**קובץ:** `supabase/migrations/20260128000000_change_workout_date_to_timestamp.sql`
- משנה את `workout_date` מ-`date` ל-`timestamptz`
- צריך להריץ את זה ב-Supabase!

### 2. תיקון save-workout Edge Function
**קובץ:** `supabase/functions/save-workout/index.ts`
- הפונקציה תמיד משתמשת בזמן הנוכחי (`new Date()`) כששומרת
- התאריך נשמר מהקלט של המשתמש
- הזמן נשמר מזמן השמירה בפועל

### 3. תיקון create_trainee_workout SQL Function
**קובץ:** `supabase/migrations/20260128000001_update_create_trainee_workout_timestamp.sql`
- הפונקציה גם היא משתמשת בזמן נוכחי
- שומרת את התאריך מהקלט אבל מוסיפה את הזמן הנוכחי

### 4. טסטים מקיפים
**קבצים:**
- `src/api/workoutApi.time.test.ts` - טסטים ללוגיקה
- `src/api/workoutApi.integration.test.ts` - טסטי אינטגרציה מלאים

## ⚠️ חשוב - מה צריך לעשות

### 1. להריץ את ה-Migrations ב-Supabase
```sql
-- Migration 1: שינוי סוג השדה
-- Run: supabase/migrations/20260128000000_change_workout_date_to_timestamp.sql

-- Migration 2: עדכון הפונקציה SQL
-- Run: supabase/migrations/20260128000001_update_create_trainee_workout_timestamp.sql
```

### 2. ל-Deploy מחדש את ה-Edge Functions
```bash
# Deploy את save-workout function
supabase functions deploy save-workout
```

### 3. לבדוק שהכל עובד
- שמור אימון חדש
- בדוק שהשדה `workout_date` כולל גם תאריך וגם שעה
- השעה צריכה להיות זמן השמירה הנוכחי, לא 00:00:00

## איך זה עובד עכשיו

### לפני התיקון:
- המשתמש בוחר תאריך: "2024-06-15"
- נשמר במסד הנתונים: `2024-06-15 00:00:00` (ללא זמן אמיתי)

### אחרי התיקון:
- המשתמש בוחר תאריך: "2024-06-15"
- המשתמש שומר את האימון בשעה 14:30:45
- נשמר במסד הנתונים: `2024-06-15 14:30:45.123` (עם זמן השמירה!)

## בדיקות

הריץ את הטסטים:
```bash
npm test -- workoutApi.time.test.ts
npm test -- workoutApi.integration.test.ts
```

כל הטסטים צריכים לעבור.

## בעיות נפוצות

### השעה עדיין לא נשמרת?
1. האם הרצת את ה-migration? בדוק שהשדה הוא `timestamptz` ולא `date`
2. האם deploy-ת את ה-edge function מחדש?
3. בדוק ב-Supabase logs אם יש שגיאות

### איך לבדוק את סוג השדה?
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workouts' AND column_name = 'workout_date';
```

צריך לראות: `timestamptz`
