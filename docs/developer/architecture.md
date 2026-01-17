# CRM System Architecture

## סקירה כללית

מערכת ה-CRM של NEWYM בנויה על ארכיטקטורה מודולרית עם הפרדה ברורה בין שכבות. המערכת משתמשת ב-React + TypeScript בצד הלקוח, Supabase כבקאנד, ו-Edge Functions לביצוע משימות בצד השרת.

## ארכיטקטורה כללית

```
┌─────────────────────────────────────────────────────────┐
│                    Client (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Components│  │  Hooks   │  │ Contexts │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │            │              │                      │
│       └────────────┼──────────────┘                      │
│                    │                                      │
│              ┌─────▼─────┐                               │
│              │ Services  │                               │
│              └─────┬─────┘                               │
└────────────────────┼────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │  API Layer  │
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼────┐ ┌────▼────┐ ┌─────▼─────┐
│  Supabase  │ │  Google │ │  Edge     │
│  Database  │ │ Calendar│ │ Functions │
└────────────┘ └─────────┘ └───────────┘
```

## שכבות הארכיטקטורה

### 1. Component Layer (`src/components/`)

**תפקיד**: UI Components ו-User Interaction

**עקרונות**:
- Lazy loading
- Error boundaries
- Accessibility (ARIA)
- Keyboard shortcuts
- Responsive design

**מבנה**:
```
src/components/
├── trainer/
│   └── crm/
│       ├── clients/
│       │   ├── ClientsListView.tsx
│       │   ├── ClientCard.tsx
│       │   └── ClientDetailView.tsx
│       ├── pipeline/
│       │   └── PipelineView.tsx
│       ├── analytics/
│       │   └── AdvancedAnalytics.tsx
│       └── reports/
│           └── CrmReportsView.tsx
```

**דוגמה**:
```typescript
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

const ClientCard = lazy(() => import('./ClientCard'));

function ClientsListView() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <ClientCard />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 2. Context Layer (`src/contexts/`)

**תפקיד**: State Management גלובלי

**עקרונות**:
- React Context API
- Centralized state
- Optimistic updates
- Cache management

**דוגמה**:
```typescript
interface CrmContextType {
  clients: CalendarClient[];
  loading: boolean;
  error: string | null;
  refreshClients: () => Promise<void>;
}

export const CrmContext = createContext<CrmContextType | null>(null);
```

### 3. Service Layer (`src/services/`)

**תפקיד**: לוגיקה עסקית, caching, orchestration

**עקרונות**:
- Caching אוטומטי
- Error handling משופר
- Business logic
- Cache invalidation
- Retry logic

**מבנה**:
```
src/services/
├── crmService.ts           # CRM Service (caching, business logic)
├── crmReportsService.ts    # CRM Reports Service
├── crmPipelineService.ts   # Pipeline management
├── crmAutomationService.ts # Automation rules
├── communicationService.ts  # Communication templates
├── paymentService.ts       # Payment tracking
├── advancedAnalyticsService.ts # Advanced analytics
├── segmentationService.ts  # Client segmentation
└── documentService.ts      # Document management
```

**דוגמה**:
```typescript
export class CrmService {
  static async getClients(
    trainerId: string,
    useCache = true
  ): Promise<ApiResponse<CalendarClient[]>> {
    const cacheKey = `clients:${trainerId}`;
    
    if (useCache) {
      const cached = crmCache.get<CalendarClient[]>(cacheKey);
      if (cached) {
        return { data: cached, success: true };
      }
    }
    
    const result = await getClientsFromCalendar(trainerId);
    
    if (result.success && result.data) {
      crmCache.set(cacheKey, result.data, CRM_CACHE_TTL);
    }
    
    return result;
  }
}
```

### 4. API Layer (`src/api/`)

**תפקיד**: תקשורת ישירה עם Supabase/Backend

**עקרונות**:
- פונקציות טהורות (pure functions)
- טיפוסים חזקים עם TypeScript
- Error handling בסיסי
- JSDoc מפורט
- Retry logic

**מבנה**:
```
src/api/
├── crmClientsApi.ts        # CRM Clients API
├── googleCalendarApi.ts     # Google Calendar API
├── types.ts                # API types
└── config.ts               # API configuration
```

**דוגמה**:
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
  if (!trainerId || typeof trainerId !== 'string') {
    return { error: 'trainerId הוא חובה' };
  }

  try {
    const { data, error } = await supabase
      .from('google_calendar_clients')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('last_event_date', { ascending: false });

    if (error) {
      logSupabaseError(error, 'getClientsFromCalendar', { trainerId });
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת לקוחות' };
  }
}
```

### 5. Database Layer (Supabase)

**תפקיד**: אחסון נתונים

**עקרונות**:
- Row Level Security (RLS)
- Foreign keys
- Indexes
- Triggers
- Functions

**טבלאות עיקריות**:
- `google_calendar_clients` - כרטיסיות לקוחות
- `client_interactions` - אינטראקציות עם לקוחות
- `trainees` - מתאמנים (מורחב עם שדות CRM)
- `trainer_google_credentials` - OAuth credentials
- `google_calendar_sync` - סנכרון אירועים

### 6. Edge Functions (`supabase/functions/`)

**תפקיד**: ביצוע משימות בצד השרת

**עקרונות**:
- Deno runtime
- JWT verification
- Error handling
- Logging

**Functions**:
- `google-oauth` - OAuth flow
- `sync-google-calendar` - סנכרון אירועים
- `google-webhook` - Push notifications
- `crm-automation` - Automation rules

## Data Flow

### קריאת נתונים

```
User Action (Click)
    ↓
Component (useState/useEffect)
    ↓
Hook (useCrmClients)
    ↓
Service Layer (CrmService.getClients)
    ↓
  ├─ Check Cache
  │   ├─ Hit → Return cached data
  │   └─ Miss → Continue
    ↓
API Layer (getClientsFromCalendar)
    ↓
Supabase Client
    ↓
Database Query
    ↓
Response flows back up
    ↓
Update Cache
    ↓
Update Component State
    ↓
Re-render UI
```

### כתיבת נתונים

```
User Action (Form Submit)
    ↓
Component (handleSubmit)
    ↓
Service Layer (CrmService.createInteraction)
    ↓
API Layer (createClientInteraction)
    ↓
Supabase Client (INSERT)
    ↓
Database Transaction
    ↓
Response flows back up
    ↓
Invalidate Cache
    ↓
Optimistic Update
    ↓
Update Component State
    ↓
Re-render UI
```

## Caching Strategy

### Cache Levels

1. **Service Layer Cache** (`CrmService`)
   - TTL: 5-10 minutes
   - In-memory cache (Map)
   - Auto-invalidation on mutations

2. **Browser Cache**
   - HTTP cache headers
   - Service Worker (future)

### Cache Keys

- `clients:{trainerId}` - List of clients
- `client-stats:{clientId}` - Client statistics
- `interactions:{traineeId}` - Client interactions
- `events:{clientId}:{start}:{end}` - Calendar events

### Cache Invalidation

- **Automatic** on mutations (create, update, delete)
- **Manual** via `CrmService.invalidateCache()`
- **Time-based** expiration (TTL)

## Security

### Authentication

- **Supabase Auth** - JWT tokens
- **OAuth 2.0** - Google Calendar integration
- **Token refresh** - Automatic token renewal

### Authorization

- **Row Level Security (RLS)** - Database-level permissions
- **Policy-based access control** - Trainer-scoped data
- **JWT verification** - Edge Functions verify tokens

### Data Protection

- **Token encryption** - OAuth tokens encrypted
- **Rate limiting** - API rate limiting
- **Input validation** - All inputs validated
- **SQL injection prevention** - Parameterized queries

## Error Handling

### Error Hierarchy

1. **API Errors** - Network, database errors
2. **Validation Errors** - Input validation failures
3. **Business Logic Errors** - Domain-specific errors

### Error Flow

```
Error occurs
    ↓
Caught by Service Layer
    ↓
Logged via Logger
    ↓
User-friendly message via Toast
    ↓
Error Boundary (if React error)
```

### Error Types

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
  code?: string;
}
```

## Performance Optimizations

### 1. Lazy Loading

```typescript
const ClientCard = lazy(() => import('./ClientCard'));

<Suspense fallback={<LoadingSpinner />}>
  <ClientCard />
</Suspense>
```

### 2. Caching

- Service layer caching
- Reduced API calls
- Faster response times

### 3. Memoization

```typescript
const memoizedClients = useMemo(
  () => clients.filter(c => c.status === 'active'),
  [clients]
);
```

### 4. Pagination

- Large lists paginated
- Virtual scrolling (future)

## Testing Strategy

### Unit Tests

- Service layer functions
- Utility functions
- Validation functions

### Component Tests

- React components
- User interactions
- Error states

### Integration Tests

- API integration
- Service + API integration
- End-to-end flows

## Best Practices

1. **Always use Service Layer** - Don't call API directly from components
2. **Validate inputs** - Use validation utilities
3. **Handle errors gracefully** - User-friendly messages
4. **Cache appropriately** - Balance freshness vs performance
5. **Document code** - JSDoc for all public functions
6. **Test thoroughly** - Unit + Integration tests
7. **Follow TypeScript** - Strong typing everywhere
8. **Accessibility** - ARIA labels, keyboard navigation

## Future Improvements

1. **Advanced Caching**
   - Redis for server-side caching
   - Service Worker for offline support

2. **Real-time Updates**
   - Supabase Realtime subscriptions
   - WebSocket connections

3. **Advanced Security**
   - Proper encryption (AES-256)
   - Token rotation
   - Audit logging

4. **Performance**
   - Virtual scrolling
   - Infinite scroll
   - Optimistic updates

5. **Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - Analytics

---

**עוד תיעוד**: [מבנה קוד](./code-structure.md) | [הנחיות תרומה](./contributing.md) | [תיעוד טכני](../technical/database-schema.md)
