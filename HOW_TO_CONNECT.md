# איך להתחבר למסד הנתונים ולעדכן אותו

## מה צריך לעשות

כדי שאני אוכל להתחבר למסד הנתונים שלך ולעדכן אותו, אני צריך את פרטי ההתחברות הבאים:

### אפשרות 1: דרך Supabase CLI (מומלץ)

1. **התקן Supabase CLI** (אם עדיין לא):
   ```bash
   npm install -g supabase
   ```
   או עם npx (ללא התקנה):
   ```bash
   npx supabase --version
   ```

2. **התחבר לפרויקט שלך**:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   את ה-project reference תוכל למצוא ב-Supabase Dashboard:
   - היכנס ל-[Supabase Dashboard](https://app.supabase.com)
   - בחר את הפרויקט שלך
   - לך ל-Settings → General
   - העתק את ה-Reference ID

3. **הרץ את המיגרציות**:
   ```bash
   npx supabase db push
   ```

### אפשרות 2: דרך הסקריפט שיצרתי

הרץ את הסקריפט עם פרטי ההתחברות:

```bash
VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key npm run db:connect
```

או במצב אינטראקטיבי:
```bash
npm run db:connect -- --interactive
```

את הפרטים תוכל למצוא ב-Supabase Dashboard:
- Settings → API → Project URL
- Settings → API → anon/public key

### אפשרות 3: דרך Dashboard

1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. בחר את הפרויקט שלך
3. לך ל-**SQL Editor**
4. העתק את תוכן כל קבצי המיגרציה מ-`supabase/migrations/` (בסדר כרונולוגי)
5. הרץ אותם אחד אחד

## מה אני יכול לעשות אחרי החיבור?

לאחר החיבור, אני אוכל:
- ✅ לבדוק אילו טבלאות קיימות
- ✅ לזהות טבלאות חסרות
- ✅ להריץ מיגרציות חסרות
- ✅ לעדכן את טיפוסי TypeScript
- ✅ לבדוק RLS policies

## צעדים הבאים

אם אתה רוצה שאני אעשה את זה:
1. תן לי את פרטי ההתחברות (URL ו-Key)
2. או הרץ את הפקודות למעלה
3. או תן לי גישה דרך Supabase CLI

אחרי זה אני אוכל לעדכן את המסד הנתונים שלך!
