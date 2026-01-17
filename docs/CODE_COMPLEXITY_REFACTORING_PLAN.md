# תוכנית פיצול קבצים מורכבים - משימה 10.2

**תאריך**: 2025-01-27  
**מטרה**: פיצול קבצים גדולים (>500 שורות) ל-components קטנים יותר

---

## קבצים לניתוח

### 1. FoodDiary.tsx (1659 שורות) - עדיפות גבוהה

**מבנה נוכחי**:
- Main component עם הרבה state
- פונקציות לטעינת נתונים
- UI components פנימיים
- לוגיקה של meals, water, diary entries

**תוכנית פיצול**:

#### Components חדשים:
1. `FoodDiaryViewModeSelector.tsx` - בחירת מצב תצוגה (day/week/month)
2. `FoodDiaryDateNavigator.tsx` - ניווט תאריכים
3. `MealList.tsx` - רשימת ארוחות ליום
4. `MealCard.tsx` - כרטיס ארוחה בודד
5. `MealFormModal.tsx` - מודל להוספת/עריכת ארוחה
6. `WaterTracker.tsx` - מעקב מים
7. `DailySummaryCard.tsx` - סיכום יומי (כבר קיים כפונקציה פנימית)
8. `MealPlanCopyModal.tsx` - מודל להעתקת תכנית ארוחות

#### Hooks חדשים:
1. `useFoodDiaryData.ts` - טעינת נתונים (meals, water, diary)
2. `useMealPlan.ts` - טעינת תכנית ארוחות
3. `useMealForm.ts` - ניהול form של ארוחה

#### Utils:
1. `foodDiaryUtils.ts` - פונקציות עזר (getWeekDates, formatDate, etc.)

**יעד**: פיצול ל-8-10 קבצים קטנים יותר (150-300 שורות כל אחד)

---

### 2. TrainerApp.tsx (1440 שורות) - עדיפות גבוהה

**תוכנית פיצול**:

#### Components חדשים:
1. `TrainerNavigation.tsx` - ניווט ראשי
2. `TraineesList.tsx` - רשימת מתאמנים
3. `TraineeCard.tsx` - כרטיס מתאמן
4. `TrainerDashboard.tsx` - דשבורד מאמן
5. `TrainerSidebar.tsx` - סיידבר

#### Hooks חדשים:
1. `useTrainerData.ts` - טעינת נתוני מאמן
2. `useTraineesList.ts` - טעינת רשימת מתאמנים

**יעד**: פיצול ל-5-6 קבצים (200-300 שורות כל אחד)

---

### 3. WorkoutSession.tsx (1192 שורות) - עדיפות בינונית

**תוכנית פיצול**:

#### Components חדשים:
1. `WorkoutExerciseManager.tsx` - ניהול תרגילים
2. `SetEditor.tsx` - עריכת סטים
3. `NumericPadManager.tsx` - ניהול Numeric Pads
4. `EquipmentManager.tsx` - ניהול ציוד
5. `SupersetManager.tsx` - ניהול סופר-סטים

#### Hooks חדשים:
1. `useWorkoutState.ts` - ניהול state של אימון

**יעד**: פיצול ל-5-6 קבצים (200-300 שורות כל אחד)

---

### 4. TraineeProfile.tsx (1005 שורות) - עדיפות נמוכה

**תוכנית פיצול**:

#### Components חדשים:
1. `TraineeProfileHeader.tsx` - כותרת פרופיל
2. `TraineeStats.tsx` - סטטיסטיקות
3. `TraineeMeasurements.tsx` - מדידות
4. `TraineeWorkouts.tsx` - אימונים

**יעד**: פיצול ל-4-5 קבצים (200-250 שורות כל אחד)

---

### 5. MeasurementForm.tsx (996 שורות) - עדיפות נמוכה

**תוכנית פיצול**:

#### Components חדשים:
1. `MeasurementFormFields.tsx` - שדות form
2. `MeasurementHistory.tsx` - היסטוריית מדידות
3. `MeasurementCharts.tsx` - גרפים

**יעד**: פיצול ל-3-4 קבצים (200-300 שורות כל אחד)

---

## אסטרטגיית פיצול

### שלב 1: יצירת Infrastructure
1. יצירת hooks משותפים
2. יצירת utils
3. יצירת types משותפים

### שלב 2: פיצול Components
1. הוצאת components פנימיים לקובץ נפרד
2. הוצאת hooks ל-custom hooks
3. הוצאת utils ל-utilities

### שלב 3: Refactoring
1. עדכון הקובץ הראשי לשימוש ב-components חדשים
2. בדיקת שהכל עובד
3. מחיקת קוד מיותר

---

## קריטריונים להצלחה

- [ ] כל component פחות מ-300 שורות
- [ ] כל hook פחות מ-200 שורות
- [ ] כל utility פחות מ-150 שורות
- [ ] אין code duplication
- [ ] כל tests עוברים
- [ ] Performance לא נפגע

---

## לוח זמנים

- **שבוע 1**: FoodDiary.tsx + TrainerApp.tsx
- **שבוע 2**: WorkoutSession.tsx
- **שבוע 3**: TraineeProfile.tsx + MeasurementForm.tsx

---

**תאריך יצירה**: 2025-01-27  
**גרסה**: 1.0
