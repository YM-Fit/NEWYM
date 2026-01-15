# תוכנית בדיקות להגעה ל-70%+ כיסוי

## סטטוס נוכחי
- **קבצי בדיקות**: 20+ קבצים
- **בדיקות עוברות**: 250+ בדיקות
- **כיסוי נוכחי**: ~30-40% (מוערך)

## יעדים
- **כיסוי יעד**: 70%+
- **קבצי בדיקות נוספים נדרשים**: 30-40 קבצים
- **בדיקות נוספות נדרשות**: ~200-300 בדיקות

## תוכנית עבודה

### שלב 1: Hooks (15 hooks ללא tests) ✅ חלקי
**סטטוס**: 4/15 הושלמו

#### הושלמו:
- ✅ `useAutoSave`
- ✅ `useIsTablet`
- ✅ `useKeyboardShortcut`
- ✅ `useMemoizedCallback`
- ✅ `useOptimisticUpdate`

#### נותרו:
- ⏳ `useEquipmentSelector`
- ⏳ `useExerciseCache`
- ⏳ `useGlobalScaleListener`
- ⏳ `useNumericPad`
- ⏳ `useScaleListener`
- ⏳ `useScaleSound`
- ⏳ `useSupabaseQuery`
- ⏳ `useSupersetSelector`
- ⏳ `useTraineeData`
- ⏳ `useWorkoutSession`

### שלב 2: Components (109 components ללא tests) ✅ חלקי
**סטטוס**: 5/109 הושלמו

#### הושלמו:
- ✅ `Button`
- ✅ `Input`
- ✅ `ErrorMessage`
- ✅ `EmptyState`
- ✅ `ErrorBoundary`
- ✅ `LoginForm`

#### עדיפות גבוהה (20-30 components):
- ⏳ `RegisterForm`
- ⏳ `ConfirmationDialog`
- ⏳ `DataTable`
- ⏳ `Modal`
- ⏳ `Select`
- ⏳ `Checkbox`
- ⏳ `Radio`
- ⏳ `Pagination`
- ⏳ `LoadingSpinner`
- ⏳ `Card`
- ⏳ `Header`
- ⏳ `Sidebar`
- ⏳ `MobileSidebar`
- ⏳ `TraineeDashboard`
- ⏳ `TraineeApp`
- ⏳ `TrainerApp`
- ⏳ `Dashboard` (trainer)
- ⏳ `QuickActions`
- ⏳ `RecentActivity`
- ⏳ `StatsCard`

### שלב 3: API Functions (13 API files ללא tests) ✅ חלקי
**סטטוס**: 3/13 הושלמו

#### הושלמו:
- ✅ `authApi`
- ✅ `workoutApi`
- ✅ `nutritionApi`

#### נותרו:
- ⏳ `analyticsApi`
- ⏳ `cardioApi`
- ⏳ `goalsApi`
- ⏳ `habitsApi`
- ⏳ `messagesApi`
- ⏳ `traineeApi`
- ⏳ `workoutFeedbackApi`
- ⏳ `types.ts` (type tests)
- ⏳ `index.ts` (export tests)

### שלב 4: Integration Tests
**סטטוס**: לא התחיל

#### בדיקות אינטגרציה מומלצות:
- ⏳ Authentication flow (login → dashboard)
- ⏳ Workout creation flow
- ⏳ Nutrition tracking flow
- ⏳ Trainee-Trainer interaction
- ⏳ Data synchronization
- ⏳ Error handling across layers

### שלב 5: E2E Tests
**סטטוס**: לא התחיל

#### כלים מומלצים:
- ⏳ **Playwright** (מומלץ) - תמיכה טובה ב-Chrome, Firefox, Safari
- ⏳ **Cypress** - אלטרנטיבה פופולרית

#### תרחישי E2E מומלצים:
- ⏳ Complete user registration and login
- ⏳ Create and complete a workout
- ⏳ Add and track nutrition
- ⏳ Trainer creates workout plan for trainee
- ⏳ Trainee views and completes assigned workout
- ⏳ View analytics and reports

## מבנה קבצי בדיקות

### Hooks
```
src/hooks/
  ├── useAutoSave.test.ts ✅
  ├── useIsTablet.test.ts ✅
  ├── useKeyboardShortcut.test.ts ✅
  ├── useMemoizedCallback.test.ts ✅
  ├── useOptimisticUpdate.test.ts ✅
  └── [10 hooks נוספים]
```

### Components
```
src/components/
  ├── ui/
  │   ├── Button.test.tsx ✅
  │   ├── Input.test.tsx ✅
  │   └── [8 components נוספים]
  ├── common/
  │   ├── ErrorMessage.test.tsx ✅
  │   ├── EmptyState.test.tsx ✅
  │   └── [8 components נוספים]
  └── auth/
      ├── LoginForm.test.tsx ✅
      └── RegisterForm.test.tsx ⏳
```

### API
```
src/api/
  ├── authApi.test.ts ✅
  ├── workoutApi.test.ts ✅
  ├── nutritionApi.test.ts ✅
  └── [10 API files נוספים]
```

## כללי בדיקות

### Best Practices
1. **Unit Tests**: בדיקות מבודדות לכל פונקציה/קומפוננטה
2. **Integration Tests**: בדיקות אינטראקציה בין רכיבים
3. **E2E Tests**: בדיקות תרחישי משתמש מלאים
4. **Coverage Goals**: 
   - Lines: 70%+
   - Functions: 70%+
   - Branches: 70%+
   - Statements: 70%+

### Mocking Strategy
- **Supabase**: Mock ב-`src/test/helpers.tsx`
- **API Calls**: Mock `fetch` ו-Supabase queries
- **Local Storage**: Mock ב-`src/test/setup.ts`
- **Timers**: שימוש ב-`vi.useFakeTimers()`

## סקריפטים שימושיים

```bash
# הרצת כל הבדיקות
npm test

# הרצת בדיקות עם כיסוי
npm test -- --coverage

# הרצת בדיקות במצב watch
npm test -- --watch

# הרצת בדיקות ספציפיות
npm test -- useAutoSave

# הרצת E2E tests (לאחר הגדרה)
npm run test:e2e
```

## הערות
- בדיקות E2E דורשות הגדרת סביבת בדיקה נפרדת
- Integration tests דורשים mock database או test database
- יש לבדוק שגם edge cases מכוסים
- יש לבדוק שגם error cases מכוסים

## לוח זמנים מוצע
- **שבוע 1-2**: השלמת hooks tests (10 hooks)
- **שבוע 3-4**: השלמת components tests (20-30 components)
- **שבוע 5-6**: השלמת API tests (10 API files)
- **שבוע 7**: Integration tests
- **שבוע 8**: E2E tests setup והרצה ראשונית

## עדכונים
- **תאריך עדכון אחרון**: 2025-01-XX
- **כיסוי נוכחי**: ~30-40%
- **כיסוי יעד**: 70%+
