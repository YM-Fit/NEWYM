# 🔧 תיקון הטבלאות החסרות

## המצב הנוכחי

✅ **קיימות:**
- `food_diary` ✅
- `food_diary_meals` ✅  
- `trainee_goals` ✅

❌ **חסרות:**
- `trainee_habits` ❌
- `habit_logs` ❌

## פתרון מהיר

### אופציה 1: הרצת המיגרציה המלאה (מומלץ)

1. פתח: **https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new**
2. העתק את כל התוכן מ-`supabase/migrations/20260123000000_fix_trainee_goals_and_habits_rls.sql`
3. הדבק והרץ

### אופציה 2: הרצת רק את החלקים החסרים (מהיר יותר)

1. פתח: **https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new**
2. העתק את התוכן מ-`scripts/create-missing-tables-only.sql`
3. הדבק והרץ

---

## מה ה-SQL עושה

✅ יוצר את טבלת `trainee_habits` עם כל השדות והאינדקסים
✅ יוצר את טבלת `habit_logs` עם כל השדות והאינדקסים
✅ מוסיף RLS policies נכונים למתאמנים ומאמנים

---

## אחרי הרצת ה-SQL

השגיאות הבאות אמורות להיפתר:
- ✅ 404 עבור `trainee_habits` → הטבלה תיווצר
- ✅ 404 עבור `habit_logs` → הטבלה תיווצר

---

## בדיקה

אחרי הרצת ה-SQL, בדוק שהטבלאות קיימות:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('trainee_habits', 'habit_logs')
ORDER BY table_name;
```

אם שתי הטבלאות מופיעות - סיימת! 🎉
