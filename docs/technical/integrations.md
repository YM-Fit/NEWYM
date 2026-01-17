# Integrations Documentation

תיעוד מפורט של אינטגרציות במערכת ה-CRM של NEWYM.

## סקירה כללית

מערכת ה-CRM של NEWYM כוללת אינטגרציות עם שירותים חיצוניים לניהול לקוחות, תקשורת, ותשלומים.

## Google Calendar Integration

### סקירה

אינטגרציה עם Google Calendar לסנכרון אוטומטי של אירועים ולקוחות.

### Authentication

**OAuth 2.0 Flow**:

1. **Initiate OAuth**:
   ```typescript
   const { data: authUrl } = await initiateGoogleOAuth(trainerId, accessToken);
   // Redirect user to authUrl
   ```

2. **Handle Callback**:
   ```typescript
   await handleGoogleOAuthCallback(code, state, accessToken);
   ```

3. **Store Credentials**:
   - Access token
   - Refresh token
   - Token expiration
   - Calendar IDs

### Sync Settings

**Sync Direction**:
- `to_google` - מהמערכת ל-Google
- `from_google` - מ-Google למערכת
- `bidirectional` - דו-כיווני (מומלץ)

**Sync Frequency**:
- `realtime` - בזמן אמת (מומלץ)
- `hourly` - כל שעה
- `daily` - פעם ביום

### API Endpoints

**Get Calendar Status**:
```typescript
const status = await getGoogleCalendarStatus(trainerId);
// Returns: { connected, autoSyncEnabled, syncDirection, syncFrequency }
```

**Update Sync Settings**:
```typescript
await updateGoogleCalendarSyncSettings(trainerId, {
  autoSyncEnabled: true,
  syncDirection: 'bidirectional',
  syncFrequency: 'realtime',
  defaultCalendarId: 'primary'
});
```

**Get Events**:
```typescript
const events = await getGoogleCalendarEvents(trainerId, {
  start: new Date('2025-01-01'),
  end: new Date('2025-01-31')
});
```

**Sync Manually**:
```typescript
await syncGoogleCalendar(trainerId, accessToken);
```

### Webhook Notifications

**Setup**:
1. Register webhook channel with Google
2. Google sends notifications on event changes
3. Edge Function processes notifications
4. Trigger sync if needed

**Webhook Endpoint**: `/functions/v1/google-webhook`

### Error Handling

**Token Expiration**:
- Automatic token refresh
- User notification if refresh fails
- Re-authentication flow

**Sync Errors**:
- Retry logic with exponential backoff
- Error logging
- User notification

## Email Integration (Future)

### סקירה

אינטגרציה עם שירותי אימייל לשליחת הודעות ללקוחות.

### Planned Features

- **SMTP Integration**: Send emails via SMTP
- **Email Templates**: Reusable email templates
- **Email Tracking**: Track email opens and clicks
- **Bulk Emailing**: Send emails to multiple clients

### API Design (Planned)

```typescript
// Send email
await sendEmail({
  to: clientEmail,
  subject: 'Welcome!',
  template: 'welcome',
  variables: { clientName, trainerName }
});

// Get email status
const status = await getEmailStatus(emailId);
```

## SMS Integration (Future)

### סקירה

אינטגרציה עם שירותי SMS לשליחת הודעות SMS ללקוחות.

### Planned Features

- **SMS Provider Integration**: Twilio, MessageBird, etc.
- **SMS Templates**: Reusable SMS templates
- **Bulk SMS**: Send SMS to multiple clients
- **Delivery Status**: Track SMS delivery

### API Design (Planned)

```typescript
// Send SMS
await sendSMS({
  to: clientPhone,
  message: 'Hello!',
  template: 'reminder'
});

// Get SMS status
const status = await getSMSStatus(smsId);
```

## Payment Integration (Future)

### סקירה

אינטגרציה עם שירותי תשלום לעיבוד תשלומים.

### Planned Features

- **Payment Gateway**: Stripe, PayPal, etc.
- **Payment Processing**: Process payments
- **Invoice Generation**: Generate invoices
- **Payment Tracking**: Track payment status

### API Design (Planned)

```typescript
// Process payment
const payment = await processPayment({
  clientId,
  amount: 1000,
  currency: 'ILS',
  method: 'credit_card'
});

// Get payment status
const status = await getPaymentStatus(paymentId);
```

## API Integration Patterns

### Authentication Pattern

```typescript
interface IntegrationCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

async function refreshCredentials(
  credentials: IntegrationCredentials
): Promise<IntegrationCredentials> {
  // Refresh logic
}
```

### Error Handling Pattern

```typescript
async function callIntegrationAPI(
  apiCall: () => Promise<Response>
): Promise<ApiResponse> {
  try {
    const response = await apiCall();
    if (!response.ok) {
      const error = await response.json();
      return { error: error.message };
    }
    const data = await response.json();
    return { data, success: true };
  } catch (error) {
    return { error: error.message };
  }
}
```

### Retry Pattern

```typescript
async function callWithRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Configuration

### Environment Variables

```bash
# Google Calendar
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/callback

# Email (Future)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password

# SMS (Future)
SMS_PROVIDER=twilio
SMS_API_KEY=your_api_key
SMS_API_SECRET=your_api_secret

# Payment (Future)
PAYMENT_PROVIDER=stripe
PAYMENT_API_KEY=your_api_key
```

### Supabase Secrets

```bash
# Set secrets
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
```

## Security

### Token Storage

- **Encryption**: Tokens encrypted using Supabase Vault
- **Access Control**: Only accessible by owner
- **Rotation**: Automatic token refresh

### API Keys

- **Environment Variables**: Never commit to git
- **Supabase Secrets**: Use for Edge Functions
- **Rotation**: Regular key rotation

### Rate Limiting

- **Client-side**: Rate limiter utility
- **Server-side**: API rate limits
- **Exponential Backoff**: Retry with backoff

## Monitoring

### Integration Health

```typescript
interface IntegrationHealth {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  errorCount?: number;
}

async function checkIntegrationHealth(
  integrationName: string
): Promise<IntegrationHealth> {
  // Check health
}
```

### Error Tracking

- **Logging**: All errors logged
- **Alerting**: Critical errors trigger alerts
- **Dashboard**: Integration status dashboard

## Best Practices

### 1. Always Handle Errors

```typescript
try {
  await syncIntegration();
} catch (error) {
  logger.error('Integration sync failed', error);
  notifyUser('Sync failed. Please try again.');
}
```

### 2. Use Retry Logic

```typescript
const result = await callWithRetry(
  () => integrationAPI.call(),
  { maxRetries: 3, backoff: 'exponential' }
);
```

### 3. Cache When Possible

```typescript
const cached = cache.get('integration-data');
if (cached) return cached;

const data = await fetchIntegrationData();
cache.set('integration-data', data, { ttl: 3600 });
return data;
```

### 4. Validate Inputs

```typescript
if (!clientId || !isValidUUID(clientId)) {
  throw new Error('Invalid client ID');
}
```

### 5. Log Important Events

```typescript
logger.info('Integration sync started', { trainerId, integration });
logger.info('Integration sync completed', { synced: count });
```

---

**עוד תיעוד**: [Database Schema](./database-schema.md) | [Edge Functions](./edge-functions.md) | [תיעוד מפתחים](../developer/architecture.md)
