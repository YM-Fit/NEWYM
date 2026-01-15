# הגדרת Google Calendar Integration

## ⚡ הגדרה מהירה

### שלב 1: הגדרת Secrets ב-Supabase Dashboard

1. **פתח את הקישור:**
   ```
   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/settings/functions
   ```

2. **הוסף את ה-Secrets הבאים:**

   | Name | Value |
   |------|-------|
   | `GOOGLE_CLIENT_ID` | `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | `YOUR_GOOGLE_CLIENT_SECRET` |
   | `GOOGLE_REDIRECT_URI` | `https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback` |

   או השתמש בסקריפט:
   ```bash
   ./scripts/setup-google-calendar-secrets.sh
   ```

### שלב 2: הגדרת Redirect URI ב-Google Cloud Console

1. **פתח את הקישור:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **בחר את ה-OAuth 2.0 Client ID שלך**

3. **הוסף ל-Authorized redirect URIs:**
   ```
   https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
   ```

4. **שמור**

### שלב 3: הפעלת Google Calendar API

1. **פתח:**
   ```
   https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
   ```

2. **לחץ "Enable"**

---

## 📋 פירוט מלא

### 1. הגדרת Credentials ב-Google Cloud Console

כבר יש לך:
- **Client ID**: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET`

### 2. הגדרת Redirect URI ב-Google Cloud Console

1. פתח [Google Cloud Console](https://console.cloud.google.com/)
2. בחר את הפרויקט שלך
3. עבור ל-APIs & Services → Credentials
4. לחץ על ה-OAuth 2.0 Client ID שלך
5. הוסף ל-Authorized redirect URIs:
   ```
   https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
   ```
   (החלף `vqvczpxmvrwfkecpwovc` ב-project ref שלך)

### 3. הגדרת Secrets ב-Supabase Dashboard

**קישור ישיר:**
```
https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/settings/functions
```

**הוסף את ה-Secrets הבאים:**

| Secret Name | Value |
|-------------|-------|
| `GOOGLE_CLIENT_ID` | `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `YOUR_GOOGLE_CLIENT_SECRET` |
| `GOOGLE_REDIRECT_URI` | `https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback` |

**או העתק-הדבק:**
```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
```

### 4. וידוא Scopes ב-Google Cloud Console

ודא שה-OAuth consent screen כולל את ה-scopes הבאים:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

### 5. הפעלת Google Calendar API

1. ב-Google Cloud Console, עבור ל-APIs & Services → Library
2. חפש "Google Calendar API"
3. לחץ "Enable"

## בדיקת התקנה

לאחר ההגדרה:
1. פתח את האפליקציה
2. עבור להגדרות Google Calendar
3. לחץ "חבר Google Calendar"
4. התחבר עם Google Account שלך
5. אשר את ההרשאות

## פתרון בעיות

### שגיאה: "redirect_uri_mismatch"
- ודא שה-Redirect URI ב-Google Cloud Console תואם בדיוק ל-URL ב-Supabase

### שגיאה: "invalid_client"
- בדוק שה-Client ID וה-Client Secret נכונים
- ודא שה-secrets הוגדרו נכון ב-Supabase

### שגיאה: "access_denied"
- ודא שה-Calendar API מופעל
- בדוק שה-scopes נכונים

## הערות חשובות

- **אבטחה**: אל תשתף את ה-Client Secret בפומבי
- **Production**: ל-production, השתמש ב-credentials נפרדים
- **Rate Limits**: Google Calendar API מוגבל ל-1M requests/יום (מספיק לכל מטרה)
