# Edge Functions Documentation

תיעוד מפורט של Edge Functions במערכת ה-CRM של NEWYM.

## סקירה כללית

Edge Functions הן פונקציות serverless שרצות על Supabase Edge Runtime (Deno). הן משמשות לביצוע משימות בצד השרת כמו OAuth flows, סנכרון נתונים, ואוטומציה.

## Runtime

- **Runtime**: Deno
- **Language**: TypeScript
- **Location**: `supabase/functions/`

## Functions

### google-oauth

**תפקיד**: ניהול OAuth flow עם Google Calendar

**Endpoint**: `/functions/v1/google-oauth`

**Methods**:
- `GET /google-oauth?trainer_id={id}` - Initiate OAuth flow
- `POST /google-oauth/callback` - Handle OAuth callback
- `POST /google-oauth/disconnect` - Disconnect Google Calendar

**Request**:
```typescript
// GET /google-oauth?trainer_id={id}
{
  headers: {
    'Authorization': 'Bearer <supabase_jwt_token>'
  }
}
```

**Response**:
```typescript
{
  authUrl: string // Google OAuth authorization URL
}
```

**Flow**:
1. Client calls `GET /google-oauth?trainer_id={id}`
2. Function generates OAuth URL with state parameter
3. Client redirects user to Google
4. User authorizes
5. Google redirects to callback URL
6. Function handles callback and stores tokens

**Code Example**:
```typescript
Deno.serve(async (req: Request) => {
  const { trainer_id } = new URL(req.url).searchParams;
  
  // Generate OAuth URL
  const authUrl = generateOAuthUrl(trainer_id);
  
  return new Response(JSON.stringify({ authUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### sync-google-calendar

**תפקיד**: סנכרון אירועים מ-Google Calendar למערכת

**Endpoint**: `/functions/v1/sync-google-calendar`

**Method**: `POST`

**Request**:
```typescript
{
  headers: {
    'Authorization': 'Bearer <supabase_jwt_token>',
    'Content-Type': 'application/json'
  },
  body: {
    trainer_id: string
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  synced_events: number,
  created_clients: number,
  errors?: string[]
}
```

**Process**:
1. Fetch credentials from database
2. Refresh token if expired
3. Fetch events from Google Calendar API
4. Process events and create/update clients
5. Update sync table
6. Return results

**Code Example**:
```typescript
Deno.serve(async (req: Request) => {
  const { trainer_id } = await req.json();
  
  // Get credentials
  const credentials = await getCredentials(trainer_id);
  
  // Refresh token if needed
  if (isTokenExpired(credentials)) {
    credentials = await refreshToken(credentials);
  }
  
  // Fetch events
  const events = await fetchGoogleEvents(credentials);
  
  // Process events
  const results = await processEvents(events, trainer_id);
  
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### google-webhook

**תפקיד**: קבלת Push Notifications מ-Google Calendar

**Endpoint**: `/functions/v1/google-webhook`

**Method**: `POST`

**Request**:
```typescript
{
  headers: {
    'X-Goog-Channel-ID': string,
    'X-Goog-Resource-ID': string,
    'X-Goog-Resource-State': 'sync' | 'exists' | 'not_exists'
  },
  body: {
    // Google webhook payload
  }
}
```

**Process**:
1. Verify webhook signature
2. Check resource state
3. Trigger sync if needed
4. Return 200 OK

**Code Example**:
```typescript
Deno.serve(async (req: Request) => {
  const channelId = req.headers.get('X-Goog-Channel-ID');
  const resourceState = req.headers.get('X-Goog-Resource-State');
  
  if (resourceState === 'exists') {
    // Trigger sync
    await triggerSync(channelId);
  }
  
  return new Response('OK', { status: 200 });
});
```

### crm-automation

**תפקיד**: ביצוע כללי אוטומציה

**Endpoint**: `/functions/v1/crm-automation`

**Method**: `POST`

**Request**:
```typescript
{
  headers: {
    'Authorization': 'Bearer <supabase_jwt_token>',
    'Content-Type': 'application/json'
  },
  body: {
    trainer_id: string,
    rule_id?: string // Optional: run specific rule
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  rules_executed: number,
  actions_taken: number
}
```

**Process**:
1. Fetch automation rules
2. Evaluate conditions
3. Execute actions
4. Log results

## Authentication

### JWT Verification

כל Function (חוץ מ-webhooks) דורשת JWT token:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response('Unauthorized', { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);

if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

function errorResponse(error: string, code?: string, details?: any): Response {
  return new Response(
    JSON.stringify({ error, code, details }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

### Usage

```typescript
try {
  // Function logic
} catch (error) {
  console.error('Function error:', error);
  return errorResponse(
    'שגיאה בביצוע הפונקציה',
    'FUNCTION_ERROR',
    { message: error.message }
  );
}
```

## CORS

### CORS Headers

```typescript
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  let allowedOrigin = allowedOrigins[0] || '*';

  if (origin && allowedOrigins.includes(origin)) {
    allowedOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}
```

### OPTIONS Handler

```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req.headers.get('Origin')),
  });
}
```

## Environment Variables

### Required Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins

### Setting Variables

```bash
# Using Supabase CLI
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret

# Or in Supabase Dashboard
# Project Settings → Edge Functions → Secrets
```

## Logging

### Console Logging

```typescript
console.log('Info message');
console.error('Error message', error);
console.warn('Warning message');
```

### Structured Logging

```typescript
function log(level: string, message: string, data?: any) {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  }));
}

log('info', 'Function started', { trainer_id });
log('error', 'Function failed', { error: error.message });
```

## Testing

### Local Testing

```bash
# Start Supabase locally
supabase start

# Test function locally
supabase functions serve google-oauth

# Call function
curl -X GET "http://localhost:54321/functions/v1/google-oauth?trainer_id=test" \
  -H "Authorization: Bearer <token>"
```

### Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy google-oauth
```

## Best Practices

### 1. Always Verify JWT

```typescript
const user = await verifyJWT(req);
if (!user) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  // Logic
} catch (error) {
  console.error('Error:', error);
  return errorResponse('שגיאה', 'ERROR');
}
```

### 3. Use Environment Variables

```typescript
const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
if (!clientId) {
  throw new Error('GOOGLE_CLIENT_ID not set');
}
```

### 4. Return Proper Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

### 5. Set CORS Headers

Always set CORS headers for browser requests.

### 6. Log Important Events

Log function start, errors, and important state changes.

## Monitoring

### Supabase Dashboard

Monitor function execution in Supabase Dashboard:
- Function logs
- Execution time
- Error rates
- Invocation count

### Custom Monitoring

```typescript
// Track execution time
const startTime = Date.now();
// ... function logic ...
const duration = Date.now() - startTime;
console.log(`Function executed in ${duration}ms`);
```

---

**עוד תיעוד**: [Database Schema](./database-schema.md) | [אינטגרציות](./integrations.md) | [תיעוד מפתחים](../developer/architecture.md)
