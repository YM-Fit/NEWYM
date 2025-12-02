# 🏗️ מדריך בנייה שלב-אחר-שלב: מערכת YM Coach
## פרומפטים ל-AI Studio

---

## 📋 סקירה כללית

מערכת **YM Coach** היא מערכת ניהול מתאמנים מתקדמת למאמנים אישיים.
המערכת מאפשרת תיעוד אימונים, מדידות, מעקב התקדמות וניהול מתאמנים.

**טכנולוגיות:** React + TypeScript + Vite + Tailwind CSS

**⚠️ הערה חשובה:** כל השלבים **ללא** חיבור ל-Supabase - נשתמש ב-LocalStorage בלבד.

---

## 🎯 מפת דרכים - 12 שלבים

```
שלב 1: תשתית פרויקט
└─> שלב 2: מערכת אותנטיקציה (LocalStorage)
    └─> שלב 3: מבנה אפליקציה ראשי + Sidebar
        └─> שלב 4: דשבורד ראשי
            └─> שלב 5: ניהול מתאמנים - רשימה והוספה
                └─> שלב 6: פרופיל מתאמן מפורט
                    └─> שלב 7: מערכת תרגילים וקבוצות שריר
                        └─> שלב 8: תיעוד אימון בסיסי
                            └─> שלב 9: תיעוד אימון מתקדם (Dropset/Superset)
                                └─> שלב 10: מדידות ומשקל
                                    └─> שלב 11: גרפים והתקדמות
                                        └─> שלב 12: אימונים זוגיים
```

---

## 📦 שלב 1: תשתית פרויקט

### 🎯 מטרה
יצירת פרויקט React + TypeScript + Vite עם Tailwind CSS.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה ליצור פרויקט React חדש עם הדרישות הבאות:

1. טכנולוגיות:
   - React 18
   - TypeScript
   - Vite (כ-bundler)
   - Tailwind CSS (לעיצוב)
   - lucide-react (אייקונים)

2. מבנה תיקיות:
   src/
   ├── components/
   │   ├── Auth/
   │   ├── Layout/
   │   ├── Dashboard/
   │   ├── Trainees/
   │   ├── Workouts/
   │   └── Measurements/
   ├── contexts/
   ├── hooks/
   ├── types/
   ├── utils/
   ├── App.tsx
   └── main.tsx

3. הגדרות Tailwind:
   - RTL (Right-to-Left) support
   - צבעים ראשיים: ירוק (#10b981 - green-500)
   - פונט: Inter או Heebo (תמיכה בעברית)

4. package.json צריך לכלול:
   - react
   - react-dom
   - typescript
   - tailwindcss
   - lucide-react
   - vite

בבקשה צור את המבנה הבסיסי עם כל קבצי התצורה הנדרשים.
```

### ✅ תוצאה צפויה:
- פרויקט Vite מוכן
- Tailwind מוגדר
- מבנה תיקיות מאורגן

---

## 🔐 שלב 2: מערכת אותנטיקציה (LocalStorage)

### 🎯 מטרה
מערכת Login/Register פשוטה עם LocalStorage.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה לבנות מערכת אותנטיקציה פשוטה עם LocalStorage:

1. AuthContext (src/contexts/AuthContext.tsx):
   - ניהול משתמש מחובר
   - פונקציות: login, register, logout
   - שמירה ב-localStorage
   - טיפוסים:
     interface User {
       id: string;
       email: string;
       full_name: string;
     }

2. LoginForm Component (src/components/Auth/LoginForm.tsx):
   - שדות: אימייל, סיסמה
   - כפתור "התחבר"
   - לינק ל-"עדיין אין לך חשבון? הירשם"
   - עיצוב מודרני עם Tailwind
   - רקע: gradient ירוק-אפור

3. RegisterForm Component (src/components/Auth/RegisterForm.tsx):
   - שדות: שם מלא, אימייל, סיסמה, אימות סיסמה
   - כפתור "הירשם"
   - לינק ל-"כבר יש לך חשבון? התחבר"
   - עיצוב זהה ל-LoginForm

4. App.tsx:
   - אם משתמש לא מחובר -> הצג LoginForm או RegisterForm
   - אם משתמש מחובר -> הצג <div>שלום {user.full_name}</div>

דרישות:
- כל הטקסטים בעברית
- תמיכה ב-RTL
- ולידציה בסיסית (אימייל תקין, סיסמה 6+ תווים)
- הודעות שגיאה ברורות
```

### ✅ תוצאה צפויה:
- AuthContext פעיל
- Login/Register עובדים
- משתמש נשמר ב-localStorage

---

## 📱 שלב 3: מבנה אפליקציה + Sidebar

### 🎯 מטרה
יצירת Layout עם Header, Sidebar וניווט.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה ליצור Layout מלא למערכת עם Sidebar וניווט:

1. Header Component (src/components/Layout/Header.tsx):
   - לוגו "YM Coach" בצד ימין
   - שם המאמן באמצע
   - כפתור "התנתק" בצד שמאל
   - רקע לבן עם צל
   - Props: onLogout, trainerName

2. Sidebar Component (src/components/Layout/Sidebar.tsx):
   - תפריט אנכי בצד ימין
   - פריטים:
     * 🏠 דשבורד
     * 👥 מתאמנים
     * 📊 דוחות
     * ⚙️ הגדרות
   - פריט פעיל מודגש בירוק
   - Props: activeView, onViewChange
   - responsive: במובייל -> תפריט תחתון

3. MainApp Component (src/components/MainApp.tsx):
   - State: activeView (dashboard, trainees, reports, settings)
   - Layout:
     * Sidebar בצד ימין
     * Header למעלה
     * Content באמצע
   - Switch case לפי activeView

4. App.tsx:
   - עדכן להציג MainApp אחרי התחברות

דרישות:
- עיצוב מודרני עם Tailwind
- אנימציות חלקות (transition)
- responsive design
- אייקונים מ-lucide-react
```

### ✅ תוצאה צפויה:
- Layout מלא עם Sidebar
- ניווט בין דפים
- Header עם שם מאמן

---

## 🏠 שלב 4: דשבורד ראשי

### 🎯 מטרה
דף בית עם סטטיסטיקות ופעולות מהירות.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה לבנות דשבורד ראשי עם כרטיסי סטטיסטיקה:

1. Dashboard Component (src/components/Dashboard/Dashboard.tsx):
   - כותרת: "שלום, {trainerName}"
   - 3 כרטיסי סטטיסטיקה בשורה:
     * סך מתאמנים פעילים
     * אימונים החודש
     * מדידות החודש
   - פעולות מהירות:
     * כפתור "הוסף מתאמן"
     * כפתור "אימון חדש"
   - פעילות אחרונה (רשימה ריקה בינתיים)

2. StatsCard Component (src/components/Dashboard/StatsCard.tsx):
   - Props: title, value, icon, color
   - עיצוב: כרטיס לבן עם צל
   - אייקון עגול צבעוני
   - מספר גדול ובולט

3. נתונים דמה:
   - 0 מתאמנים פעילים
   - 0 אימונים
   - 0 מדידות
   (יתעדכן כשנוסיף נתונים אמיתיים)

דרישות:
- responsive grid (3 קולונות -> 1 במובייל)
- צבעים: ירוק (מתאמנים), כחול (אימונים), סגול (מדידות)
- אנימציות hover
```

### ✅ תוצאה צפויה:
- דשבורד מעוצב
- כרטיסי סטטיסטיקה
- פעולות מהירות

---

## 👥 שלב 5: ניהול מתאמנים - רשימה והוספה

### 🎯 מטרה
רשימת מתאמנים + טופס הוספה.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה לבנות מערכת ניהול מתאמנים בסיסית:

1. טיפוסים (src/types/index.ts):
   interface Trainee {
     id: string;
     name: string;
     email: string;
     phone: string;
     age: number;
     gender: 'male' | 'female';
     height: number;
     startDate: string;
     status: 'active' | 'inactive' | 'vacation' | 'new';
     notes: string;
   }

2. TraineesList Component (src/components/Trainees/TraineesList.tsx):
   - כותרת "המתאמנים שלי"
   - כפתור "הוסף מתאמן" למעלה
   - Grid של כרטיסי מתאמנים (3 קולונות)
   - כל כרטיס מציג: שם, גיל, סטטוס
   - Click על כרטיס -> פתיחת פרופיל
   - אם אין מתאמנים -> הודעה "עדיין לא הוספת מתאמנים"

3. AddTraineeForm Component (src/components/Trainees/AddTraineeForm.tsx):
   - שדות:
     * שם מלא (חובה)
     * טלפון
     * אימייל
     * תאריך לידה (או גיל)
     * מגדר (רדיו: זכר/נקבה)
     * גובה (ס"מ)
     * תאריך התחלה (ברירת מחדל: היום)
     * הערות (textarea)
   - כפתורים: "שמור" ו-"ביטול"
   - שמירה ב-localStorage

4. MainApp עדכון:
   - State: trainees (מערך)
   - loadTrainees מ-localStorage
   - saveTrainee -> הוספה למערך + שמירה
   - העברת Props ל-TraineesList

דרישות:
- ולידציה: שם חובה
- עיצוב טופס מסודר (2 קולונות)
- כרטיסי מתאמן עם צבע לפי סטטוס
- ID ייחודי: Date.now() + Math.random()
```

### ✅ תוצאה צפויה:
- רשימת מתאמנים
- הוספת מתאמן
- שמירה ב-localStorage

---

## 📄 שלב 6: פרופיל מתאמן מפורט

### 🎯 מטרה
דף פרופיל עם כל הפרטים + לשוניות.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה ליצור דף פרופיל מתאמן מפורט:

1. TraineeProfile Component (src/components/Trainees/TraineeProfile.tsx):
   - Header:
     * כפתור "חזור" למעלה
     * שם המתאמן (גדול)
     * סטטוס (badge צבעוני)
     * כפתורים: "ערוך", "מחק"

   - פרטים אישיים (כרטיס):
     * טלפון, אימייל
     * גיל, מגדר
     * גובה, תאריך התחלה
     * הערות

   - פעולות מהירות (3 כפתורים גדולים):
     * 🏋️ אימון חדש
     * 📏 מדידה חדשה
     * 📊 צפייה בהתקדמות

   - לשוניות (Tabs):
     * אימונים אחרונים (רשימה ריקה)
     * מדידות (רשימה ריקה)
     * גרפים (בקרוב)

2. EditTraineeForm Component:
   - טופס זהה ל-AddTraineeForm
   - טעינת נתונים קיימים
   - עדכון ב-localStorage

דרישות:
- עיצוב מקצועי עם כרטיסים
- כפתור מחיקה באדום + אישור
- ניווט חלק (חזרה לרשימה)
```

### ✅ תוצאה צפויה:
- פרופיל מפורט
- עריכה ומחיקה
- פעולות מהירות

---

## 💪 שלב 7: מערכת תרגילים וקבוצות שריר

### 🎯 מטרה
מבנה נתונים של תרגילים מחולקים לקבוצות שריר.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה ליצור מערכת תרגילים מסודרת:

1. קבוצות שריר (src/utils/defaultExercises.ts):
   const MUSCLE_GROUPS = [
     { id: '1', name: 'חזה' },
     { id: '2', name: 'גב' },
     { id: '3', name: 'כתפיים' },
     { id: '4', name: 'ביצפס' },
     { id: '5', name: 'טריצפס' },
     { id: '6', name: 'רגליים' },
     { id: '7', name: 'בטן' }
   ];

2. תרגילים לפי קבוצות (40+ תרגילים):

   חזה:
   - דחיקות מישור
   - דחיקות שיפוע
   - צלבים כבלים
   - צלבים משופע
   - צלבים ישר

   גב:
   - משיכות עליון
   - משיכות צר
   - משיכות במשקולת
   - חתירה בר
   - חתירה כבלים

   כתפיים:
   - לחיצת כתפיים
   - הרמות צד
   - הרמות קדמי
   - פייס פול

   רגליים:
   - סקוואט
   - לג פרס
   - לאנג'ס
   - רומני
   - סגירות רגליים

   (המשך לשאר הקבוצות...)

3. ExerciseSelector Component (src/components/Workouts/ExerciseSelector.tsx):
   - רשימת קבוצות שריר (כפתורים)
   - בחירת קבוצה -> הצגת תרגילים שלה
   - בחירת תרגיל -> קריאה ל-onSelect(exercise)
   - חיפוש תרגיל (input)
   - עיצוב: Modal או Drawer

דרישות:
- נתונים שמורים ב-localStorage
- חיפוש מסנן בזמן אמת
- עיצוב נקי ונוח
```

### ✅ תוצאה צפויה:
- 7 קבוצות שריר
- 40+ תרגילים
- בורר תרגילים פונקציונלי

---

## 🏋️ שלב 8: תיעוד אימון בסיסי

### 🎯 מטרה
מסך תיעוד אימון עם תרגילים וסטים.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה לבנות מסך תיעוד אימון:

1. טיפוסים:
   interface ExerciseSet {
     set_number: number;
     weight: number;
     reps: number;
     rpe?: number; // 1-10
   }

   interface WorkoutExercise {
     tempId: string;
     exercise: { id: string; name: string; muscle_group_id: string; };
     sets: ExerciseSet[];
   }

   interface Workout {
     id: string;
     traineeId: string;
     date: string;
     exercises: WorkoutExercise[];
     notes: string;
   }

2. WorkoutSession Component (src/components/Workouts/WorkoutSession.tsx):

   Header:
   - כפתור "חזור"
   - שם המתאמן
   - תאריך אימון

   אזור תרגילים:
   - כפתור "הוסף תרגיל" -> פותח ExerciseSelector
   - רשימת תרגילים שנבחרו:
     * שם תרגיל (עם כפתור X למחיקה)
     * טבלת סטים:
       - סט | משקל (ק"ג) | חזרות | RPE
       - שורה לכל סט
     * כפתור "הוסף סט"
     * כפתור "Copy" (שכפול הסט האחרון)

   כפתורים תחתונים:
   - "שמור אימון"
   - "ביטול"

3. לוגיקה:
   - הוספת תרגיל -> tempId ייחודי
   - הוספת סט -> set_number אוטומטי
   - Copy -> שכפול משקל+חזרות של סט אחרון
   - שמירה -> localStorage בתוך trainee

דרישות:
- input נומרי למשקל וחזרות
- RPE אופציונלי (1-10)
- עיצוב טבלה נקי
- responsive
```

### ✅ תוצאה צפויה:
- תיעוד אימון פועל
- הוספת תרגילים וסטים
- שמירה ב-localStorage

---

## 🔥 שלב 9: אימון מתקדם (Dropset/Superset)

### 🎯 מטרה
הוספת תכונות מתקדמות: דרופ-סט וסופר-סט.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה להוסיף תכונות מתקדמות לתיעוד אימון:

1. עדכון טיפוסים:
   interface ExerciseSet {
     set_number: number;
     weight: number;
     reps: number;
     rpe?: number;
     set_type: 'regular' | 'superset' | 'dropset';

     // Dropset
     dropset_weight?: number;
     dropset_reps?: number;

     // Superset
     superset_exercise_id?: string;
     superset_weight?: number;
     superset_reps?: number;
   }

2. עדכון WorkoutSession:

   בכל סט הוסף:
   - Checkbox "דרופ-סט"
     * אם מסומן -> שדות נוספים:
       - משקל דרופ
       - חזרות דרופ

   - Checkbox "סופר-סט"
     * אם מסומן:
       - בחירת תרגיל שני (ExerciseSelector)
       - משקל + חזרות לתרגיל השני

3. תצוגה:
   - סט רגיל: "12 x 80 ק"ג"
   - דרופ-סט: "12 x 80 ק"ג → 15 x 60 ק"ג"
   - סופר-סט: "12 x 80 ק"ג + דחיקות משופע 15 x 70 ק"ג"

4. Copy חכם:
   - שכפול כולל Dropset/Superset
   - אפשרות לשנות משקלים במהירות

דרישות:
- UI אינטואיטיבי
- עיצוב מסודר (אפשר לכווץ/לפתוח)
- שמירת כל הנתונים
```

### ✅ תוצאה צפויה:
- Dropset פועל
- Superset פועל
- תצוגה ברורה

---

## 📏 שלב 10: מדידות ומשקל

### 🎯 מטרה
מערכת תיעוד מדידות: משקל, אחוזים, היקפי גוף.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה לבנות מערכת מדידות:

1. טיפוסים:
   interface Measurement {
     id: string;
     traineeId: string;
     date: string;

     // משקל ואחוזים
     weight: number;
     bodyFat?: number;
     muscleMass?: number;
     waterPercentage?: number;
     visceralFat?: number;
     bmi?: number;

     // היקפי גוף
     measurements: {
       chest?: number;
       waist?: number;
       hips?: number;
       arms?: number;
       thighs?: number;
     };

     source: 'manual' | 'tanita';
     notes: string;
   }

2. MeasurementForm Component (src/components/Measurements/MeasurementForm.tsx):

   Layout (2 קולונות):

   עמודה שמאל - משקל ואחוזים:
   - משקל (ק"ג) - חובה
   - אחוז שומן
   - מסת שריר
   - אחוז מים
   - BMI
   - שומן ויסרלי

   עמודה ימין - היקפי גוף:
   - חזה (ס"מ)
   - מותן
   - ירכיים
   - זרועות
   - ירכיים

   תחתון:
   - מקור מדידה (רדיו: ידני/Tanita)
   - הערות
   - כפתורים: שמור/ביטול

3. MeasurementsView Component:
   - רשימת מדידות (כרטיסים)
   - כל מדידה מציגה: תאריך, משקל, שינוי
   - Click -> הצגת כל הפרטים
   - כפתורים: ערוך, מחק
   - כפתור "מדידה חדשה"

דרישות:
- תאריך ברירת מחדל: היום
- חישוב BMI אוטומטי (משקל / גובה²)
- הצגת שינוי ממדידה קודמת (↑/↓)
- עיצוב נקי וברור
```

### ✅ תוצאה צפויה:
- תיעוד מדידות
- היקפי גוף
- רשימה והצגה

---

## 📊 שלב 11: גרפים והתקדמות

### 🎯 מטרה
גרפים להתקדמות במשקל, מדידות ותרגילים.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה להוסיף גרפים להתקדמות:

1. התקנת ספרייה:
   npm install recharts

2. MeasurementsChart Component (src/components/Measurements/MeasurementsChart.tsx):
   - גרף קווי (LineChart) מ-recharts
   - ציר X: תאריכים
   - ציר Y: משקל/אחוז שומן/מסת שריר
   - Toggle בין המדדים
   - Props: measurements[]
   - עיצוב: כרטיס עם כותרת

3. WorkoutProgress Component (src/components/Workouts/WorkoutProgress.tsx):

   Layout:
   - בחירת תרגיל (Dropdown)
   - גרף התקדמות:
     * ציר X: תאריכי אימונים
     * ציר Y: משקל מקסימלי
   - טבלה: היסטוריית התרגיל
     * תאריך | סט | משקל | חזרות

   חישוב:
   - מציאת משקל מקסימלי בכל אימון
   - מיון לפי תאריך

4. שילוב ב-TraineeProfile:
   - לשונית "התקדמות"
   - MeasurementsChart למעלה
   - WorkoutProgress למטה

דרישות:
- גרפים responsive
- צבעים מותאמים (ירוק, כחול, סגול)
- Tooltip על hover
- אנימציות חלקות
```

### ✅ תוצאה צפויה:
- גרף משקל ומדידות
- גרף התקדמות תרגילים
- תצוגה ויזואלית

---

## 👫 שלב 12: אימונים זוגיים

### 🎯 מטרה
תמיכה במתאמנים זוגיים עם אימון משותף או נפרד.

### 📝 פרומפט ל-AI Studio:

```
אני רוצה להוסיף תמיכה באימונים זוגיים:

1. עדכון טיפוס Trainee:
   interface Trainee {
     // ... שדות קיימים
     isPair: boolean;

     // פרטי חבר א'
     pairName1?: string;
     pairPhone1?: string;
     pairEmail1?: string;
     pairGender1?: 'male' | 'female';
     pairBirthDate1?: string;
     pairHeight1?: number;

     // פרטי חבר ב'
     pairName2?: string;
     pairPhone2?: string;
     pairEmail2?: string;
     pairGender2?: 'male' | 'female';
     pairBirthDate2?: string;
     pairHeight2?: number;
   }

2. עדכון AddTraineeForm:
   - Checkbox "זוג מתאמנים"
   - אם מסומן -> הצגת שדות לשני חברי הזוג
   - Layout: 2 עמודות (חבר א' | חבר ב')

3. WorkoutTypeSelection Component:
   - מסך בחירה:
     * "אימון אישי" (לחבר מסוים)
     * "אימון זוגי" (שניהם ביחד)
   - פתיחת המסך המתאים

4. PairWorkoutSession Component:
   - 2 עמודות: חבר א' | חבר ב'
   - תרגילים משותפים
   - סטים נפרדים לכל אחד
   - טבלה: תרגיל | חבר א' | חבר ב'
   - שמירת אימון משותף

5. עדכון MeasurementForm:
   - אם זוג -> בחירת חבר (רדיו)
   - מדידה נשמרת עם pair_member

דרישות:
- UI אינטואיטיבי
- תצוגה ברורה בפרופיל
- הפרדה בין נתונים אישיים
```

### ✅ תוצאה צפויה:
- מתאמנים זוגיים
- אימון משותף/נפרד
- מדידות נפרדות

---

## 🎨 שיפורים נוספים (אופציונלי)

### שיפורי UX:
```
1. Toast Notifications:
   - הודעות הצלחה/שגיאה
   - עיצוב עליון-מרכז
   - נעלמות אחרי 3 שניות

2. Loading States:
   - Skeleton loaders
   - Spinners
   - הודעות "טוען..."

3. Empty States:
   - איורים חמודים
   - הודעות מעודדות
   - קריאה לפעולה (CTA)

4. Animations:
   - Fade in/out
   - Slide transitions
   - Hover effects

5. Dark Mode:
   - Toggle במסך הגדרות
   - צבעים מותאמים
   - שמירה ב-localStorage
```

### תכונות מתקדמות:
```
1. ייצוא נתונים:
   - ייצוא ל-PDF/Excel
   - תקציר חודשי

2. תבניות אימון:
   - שמירת אימון כתבנית
   - שכפול מהיר

3. מחשבונים:
   - 1RM (משקל מקסימלי)
   - BMR/TDEE
   - אחוז שומן לפי מדידות

4. תזכורות:
   - תזכורת לאימון הבא
   - תזכורת למדידה

5. סטטיסטיקות מתקדמות:
   - נפח אימון שבועי
   - חלוקת קבוצות שריר
   - זמן מנוחה בין סטים
```

---

## 📦 סיכום והרצה

### הרצת הפרויקט:

```bash
# התקנה
npm install

# הפעלה
npm run dev

# בנייה לפרודקשן
npm run build
```

### מבנה localStorage:

```javascript
// דוגמה למבנה הנתונים
{
  "user": {
    "id": "123",
    "email": "coach@example.com",
    "full_name": "יוסי המאמן"
  },
  "trainees": [
    {
      "id": "456",
      "name": "דן כהן",
      "email": "dan@example.com",
      // ... שאר השדות
    }
  ],
  "workouts": [
    {
      "id": "789",
      "traineeId": "456",
      "date": "2024-12-02",
      "exercises": [...]
    }
  ],
  "measurements": [...]
}
```

---

## ✅ Checklist סופי

לפני השקה, ודא ש:

- [ ] כל הטפסים עם ולידציה
- [ ] כל הכפתורים פועלים
- [ ] נתונים נשמרים נכון ב-localStorage
- [ ] עיצוב responsive (מובייל + דסקטופ)
- [ ] טקסטים בעברית (RTL)
- [ ] הודעות שגיאה ברורות
- [ ] אין קונסול errors
- [ ] Loading states בכל מקום
- [ ] Empty states מעוצבים
- [ ] אנימציות חלקות

---

## 🚀 למידע נוסף

**מפתח:** YM Coach Team
**גרסה:** 1.0
**תאריך:** דצמבר 2024

---

**בהצלחה בבנייה! 💪**
