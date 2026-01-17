# Code Review Guidelines - NEWYM

## מטרה
מסמך זה מספק הנחיות לבדיקת קוד (Code Review) במערכת NEWYM, כדי להבטיח איכות קוד גבוהה, עקביות, ותחזוקה קלה.

---

## עקרונות כלליים

### 1. עקביות
- כל הקוד צריך לעקוב אחרי הסגנון הקיים בפרויקט
- שימוש ב-ESLint ו-Prettier לאוטומציה של עיצוב קוד

### 2. קריאות
- שמות משתנים ופונקציות ברורים ומתארים
- פונקציות קצרות (עד 50 שורות)
- קוד מודולרי וניתן לשימוש חוזר

### 3. אבטחה
- אין חשיפת מידע רגיש
- בדיקת קלט משתמש
- שימוש בטוח ב-API calls

### 4. ביצועים
- הימנעות מ-re-renders מיותרים
- שימוש ב-memoization במקומות הנכונים
- אופטימיזציה של queries

---

## Checklist לבדיקת קוד

### ✅ TypeScript & Types

- [ ] אין שימוש ב-`any` types
- [ ] כל הפונקציות מחזירות types ברורים
- [ ] שימוש ב-interfaces ו-types במקום `object` או `Record<string, unknown>`
- [ ] Type safety מלא - אין `as` casts מיותרים

**דוגמה טובה:**
```typescript
interface UserData {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<ApiResponse<UserData>> {
  // ...
}
```

**דוגמה רעה:**
```typescript
function getUser(id: string): Promise<any> {
  // ...
}
```

### ✅ Error Handling

- [ ] שימוש ב-`handleApiError` utility במקום `catch (err: any)`
- [ ] כל ה-errors מטופלים בצורה נכונה
- [ ] הודעות שגיאה ברורות למשתמש
- [ ] Logging של שגיאות לצרכי debug

**דוגמה טובה:**
```typescript
try {
  // API call
} catch (err: unknown) {
  const errorMessage = handleApiError(err, {
    defaultMessage: 'שגיאה בטעינת נתונים',
    context: 'getUserData',
    additionalInfo: { userId },
  });
  return { error: errorMessage };
}
```

**דוגמה רעה:**
```typescript
try {
  // API call
} catch (err: any) {
  return { error: err.message };
}
```

### ✅ Code Duplication

- [ ] אין קוד כפול
- [ ] שימוש ב-shared utilities
- [ ] פונקציות נפוצות ב-utils או hooks

**דוגמה טובה:**
```typescript
// utils/apiErrorHandler.ts
export function handleApiError(error: ApiError, options: ApiErrorHandlerOptions): string {
  // Centralized error handling
}

// api/usersApi.ts
import { handleApiError } from '../utils/apiErrorHandler';
```

### ✅ React Components

- [ ] Components קצרים (עד 300 שורות)
- [ ] שימוש ב-custom hooks ללוגיקה מורכבת
- [ ] Props עם types ברורים
- [ ] שימוש ב-`useCallback` ו-`useMemo` במידה נדרש
- [ ] אין `console.log` ב-production code

**דוגמה טובה:**
```typescript
interface UserCardProps {
  userId: string;
  onUserClick: (userId: string) => void;
}

export function UserCard({ userId, onUserClick }: UserCardProps) {
  const { data, loading, error } = useUserData(userId);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>{/* ... */}</div>;
}
```

### ✅ Performance

- [ ] אין re-renders מיותרים
- [ ] שימוש ב-`React.memo` במקומות הנכונים
- [ ] `useCallback` ו-`useMemo` עם dependencies נכונים
- [ ] Pagination על רשימות גדולות
- [ ] Lazy loading של components כבדים

### ✅ Testing

- [ ] Unit tests לפונקציות קריטיות
- [ ] Integration tests לזרימות חשובות
- [ ] Coverage של 80%+ על קוד חדש

### ✅ Accessibility

- [ ] ARIA labels על כל buttons ו-inputs
- [ ] Keyboard navigation עובד
- [ ] Color contrast עובר WCAG AA
- [ ] Screen reader friendly

### ✅ Documentation

- [ ] JSDoc על פונקציות מורכבות
- [ ] הערות על לוגיקה מורכבת
- [ ] README מעודכן אם יש שינויים ב-API

---

## תהליך Code Review

### 1. לפני הבדיקה

- וודא שהקוד עובר linting (`npm run lint`)
- וודא שהקוד עובר type checking (`npm run typecheck`)
- וודא שכל ה-tests עוברים (`npm test`)

### 2. במהלך הבדיקה

- בדוק את ה-checklist לעיל
- חפש בעיות אבטחה
- בדוק performance issues
- ודא שהקוד עקבי עם הסגנון הקיים

### 3. הערות

- הערות חיוביות על קוד טוב
- הערות בונות על שיפורים
- הצעות קונקרטיות לתיקון

### 4. אחרי הבדיקה

- Approve אם הכל תקין
- Request changes אם יש בעיות
- Discuss אם יש שאלות

---

## דוגמאות נפוצות לבעיות

### ❌ בעיה: שימוש ב-`any`

```typescript
// רע
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// טוב
interface DataItem {
  value: number;
}

function processData(data: DataItem[]): number[] {
  return data.map((item) => item.value);
}
```

### ❌ בעיה: Error handling לא נכון

```typescript
// רע
try {
  await apiCall();
} catch (err: any) {
  console.log(err);
}

// טוב
try {
  await apiCall();
} catch (err: unknown) {
  const errorMessage = handleApiError(err, {
    defaultMessage: 'שגיאה בקריאה ל-API',
    context: 'apiCall',
  });
  showErrorToast(errorMessage);
}
```

### ❌ בעיה: Component גדול מדי

```typescript
// רע - 500+ שורות
function UserDashboard() {
  // כל הלוגיקה כאן
}

// טוב - פיצול ל-components קטנים
function UserDashboard() {
  return (
    <>
      <UserProfileSection />
      <UserStatsSection />
      <UserActivitySection />
    </>
  );
}
```

### ❌ בעיה: Code duplication

```typescript
// רע - קוד כפול
function getUserData() {
  try {
    // error handling
  } catch (err: any) {
    return { error: err.message };
  }
}

function getTraineeData() {
  try {
    // error handling
  } catch (err: any) {
    return { error: err.message };
  }
}

// טוב - שימוש ב-utility
function getUserData() {
  try {
    // ...
  } catch (err: unknown) {
    return { error: handleApiError(err, { ... }) };
  }
}
```

---

## Best Practices

### 1. Naming Conventions

- **Components**: PascalCase (`UserCard.tsx`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`UserData`)

### 2. File Organization

```
src/
  api/
    userApi.ts
  components/
    user/
      UserCard.tsx
  hooks/
    useUserData.ts
  utils/
    apiErrorHandler.ts
  types/
    userTypes.ts
```

### 3. Import Order

```typescript
// 1. External libraries
import React from 'react';
import { supabase } from '../lib/supabase';

// 2. Internal utilities
import { handleApiError } from '../utils/apiErrorHandler';

// 3. Types
import type { UserData } from '../types/userTypes';

// 4. Components
import { UserCard } from './UserCard';
```

### 4. Error Messages

- הודעות שגיאה בעברית ברורות למשתמש
- הודעות שגיאה טכניות ל-logging בלבד
- שימוש ב-`getUserFriendlyError` להמרת שגיאות

---

## ESLint Rules

הפרויקט משתמש ב-ESLint עם strict rules:

- `@typescript-eslint/no-explicit-any`: error
- `max-lines-per-function`: warn (50)
- `complexity`: warn (15)
- `max-depth`: warn (4)
- `max-params`: warn (5)

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**תאריך עדכון אחרון**: 2025-01-27  
**גרסה**: 1.0
