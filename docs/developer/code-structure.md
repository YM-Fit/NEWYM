# מבנה קוד - Code Structure

מדריך מפורט למבנה הקוד במערכת ה-CRM של NEWYM.

## מבנה תיקיות

```
src/
├── api/                    # API Layer - תקשורת עם Backend
│   ├── crmClientsApi.ts   # CRM Clients API
│   ├── googleCalendarApi.ts # Google Calendar API
│   ├── types.ts           # API types
│   └── config.ts          # API configuration
│
├── services/               # Service Layer - לוגיקה עסקית
│   ├── crmService.ts      # CRM Service (caching, business logic)
│   ├── crmReportsService.ts # CRM Reports Service
│   ├── crmPipelineService.ts # Pipeline management
│   ├── crmAutomationService.ts # Automation rules
│   ├── communicationService.ts # Communication templates
│   ├── paymentService.ts  # Payment tracking
│   ├── advancedAnalyticsService.ts # Advanced analytics
│   ├── segmentationService.ts # Client segmentation
│   ├── documentService.ts # Document management
│   └── crm/               # CRM service exports
│       └── index.ts
│
├── components/             # UI Components
│   └── trainer/
│       └── crm/
│           ├── clients/
│           │   ├── ClientsListView.tsx
│           │   ├── ClientCard.tsx
│           │   └── ClientDetailView.tsx
│           ├── pipeline/
│           │   └── PipelineView.tsx
│           ├── analytics/
│           │   └── AdvancedAnalytics.tsx
│           └── reports/
│               └── CrmReportsView.tsx
│
├── contexts/               # React Contexts
│   └── CrmContext.tsx     # CRM Context
│
├── hooks/                  # React Hooks
│   ├── useCrmClients.ts   # Hook for CRM clients
│   ├── useCrmRealtime.ts  # Real-time updates
│   ├── useCrmEvents.ts    # Event system
│   └── useKeyboardShortcut.ts # Keyboard shortcuts
│
├── utils/                  # Utilities
│   ├── validation.ts      # Validation functions
│   ├── rateLimiter.ts     # Rate limiting
│   ├── encryption.ts      # Encryption utilities
│   ├── logger.ts          # Logging
│   └── errorTracking.ts   # Error tracking
│
├── constants/              # Constants
│   └── crmConstants.ts    # CRM constants
│
├── types/                  # TypeScript types
│   ├── database.ts        # Database types
│   └── crm.ts             # CRM types
│
└── lib/                    # Libraries
    └── supabase.ts        # Supabase client
```

## API Layer (`src/api/`)

### crmClientsApi.ts

**תפקיד**: פונקציות CRUD ללקוחות CRM

**פונקציות עיקריות**:
- `getClientsFromCalendar()` - קבלת רשימת לקוחות
- `getClientCalendarStats()` - סטטיסטיקות לקוח
- `getClientInteractions()` - אינטראקציות לקוח
- `createClientInteraction()` - יצירת אינטראקציה
- `linkTraineeToCalendarClient()` - קישור מתאמן ללקוח

**דוגמה**:
```typescript
export async function getClientsFromCalendar(
  trainerId: string
): Promise<ApiResponse<CalendarClient[]>> {
  // Implementation
}
```

### googleCalendarApi.ts

**תפקיד**: אינטגרציה עם Google Calendar API

**פונקציות עיקריות**:
- `initiateGoogleOAuth()` - התחלת OAuth flow
- `handleGoogleOAuthCallback()` - טיפול ב-OAuth callback
- `getGoogleCalendarEvents()` - קבלת אירועים
- `syncGoogleCalendar()` - סנכרון ידני
- `createGoogleCalendarEvent()` - יצירת אירוע

## Service Layer (`src/services/`)

### crmService.ts

**תפקיד**: שירות CRM מרכזי עם caching

**מחלקה**: `CrmService`

**מתודות סטטיות**:
- `getClients()` - קבלת לקוחות עם cache
- `getClientStats()` - סטטיסטיקות לקוח
- `getInteractions()` - אינטראקציות
- `createInteraction()` - יצירת אינטראקציה
- `invalidateCache()` - ביטול cache

**דוגמה**:
```typescript
export class CrmService {
  static async getClients(
    trainerId: string,
    useCache = true
  ): Promise<ApiResponse<CalendarClient[]>> {
    // Check cache
    // Fetch from API if miss
    // Store in cache
  }
}
```

### crmReportsService.ts

**תפקיד**: דוחות ואנליטיקה

**פונקציות**:
- `getPipelineReport()` - דוח Pipeline
- `getRevenueReport()` - דוח הכנסות
- `getActivityReport()` - דוח פעילות
- `getClientsNeedingFollowup()` - לקוחות הזקוקים למעקב

### crmPipelineService.ts

**תפקיד**: ניהול Pipeline

**פונקציות**:
- `getPipelineData()` - נתוני Pipeline
- `moveClientToStage()` - העברת לקוח לשלב
- `calculateLeadScore()` - חישוב Lead Score
- `detectBottlenecks()` - זיהוי חסימות

## Components (`src/components/`)

### ClientsListView.tsx

**תפקיד**: תצוגת רשימת לקוחות

**Props**:
```typescript
interface ClientsListViewProps {
  trainerId: string;
  onClientSelect?: (client: CalendarClient) => void;
}
```

**State**:
- `clients` - רשימת לקוחות
- `loading` - מצב טעינה
- `error` - שגיאה
- `filters` - פילטרים

**Features**:
- חיפוש
- פילטרים
- מיון
- Pagination

### ClientDetailView.tsx

**תפקיד**: תצוגה מפורטת של לקוח

**Tabs**:
- סקירה
- תקשורת
- תשלומים
- חוזים
- מסמכים

## Hooks (`src/hooks/`)

### useCrmClients.ts

**תפקיד**: Hook לניהול לקוחות CRM

**דוגמה**:
```typescript
export function useCrmClients(trainerId: string) {
  const [clients, setClients] = useState<CalendarClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    CrmService.getClients(trainerId)
      .then(result => {
        if (result.success && result.data) {
          setClients(result.data);
        } else {
          setError(result.error || 'שגיאה');
        }
        setLoading(false);
      });
  }, [trainerId]);

  return { clients, loading, error };
}
```

### useCrmRealtime.ts

**תפקיד**: Real-time updates מ-Supabase

**דוגמה**:
```typescript
export function useCrmRealtime(trainerId: string) {
  useEffect(() => {
    const subscription = supabase
      .channel('crm-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'google_calendar_clients',
        filter: `trainer_id=eq.${trainerId}`
      }, (payload) => {
        // Handle real-time update
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [trainerId]);
}
```

## Utils (`src/utils/`)

### validation.ts

**תפקיד**: פונקציות ולידציה

**פונקציות**:
- `validateEmail()` - ולידציה של אימייל
- `validatePhone()` - ולידציה של טלפון
- `validateName()` - ולידציה של שם
- `validateDate()` - ולידציה של תאריך

### rateLimiter.ts

**תפקיד**: הגבלת קצב קריאות API

**דוגמה**:
```typescript
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(key: string, maxRequests: number, windowMs: number): boolean {
    // Implementation
  }
}
```

### logger.ts

**תפקיד**: Logging

**פונקציות**:
- `logger.debug()` - Debug logs
- `logger.info()` - Info logs
- `logger.warn()` - Warning logs
- `logger.error()` - Error logs

## Constants (`src/constants/`)

### crmConstants.ts

**תפקיד**: קבועים של CRM

**קבועים**:
- `CRM_CACHE_TTL` - Cache TTL values
- `CRM_ALERTS` - Alert thresholds
- `CRM_VALIDATION` - Validation rules
- `CRM_STATUSES` - CRM statuses

## Types (`src/types/`)

### database.ts

**תפקיד**: Database types מ-Supabase

**Generated**: מ-Supabase CLI

### crm.ts

**תפקיד**: CRM-specific types

**Types**:
- `CalendarClient`
- `ClientInteraction`
- `ClientCalendarStats`
- `PipelineStage`
- `LeadScore`

## Naming Conventions

### Files

- **Components**: PascalCase (e.g., `ClientCard.tsx`)
- **Services**: camelCase (e.g., `crmService.ts`)
- **Utils**: camelCase (e.g., `validation.ts`)
- **Types**: camelCase (e.g., `crm.ts`)
- **Constants**: camelCase (e.g., `crmConstants.ts`)

### Functions

- **API functions**: camelCase (e.g., `getClientsFromCalendar`)
- **Service methods**: camelCase (e.g., `getClients`)
- **Component functions**: camelCase (e.g., `handleSubmit`)

### Variables

- **camelCase** for variables (e.g., `clientId`)
- **UPPER_SNAKE_CASE** for constants (e.g., `CRM_CACHE_TTL`)

### Types/Interfaces

- **PascalCase** (e.g., `CalendarClient`, `ApiResponse`)

## Code Style

### TypeScript

- **Strict mode** enabled
- **No `any` types** (use `unknown` if needed)
- **Explicit return types** for public functions
- **JSDoc** for all public functions

### React

- **Functional components** only
- **Hooks** for state management
- **Error boundaries** for error handling
- **Lazy loading** for large components

### Error Handling

```typescript
try {
  const result = await apiCall();
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
} catch (error) {
  logger.error('API call failed', error);
  throw error;
}
```

### Async/Await

```typescript
// Good
const result = await getClients(trainerId);
if (result.success) {
  // Handle success
}

// Bad
getClients(trainerId).then(result => {
  // Handle result
});
```

## Testing

### Unit Tests

**Location**: `src/**/*.test.ts`

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail } from './validation';

describe('validateEmail', () => {
  it('should validate correct email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
  });
});
```

### Component Tests

**Location**: `src/**/*.test.tsx`

**Example**:
```typescript
import { render, screen } from '@testing-library/react';
import { ClientCard } from './ClientCard';

describe('ClientCard', () => {
  it('should render client name', () => {
    render(<ClientCard client={mockClient} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

---

**עוד תיעוד**: [ארכיטקטורה](./architecture.md) | [הנחיות תרומה](./contributing.md) | [תיעוד טכני](../technical/database-schema.md)
