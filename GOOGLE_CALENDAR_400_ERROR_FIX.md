# תיקון שגיאת 400 - trainer_google_credentials

## בעיה

שגיאה חוזרת ונשנית בקונסול:
```
GET /rest/v1/trainer_google_credentials?select=auto_sync_enabled,sync_direction,sync_frequency,default_calendar_id
400 (Bad Request)
{"code":"42703","message":"column trainer_google_credentials.sync_direction does not exist"}
```

**הבעיה**: הקוד מנסה לבחור שדות (`sync_direction`, `sync_frequency`) שלא קיימים עדיין במסד הנתונים.

---

## שיפורים שבוצעו

### 1. תיקון `getGoogleCalendarStatus` (`src/api/googleCalendarApi.ts`)

#### לפני:
```typescript
.select('auto_sync_enabled, sync_direction, sync_frequency, default_calendar_id')
```

#### אחרי:
- ✅ **Fallback לשאילתה בסיסית** - בוחר רק שדות שתמיד קיימים
- ✅ **טיפול בשגיאות** - אם השדות החדשים לא קיימים, משתמש בערכי ברירת מחדל
- ✅ **שאילתה נפרדת לשדות מורחבים** - מנסה לקבל את השדות החדשים רק אם הם קיימים
- ✅ **לוגינג שגיאות משופר** - שימוש ב-`logSupabaseError` עם context מלא

**הלוגיקה החדשה:**
1. בוחר תחילה רק `auto_sync_enabled` ו-`default_calendar_id` (שדות בסיסיים)
2. אם יש שגיאה על שדה לא קיים (code 42703), מחזיר fallback עם ערכי ברירת מחדל
3. מנסה לקבל את השדות המורחבים (`sync_direction`, `sync_frequency`) בנפרד
4. אם השדות לא קיימים, משתמש בערכי ברירת מחדל (`bidirectional`, `realtime`)

### 2. הוספת Debounce (`src/components/trainer/Settings/GoogleCalendarSettings.tsx`)

- ✅ **Debounce mechanism** - לא טוען יותר מפעם אחת כל 2 שניות
- ✅ **Loading guard** - `loadingRef` מונע קריאות מקבילות
- ✅ **טיפול בשגיאות צפויות** - לא מציג שגיאות על שדות חסרים

**השיפורים:**
- מניעת קריאות חוזרות ונשנות
- חוויית משתמש טובה יותר
- פחות עומס על השרת

---

## תוצאות

### לפני התיקון:
- ❌ עשרות קריאות חוזרות של אותה שאילתה
- ❌ שגיאות 400 חוזרות בקונסול
- ❌ חוויית משתמש גרועה

### אחרי התיקון:
- ✅ קריאה אחת בלבד (עם debounce)
- ✅ אין שגיאות אם השדות לא קיימים (fallback לערכי ברירת מחדל)
- ✅ לוגינג ברור של שגיאות אמיתיות
- ✅ חוויית משתמש טובה

---

## איך זה עובד עכשיו

1. **טעינה ראשונית**: בוחר רק שדות בסיסיים
2. **אם שדות חדשים קיימים**: משתמש בהם
3. **אם שדות חדשים לא קיימים**: משתמש בערכי ברירת מחדל (`bidirectional`, `realtime`)
4. **Debounce**: מניעת קריאות חוזרות בתוך 2 שניות

---

## הערות חשובות

### אם תרצה להוסיף את השדות למסד הנתונים:

יש migration קיים ב:
```
supabase/migrations/20260126000000_add_sync_direction_to_credentials.sql
```

להפעלה, הרץ את ה-migration הזה ב-Supabase Dashboard → SQL Editor.

אחרי שרץ ה-migration, השדות יהיו זמינים והקוד ישתמש בהם אוטומטית.

### ללא Migration:

הקוד יעבוד גם בלי ה-migration - הוא פשוט ישתמש בערכי ברירת מחדל.

---

## בדיקה

אחרי התיקון, אתה אמור לראות:
- ✅ **אין יותר שגיאות 400 חוזרות**
- ✅ **קריאה אחת בלבד** (עם debounce)
- ✅ **המערכת עובדת** גם בלי השדות החדשים

אם עדיין יש שגיאות, הן יהיו עם פרטים מלאים בקונסול בזכות ה-`logSupabaseError` המשופר.

---

**תאריך תיקון**: 2025-01-27  
**סטטוס**: ✅ תוקן ומתועד
