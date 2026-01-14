# עזרה בחיבור למסד הנתונים

## מה נוצר?

יצרתי לך מספר כלים שיעזרו לך להתחבר למסד הנתונים Supabase ולעדכן אותו:

### 1. סקריפטים חדשים

#### `scripts/check-database-sync.ts`
בודק אילו טבלאות קיימות במיגרציות לעומת טיפוסי TypeScript.

**שימוש:**
```bash
npm run db:check
```

#### `scripts/run-migrations.ts`
מסייע בהרצת מיגרציות דרך Supabase CLI.

**שימוש:**
```bash
npm run db:migrate
```

#### `scripts/connect-and-update-db.ts`
מתחבר למסד הנתונים ובודק מה חסר.

**שימוש:**
```bash
# עם משתני סביבה
VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key npm run db:connect

# או ישירות
npm run db:connect
```

### 2. קבצי עזרה

- `DATABASE_UPDATE_GUIDE.md` - מדריך מפורט לעדכון המסד
- `DATABASE_CONNECTION_HELP.md` - קובץ זה

## איך להתחבר?

### אפשרות 1: Supabase CLI (הכי קל)

```bash
# התקן את ה-CLI
npm install -g supabase

# התחבר לפרויקט שלך
supabase link --project-ref YOUR_PROJECT_REF

# הרץ את כל המיגרציות
supabase db push

# צור טיפוסי TypeScript
supabase gen types typescript --linked > src/types/database.ts
```

### אפשרות 2: דרך Dashboard

1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. בחר את הפרויקט שלך
3. לך ל-**SQL Editor**
4. העתק והרץ את כל קבצי המיגרציה (בסדר כרונולוגי)

### אפשרות 3: דרך הסקריפט שיצרתי

```bash
# קודם התקן את tsx
npm install

# הרץ את הסקריפט עם פרטי ההתחברות שלך
VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key npm run db:connect
```

הסקריפט יבדוק:
- ✅ אילו טבלאות קיימות
- ✅ אילו טבלאות חסרות
- ✅ אילו מיגרציות לא רצו

## מה צריך לעדכן?

לפי המיגרציות שלך, יש 120 קבצי מיגרציה שצריכים לרוץ. הטבלאות העיקריות שצריכות להיות:

### טבלאות בסיסיות (חייבות להיות):
- `trainers`, `trainees`
- `muscle_groups`, `exercises`
- `workouts`, `workout_trainees`, `workout_exercises`, `exercise_sets`
- `measurements`
- `cardio_types`, `cardio_activities`

### טבלאות מתקדמות (ייתכן שחסרות):
- `trainee_workout_plans` / `workout_plans`
- `workout_plan_days`, `workout_plan_day_exercises`
- `meal_plans`, `meal_plan_meals`, `meal_plan_food_items`
- `trainer_notifications`, `trainee_auth`
- `daily_log`, `meals`
- `scale_readings`, `scale_heartbeats`
- `trainee_self_weights`, `personal_records`, `trainee_goals`

## צעדים מומלצים

1. **התקן Supabase CLI** (אם עדיין לא):
   ```bash
   npm install -g supabase
   ```

2. **התחבר לפרויקט**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   (אתה יכול למצוא את ה-project ref ב-Dashboard שלך)

3. **הרץ את המיגרציות**:
   ```bash
   supabase db push
   ```

4. **צור טיפוסי TypeScript**:
   ```bash
   supabase gen types typescript --linked > src/types/database.ts
   ```

5. **בדוק שהכל עובד**:
   ```bash
   npm run db:check
   ```

## בעיות נפוצות

### "supabase: command not found"
התקן את Supabase CLI:
```bash
npm install -g supabase
```

### "Missing Supabase credentials"
צור קובץ `.env` עם:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

אתה יכול למצוא את הערכים האלה ב-Dashboard של Supabase:
- Settings → API → Project URL
- Settings → API → anon/public key

### "Permission denied"
ודא שיש לך הרשאות מתאימות ב-Supabase Dashboard.

## צורך בעזרה נוספת?

אם אתה צריך עזרה ספציפית:
1. הרץ את `npm run db:connect` כדי לראות מה חסר
2. שתף את הפלט ואני אעזור לך לתקן
