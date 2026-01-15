# תיקון שגיאת redirect_uri_mismatch

## הבעיה
Google מחזיר שגיאה `redirect_uri_mismatch` כי ה-Redirect URI שמוגדר ב-Google Cloud Console לא תואם למה שה-Edge Function שולח.

## פתרון

### שלב 1: בדוק מה ה-Redirect URI שנשלח

פתח את **Edge Functions logs** ב-Supabase Dashboard וחפש את השורה:
```
[google-oauth] Redirect URI: ...
```

זה יציג את ה-Redirect URI המדויק שה-Edge Function שולח ל-Google.

### שלב 2: הוסף את ה-Redirect URI ל-Google Cloud Console

1. **פתח:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **בחר את ה-OAuth 2.0 Client ID שלך** (זה עם ה-Client ID: `155837870964-44voh3f5eqhpdc4kmi4eqgv63mj50vl6`)

3. **במקטע "Authorized redirect URIs", הוסף:**
   ```
   https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
   ```
   
   **חשוב:** ה-URL חייב להיות **בדיוק** אותו דבר, כולל:
   - `https://` (לא `http://`)
   - לא trailing slash בסוף
   - אותיות קטנות/גדולות מדויקות

4. **שמור** (Save)

### שלב 3: וידוא שהמשתנה ב-Supabase נכון

1. **פתח:**
   ```
   https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/settings/functions
   ```

2. **ודא ש-`GOOGLE_REDIRECT_URI` מוגדר ל:**
   ```
   https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
   ```

3. **אם לא, עדכן אותו**

### שלב 4: נסה שוב

1. רענן את הדף
2. לחץ שוב "חבר Google Calendar"
3. זה אמור לעבוד עכשיו!

## הערות חשובות

- ה-Redirect URI **חייב** להיות תואם **בדיוק** בשני המקומות:
  - Google Cloud Console → Authorized redirect URIs
  - Supabase → GOOGLE_REDIRECT_URI secret

- אין trailing slash בסוף ה-URL

- אם עדיין לא עובד, בדוק ב-Edge Functions logs מה ה-URL המדויק שנשלח

## בדיקה מהירה

פתח את ה-URL הזה ישירות בדפדפן (החלף `YOUR_TRAINER_ID`):
```
https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth?trainer_id=YOUR_TRAINER_ID
```

אם זה עובד (מגיע ל-Google), אז הבעיה הייתה ב-Redirect URI.
אם עדיין יש שגיאה, בדוק את ה-logs.
