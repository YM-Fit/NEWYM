# שיפורי לוגינג שגיאות Supabase

## בעיה
בקונסול הופיעו שגיאות חוזרות של "Supabase request failed Object" ללא פרטים ברורים על מה נכשל.

## שיפורים שבוצעו

### 1. שיפור Logger (`src/utils/logger.ts`)
- ✅ הוספת פורמט טוב יותר לשגיאות - אובייקטים מוצגים עם פרטים מלאים
- ✅ הוספת `_stringified` field לאובייקטים לצורך debugging
- ✅ שיפור התצוגה בקונסול עם קבוצות (console.group)

### 2. שיפור לוגינג שגיאות Supabase (`src/lib/supabase.ts`)
- ✅ **Deduplication של שגיאות** - מניעת לוגינג חוזר של אותה שגיאה תוך 5 שניות
- ✅ **ניקוי אוטומטי** של cache שגיאות ישנות
- ✅ **פילטור שגיאות צפויות** - שגיאות נפוצות כמו `PGRST116` (לא נמצא) ו-`23505` (unique violation) נשלחות ל-debug במקום error
- ✅ **לוגינג מפורט יותר** עם:
  - שם הטבלה
  - קוד שגיאה
  - הודעת שגיאה
  - פרטים נוספים (details, hint)
  - Stack trace לזיהוי מקור הבעיה
- ✅ **תצוגה נוחה בקונסול** עם קבוצות וצבעים

### 3. שיפור useSupabaseQuery (`src/hooks/useSupabaseQuery.ts`)
- ✅ הוספת פרטי query מלאים ללוגינג:
  - Cache key
  - Dependencies (עם ערכים)
  - Stack trace לזיהוי הקומפוננטה הקוראת
- ✅ תיקון useEffect להכללת `enabled` ב-dependencies
- ✅ לוגינג טוב יותר של שגיאות עם כל הפרטים

### 4. תיקון WorkoutDetails (`src/components/trainer/Workouts/WorkoutDetails.tsx`)
- ✅ הוספת בדיקה ש-workoutId תקין לפני ביצוע query
- ✅ טיפול בשגיאות עם logger במקום התעלמות
- ✅ הוספת import של logger

## תוצאות

### לפני השיפורים:
```
Supabase request failed Object
```

### אחרי השיפורים:
```
🔴 Supabase Error in: useSupabaseQuery
  📊 Table: trainees
  🔢 Error Code: PGRST116
  💬 Message: Could not find the requested resource
  📋 Details: ...
  💡 Hint: ...
  🔍 Additional Context: { dep_0: "some-id", stackTrace: "..." }
```

## שגיאות שדורשות תשומת לב

השגיאות הבאות נשלחות כ-debug (לא error) כי הן צפויות:
- `PGRST116` - Resource not found (נפוץ כשמחפשים אם רשומה קיימת)
- `23505` - Unique violation (נפוץ ב-upserts)

## איך לבדוק

1. **פתח את הקונסול** בדפדפן
2. **חפש שגיאות** - הן יהיו בתוך קבוצה עם שם ברור
3. **בדוק את הפרטים** - כל שגיאה מכילה:
   - איזה טבלה נכשלה
   - קוד שגיאה
   - הודעה מפורטת
   - stack trace לזיהוי מקור

## מניעת שגיאות חוזרות

המערכת עכשיו:
- ✅ לא תתעלם מאותה שגיאה אם היא מופיעה שוב תוך 5 שניות
- ✅ מנקה אוטומטית cache של שגיאות ישנות
- ✅ מסננת שגיאות צפויות שלא דורשות פעולה

## המלצות

אם אתה רואה שגיאות בקונסול:
1. בדוק את הפרטים המלאים בתוך הקבוצה
2. זהה את הקומפוננטה שכשלה באמצעות stack trace
3. בדוק אם זו שגיאה צפויה (למשל, חיפוש משהו שלא קיים)
4. אם זו שגיאה לא צפויה, בדוק:
   - RLS policies
   - תקינות ה-ID
   - Authentication state
