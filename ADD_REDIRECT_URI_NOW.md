# ⚠️ הוספת Redirect URI ל-Google Cloud Console - הוראות מיידיות

## הבעיה
Google מחזיר שגיאה:
```
אין לך אפשרות להיכנס לאפליקציה הזו כי היא לא עומדת בדרישות מדיניות OAuth 2.0 של Google.
redirect_uri=https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
```

## ✅ הפתרון - שלבים פשוטים

### שלב 1: פתח את Google Cloud Console

**לחץ על הקישור הזה:**
```
https://console.cloud.google.com/apis/credentials
```

או:
1. פתח [Google Cloud Console](https://console.cloud.google.com/)
2. בחר את הפרויקט שלך
3. בתפריט השמאלי, לחץ על **APIs & Services**
4. לחץ על **Credentials**

### שלב 2: מצא את ה-OAuth 2.0 Client ID שלך

1. במסך **Credentials**, תראה רשימה של כל ה-OAuth clients שלך
2. **חפש את ה-Client ID** שלך (זה שמופיע ב-Supabase secrets)
3. **לחץ על השם** של ה-OAuth client (לא על העריכה, אלא על השם עצמו)

### שלב 3: הוסף את ה-Redirect URI

1. במסך שנפתח, גלול למטה למקטע **"Authorized redirect URIs"**
2. לחץ על **"+ ADD URI"** או על הכפתור **"Add URI"**
3. **העתק והדבק בדיוק את ה-URL הזה:**
   ```
   https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
   ```
   
   ⚠️ **חשוב מאוד:**
   - העתק **בדיוק** את ה-URL הזה
   - אין רווחים לפני או אחרי
   - אין trailing slash בסוף (`/`)
   - הכל באותיות קטנות
   - מתחיל ב-`https://` (לא `http://`)

4. לחץ **"Save"** או **"שמור"**

### שלב 4: המתן כמה שניות

Google צריך כמה שניות לעדכן את ההגדרות. המתן 10-30 שניות.

### שלב 5: נסה שוב

1. חזור לאפליקציה שלך
2. רענן את הדף (F5 או Cmd+R)
3. לחץ שוב על **"חבר Google Calendar"**
4. זה אמור לעבוד עכשיו! 🎉

---

## 🔍 איך לבדוק שהכל תקין

### בדיקה 1: וודא שה-URI נוסף

1. חזור ל-[Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. לחץ על ה-OAuth client שלך
3. גלול למטה ל-**"Authorized redirect URIs"**
4. **ודא שאתה רואה את ה-URL הזה ברשימה:**
   ```
   https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
   ```

### בדיקה 2: וודא שה-Secret ב-Supabase נכון

1. פתח: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/settings/functions
2. גלול למטה ל-**Secrets**
3. **ודא ש-`GOOGLE_REDIRECT_URI` מוגדר ל:**
   ```
   https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
   ```
4. אם לא, לחץ על העריכה ועדכן

---

## 🐛 אם עדיין לא עובד

### אפשרות 1: בדוק את ה-Logs

1. פתח: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/logs/edge-functions
2. בחר את ה-function `google-oauth`
3. חפש שגיאות או הודעות על redirect URI

### אפשרות 2: נסה למחוק cache

1. בדפדפן, לחץ `Ctrl+Shift+Delete` (או `Cmd+Shift+Delete` ב-Mac)
2. בחר "Cookies" ו-"Cached images"
3. לחץ "Clear data"
4. נסה שוב

### אפשרות 3: בדוק שה-Client ID נכון

1. ב-Google Cloud Console, העתק את ה-Client ID
2. ב-Supabase Dashboard, בדוק שה-`GOOGLE_CLIENT_ID` secret תואם בדיוק

---

## 📝 סיכום - מה צריך להיות זהה בשני מקומות

| מקום | שם | ערך |
|------|-----|-----|
| **Google Cloud Console** | Authorized redirect URIs | `https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback` |
| **Supabase Secrets** | `GOOGLE_REDIRECT_URI` | `https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback` |

**חשוב:** שני הערכים חייבים להיות **בדיוק זהים**, אות באות.

---

## 🎯 קישורים מהירים

- **Google Cloud Console Credentials:** https://console.cloud.google.com/apis/credentials
- **Supabase Functions Settings:** https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/settings/functions
- **Supabase Edge Functions Logs:** https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/logs/edge-functions

---

**אחרי שתוסיף את ה-Redirect URI, זה אמור לעבוד מיד!** 🚀
