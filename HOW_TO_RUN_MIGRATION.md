# איך להריץ את המיגרציה - מדריך מפורט

## אפשרות 1: דרך Supabase Dashboard (הכי קל - 2 דקות) ⭐ מומלץ

1. **פתח את הקישור הזה:**
   ```
   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new
   ```

2. **העתק את כל התוכן מהקובץ:**
   ```
   supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql
   ```

3. **הדבק ב-SQL Editor**

4. **לחץ על "Run" (או Ctrl+Enter / Cmd+Enter)**

5. ✅ **סיימת!**

---

## אפשרות 2: דרך סקריפט עם Service Role Key

אם אתה רוצה שאני אריץ את זה אוטומטית, תן לי את ה-Service Role Key:

### איך למצוא את ה-Service Role Key:

1. פתח את Supabase Dashboard:
   ```
   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/settings/api
   ```

2. תחת **"Project API keys"** תמצא:
   - `anon` `public` - זה לא זה
   - `service_role` `secret` - **זה מה שאתה צריך!** 🔑

3. לחץ על "Reveal" ליד `service_role` key

4. העתק את ה-key

### הרצת המיגרציה:

**שיטה A: דרך משתנה סביבה**
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here npx tsx scripts/run-fix-migration.ts
```

**שיטה B: אינטראקטיבי (הסקריפט ישאל אותך)**
```bash
npx tsx scripts/run-fix-migration.ts
```

**שיטה C: דרך קובץ .env (אם אתה רוצה לשמור)**
```bash
# צור קובץ .env.local (אל תעלה אותו ל-git!)
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here" > .env.local

# הרץ את הסקריפט
npx tsx scripts/run-fix-migration.ts
```

---

## אפשרות 3: דרך Supabase CLI

אם יש לך Supabase CLI מותקן:

```bash
# התקן Supabase CLI אם לא מותקן
npm install -g supabase

# התחבר לפרויקט
supabase link --project-ref vqvczpxmvrwfkecpwovc

# הרץ את המיגרציה
supabase db push
```

---

## ⚠️ חשוב - אבטחה

**אל תעלה את ה-Service Role Key ל-git!**

ה-Service Role Key נותן גישה מלאה למסד הנתונים שלך. שמור אותו בטוח:

- ✅ השתמש ב-`.env.local` (לא נשמר ב-git)
- ✅ אל תעלה אותו ל-GitHub/GitLab
- ✅ אל תשתף אותו בפומבי

---

## מה המיגרציה עושה?

המיגרציה תיצור ותתקן:

1. ✅ **טבלת `food_diary`** - יוצרת את הטבלה החסרה
2. ✅ **טבלת `food_diary_meals`** - יוצרת את הטבלה החסרה
3. ✅ **RLS Policies** - מוסיפה הרשאות נכונות למתאמנים ומאמנים
4. ✅ **`trainee_goals`** - מוסיפה INSERT policy למתאמנים
5. ✅ **`trainee_habits`** - מוסיפה INSERT policy למתאמנים
6. ✅ **`habit_logs`** - מוודא שהטבלה קיימת עם RLS נכון

---

## בדיקה אחרי הרצת המיגרציה

אחרי הרצת המיגרציה, בדוק שהטבלאות קיימות:

```sql
-- בדוק שהטבלאות קיימות
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('food_diary', 'food_diary_meals', 'trainee_habits', 'habit_logs')
ORDER BY table_name;
```

אם כל הטבלאות מופיעות - המיגרציה הצליחה! 🎉

---

## פתרון בעיות

### שגיאה: "Missing SUPABASE_SERVICE_ROLE_KEY"
→ תן את ה-key דרך משתנה סביבה או דרך הסקריפט האינטראקטיבי

### שגיאה: "Management API not available"
→ זה נורמלי - Supabase לא מאפשר הרצת SQL ישירות דרך REST API
→ השתמש ב-Supabase Dashboard (אפשרות 1)

### שגיאה: "Table already exists"
→ זה בסדר! המיגרציה משתמשת ב-`CREATE TABLE IF NOT EXISTS`
→ היא רק תוסיף את מה שחסר

---

## שאלות?

אם יש בעיות, תגיד לי ואני אעזור! 🚀
