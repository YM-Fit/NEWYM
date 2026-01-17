# API Documentation

## Overview

This document provides comprehensive API documentation for the NEWYM CRM system.

## Base URL

```
https://your-project.supabase.co/rest/v1
```

## Authentication

All API requests require authentication using Supabase JWT tokens.

### Headers

```
Authorization: Bearer <access_token>
apikey: <supabase_anon_key>
Content-Type: application/json
```

## Error Codes

### Standard HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

### Custom Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `DATABASE_ERROR` - Database operation failed

## Rate Limiting

All endpoints are rate-limited:
- **Default**: 100 requests per minute per user
- **Heavy operations**: 10 requests per minute
- **Authentication**: 5 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Endpoints

### CRM Clients

#### Get Clients

```http
GET /trainees?trainer_id=eq.{trainer_id}
```

**Query Parameters:**
- `trainer_id` (required) - Trainer ID
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset
- `order` (optional) - Sort order (e.g., `created_at.desc`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "שם לקוח",
      "email": "client@example.com",
      "phone": "050-1234567",
      "crm_status": "active",
      "contract_value": 1000,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "success": true
}
```

#### Create Client

```http
POST /trainees
```

**Request Body:**
```json
{
  "trainer_id": "uuid",
  "full_name": "שם לקוח",
  "email": "client@example.com",
  "phone": "050-1234567",
  "crm_status": "lead"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "full_name": "שם לקוח",
    ...
  },
  "success": true
}
```

#### Update Client

```http
PATCH /trainees?id=eq.{client_id}
```

**Request Body:**
```json
{
  "crm_status": "active",
  "contract_value": 1500
}
```

#### Delete Client

```http
DELETE /trainees?id=eq.{client_id}
```

### Client Interactions

#### Get Interactions

```http
GET /client_interactions?trainer_id=eq.{trainer_id}
```

**Query Parameters:**
- `trainer_id` (required)
- `trainee_id` (optional) - Filter by client
- `interaction_date` (optional) - Date range filter
- `limit`, `offset` - Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "trainee_id": "uuid",
      "interaction_type": "call",
      "subject": "שיחת מעקב",
      "interaction_date": "2025-01-01T00:00:00Z",
      "description": "שיחה על התקדמות"
    }
  ],
  "success": true
}
```

#### Create Interaction

```http
POST /client_interactions
```

**Request Body:**
```json
{
  "trainee_id": "uuid",
  "trainer_id": "uuid",
  "interaction_type": "call",
  "subject": "שיחת מעקב",
  "description": "שיחה על התקדמות",
  "interaction_date": "2025-01-01T00:00:00Z"
}
```

### Pipeline Management

#### Get Pipeline Stages

```http
GET /trainees?trainer_id=eq.{trainer_id}&select=*,crm_status
```

**Response:**
```json
{
  "data": {
    "stages": [
      {
        "status": "lead",
        "label": "ליד",
        "count": 10,
        "clients": [...]
      }
    ]
  },
  "success": true
}
```

#### Update Client Status

```http
PATCH /trainees?id=eq.{client_id}
```

**Request Body:**
```json
{
  "crm_status": "qualified",
  "status_change_reason": "עבר אימות"
}
```

### Reports & Analytics

#### Get Pipeline Stats

```http
GET /trainees?trainer_id=eq.{trainer_id}&select=id,crm_status
```

**Response:**
```json
{
  "data": {
    "total": 100,
    "active": 50,
    "leads": 20,
    "qualified": 15,
    "churned": 5
  },
  "success": true
}
```

#### Get Revenue Stats

```http
GET /crm_payments?trainer_id=eq.{trainer_id}&status=eq.paid
```

**Response:**
```json
{
  "data": {
    "totalRevenue": 50000,
    "monthlyRevenue": 5000,
    "averageTransaction": 1000,
    "overduePayments": 3
  },
  "success": true
}
```

### Data Export

#### Export Clients

```http
POST /rpc/export_clients
```

**Request Body:**
```json
{
  "trainer_id": "uuid",
  "format": "csv",
  "filters": {
    "status": ["active"],
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "blob": "base64_encoded_file",
    "filename": "clients-2025-01-01.csv"
  },
  "success": true
}
```

### Data Import

#### Import Clients

```http
POST /rpc/import_clients
```

**Request Body:**
```json
{
  "trainer_id": "uuid",
  "format": "csv",
  "file": "base64_encoded_file"
}
```

**Response:**
```json
{
  "data": {
    "imported": 50,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "error": "Invalid email format"
      }
    ]
  },
  "success": true
}
```

## Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get clients
const { data, error } = await supabase
  .from('trainees')
  .select('*')
  .eq('trainer_id', trainerId)
  .order('created_at', { ascending: false });

// Create client
const { data, error } = await supabase
  .from('trainees')
  .insert({
    trainer_id: trainerId,
    full_name: 'שם לקוח',
    email: 'client@example.com',
    crm_status: 'lead'
  });

// Update client
const { data, error } = await supabase
  .from('trainees')
  .update({ crm_status: 'active' })
  .eq('id', clientId);
```

### cURL

```bash
# Get clients
curl -X GET \
  'https://your-project.supabase.co/rest/v1/trainees?trainer_id=eq.{trainer_id}' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'apikey: {anon_key}'

# Create client
curl -X POST \
  'https://your-project.supabase.co/rest/v1/trainees' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'apikey: {anon_key}' \
  -H 'Content-Type: application/json' \
  -d '{
    "trainer_id": "uuid",
    "full_name": "שם לקוח",
    "email": "client@example.com"
  }'
```

## Best Practices

1. **Always handle errors**: Check for `error` in responses
2. **Use pagination**: For large datasets, use `limit` and `offset`
3. **Respect rate limits**: Implement retry logic with exponential backoff
4. **Validate input**: Validate data before sending requests
5. **Use transactions**: For multiple related operations
6. **Cache responses**: Cache frequently accessed data
7. **Monitor usage**: Track API usage and optimize queries

## Support

For API support, contact: support@newym.com
