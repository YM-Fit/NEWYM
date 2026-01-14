# 🚀 מדריך מהיר להרצת המיגרציה

## ⚡ הדרך המהירה ביותר (2 דקות)

### שלב 1: פתח את SQL Editor
לחץ על הקישור הזה:
**https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new**

### שלב 2: העתק את ה-SQL
פתח את הקובץ:
```
supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql
```

העתק את **כל התוכן** (Ctrl+A / Cmd+A, ואז Ctrl+C / Cmd+C)

### שלב 3: הדבק והרץ
1. הדבק ב-SQL Editor (Ctrl+V / Cmd+V)
2. לחץ על כפתור **"Run"** (או Ctrl+Enter / Cmd+Enter)
3. ✅ סיימת!

---

## מה המיגרציה עושה?

✅ יוצרת טבלת `food_diary` (חסרה!)
✅ יוצרת טבלת `food_diary_meals` (חסרה!)
✅ מוסיפה INSERT policy למתאמנים על `trainee_goals`
✅ מוודאת ש-`trainee_habits` קיימת עם RLS נכון
✅ מוודאת ש-`habit_logs` קיימת עם RLS נכון

---

## אחרי הרצת המיגרציה

השגיאות הבאות אמורות להיפתר:

- ✅ 404 עבור `trainee_habits` → הטבלה תיווצר
- ✅ 404 עבור `habit_logs` → הטבלה תיווצר
- ✅ 404 עבור `food_diary_entries` → הקוד כבר תוקן
- ✅ 403 עבור `trainee_goals` → יוסף INSERT policy
- ✅ 400 עבור `meals` → אמור להיפתר

---

## בדיקה

אחרי הרצת המיגרציה, בדוק שהטבלאות קיימות:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('food_diary', 'food_diary_meals', 'trainee_habits', 'habit_logs')
ORDER BY table_name;
```

אם כל הטבלאות מופיעות - המיגרציה הצליחה! 🎉

---

## למה אני לא יכול להריץ את זה אוטומטית?

Supabase לא מאפשר הרצת SQL ישירות דרך REST API מסיבות אבטחה. הדרך היחידה היא:
- ✅ דרך Dashboard (מהיר וקל)
- ✅ דרך Supabase CLI (אם מותקן)

זה לוקח 2 דקות בלבד! 🚀
