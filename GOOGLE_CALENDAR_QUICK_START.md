# Google Calendar - Quick Start Guide

## ✅ מה כבר מוכן

התשתית הוקמה במלואה! כל הקבצים והקוד מוכנים לשימוש.

## 🚀 איך להתחיל להשתמש

### 1. הרץ את המיגרציות (אם לא רצת)

אם עדיין לא רצת את המיגרציות, הרץ אותן דרך Supabase Dashboard:

1. פתח: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new
2. העתק והדבק את התוכן מ:
   - `supabase/migrations/20260125000000_create_google_calendar_tables.sql`
   - `supabase/migrations/20260125000001_extend_trainees_crm.sql`
   - `supabase/migrations/20260125000002_create_client_interactions.sql`

### 2. Deploy את ה-Edge Functions

Deploy את ה-Edge Functions החדשים דרך Supabase Dashboard או CLI:

```bash
# דרך CLI (אם יש לך)
supabase functions deploy google-oauth
supabase functions deploy google-webhook
supabase functions deploy sync-google-calendar
```

או דרך Dashboard:
1. לך ל: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/functions
2. העלה את הקבצים מ:
   - `supabase/functions/google-oauth/`
   - `supabase/functions/google-webhook/`
   - `supabase/functions/sync-google-calendar/`

### 3. בדוק שהכל עובד

1. **פתח את האפליקציה**
2. **עבור לתפריט "יומן"** (Calendar)
3. **לחץ "הגדר Google Calendar"**
4. **לחץ "חבר Google Calendar"**
5. **התחבר עם Google Account שלך**

אם הכל תקין, תראה הודעת הצלחה וה-Calendar יתחיל להסונכרן!

## 📋 מה עובד עכשיו

### ✅ סנכרון אוטומטי
- כשמאמן יוצר אימון חדש → נוצר אירוע ב-Google Calendar
- כשמתעדכן אירוע ב-Google Calendar → מתעדכן האימון במערכת
- כשנמחק אירוע ב-Google Calendar → נמחק האימון (אם לא הושלם)

### ✅ כרטיסיות לקוחות
- כרטיסיות נוצרות אוטומטית מאירועים ב-Calendar
- סטטיסטיקות אירועים מתעדכנות אוטומטית
- אפשר לקשר מתאמן לכרטיס Calendar

### ✅ תצוגת Calendar
- תצוגת יומן חודשי עם כל האירועים
- אפשר ליצור אימון מאירוע
- אפשר לראות אירועים קרובים

## 🔧 פתרון בעיות

### האימות לא עובד
- ודא שה-secrets הוגדרו נכון ב-Supabase
- בדוק שה-Redirect URI תואם ב-Google Cloud Console
- ודא שה-Calendar API מופעל

### אימונים לא מסונכרנים
- בדוק ב-Dashboard של Google Calendar אם יש אירועים חדשים
- ודא ש-`auto_sync_enabled = true` בהגדרות
- נסה "סנכרון ידני עכשיו" בהגדרות

### שגיאות ב-Edge Functions
- בדוק את הלוגים ב-Supabase Dashboard → Edge Functions → Logs
- ודא שה-secrets מוגדרים נכון
- בדוק שה-tokens לא פגו (נדרשת refresh)

## 📚 קבצים חשובים

- `GOOGLE_CALENDAR_SETUP.md` - הוראות הגדרה מפורטות
- `supabase/functions/README_GOOGLE_CALENDAR.md` - תיעוד Edge Functions
- `src/api/googleCalendarApi.ts` - API layer
- `src/api/crmClientsApi.ts` - CRM API

## ✨ מה הלאה?

1. **נסה ליצור אימון** - הוא אמור להופיע ב-Google Calendar
2. **נסה ליצור אירוע ב-Google Calendar** - הוא אמור להופיע במערכת
3. **בדוק את כרטיסיות הלקוחות** - הן אמורות להתמלא מאירועים

בהצלחה! 🎉
