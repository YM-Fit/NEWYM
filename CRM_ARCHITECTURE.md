# CRM System Architecture

## סקירה כללית

מערכת ה-CRM של NEWYM בנויה על ארכיטקטורה מודולרית עם הפרדה ברורה בין שכבות.

## מבנה הקבצים

```
src/
├── api/                    # API Layer - תקשורת עם Backend
│   ├── crmClientsApi.ts   # CRM Clients API
│   └── googleCalendarApi.ts # Google Calendar API
│
├── services/               # Service Layer - לוגיקה עסקית
│   ├── crmService.ts      # CRM Service (caching, business logic)
│   └── crmReportsService.ts # CRM Reports Service
│
├── components/             # UI Components
│   └── trainer/
│       └── Clients/
│           ├── ClientsListView.tsx
│           ├── ClientCard.tsx
│           └── CrmReportsView.tsx
│
├── constants/              # Constants
│   └── crmConstants.ts     # CRM constants
│
├── utils/                  # Utilities
│   ├── validation.ts      # Validation functions
│   ├── rateLimiter.ts     # Rate limiting
│   └── encryption.ts      # Encryption utilities
│
└── hooks/                  # React Hooks
    └── useKeyboardShortcut.ts
```

## שכבות הארכיטקטורה

### 1. API Layer (`src/api/`)

**תפקיד**: תקשורת ישירה עם Supabase/Backend

**קבצים עיקריים**:
- `crmClientsApi.ts` - פונקציות CRUD ללקוחות
- `googleCalendarApi.ts` - אינטגרציה עם Google Calendar

**עקרונות**:
- פונקציות טהורות (pure functions)
- טיפוסים חזקים עם TypeScript
- Error handling בסיסי
- JSDoc מפורט

**דוגמה**:
```typescript
export async function getClientsFromCalendar(
  trainerId: string
): Promise<ApiResponse<CalendarClient[]>> {
  // API call logic
}
```

### 2. Service Layer (`src/services/`)

**תפקיד**: לוגיקה עסקית, caching, orchestration

**קבצים עיקריים**:
- `crmService.ts` - שירות CRM מרכזי עם caching
- `crmReportsService.ts` - דוחות ואנליטיקה

**עקרונות**:
- Caching אוטומטי
- Error handling משופר
- Business logic
- Cache invalidation

**דוגמה**:
```typescript
export class CrmService {
  static async getClients(
    trainerId: string,
    useCache = true
  ): Promise<ApiResponse<CalendarClient[]>> {
    // Check cache first
    // If miss, fetch from API
    // Store in cache
  }
}
```

### 3. Component Layer (`src/components/`)

**תפקיד**: UI Components ו-User Interaction

**עקרונות**:
- Lazy loading
- Error boundaries
- Accessibility (ARIA)
- Keyboard shortcuts

**דוגמה**:
```typescript
const ClientCard = lazy(() => import('./ClientCard'));

<Suspense fallback={<LoadingSpinner />}>
  <ClientCard />
</Suspense>
```

## Data Flow

```
User Action
    ↓
Component (UI)
    ↓
Service Layer (Business Logic + Cache)
    ↓
API Layer (HTTP/DB Calls)
    ↓
Supabase/Backend
    ↓
Response flows back up
```

## Caching Strategy

### Cache Levels

1. **Service Layer Cache** (`CrmService`)
   - TTL: 5-10 minutes
   - In-memory cache
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

- Automatic on mutations (create, update, delete)
- Manual via `CrmService.invalidateCache()`
- Time-based expiration

## Security

### Authentication
- Supabase Auth
- JWT tokens
- OAuth 2.0 for Google Calendar

### Authorization
- Row Level Security (RLS) in database
- Policy-based access control
- Trainer-scoped data

### Data Protection
- Token encryption (basic implementation)
- Rate limiting
- Input validation

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

## Performance Optimizations

### 1. Lazy Loading
- Components loaded on demand
- Code splitting

### 2. Caching
- Service layer caching
- Reduced API calls

### 3. Memoization
- React.useMemo for expensive calculations
- React.useCallback for stable references

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

## Best Practices

1. **Always use Service Layer** - Don't call API directly from components
2. **Validate inputs** - Use validation utilities
3. **Handle errors gracefully** - User-friendly messages
4. **Cache appropriately** - Balance freshness vs performance
5. **Document code** - JSDoc for all public functions
6. **Test thoroughly** - Unit + Integration tests
7. **Follow TypeScript** - Strong typing everywhere
8. **Accessibility** - ARIA labels, keyboard navigation
