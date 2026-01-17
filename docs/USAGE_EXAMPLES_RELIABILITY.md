# דוגמאות שימוש - מערכת אמינות וניטור

## תוכן עניינים

1. [Error Tracking עם Sentry](#error-tracking-עם-sentry)
2. [Retry Logic](#retry-logic)
3. [Circuit Breaker](#circuit-breaker)
4. [Health Checks](#health-checks)
5. [Performance Monitoring](#performance-monitoring)
6. [Error Handler Hook](#error-handler-hook)
7. [Structured Logging](#structured-logging)

---

## Error Tracking עם Sentry

### אתחול Sentry

Sentry מתחיל אוטומטית ב-`main.tsx`. להגדרה, הוסף environment variable:

```env
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### שימוש ב-Error Tracking

```typescript
import { errorTracking, ErrorSeverity, captureApiError } from '../utils/errorTracking';
import { captureException, setUserContext, clearUserContext } from '../utils/sentry';

// Track error manually
errorTracking.track(
  new Error('Something went wrong'),
  ErrorSeverity.HIGH,
  {
    component: 'ClientList',
    action: 'fetchClients',
    userId: 'user-123',
    metadata: {
      clientId: 'client-456',
    },
  }
);

// Capture API error
try {
  await fetchClients();
} catch (error) {
  captureApiError(error, '/api/clients', {
    component: 'ClientList',
    userId: 'user-123',
  });
}

// Set user context (e.g., on login)
setUserContext('user-123', 'user@example.com', {
  trainerId: 'trainer-456',
});

// Clear user context (e.g., on logout)
clearUserContext();
```

---

## Retry Logic

### Basic Retry עם Exponential Backoff

```typescript
import { retryWithBackoff } from '../utils/retry';

// Simple retry
try {
  const result = await retryWithBackoff(() => fetchClients(), {
    maxRetries: 3,
    initialDelay: 1000,
    multiplier: 2,
  });
} catch (error) {
  console.error('Failed after retries:', error);
}

// Advanced retry עם custom retry logic
const result = await retryWithBackoff(
  () => createClient(clientData),
  {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 10000,
    multiplier: 2,
    jitter: 0.3, // Add randomness to delays
    isRetryable: (error) => {
      // Only retry on network errors or 5xx errors
      if (error instanceof TypeError) return true;
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: number }).status;
        return status >= 500 && status < 600;
      }
      return false;
    },
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error);
    },
  }
);
```

---

## Circuit Breaker

### שימוש ב-Circuit Breaker

```typescript
import { createCircuitBreaker, retryWithCircuitBreaker } from '../utils/retry';

// Create circuit breaker
const apiCircuitBreaker = createCircuitBreaker('api-clients', {
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 60000, // Try to close after 1 minute
  successThreshold: 2, // Need 2 successes to close from half-open
});

// Use with circuit breaker
try {
  const clients = await apiCircuitBreaker.execute(() => fetchClients());
} catch (error) {
  if (apiCircuitBreaker.getState() === 'open') {
    console.log('Circuit breaker is open - service is down');
  }
}

// Retry with circuit breaker
const result = await retryWithCircuitBreaker(
  () => createClient(clientData),
  apiCircuitBreaker,
  {
    maxRetries: 3,
    initialDelay: 1000,
  }
);

// Check circuit breaker state
const state = apiCircuitBreaker.getState(); // 'closed' | 'open' | 'half-open'

// Reset circuit breaker manually
apiCircuitBreaker.reset();
```

### שימוש ב-API Service

```typescript
import { createCircuitBreaker } from '../utils/retry';

// Create circuit breakers for different services
const clientsCircuitBreaker = createCircuitBreaker('clients-api');
const calendarCircuitBreaker = createCircuitBreaker('calendar-api');

export async function fetchClients() {
  return clientsCircuitBreaker.execute(async () => {
    const { data, error } = await supabase
      .from('calendar_clients')
      .select('*');
    
    if (error) throw error;
    return data;
  });
}

export async function createCalendarEvent(eventData: any) {
  return calendarCircuitBreaker.execute(async () => {
    // API call
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  });
}
```

---

## Health Checks

### שימוש ב-Health Check Hook

```typescript
import { useHealthCheck } from '../hooks/useHealthCheck';

function App() {
  const { health, status, isLoading, error, checkHealth } = useHealthCheck({
    autoCheck: true, // Enable automatic health checks
    interval: 60000, // Check every minute
    onStatusChange: (newStatus) => {
      if (newStatus === 'unhealthy') {
        // Show warning to user
        toast.warning('Some services are experiencing issues');
      }
    },
  });

  // Manual check
  const handleCheckHealth = async () => {
    await checkHealth();
  };

  return (
    <div>
      {isLoading && <div>Checking health...</div>}
      {status === 'healthy' && <div className="text-green-500">All systems operational</div>}
      {status === 'degraded' && <div className="text-yellow-500">Some systems degraded</div>}
      {status === 'unhealthy' && <div className="text-red-500">System issues detected</div>}
      
      {health && (
        <div>
          <h3>Health Checks:</h3>
          {health.checks.map((check) => (
            <div key={check.name}>
              {check.name}: {check.status} ({check.latency}ms)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Manual Health Check

```typescript
import { runHealthChecks, getHealthStatus } from '../utils/healthCheck';

// Run all health checks
const health = await runHealthChecks();
console.log('Overall health:', health.overall);
console.log('Checks:', health.checks);

// Get overall status only
const status = await getHealthStatus();
console.log('Status:', status); // 'healthy' | 'degraded' | 'unhealthy'
```

---

## Performance Monitoring

### Tracking API Calls

```typescript
import { trackAPICall, performanceMonitor } from '../utils/performance';

// Track API call automatically
const clients = await trackAPICall('/api/clients', 'GET', async () => {
  const { data, error } = await supabase
    .from('calendar_clients')
    .select('*');
  
  if (error) throw error;
  return data;
});

// Get performance summary
const summary = performanceMonitor.getSummary();
console.log('Web Vitals:', summary.webVitals);
console.log('Average API Duration:', summary.averageAPIDuration);
console.log('Total API Calls:', summary.totalAPICalls);
console.log('Slow API Calls:', summary.slowAPICalls);

// Get Web Vitals
const vitals = performanceMonitor.getWebVitals();
console.log('LCP:', vitals.lcp); // Largest Contentful Paint
console.log('FID:', vitals.fid); // First Input Delay
console.log('CLS:', vitals.cls); // Cumulative Layout Shift
console.log('FCP:', vitals.fcp); // First Contentful Paint
console.log('TTFB:', vitals.ttfb); // Time to First Byte

// Get recent metrics
const recentMetrics = performanceMonitor.getRecentMetrics(10);
const recentAPIMetrics = performanceMonitor.getRecentAPIMetrics(10);
```

### Custom Performance Metrics

```typescript
import { performanceMonitor } from '../utils/performance';

// Record custom metric
performanceMonitor.recordMetric('custom-operation', 150, 'ms', {
  operation: 'processData',
  dataSize: 1000,
});

// Long task detection (automatic)
// Tasks longer than 50ms are automatically tracked
```

---

## Error Handler Hook

### שימוש ב-useErrorHandler

```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ErrorSeverity } from '../utils/errorTracking';

function ClientList() {
  const { handleError } = useErrorHandler();

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_clients')
        .select('*');
      
      if (error) throw error;
      return data;
    } catch (error) {
      await handleError(error, 'ClientList', {
        showToast: true,
        logError: true,
        severity: ErrorSeverity.MEDIUM,
        retry: () => fetchClients(), // Auto-retry
        retryOptions: {
          maxRetries: 3,
          initialDelay: 1000,
        },
        customMessage: 'שגיאה בטעינת הלקוחות',
      });
      throw error;
    }
  };

  // Without auto-retry
  const createClient = async (clientData: any) => {
    try {
      const { data, error } = await supabase
        .from('calendar_clients')
        .insert(clientData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      await handleError(error, 'ClientList', {
        showToast: true,
        severity: ErrorSeverity.HIGH,
        customMessage: 'שגיאה ביצירת לקוח חדש',
      });
      throw error;
    }
  };

  return <div>...</div>;
}
```

---

## Structured Logging

### שימוש ב-Logger

```typescript
import { logger } from '../utils/logger';

// Set minimum log level
logger.setLogLevel('info'); // Only log info, warn, error

// Different log levels
logger.debug('Debug message', { data: 'value' }, 'Component');
logger.log('Log message', { data: 'value' }, 'Component');
logger.info('Info message', { data: 'value' }, 'Component');
logger.warn('Warning message', { data: 'value' }, 'Component');
logger.error('Error message', error, 'Component');

// In production, logs are automatically structured as JSON
// Example output:
// {
//   "message": "User logged in",
//   "level": "info",
//   "timestamp": "2025-01-27T10:00:00.000Z",
//   "context": "Auth",
//   "userId": "123"
// }
```

---

## שילוב מלא - דוגמה מקצועית

### API Service עם כל המערכות

```typescript
import { retryWithBackoff, createCircuitBreaker } from '../utils/retry';
import { trackAPICall, performanceMonitor } from '../utils/performance';
import { errorTracking, ErrorSeverity } from '../utils/errorTracking';
import { logger } from '../utils/logger';

// Create circuit breakers
const clientsCircuitBreaker = createCircuitBreaker('clients-api', {
  failureThreshold: 5,
  resetTimeout: 60000,
});

const calendarCircuitBreaker = createCircuitBreaker('calendar-api', {
  failureThreshold: 3,
  resetTimeout: 120000,
});

export async function fetchClients(trainerId: string) {
  return trackAPICall('/api/clients', 'GET', async () => {
    return clientsCircuitBreaker.execute(async () => {
      try {
        return await retryWithBackoff(
          async () => {
            const { data, error } = await supabase
              .from('calendar_clients')
              .select('*')
              .eq('trainer_id', trainerId);
            
            if (error) throw error;
            return data;
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
            isRetryable: (error) => {
              // Only retry on network/5xx errors
              return error instanceof TypeError || 
                     (error && typeof error === 'object' && 'status' in error && 
                      (error as { status: number }).status >= 500);
            },
          }
        );
      } catch (error) {
        // Track error
        errorTracking.track(
          error instanceof Error ? error : new Error(String(error)),
          ErrorSeverity.MEDIUM,
          {
            component: 'ClientsAPI',
            action: 'fetchClients',
            metadata: { trainerId },
          }
        );
        
        // Log error
        logger.error('Failed to fetch clients', error, 'ClientsAPI');
        
        throw error;
      }
    });
  });
}
```

---

## הערות חשובות

1. **Sentry DSN**: הוסף `VITE_SENTRY_DSN` ל-environment variables ב-production
2. **Performance Impact**: Performance monitoring הוא minimal overhead
3. **Circuit Breaker**: Reset אוטומטי לאחר `resetTimeout`
4. **Health Checks**: Auto-check כל `interval` milliseconds
5. **Logging**: ב-production, logs הם structured JSON format

---

**תאריך**: 2025-01-27  
**מסמך**: דוגמאות שימוש - מערכת אמינות וניטור
