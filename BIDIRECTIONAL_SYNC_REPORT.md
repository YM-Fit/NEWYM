# דוח בדיקת סנכרון דו-כיווני - Google Calendar

**תאריך בדיקה:** 2026-07-20  
**מאמן נבדק:** 1971981f-95d4-4a2b-b50a-fe9f1df25b24

## סיכום ביצועים

### ✅ מה שעובד

1. **סנכרון מ-Google Calendar למערכת (from_google)**
   - ✅ **841 רשומות** מסונכרנות בהצלחה
   - ✅ כל האירועים מ-Google Calendar נוצרים כעבודות במערכת
   - ✅ Webhook עובד ומעדכן את המערכת כשמשנים אירועים ב-Google Calendar

2. **הגדרות מאמן**
   - ✅ `sync_direction` = `'bidirectional'` (מוגדר נכון)
   - ✅ `auto_sync_enabled` = `true`
   - ✅ יש חיבור ל-Google Calendar

3. **סטטוס סנכרון**
   - ✅ **867 רשומות** בסך הכל
   - ✅ **867 מסונכרנות** (100%)
   - ✅ **0 נכשלו**

### ⚠️ בעיות שזוהו

1. **סנכרון מהמערכת ל-Google Calendar (to_google)**
   - ⚠️ **0 רשומות** עם `sync_direction = 'to_google'`
   - ⚠️ רק **26 רשומות** עם `sync_direction = 'bidirectional'`
   - ⚠️ **7 אימונים** לא מסונכרנים (מתוך 856 באותו חודש)

2. **Token פג תוקף**
   - ⚠️ ה-token של Google Calendar פג תוקף
   - ⚠️ צריך לרענן את ה-token

## ניתוח מפורט

### התפלגות כיווני סנכרון

```
סה"כ רשומות: 867
├── bidirectional: 26 (3%)
├── from_google: 841 (97%)
└── to_google: 0 (0%)
```

### אימונים בחודש האחרון

```
סה"כ אימונים: 856
├── מסונכרנים: 849 (99.2%)
│   ├── bidirectional: 26
│   └── from_google: 823
└── לא מסונכרנים: 7 (0.8%)
```

## מסקנות

### ✅ הסנכרון הדו-כיווני **עובד חלקית**:

1. **מ-Google Calendar למערכת** ✅
   - Webhook מקבל עדכונים מ-Google Calendar
   - אירועים נוצרים כעבודות במערכת
   - עדכונים באירועים משתקפים בעבודות

2. **מהמערכת ל-Google Calendar** ⚠️
   - רוב האימונים נוצרים מ-Google Calendar (לא מהמערכת)
   - יש רק 26 רשומות עם `bidirectional` (כנראה אימונים שנוצרו במערכת)
   - ייתכן שכאשר יוצרים אימון חדש במערכת, הוא לא מסונכרן ל-Google Calendar

## המלצות לתיקון

### 1. בדיקת סנכרון מהמערכת ל-Google Calendar

**לבדוק:**
- האם כאשר יוצרים אימון חדש במערכת, הוא מסונכרן ל-Google Calendar?
- האם ה-`save-workout` Edge Function מנסה לסנכרן ל-Google Calendar?
- האם יש שגיאות ב-logs של `save-workout`?

**קוד לבדיקה:**
```typescript
// supabase/functions/save-workout/index.ts
// שורה 711-713: בודק אם צריך לסנכרן
const shouldSyncToGoogle = credentials.auto_sync_enabled && 
  (credentials.sync_direction === 'to_google' || 
   credentials.sync_direction === 'bidirectional');
```

### 2. רענון Token

**לבצע:**
1. לפתוח את ההגדרות של Google Calendar
2. לנתק ולחבר מחדש את Google Calendar
3. או להשתמש ב-`google-oauth/refresh` endpoint

### 3. בדיקה ידנית

**לבצע בדיקה:**
1. ליצור אימון חדש במערכת
2. לבדוק אם הוא מופיע ב-Google Calendar
3. לבדוק את `google_calendar_sync` table - האם נוצרה רשומה?
4. לבדוק את ה-logs של `save-workout` Edge Function

## בדיקות נוספות מומלצות

### בדיקה 1: יצירת אימון חדש במערכת
```sql
-- לפני יצירת אימון
SELECT COUNT(*) FROM google_calendar_sync WHERE sync_direction = 'bidirectional';

-- אחרי יצירת אימון - לבדוק אם נוספה רשומה
SELECT * FROM google_calendar_sync 
WHERE workout_id = '<NEW_WORKOUT_ID>'
ORDER BY created_at DESC;
```

### בדיקה 2: עדכון אימון קיים
1. לעדכן אימון קיים במערכת
2. לבדוק אם האירוע ב-Google Calendar מתעדכן
3. לבדוק את `last_synced_at` ב-`google_calendar_sync`

### בדיקה 3: מחיקת אימון
1. למחוק אימון במערכת
2. לבדוק אם האירוע נמחק מ-Google Calendar
3. לבדוק אם רשומת הסנכרון נמחקה

## סיכום

הסנכרון הדו-כיווני **עובד חלקית**:
- ✅ **מ-Google Calendar למערכת** - עובד מצוין
- ⚠️ **מהמערכת ל-Google Calendar** - צריך לבדוק מדוע רוב האימונים לא מסונכרנים

**המלצה:** לבצע בדיקה ידנית של יצירת אימון חדש במערכת ולבדוק אם הוא מסונכרן ל-Google Calendar.
