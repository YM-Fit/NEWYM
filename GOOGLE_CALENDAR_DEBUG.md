# Google Calendar Integration - Debug Guide

## שינויים אחרונים

### 1. שיפור זיהוי Path
- תוקן כך שיזהה גם `/functions/v1/google-oauth` (לא רק `/google-oauth`)
- נוספה בדיקה טובה יותר של callback path

### 2. שיפור זיהוי APP_URL
- מנסה לחלץ מה-referer header
- אם לא, מנסה מה-origin
- Fallback ל-`http://localhost:5173`

### 3. שיפור CORS Headers
- זיהוי טוב יותר של StackBlitz/WebContainer origins
- יותר גמיש בפיתוח

### 4. הוספת Logging
- כל בקשה נרשמת ל-console
- ניתן לראות מה קורה ב-Edge Functions logs

## בדיקות שצריך לבצע

### 1. בדיקת Environment Variables
וודא שה-environment variables מוגדרים ב-Supabase Dashboard:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (אופציונלי - default: `${SUPABASE_URL}/functions/v1/google-oauth/callback`)
- `APP_URL` (אופציונלי - לחזרה מהאימות)

### 2. בדיקת Google Console
וודא שב-Google Cloud Console:
- Redirect URI מוגדר: `https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback`
- ה-Client ID וה-Client Secret תואמים

### 3. בדיקת Console בדפדפן
פתח את Developer Tools (F12) ובדוק:
- שגיאות ב-Console
- שגיאות ב-Network tab
- האם יש בקשות OPTIONS (preflight) שנכשלות?

### 4. בדיקת Edge Functions Logs
ב-Supabase Dashboard → Edge Functions → google-oauth → Logs:
- האם יש בקשות שמגיעות?
- מה הסטטוס קוד שמתקבל?
- האם יש שגיאות?

### 5. Flow שצריך לקרות
1. המשתמש לוחץ "חבר Google Calendar"
2. הדפדפן עושה redirect ל-`/functions/v1/google-oauth?trainer_id=...`
3. ה-Edge Function מחזיר 302 redirect ל-Google OAuth
4. המשתמש מאשר ב-Google
5. Google מחזיר ל-`/functions/v1/google-oauth/callback?code=...&state=...`
6. ה-Edge Function מחליף את ה-code ל-tokens
7. ה-Edge Function שומר את ה-tokens ב-DB
8. ה-Edge Function מחזיר redirect חזרה ל-app עם `?google_calendar=connected`
9. ה-app מזהה את ה-query parameter ומציג הודעת הצלחה

## פתרון בעיות נפוצות

### שגיאת CORS
- **סימפטום**: "Access-Control-Allow-Origin" error ב-console
- **פתרון**: בדוק שה-origin מזוהה נכון ב-`getCorsHeaders`
- **פתרון נוסף**: בדוק ב-Edge Functions logs מה ה-origin שמגיע

### לא מגיע ל-Google OAuth
- **סימפטום**: לחץ על "חבר" אבל לא קורה כלום
- **פתרון**: בדוק ב-Network tab האם יש בקשה ל-`/functions/v1/google-oauth`
- **פתרון נוסף**: בדוק ב-Edge Functions logs האם יש בקשות

### חוזר מהאימות אבל לא נשמר
- **סימפטום**: עובר את Google OAuth אבל לא מחובר
- **פתרון**: בדוק ב-Edge Functions logs את ה-callback
- **פתרון נוסף**: בדוק ב-DB אם יש רשומה ב-`trainer_google_credentials`

### שגיאה ב-Redirect URI
- **סימפטום**: Google אומר "redirect_uri_mismatch"
- **פתרון**: וודא שב-Google Console ה-Redirect URI הוא בדיוק:
  `https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback`

## פריסה מחדש

לאחר שינויים ב-Edge Function, צריך לפרוס מחדש:
```bash
npx supabase functions deploy google-oauth
```

או דרך Supabase Dashboard → Edge Functions → google-oauth → Deploy

## בדיקת תקינות

לאחר הפריסה, בדוק:
1. Edge Functions logs - האם יש בקשות?
2. DB - האם יש רשומות ב-`trainer_google_credentials`?
3. Frontend - האם הסטטוס מתעדכן?
