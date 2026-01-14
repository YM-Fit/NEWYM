# מדריך עדכון מסד הנתונים

## סקירה כללית

יש לך 120 קבצי מיגרציה שצריכים לרוץ על מסד הנתונים. המדריך הזה יעזור לך לעדכן את המסד.

## שיטות עדכון

### שיטה 1: Supabase CLI (מומלץ)

#### התקנה:
```bash
npm install -g supabase
```

#### חיבור לפרויקט:
```bash
# אם יש לך project reference
supabase link --project-ref YOUR_PROJECT_REF

# או אם אתה עובד עם local development
supabase start
```

#### הרצת מיגרציות:
```bash
# דחיפת כל המיגרציות למסד
supabase db push

# או אם אתה עובד עם local
supabase migration up
```

#### יצירת טיפוסי TypeScript:
```bash
# מ-local database
supabase gen types typescript --local > src/types/database.ts

# מ-remote database
supabase gen types typescript --linked > src/types/database.ts
```

### שיטה 2: Supabase Dashboard

1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. בחר את הפרויקט שלך
3. לך ל-**SQL Editor**
4. העתק את תוכן כל קבצי המיגרציה (בסדר כרונולוגי)
5. הרץ אותם אחד אחד

### שיטה 3: סקריפט אוטומטי

השתמש בסקריפט שיצרתי:

```bash
# בדיקת סנכרון
npx tsx scripts/check-database-sync.ts

# הרצת מיגרציות (דורש Supabase CLI)
npx tsx scripts/run-migrations.ts
```

## טבלאות שצריך לוודא שהן קיימות

לפי המיגרציות, הטבלאות הבאות צריכות להיות במסד:

### טבלאות בסיסיות:
- ✅ `trainers`
- ✅ `trainees`
- ✅ `muscle_groups`
- ✅ `exercises`
- ✅ `workouts`
- ✅ `workout_trainees`
- ✅ `workout_exercises`
- ✅ `exercise_sets`
- ✅ `measurements`
- ✅ `cardio_types`
- ✅ `cardio_activities`

### טבלאות מתקדמות:
- ⚠️ `trainee_workout_plans` (או `workout_plans`)
- ⚠️ `workout_plan_days`
- ⚠️ `workout_plan_day_exercises`
- ⚠️ `meal_plans`
- ⚠️ `meal_plan_meals`
- ⚠️ `meal_plan_food_items`
- ⚠️ `trainer_notifications`
- ⚠️ `trainee_auth`
- ⚠️ `daily_log`
- ⚠️ `meals`
- ⚠️ `scale_readings`
- ⚠️ `scale_heartbeats`
- ⚠️ `trainee_self_weights`
- ⚠️ `personal_records`
- ⚠️ `trainee_goals`
- ⚠️ `workout_templates`
- ⚠️ `meal_plan_templates`

## בדיקת סנכרון

לאחר הרצת המיגרציות, בדוק:

1. **טבלאות חסרות**: הרץ את `check-database-sync.ts` כדי לראות מה חסר
2. **טיפוסי TypeScript**: ודא ש-`src/types/database.ts` מעודכן
3. **RLS Policies**: ודא שכל הטבלאות יש להן RLS policies

## פתרון בעיות

### שגיאת "table already exists"
זה בסדר - המיגרציות משתמשות ב-`CREATE TABLE IF NOT EXISTS`.

### שגיאת "permission denied"
ודא שיש לך הרשאות מתאימות ב-Supabase Dashboard.

### שגיאת "column does not exist"
ייתכן שמיגרציה מסוימת לא רצה. בדוק את הלוגים.

## צעדים הבאים

1. ✅ הרץ את כל המיגרציות
2. ✅ עדכן את טיפוסי TypeScript
3. ✅ בדוק שהקוד עובד עם המסד המעודכן
4. ✅ בדוק RLS policies

## קישורים שימושיים

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [TypeScript Types Generation](https://supabase.com/docs/reference/cli/supabase-gen-types-typescript)
