# אפיון מפורט של מערכת NEWYM

## 📋 סקירה כללית

**NEWYM** היא מערכת ניהול אימונים וכושר גופני דו-צדדית, המיועדת למאמנים ומתאמנים. המערכת מספקת פתרון מקיף לניהול אימונים, מדידות, תזונה, מעקב התקדמות ותקשורת בין מאמנים למתאמנים.

---

## 🏗️ ארכיטקטורה וטכנולוגיות

### Frontend
- **Framework**: React 18.3.1 עם TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Charts**: Recharts 3.3.0

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime Subscriptions
- **Edge Functions**: Supabase Functions (TypeScript)

### מבנה הפרויקט
```
src/
├── api/              # API clients ו-logic
├── components/       # רכיבי React
│   ├── auth/        # התחברות והרשמה
│   ├── common/      # רכיבים משותפים
│   ├── layout/      # Header, Sidebar, Navigation
│   ├── trainee/     # אפליקציית מתאמן
│   └── trainer/     # אפליקציית מאמן
├── contexts/         # React Contexts (Auth, Theme)
├── hooks/           # Custom React Hooks
├── lib/             # ספריות חיצוניות
├── types/           # TypeScript types
└── utils/           # פונקציות עזר
```

---

## 👥 שני סוגי משתמשים

### 1. מאמן (Trainer)
- ניהול מתאמנים מרובים
- יצירת ותכנון אימונים
- מעקב מדידות והתקדמות
- ניהול תכניות תזונה
- תקשורת עם מתאמנים
- דוחות ואנליטיקה

### 2. מתאמן (Trainee)
- צפייה בתכנית אימונים
- רישום אימונים עצמאיים
- מעקב מדידות ושקילות
- יומן אוכל
- כלים מנטליים
- מעקב מטרות והרגלים

---

## 🎯 תכונות עיקריות - מאמן

### 1. ניהול מתאמנים
- ✅ רשימת מתאמנים עם סטטוסים (active, inactive, vacation, new)
- ✅ יצירת מתאמן חדש (יחיד או זוג)
- ✅ עריכת פרטי מתאמן
- ✅ מחיקת מתאמן
- ✅ תצוגת פרופיל מלא
- ✅ ניהול גישה (TraineeAccessManager)
- ✅ אינדיקטורים לשקילות חדשות

### 2. אימונים (Workouts)
- ✅ יצירת אימון חדש (אישי או זוגי)
- ✅ עריכת אימון קיים
- ✅ שכפול אימון
- ✅ מחיקת אימון
- ✅ תצוגת היסטוריית אימונים
- ✅ חישוב נפח אימון (Volume)
- ✅ תמיכה בסופר-סטים ודרופ-סטים
- ✅ RPE (Rate of Perceived Exertion)
- ✅ הוראות תרגילים
- ✅ שמירה אוטומטית
- ✅ תצוגת התקדמות (WorkoutProgress)

### 3. מדידות (Measurements)
- ✅ יצירת מדידה חדשה (Tanita או ידני)
- ✅ עריכת מדידה קיימת
- ✅ תצוגת היסטוריית מדידות
- ✅ גרפים דינמיים
- ✅ מדדים: משקל, אחוז שומן, מסת שריר, אחוז מים, BMI, BMR, גיל מטבולי
- ✅ מדידות היקפים (חזה, בטן, ירכיים, זרועות)
- ✅ תמיכה במדידות זוג (member_1, member_2)

### 4. שקילות (Weigh-ins)
- ✅ **קריאות מאזניים בזמן אמת** - זיהוי אוטומטי של מתאמנים
- ✅ שמירת שקילות מ-Tanita
- ✅ תצוגת שקילות מהבית (trainee_self_weights)
- ✅ סימון שקילות כנראה/לא נראה
- ✅ אינדיקטורים לשקילות חדשות
- ✅ הערות ושמירת תאריך מותאם

### 5. תכניות אימונים (Workout Plans)
- ✅ בניית תכנית אימונים (WorkoutPlanBuilder)
- ✅ הקצאת תכנית למתאמן
- ✅ תצוגת תכנית בממשק המתאמן

### 6. תכניות תזונה (Meal Plans)
- ✅ בניית תכנית תזונה (MealPlanBuilder)
- ✅ הקצאת תכנית למתאמן
- ✅ תצוגת תכנית בממשק המתאמן

### 7. יומן אוכל (Food Diary)
- ✅ צפייה ביומן האוכל של המתאמן
- ✅ מעקב אחר צריכת קלוריות

### 8. אירובי (Cardio)
- ✅ ניהול אירובי (CardioManager)
- ✅ הקצאת אירובי למתאמן
- ✅ מעקב אחר ביצועים

### 9. כלים מנטליים (Mental Tools)
- ✅ עריכת כלים מנטליים למתאמן
- ✅ תמיכה בתוכן מותאם אישית

### 10. מטרות והרגלים (Goals & Habits)
- ✅ ניהול מטרות למתאמן
- ✅ ניהול הרגלים (מים, צעדים, שינה, תזונה)
- ✅ מעקב יומי

### 11. משימות שבועיות (Weekly Tasks)
- ✅ יצירת משימות שבועיות
- ✅ הקצאת משימות למתאמן
- ✅ מעקב אחר ביצוע

### 12. תקשורת (Messages)
- ✅ שליחת הודעות למתאמנים
- ✅ קבלת הודעות ממתאמנים

### 13. דוחות ואנליטיקה (Reports & Analytics)
- ✅ דוחות התקדמות
- ✅ מטריקות היענות (AdherenceMetrics)
- ✅ השוואות בין מתאמנים
- ✅ גרפים וסטטיסטיקות

### 14. Dashboard
- ✅ תצוגה כללית של כל המתאמנים
- ✅ קריאות מאזניים אחרונות
- ✅ סטטיסטיקות מהירות
- ✅ ניווט מהיר למתאמנים

---

## 🎯 תכונות עיקריות - מתאמן

### 1. Dashboard
- ✅ תצוגה כללית של התקדמות
- ✅ סטטיסטיקות מהירות
- ✅ קישורים מהירים לתכונות

### 2. תכנית אימונים (MyWorkoutPlan)
- ✅ צפייה בתכנית האימונים
- ✅ סטטוס ביצוע לכל אימון

### 3. אימון עצמאי (SelfWorkoutSession)
- ✅ רישום אימון עצמאי
- ✅ בחירת תרגילים
- ✅ רישום סטים, משקלים, חזרות
- ✅ תמיכה בסופר-סטים ודרופ-סטים
- ✅ שמירת אימון

### 4. היסטוריית אימונים (WorkoutHistory)
- ✅ תצוגת כל האימונים שבוצעו
- ✅ פירוט אימון
- ✅ השוואות בין אימונים

### 5. מדידות (MyMeasurements)
- ✅ תצוגת מדידות
- ✅ גרפי התקדמות
- ✅ השוואות בין מדידות

### 6. יומן אוכל (FoodDiary)
- ✅ רישום ארוחות
- ✅ מעקב קלוריות
- ✅ תצוגת יומן יומי/שבועי

### 7. תכנית תזונה (MyMealPlan)
- ✅ צפייה בתכנית התזונה
- ✅ מעקב אחר ביצוע

### 8. כלים מנטליים (MyMentalTools)
- ✅ צפייה בכלים מנטליים
- ✅ תוכן מותאם אישית

### 9. אירובי (MyCardio)
- ✅ צפייה בתכנית אירובי
- ✅ רישום ביצוע אירובי

### 10. מטרות (MyGoals)
- ✅ צפייה במטרות
- ✅ מעקב אחר התקדמות

### 11. הרגלים (MyHabits)
- ✅ מעקב הרגלים יומי
- ✅ רישום ביצוע
- ✅ גרפי התקדמות

---

## 🗄️ מבנה מסד הנתונים

### טבלאות עיקריות:

#### משתמשים
- `trainers` - מאמנים
- `trainees` - מתאמנים

#### אימונים
- `workouts` - אימונים
- `workout_trainees` - קשר מתאמן-אימון
- `workout_exercises` - תרגילים באימון
- `exercise_sets` - סטים בתרגיל
- `exercises` - תרגילים
- `muscle_groups` - קבוצות שרירים

#### מדידות
- `measurements` - מדידות
- `scale_readings` - קריאות מאזניים
- `trainee_self_weights` - שקילות מהבית

#### תזונה
- `meal_plans` - תכניות תזונה
- `meal_plan_items` - פריטים בתכנית
- `food_diary_entries` - יומן אוכל

#### מטרות והרגלים
- `trainee_goals` - מטרות
- `trainee_habits` - הרגלים
- `habit_logs` - לוגים יומיים

#### תקשורת
- `messages` - הודעות
- `workout_feedback` - משוב על אימונים

#### משימות
- `weekly_tasks` - משימות שבועיות

#### אירובי
- `cardio_assignments` - הקצאות אירובי
- `cardio_logs` - לוגים של אירובי

---

## 🔧 תכונות טכניות מתקדמות

### 1. Real-time Updates
- ✅ Supabase Realtime Subscriptions
- ✅ עדכונים בזמן אמת של שקילות
- ✅ התראות על שקילות חדשות

### 2. Scale Integration
- ✅ זיהוי אוטומטי של מתאמנים לפי משקל
- ✅ אלגוריתם התאמה (confidence score)
- ✅ תמיכה במאזני Tanita
- ✅ Global Scale Listener

### 3. Performance Optimizations
- ✅ Lazy Loading של רכיבים
- ✅ Code Splitting
- ✅ Caching של תרגילים
- ✅ Optimistic Updates
- ✅ Debouncing
- ✅ Auto-save

### 4. Error Handling
- ✅ Error Boundaries
- ✅ Component Error Boundaries
- ✅ Toast Notifications
- ✅ Graceful Degradation

### 5. UX Features
- ✅ RTL Support (עברית)
- ✅ Dark/Light Theme
- ✅ Responsive Design (Mobile & Desktop)
- ✅ Keyboard Shortcuts
- ✅ Touch Optimized
- ✅ Loading States
- ✅ Empty States
- ✅ Confirmation Dialogs

### 6. Security
- ✅ Supabase Row Level Security (RLS)
- ✅ Authentication & Authorization
- ✅ Secure Session Management
- ✅ CORS Configuration

---

## 📱 ממשק משתמש

### עיצוב
- **Style**: Modern Glass-morphism
- **Colors**: Green/Lime accent colors
- **Typography**: RTL-optimized Hebrew fonts
- **Animations**: Smooth transitions and micro-interactions
- **Icons**: Lucide React icon set

### Navigation
- **Desktop**: Sidebar + Header
- **Mobile**: Bottom Navigation Bar + Mobile Sidebar
- **Collapsible**: Header & Sidebar can be collapsed during workouts

### Components
- **Reusable UI Components**: Button, Card, Input, Select, Modal, Toast, etc.
- **Data Display**: DataTable, Pagination, Charts
- **Feedback**: LoadingSpinner, ErrorMessage, EmptyState

---

## 🔌 אינטגרציות

### 1. Supabase
- ✅ Database
- ✅ Authentication
- ✅ Real-time Subscriptions
- ✅ Storage (אם נדרש)
- ✅ Edge Functions

### 2. Tanita Scale
- ✅ קריאות מאזניים
- ✅ זיהוי אוטומטי
- ✅ שמירת מדידות

### 3. Google Calendar (מתוכנן)
- 📋 אינטגרציה עתידית
- 📋 סנכרון דו-כיווני
- 📋 Webhooks

---

## 📊 סטטיסטיקות ומדדים

### מטריקות זמינות:
- ✅ נפח אימון (Volume)
- ✅ היענות לאימונים (Adherence)
- ✅ התקדמות במשקל
- ✅ שינוי באחוז שומן
- ✅ שינוי במסת שריר
- ✅ מעקב הרגלים
- ✅ ביצוע מטרות

---

## 🚀 תכונות עתידיות (מתוכננות)

1. **CRM Features**
   - כרטיסיות לקוחות מתקדמות
   - מעקב אינטראקציות
   - תגיות וקטגוריות

2. **Google Calendar Integration**
   - סנכרון אוטומטי
   - יצירת אירועים
   - Webhooks

3. **Advanced Analytics**
   - דוחות מותאמים אישית
   - חיזוי התקדמות
   - המלצות חכמות

4. **Mobile App**
   - אפליקציה נטיבית
   - Push Notifications
   - Offline Support

---

## 📝 הערות טכניות

### Environment Variables
- `VITE_SUPABASE_URL` - כתובת Supabase
- `VITE_SUPABASE_ANON_KEY` - מפתח Supabase
- `VITE_ALLOWED_ORIGINS` - מקורות מורשים

### Build & Deploy
- **Dev**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Test**: `npm test`

### Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Component-based architecture
- ✅ Custom hooks for reusability
- ✅ Error boundaries for resilience

---

## 🎓 סיכום

**NEWYM** היא מערכת מקצועית ומקיפה לניהול אימונים וכושר, המספקת:

✅ **למאמן**: כלים מלאים לניהול מתאמנים, אימונים, מדידות, תזונה ותקשורת
✅ **למתאמן**: ממשק נוח למעקב אחר התקדמות, רישום אימונים ותקשורת עם המאמן
✅ **טכנולוגיות מודרניות**: React, TypeScript, Supabase
✅ **UX מעולה**: עיצוב מודרני, תמיכה במובייל, RTL
✅ **ביצועים**: אופטימיזציות, caching, lazy loading
✅ **אבטחה**: Authentication, Authorization, RLS

המערכת מוכנה לשימוש ומתוכננת להרחבות עתידיות.
