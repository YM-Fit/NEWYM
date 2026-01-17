# API Error Codes

This document describes all error codes that can be returned by the NEWYM CRM API.

## Error Response Format

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details (optional)
  }
}
```

## Error Codes

### Authentication & Authorization (1xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token | Include valid JWT token in Authorization header |
| `TOKEN_EXPIRED` | 401 | Authentication token has expired | Refresh the token or re-authenticate |
| `FORBIDDEN` | 403 | User doesn't have permission to access this resource | Check user permissions |
| `INVALID_CREDENTIALS` | 401 | Invalid email or password | Verify credentials |

### Validation Errors (2xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `VALIDATION_ERROR` | 400 | Invalid input parameters | Check request body/query parameters |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing | Include all required fields |
| `INVALID_FORMAT` | 400 | Field format is invalid (e.g., email, date) | Verify field format matches expected pattern |
| `INVALID_UUID` | 400 | Invalid UUID format | Ensure UUID is in correct format |
| `INVALID_ENUM_VALUE` | 400 | Enum value is not allowed | Check allowed values for the field |

### Resource Errors (3xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `NOT_FOUND` | 404 | Resource not found | Verify resource ID exists |
| `ALREADY_EXISTS` | 409 | Resource already exists | Check if resource was already created |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate entry) | Resolve conflict before retrying |

### Google Calendar Errors (4xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `GOOGLE_NOT_CONNECTED` | 400 | Google Calendar is not connected | Connect Google Calendar first |
| `GOOGLE_TOKEN_EXPIRED` | 401 | Google OAuth token expired | Re-authenticate with Google |
| `GOOGLE_API_ERROR` | 502 | Error from Google Calendar API | Check Google Calendar API status |
| `GOOGLE_RATE_LIMIT` | 429 | Google Calendar API rate limit exceeded | Wait before retrying |
| `GOOGLE_SYNC_ERROR` | 500 | Error during Google Calendar sync | Check sync configuration |

### Database Errors (5xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `DATABASE_ERROR` | 500 | Database operation failed | Check database connection |
| `QUERY_ERROR` | 500 | Database query failed | Verify query parameters |
| `CONSTRAINT_VIOLATION` | 400 | Database constraint violation | Check data constraints |
| `TRANSACTION_ERROR` | 500 | Database transaction failed | Retry the operation |

### Rate Limiting (6xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait before retrying |
| `RATE_LIMIT_WINDOW` | 429 | Rate limit window exceeded | Wait for rate limit window to reset |

### Internal Errors (9xxx)

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INTERNAL_ERROR` | 500 | Internal server error | Contact support if issue persists |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | Retry after a short delay |
| `TIMEOUT` | 504 | Request timeout | Retry the request |

## Examples

### Validation Error

```json
{
  "error": "trainerId הוא חובה",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "trainerId",
    "reason": "required"
  }
}
```

### Resource Not Found

```json
{
  "error": "לקוח לא נמצא",
  "code": "NOT_FOUND",
  "details": {
    "resource": "client",
    "id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

### Google Calendar Error

```json
{
  "error": "Google Calendar לא מחובר",
  "code": "GOOGLE_NOT_CONNECTED",
  "details": {
    "trainer_id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

## Error Handling Best Practices

1. **Always check the `code` field** for programmatic error handling
2. **Display the `error` message** to users (it's in Hebrew for user-facing errors)
3. **Log `details`** for debugging purposes
4. **Implement retry logic** for transient errors (5xx, rate limits)
5. **Handle authentication errors** by redirecting to login
6. **Validate input** before sending requests to prevent validation errors

## Client-Side Error Handling

```typescript
import type { ApiResponse } from './api/types';

async function handleApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>
): Promise<T> {
  try {
    const result = await apiCall();
    
    if (!result.success) {
      // Handle specific error codes
      switch (result.code) {
        case 'UNAUTHORIZED':
          // Redirect to login
          window.location.href = '/login';
          break;
        case 'RATE_LIMIT_EXCEEDED':
          // Show retry message
          toast.error('יותר מדי בקשות. נסה שוב בעוד רגע.');
          break;
        case 'GOOGLE_NOT_CONNECTED':
          // Show connect Google Calendar message
          toast.error('נא לחבר את Google Calendar');
          break;
        default:
          // Show generic error
          toast.error(result.error || 'שגיאה לא צפויה');
      }
      throw new Error(result.error);
    }
    
    return result.data!;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```
