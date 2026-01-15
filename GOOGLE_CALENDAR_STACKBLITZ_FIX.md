# Google Calendar - StackBlitz Fix

## הבעיה
ב-StackBlitz, redirect כפול (אפליקציה → Edge Function → Google) לא עובד כראוי. ה-Edge Function מחזיר 302, אבל הדפדפן לא עוקב אחרי ה-redirect.

## פתרון מומלץ

### אופציה 1: פתיחה בחלון חדש (Popup)
פתיחה בחלון חדש במקום redirect מלא:

```typescript
const popup = window.open(
  `${supabaseUrl}/functions/v1/google-oauth?trainer_id=${user.id}`,
  'google-oauth',
  'width=500,height=600'
);

// Listen for popup close
const checkClosed = setInterval(() => {
  if (popup.closed) {
    clearInterval(checkClosed);
    // Reload status
    loadStatus();
  }
}, 1000);
```

### אופציה 2: בניית URL ישירות
בניית ה-Google OAuth URL ישירות מהקליינט (אבל צריך לשמור את ה-state מאובטח):

```typescript
// Build OAuth URL directly
const state = btoa(JSON.stringify({ trainer_id: user.id }));
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${GOOGLE_CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events&` +
  `access_type=offline&` +
  `prompt=consent&` +
  `state=${state}`;

window.location.href = authUrl;
```

**אבל:** זה דורש לחשוף את ה-Client ID בצד הקליינט, וזה בסדר.

### אופציה 3: בדיקת Redirect ב-StackBlitz
ייתכן שב-StackBlitz יש הגבלות על redirects. בדוק:
1. האם יש console errors בעת ה-redirect?
2. האם הדפדפן חוסם את ה-redirect?
3. האם יש popup blockers?

## בדיקות

1. **פתח Network tab** ב-Developer Tools
2. **לחץ "חבר Google Calendar"**
3. **בדוק:**
   - האם יש בקשה ל-`/functions/v1/google-oauth`?
   - מה ה-status code?
   - מה ה-response headers?
   - האם יש `Location` header ב-response?

4. **אם יש Location header**, בדוק:
   - מה ה-URL?
   - האם הדפדפן עוקב אחרי ה-redirect?

## פתרון מיידי לבדיקה

נסה לפתוח את ה-URL ישירות בדפדפן:
```
https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth?trainer_id=YOUR_TRAINER_ID
```

אם זה עובד (מגיע ל-Google OAuth), הבעיה היא בקוד הקליינט.
אם זה לא עובד, הבעיה היא ב-Edge Function או ב-Google OAuth setup.
