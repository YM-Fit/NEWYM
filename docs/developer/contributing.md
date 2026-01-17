# הנחיות תרומה - Contributing Guidelines

תודה על העניין שלך לתרום למערכת ה-CRM של NEWYM! מדריך זה מסביר איך לתרום לפרויקט.

## תוכן עניינים

1. [קוד התנהגות](#קוד-התנהגות)
2. [תהליך תרומה](#תהליך-תרומה)
3. [סטנדרטי קוד](#סטנדרטי-קוד)
4. [בדיקות](#בדיקות)
5. [תיעוד](#תיעוד)
6. [Commit Messages](#commit-messages)
7. [Pull Requests](#pull-requests)

## קוד התנהגות

### עקרונות

- **כבוד** - התייחס בכבוד לכל המשתתפים
- **סובלנות** - היה סובלני לדעות שונות
- **שיתוף פעולה** - עבד יחד למען המטרה המשותפת
- **בנייה** - בנה על העבודה של אחרים

### התנהגות לא מקובלת

- הערות פוגעניות או משפילות
- הטרדה או בריונות
- פרסום מידע פרטי ללא רשות
- התנהגות לא מקצועית אחרת

## תהליך תרומה

### 1. Fork ו-Clone

```bash
# Fork את הפרויקט ב-GitHub
# Clone את ה-fork שלך
git clone https://github.com/YOUR_USERNAME/NEWYM.git
cd NEWYM
```

### 2. יצירת Branch

```bash
# צור branch חדש
git checkout -b feature/your-feature-name

# או לתיקון באג
git checkout -b fix/your-bug-fix
```

**Conventions**:
- `feature/` - תכונות חדשות
- `fix/` - תיקוני באגים
- `docs/` - שינויים בתיעוד
- `refactor/` - שיפורי קוד
- `test/` - הוספת בדיקות

### 3. פיתוח

- עקוב אחר [סטנדרטי הקוד](#סטנדרטי-קוד)
- כתוב [בדיקות](#בדיקות) לתכונות חדשות
- עדכן [תיעוד](#תיעוד) אם נדרש
- ודא שכל הבדיקות עוברות

### 4. Commit

```bash
git add .
git commit -m "feat: add new feature"
```

ראה [Commit Messages](#commit-messages) לפרטים.

### 5. Push ו-Pull Request

```bash
git push origin feature/your-feature-name
```

צור Pull Request ב-GitHub עם תיאור מפורט.

## סטנדרטי קוד

### TypeScript

- **Strict mode** - תמיד
- **No `any`** - השתמש ב-`unknown` אם צריך
- **Explicit types** - הגדר טיפוסים מפורשים
- **JSDoc** - תיעוד לכל פונקציה public

**דוגמה טובה**:
```typescript
/**
 * Get clients from Google Calendar
 * 
 * @param trainerId - The unique identifier of the trainer
 * @returns Promise resolving to an ApiResponse containing an array of CalendarClient objects
 */
export async function getClientsFromCalendar(
  trainerId: string
): Promise<ApiResponse<CalendarClient[]>> {
  // Implementation
}
```

**דוגמה רעה**:
```typescript
export async function getClients(trainerId: any): Promise<any> {
  // Implementation
}
```

### React

- **Functional components** - רק components פונקציונליים
- **Hooks** - השתמש ב-hooks לניהול state
- **Error boundaries** - עטף components ב-error boundaries
- **Lazy loading** - השתמש ב-lazy loading ל-components גדולים

**דוגמה טובה**:
```typescript
import { lazy, Suspense } from 'react';

const ClientCard = lazy(() => import('./ClientCard'));

function ClientsList() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ClientCard />
    </Suspense>
  );
}
```

### Naming Conventions

- **Files**: 
  - Components: `PascalCase.tsx` (e.g., `ClientCard.tsx`)
  - Services: `camelCase.ts` (e.g., `crmService.ts`)
  - Utils: `camelCase.ts` (e.g., `validation.ts`)

- **Functions**: `camelCase` (e.g., `getClientsFromCalendar`)
- **Variables**: `camelCase` (e.g., `clientId`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `CRM_CACHE_TTL`)
- **Types/Interfaces**: `PascalCase` (e.g., `CalendarClient`)

### Code Organization

- **One file, one responsibility** - קובץ אחד, אחריות אחת
- **Small functions** - פונקציות קטנות (< 50 שורות)
- **DRY** - Don't Repeat Yourself
- **Separation of concerns** - הפרדה בין שכבות

### Error Handling

**תמיד**:
- תפוס שגיאות עם `try-catch`
- החזר `ApiResponse` עם `error` field
- לוג שגיאות עם `logger`
- הצג הודעות ידידותיות למשתמש

**דוגמה**:
```typescript
try {
  const result = await apiCall();
  if (!result.success) {
    logger.error('API call failed', result.error);
    toast.error(result.error || 'שגיאה');
    return;
  }
  return result.data;
} catch (error) {
  logger.error('Unexpected error', error);
  toast.error('שגיאה לא צפויה');
  throw error;
}
```

## בדיקות

### דרישות

- **כל תכונה חדשה** חייבת בדיקות
- **כל תיקון באג** חייב בדיקות
- **Coverage** - לפחות 80% coverage

### סוגי בדיקות

1. **Unit Tests** - פונקציות בודדות
2. **Component Tests** - React components
3. **Integration Tests** - אינטגרציה בין שכבות
4. **E2E Tests** - זרימות מלאות

### כתיבת בדיקות

**Location**: `src/**/*.test.ts` או `src/**/*.test.tsx`

**דוגמה**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { CrmService } from './crmService';

describe('CrmService', () => {
  describe('getClients', () => {
    it('should return clients from cache if available', async () => {
      // Arrange
      const trainerId = 'trainer-123';
      const cachedClients = [{ id: '1', name: 'Client 1' }];
      
      // Act
      const result = await CrmService.getClients(trainerId, true);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedClients);
    });

    it('should fetch from API if cache miss', async () => {
      // Test implementation
    });
  });
});
```

### הרצת בדיקות

```bash
# כל הבדיקות
npm test

# בדיקות עם coverage
npm test -- --coverage

# בדיקות במצב watch
npm test -- --watch
```

## תיעוד

### JSDoc

**כל פונקציה public** חייבת JSDoc:

```typescript
/**
 * Get clients from Google Calendar
 * 
 * @param trainerId - The unique identifier of the trainer
 * @param useCache - Whether to use cache (default: true)
 * @returns Promise resolving to an ApiResponse containing an array of CalendarClient objects
 * 
 * @example
 * ```typescript
 * const result = await getClientsFromCalendar('trainer-123');
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */
export async function getClientsFromCalendar(
  trainerId: string,
  useCache = true
): Promise<ApiResponse<CalendarClient[]>> {
  // Implementation
}
```

### README Updates

אם הוספת תכונה חדשה:
- עדכן את `README.md`
- עדכן את `docs/user-guide/features.md`
- עדכן את `docs/api/openapi.yaml` (אם יש API חדש)

## Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - תכונה חדשה
- `fix` - תיקון באג
- `docs` - שינוי בתיעוד
- `style` - שינוי פורמט (לא משפיע על קוד)
- `refactor` - שיפור קוד (לא משפיע על תכונות)
- `test` - הוספת בדיקות
- `chore` - משימות תחזוקה

### Examples

```
feat(crm): add client search functionality

Add search bar to ClientsListView component with filtering
by name, email, and phone number.

Closes #123
```

```
fix(api): handle Google Calendar token expiration

Add automatic token refresh when Google Calendar token expires.
Show user-friendly error message if refresh fails.

Fixes #456
```

```
docs(user-guide): add FAQ section

Add frequently asked questions section to user guide with
common issues and solutions.
```

## Pull Requests

### Checklist

לפני יצירת Pull Request, ודא:

- [ ] כל הבדיקות עוברות
- [ ] Coverage לפחות 80%
- [ ] אין linting errors
- [ ] הקוד עוקב אחר הסטנדרטים
- [ ] JSDoc נוסף לכל פונקציה public
- [ ] תיעוד עודכן (אם נדרש)
- [ ] Commit messages עוקבים אחר הפורמט

### Template

```markdown
## תיאור
תיאור קצר של השינוי

## סוג שינוי
- [ ] תכונה חדשה
- [ ] תיקון באג
- [ ] שיפור קוד
- [ ] שינוי בתיעוד
- [ ] אחר

## בדיקות
- [ ] בדיקות unit נוספו/עודכנו
- [ ] כל הבדיקות עוברות
- [ ] בדיקות ידניות בוצעו

## Screenshots (אם רלוונטי)
[הוסף screenshots]

## Issues
Closes #123
```

### Review Process

1. **Automated checks** - CI/CD יבצע בדיקות אוטומטיות
2. **Code review** - מפתח אחר יבדוק את הקוד
3. **Approval** - נדרש approval לפני merge
4. **Merge** - לאחר approval, הקוד ימוזג

### Feedback

אם יש הערות ב-review:
- הגב על כל הערה
- בצע שינויים אם נדרש
- עדכן את ה-PR

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Supabase Documentation](https://supabase.com/docs)

---

**שאלות?** צור issue או צור קשר עם המפתחים.

**תודה על התרומה!** 🙏
