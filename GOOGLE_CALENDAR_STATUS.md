# Google Calendar Integration - Status

## ✅ מה בוצע

### 1. מסד נתונים
- ✅ נוצרו 3 טבלאות חדשות:
  - `trainer_google_credentials` - אחסון OAuth credentials
  - `google_calendar_sync` - מעקב סנכרון אירועים
  - `google_calendar_clients` - כרטיסיות לקוחות מבוססות Calendar
  - `client_interactions` - מעקב אינטראקציות
- ✅ הורחבה טבלת `trainees` עם שדות CRM

### 2. Edge Functions
- ✅ `google-oauth` - OAuth flow מלא עם תמיכה ב-GET callback
- ✅ `google-webhook` - קבלת Push Notifications מ-Google
- ✅ `sync-google-calendar` - סנכרון תקופתי
- ✅ עדכון `save-workout` - סנכרון אוטומטי ל-Calendar

### 3. Frontend
- ✅ `GoogleCalendarSettings` - הגדרות Calendar עם טיפול ב-OAuth redirect
- ✅ `CalendarView` - תצוגת Calendar חודשית
- ✅ עדכון `TraineeCard` - אינדיקטור Calendar sync
- ✅ עדכון `Sidebar` ו-`MobileSidebar` - ניווט ל-Calendar
- ✅ עדכון `WorkoutSession` - אינטגרציה עם Calendar

### 4. API Layer
- ✅ `googleCalendarApi.ts` - API מלא ל-Google Calendar
- ✅ `crmClientsApi.ts` - CRM API
- ✅ עדכון `workoutApi.ts`

### 5. Utils
- ✅ `calendarStats.ts` - חישוב סטטיסטיקות
- ✅ `googleCalendarHelpers.ts` - פונקציות עזר

### 6. הגדרות
- ✅ Secrets מוגדרים ב-Supabase (לפי המשתמש)
- ✅ Redirect URI מוגדר ב-Google Cloud Console (לפי המשתמש)

## 🔄 מה נדרש לעשות

### 1. Deploy Edge Functions
אם לא deploy-תם את ה-Functions החדשים:

```bash
# דרך Supabase Dashboard
# לך ל: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/functions
# העלה את הקבצים מ:
# - supabase/functions/google-oauth/
# - supabase/functions/google-webhook/
# - supabase/functions/sync-google-calendar/
```

### 2. הרץ את המיגרציות
אם לא רצת את המיגרציות:

1. פתח: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/sql/new
2. העתק והדבק את התוכן מ:
   - `supabase/migrations/20260125000000_create_google_calendar_tables.sql`
   - `supabase/migrations/20260125000001_extend_trainees_crm.sql`
   - `supabase/migrations/20260125000002_create_client_interactions.sql`

### 3. בדוק שהכל עובד
1. פתח את האפליקציה
2. עבור להגדרות Google Calendar
3. לחץ "חבר Google Calendar"
4. התחבר עם Google
5. אמור לראות הודעת הצלחה

## 📝 הערות טכניות

### OAuth Flow
- Google מחזיר GET request עם `code` ו-`state` ב-URL
- ה-callback מטפל ב-GET (לא POST)
- אחרי אימות מוצלח, המשתמש מועבר חזרה לאפליקציה עם `?google_calendar=connected`
- ה-frontend מזהה את ה-parameter ומציג הודעת הצלחה

### Secrets הנדרשים
```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
APP_URL=http://localhost:5173 (או URL של production)
```

### Token Refresh
- ה-system מרענן tokens אוטומטית לפני שהם פגים
- Refresh token נשמר ב-DB ומשומש אוטומטית

## ✨ מוכן לשימוש!

המערכת מוכנה לשימוש מלא עם Google Calendar! 🎉
