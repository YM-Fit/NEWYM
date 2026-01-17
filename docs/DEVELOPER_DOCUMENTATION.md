# Developer Documentation

## Architecture Overview

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Testing**: Vitest + Playwright
- **Error Tracking**: Sentry

### Project Structure

```
src/
├── api/              # API layer (Supabase client wrappers)
├── components/       # React components
│   ├── common/      # Shared components
│   ├── trainer/     # Trainer-specific components
│   └── ui/          # UI primitives
├── contexts/        # React contexts (Auth, CRM, Theme)
├── hooks/           # Custom React hooks
├── services/        # Business logic services
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── test/            # Test utilities and helpers
```

## Code Organization

### API Layer (`src/api/`)

API files wrap Supabase client calls and provide:
- Type safety
- Error handling
- Rate limiting
- Caching

Example:
```typescript
// src/api/crmClientsApi.ts
export async function getClientsFromCalendar(
  trainerId: string,
  options?: PaginationOptions
): Promise<ApiResponse<PaginatedResponse<CalendarClient>>> {
  // Implementation
}
```

### Services (`src/services/`)

Services contain business logic:
- Data transformation
- Complex operations
- Integration with multiple APIs

Example:
```typescript
// src/services/crmService.ts
export class CrmService {
  static async getClients(trainerId: string): Promise<ApiResponse<CalendarClient[]>> {
    // Business logic
  }
}
```

### Components (`src/components/`)

Components are organized by feature:
- `trainer/crm/` - CRM features
- `common/` - Shared components
- `ui/` - UI primitives

### Hooks (`src/hooks/`)

Custom hooks for:
- Data fetching
- State management
- Side effects

Example:
```typescript
// src/hooks/useCrm.ts
export function useCrm() {
  const context = useContext(CrmContext);
  // ...
}
```

## Coding Guidelines

### TypeScript

- Use strict mode
- Define types for all functions
- Avoid `any` type
- Use interfaces for object shapes

### React

- Use functional components
- Prefer hooks over class components
- Extract reusable logic to custom hooks
- Use Context for global state

### Error Handling

- Always handle errors
- Use try-catch for async operations
- Log errors with context
- Show user-friendly messages

### Performance

- Use lazy loading for heavy components
- Implement pagination for large lists
- Cache frequently accessed data
- Optimize re-renders with React.memo

## Testing

### Unit Tests

```typescript
// src/services/crmService.test.ts
import { describe, it, expect } from 'vitest';

describe('CrmService', () => {
  it('should get clients', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
// src/test/integration/crmIntegration.test.ts
describe('CRM Integration', () => {
  it('should handle client CRUD flow', async () => {
    // Test implementation
  });
});
```

### E2E Tests

```typescript
// e2e/tests/crm/client-crud.spec.ts
import { test, expect } from '@playwright/test';

test('should create client', async ({ page }) => {
  // Test implementation
});
```

## Database Schema

### Key Tables

- `trainers` - Trainer accounts
- `trainees` - Clients/trainees
- `google_calendar_clients` - Calendar clients
- `client_interactions` - Interaction history
- `crm_payments` - Payment tracking
- `crm_automation_rules` - Automation rules
- `audit_log` - Audit trail

### Migrations

Migrations are in `supabase/migrations/`:
- Named with timestamp: `YYYYMMDDHHMMSS_description.sql`
- Applied via Supabase CLI or dashboard

## Security

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only access their own data
- Policies enforce data isolation

### Authentication

- JWT-based authentication
- Token refresh handled automatically
- Session management via Supabase Auth

### Rate Limiting

- Client-side rate limiting
- Server-side rate limiting (Supabase)
- Exponential backoff for retries

## Deployment

### Build

```bash
npm run build
```

### Environment Variables

Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (optional)

### CI/CD

- Automated tests on push
- Build verification
- Deployment to production

## Contributing

1. Create feature branch
2. Write tests
3. Implement feature
4. Update documentation
5. Submit pull request

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
