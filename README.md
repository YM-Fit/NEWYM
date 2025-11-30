# YM Coach - מערכת ניהול מתאמנים למאמנים אישיים

מערכת מקיפה לניהול מתאמנים, אימונים, מדידות וציוד עבור מאמנים אישיים.

## 🚀 טכנולוגיות

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Authentication + Real-time)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

## 📋 דרישות מקדימות

- Node.js >= 18
- npm או yarn
- חשבון Supabase (חינם)

## ⚙️ התקנה

### 1. שכפול הפרויקט

```bash
git clone <repository-url>
cd NEWYM
```

### 2. התקנת תלויות

```bash
npm install
```

### 3. הגדרת משתני סביבה

צור קובץ `.env.local` בתיקייה הראשית:

```bash
cp .env.example .env.local
```

ערוך את `.env.local` והוסף את פרטי Supabase שלך:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**איך למצוא את הפרטים?**
1. היכנס ל-[Supabase Dashboard](https://app.supabase.com)
2. בחר את הפרויקט שלך
3. לך ל-Settings > API
4. העתק את Project URL ו-anon/public key

### 4. הרצת המערכת

```bash
npm run dev
```

המערכת תהיה זמינה ב-`http://localhost:5173`

## 🗄️ הגדרת מסד הנתונים

הרץ את כל ה-migrations שב-`supabase/migrations/` בסדר כרונולוגי:

1. היכנס ל-Supabase Dashboard
2. לך ל-SQL Editor
3. הרץ כל קובץ migration לפי סדר (מהישן לחדש)

או השתמש ב-Supabase CLI:

```bash
supabase db push
```

## 📱 תכונות עיקריות

### ניהול מתאמנים
- ✅ הוספה, עריכה ומחיקה של מתאמנים
- ✅ **חיפוש מתקדם** - חיפוש לפי שם, טלפון, אימייל
- ✅ **סינון** - סנן לפי סטטוס (פעיל, חדש, בחופשה, לא פעיל)
- ✅ תמיכה באימונים אישיים וזוגיים
- ✅ פרופיל מפורט לכל מתאמן

### ניהול אימונים
- ✅ תיעוד אימונים עם תרגילים מרובים
- ✅ תמיכה ב-Supersets ו-Dropsets
- ✅ מעקב אחר RPE (Rate of Perceived Exertion)
- ✅ חישוב נפח אימון אוטומטי
- ✅ היסטוריית אימונים מלאה
- ✅ שכפול אימונים
- ✅ עריכה ומחיקה של אימונים

### מעקב מדידות
- ✅ מדידות משקל וגוף (Tanita / ידני)
- ✅ גרפים להתקדמות
- ✅ מדידות היקפים (חזה, מותניים, ירכיים, זרועות, ירכיים)

### ניהול ציוד
- ✅ מעקב אחר ציוד (גומיות, מוטות, כדורים וכו')
- ✅ ארגון לפי קטגוריות
- ✅ הוספת ציוד לסטים

## 🎯 תיקונים שבוצעו (2024)

### 🔐 אבטחה ותצורה
- ✅ הוספת `.env.example` ו-`.env.local.example`
- ✅ Error Boundary למניעת קריסות

### 💪 Type Safety
- ✅ החלפת `any` ב-interfaces מוגדרים:
  - `WorkoutSummary`
  - `DetailedWorkout`
  - `MeasurementData`
  - `SetData`

### 🎨 UX/UI
- ✅ **מערכת Toast Notifications** - החלפת `alert()` בהודעות מעוצבות
- ✅ **חיפוש ומסנן פעיל** ב-TraineesList
- ✅ הצגת מספר תוצאות מסוננות
- ✅ כפתור "נקה הכל" למסננים

### 📊 שיפורים נוספים
- ✅ Tailwind animations (slide-in-right)
- ✅ טיפול משופר בשגיאות

## 🛠️ Scripts זמינים

```bash
# הרצה במצב פיתוח
npm run dev

# בנייה לפרודקשן
npm run build

# בדיקת TypeScript
npm run typecheck

# ESLint
npm run lint

# תצוגה מקדימה של build
npm run preview
```

## 📖 שימוש ב-Toast Notifications

```tsx
import { useToast } from './contexts/ToastContext';

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const handleAction = async () => {
    try {
      // Your action...
      showSuccess('הפעולה הושלמה בהצלחה');
    } catch (error) {
      showError('אירעה שגיאה');
    }
  };

  return <button onClick={handleAction}>לחץ כאן</button>;
}
```

## 🎓 מבנה הפרויקט

```
src/
├── components/
│   ├── Auth/           # רכיבי התחברות והרשמה
│   ├── Dashboard/      # ראשי - סקירה כללית
│   ├── Equipment/      # ניהול ציוד
│   ├── Layout/         # Header, Sidebar
│   ├── Measurements/   # מדידות ושקילות
│   ├── Trainees/       # ניהול מתאמנים
│   ├── Workouts/       # ניהול אימונים
│   ├── ErrorBoundary.tsx
│   ├── Toast.tsx       # הודעות Toast
│   └── MainApp.tsx     # App ראשי
├── contexts/
│   ├── AuthContext.tsx     # ניהול אימות
│   └── ToastContext.tsx    # ניהול הודעות
├── lib/
│   └── supabase.ts     # Supabase client
├── types/
│   ├── index.ts        # Types משותפים
│   └── database.ts     # Database schema types
├── App.tsx
└── main.tsx
```

## 🐛 בעיות נפוצות

### המערכת לא עולה

1. ודא שהתקנת את התלויות: `npm install`
2. בדוק שקובץ `.env.local` קיים עם ערכים תקינים
3. נקה cache: `rm -rf node_modules .vite && npm install`

### שגיאות Database

1. ודא שהרצת את כל ה-migrations
2. בדוק RLS policies ב-Supabase Dashboard
3. ודא שהמפתח ב-`.env.local` תקין

### אין תרגילים

התרגילים נוצרים אוטומטית בהרשמה. אם אין תרגילים:
1. התנתק והתחבר מחדש
2. או הרץ את migration `add_default_exercises_hebrew.sql`

## 🔜 תכונות עתידיות (Roadmap)

- [ ] Pagination למתאמנים ואימונים
- [ ] React Query לניהול state
- [ ] PWA Support (offline mode)
- [ ] Templates לאימונים
- [ ] Nutrition tracking
- [ ] Dashboard משופר עם גרפים
- [ ] Export לPDF/Excel
- [ ] Email verification
- [ ] Password reset UI
- [ ] Tests (Unit + E2E)

## 🤝 תרומה

Pull requests מתקבלים בברכה! לפני שליחת PR:

1. הרץ `npm run typecheck`
2. הרץ `npm run lint`
3. ודא שהקוד עובד ללא שגיאות

## 📄 רישיון

MIT License - ראה קובץ LICENSE לפרטים

## 📞 תמיכה

לשאלות או בעיות, פתח Issue ב-GitHub.

---

**Built with ❤️ by YM Coach Team**
