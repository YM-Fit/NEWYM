# תיקוני Google Calendar

## 🔧 תיקונים שבוצעו

### 1. תיקון CORS
**בעיה:** Edge Function לא איפשר requests מ-StackBlitz/WebContainer origins

**תיקון:** עודכנה הפונקציה `getCorsHeaders` כדי לאשר:
- Origins מ-StackBlitz/WebContainer
- כל variations של localhost
- Origins מרשימת ALLOWED_ORIGINS

**קובץ:** `supabase/functions/google-oauth/index.ts`

### 2. הסרת README מ-edge functions
**בעיה:** ניסיון ל-deploy קובץ README כקובץ edge function

**תיקון:** קובץ `README_GOOGLE_CALENDAR.md` הוסר מתיקיית `supabase/functions/`

**הערה:** הקובץ עדיין קיים ב-root של הפרויקט

## ✅ מה לעשות עכשיו

1. **Deploy מחדש את ה-Edge Function:**
   ```bash
   # דרך Supabase Dashboard
   # לך ל: https://app.supabase.com/project/vqvczpxmvrwfkecpwovc/functions
   # Deploy מחדש את google-oauth
   ```

2. **נסה שוב:**
   - פתח את האפליקציה
   - עבור להגדרות Google Calendar
   - לחץ "חבר Google Calendar"

## 📝 הערות

- ה-CORS עכשיו תומך גם ב-development environments כמו StackBlitz
- ב-production, ודא ש-ALLOWED_ORIGINS מכיל את כל ה-origins הנדרשים
