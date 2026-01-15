# דוגמאות קוד - מערכת CRM

## תוכן עניינים

1. [שימוש ב-Service Layer](#שימוש-ב-service-layer)
2. [Real-time Updates](#real-time-updates)
3. [Caching](#caching)
4. [Error Handling](#error-handling)
5. [Export Data](#export-data)
6. [Validation](#validation)
7. [Encryption](#encryption)

---

## שימוש ב-Service Layer

### טעינת לקוחות

```typescript
import { CrmService } from '../services/crmService';

// טעינה עם cache
const result = await CrmService.getClients(trainerId, true);

if (result.success && result.data) {
  setClients(result.data);
} else if (result.error) {
  toast.error(result.error);
}
```

### יצירת אינטראקציה עם Optimistic Update

```typescript
import { CrmService } from '../services/crmService';

const handleCreateInteraction = async () => {
  // Optimistic update - עדכן UI מיד
  const tempId = `temp-${Date.now()}`;
  setInteractions(prev => [...prev, {
    id: tempId,
    ...interactionData,
    // Mark as pending
    _pending: true,
  }]);

  // Create interaction
  const result = await CrmService.createInteraction(
    interactionData,
    (tempId) => {
      // Additional optimistic update logic
      console.log('Optimistic update:', tempId);
    }
  );

  if (result.success && result.data) {
    // Replace temp with real data
    setInteractions(prev => 
      prev.map(i => i.id === tempId ? result.data : i)
    );
  } else {
    // Rollback on error
    setInteractions(prev => prev.filter(i => i.id !== tempId));
    toast.error(result.error);
  }
};
```

---

## Real-time Updates

### שימוש ב-useCrmRealtime Hook

```typescript
import { useCrmRealtime } from '../hooks/useCrmRealtime';

function ClientsList() {
  const [clients, setClients] = useState<CalendarClient[]>([]);
  const { user } = useAuth();

  // Setup real-time updates
  const { isConnected, error, reconnect } = useCrmRealtime({
    trainerId: user?.id || '',
    enabled: !!user,
    onClientUpdate: (client) => {
      // עדכן לקוח קיים
      setClients(prev =>
        prev.map(c => c.id === client.id ? client : c)
      );
      toast.success('לקוח עודכן', { duration: 2000 });
    },
    onClientInsert: (client) => {
      // הוסף לקוח חדש
      setClients(prev => [client, ...prev]);
      toast.success('לקוח חדש נוסף', { duration: 2000 });
    },
    onClientDelete: (clientId) => {
      // מחק לקוח
      setClients(prev => prev.filter(c => c.id !== clientId));
      toast.success('לקוח נמחק', { duration: 2000 });
    },
  });

  return (
    <div>
      {/* Connection status indicator */}
      {isConnected ? (
        <span className="text-green-400">מחובר</span>
      ) : (
        <button onClick={reconnect}>חבר מחדש</button>
      )}
      
      {/* Clients list */}
      {clients.map(client => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
}
```

---

## Caching

### שימוש ב-Cache

```typescript
import { CrmService } from '../services/crmService';

// טעינה עם cache (ברירת מחדל)
const result1 = await CrmService.getClients(trainerId, true);
// Uses cache if available

// טעינה ללא cache (force refresh)
const result2 = await CrmService.getClients(trainerId, false);
// Always fetches from API

// Invalidate cache manually
CrmService.invalidateCache('clients:trainer-123');

// Clear all cache
CrmService.clearCache();
```

### Cache Invalidation

```typescript
// Cache מתבטל אוטומטית על mutations
await CrmService.createInteraction(interaction);
// Cache for interactions is automatically invalidated

await CrmService.linkTraineeToClient(traineeId, clientId, trainerId);
// Cache for clients is automatically invalidated
```

---

## Error Handling

### Error Tracking

```typescript
import { errorTracking, ErrorSeverity, captureApiError } from '../utils/errorTracking';

// Track API error
try {
  const result = await CrmService.getClients(trainerId);
  if (result.error) {
    captureApiError(result.error, 'getClients', {
      userId: user.id,
      trainerId,
    });
  }
} catch (error) {
  errorTracking.track(
    error,
    ErrorSeverity.HIGH,
    {
      userId: user.id,
      component: 'ClientsListView',
      action: 'loadClients',
    }
  );
}

// Get error statistics
const stats = errorTracking.getStatistics();
console.log('Total errors:', stats.total);
console.log('By severity:', stats.bySeverity);
console.log('Recent (1 hour):', stats.recent);
```

### Error Boundary

```typescript
import { captureErrorBoundaryError } from '../utils/errorTracking';

class CRMErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureErrorBoundaryError(error, errorInfo, {
      component: 'CRM',
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

---

## Export Data

### ייצוא ל-CSV

```typescript
import { exportClientsToCSV, exportReportsToCSV } from '../utils/exportUtils';

// ייצוא לקוחות
const handleExportClients = () => {
  exportClientsToCSV(clients, `clients-${new Date().toISOString().split('T')[0]}`);
  toast.success('הקובץ יוצא בהצלחה');
};

// ייצוא דוחות
const handleExportReports = () => {
  exportReportsToCSV(reports, 'client-reports');
  toast.success('הקובץ יוצא בהצלחה');
};
```

### ייצוא ל-PDF

```typescript
import { exportClientsToPDF } from '../utils/exportUtils';

const handleExportPDF = async () => {
  try {
    await exportClientsToPDF(clients, 'דוח לקוחות');
    toast.success('הקובץ יוצא בהצלחה');
  } catch (error) {
    toast.error('שגיאה בייצוא PDF');
  }
};
```

### ייצוא מותאם אישית

```typescript
import { arrayToCSV, downloadCSV } from '../utils/exportUtils';

// ייצוא מותאם אישית
const customData = clients.map(client => ({
  'שם': client.client_name,
  'אימייל': client.client_email,
  'סטטוס': client.trainee_id ? 'מקושר' : 'לא מקושר',
}));

const csv = arrayToCSV(customData);
downloadCSV(csv, 'custom-export');
```

---

## Validation

### ולידציה של נתונים

```typescript
import {
  validateClientName,
  isValidEmail,
  isValidPhone,
  validateRequired,
  validateTextLength,
} from '../utils/validation';

// Validate client name
const nameValidation = validateClientName(clientName);
if (!nameValidation.isValid) {
  toast.error(nameValidation.error);
  return;
}

// Validate email
if (clientEmail && !isValidEmail(clientEmail)) {
  toast.error('אימייל לא תקין');
  return;
}

// Validate phone
if (clientPhone && !isValidPhone(clientPhone)) {
  toast.error('מספר טלפון לא תקין');
  return;
}

// Validate required field
const requiredValidation = validateRequired(trainerId, 'מזהה מאמן');
if (!requiredValidation.isValid) {
  toast.error(requiredValidation.error);
  return;
}

// Validate text length
const notesValidation = validateTextLength(notes, 5000);
if (!notesValidation.isValid) {
  toast.error(notesValidation.error);
  return;
}
```

---

## Encryption

### הצפנת נתונים רגישים

```typescript
import { encrypt, decrypt, SecureTokenStorage } from '../utils/encryption';

// Set encryption key (should be from environment variable)
SecureTokenStorage.setEncryptionKey(process.env.ENCRYPTION_KEY || 'default-key');

// Store encrypted token
SecureTokenStorage.setToken('google_access_token', accessToken);

// Get decrypted token
const token = SecureTokenStorage.getToken('google_access_token');

// Encrypt custom data
const encrypted = await encrypt('sensitive data', 'secret-key');

// Decrypt data
const decrypted = await decrypt(encrypted, 'secret-key');
```

### שימוש בהצפנה ב-API

```typescript
// Before storing token
const encryptedToken = await encrypt(accessToken, encryptionKey);

// Store encrypted token
await supabase
  .from('trainer_google_credentials')
  .update({ access_token: encryptedToken })
  .eq('trainer_id', trainerId);

// When retrieving token
const { data } = await supabase
  .from('trainer_google_credentials')
  .select('access_token')
  .eq('trainer_id', trainerId)
  .single();

const decryptedToken = await decrypt(data.access_token, encryptionKey);
```

---

## Virtual Scrolling

### שימוש ב-VirtualList

```typescript
import VirtualList from '../components/common/VirtualList';

function LargeClientsList({ clients }) {
  return (
    <VirtualList
      items={clients}
      itemHeight={200} // Height of each card
      containerHeight={600} // Height of visible area
      overscan={3} // Render 3 extra items outside view
      renderItem={(client, index) => (
        <ClientCard
          key={client.id}
          client={client}
          index={index}
        />
      )}
    />
  );
}
```

---

## Rate Limiting

### הגבלת קצב קריאות

```typescript
import { rateLimit } from '../utils/rateLimiter';

// Create rate-limited function
const limitedGetClients = rateLimit(
  CrmService.getClients,
  100, // max 100 requests
  60000, // per minute
  (trainerId) => trainerId // use trainerId as key
);

// Use rate-limited function
try {
  const result = await limitedGetClients(trainerId);
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    toast.error('יותר מדי בקשות. נסה שוב בעוד כמה רגעים');
  }
}
```

---

## דוגמאות שימוש מלאות

### Component מלא עם כל התכונות

```typescript
import { useState, useEffect, useCallback } from 'react';
import { CrmService } from '../services/crmService';
import { useCrmRealtime } from '../hooks/useCrmRealtime';
import { exportClientsToCSV } from '../utils/exportUtils';
import { errorTracking, ErrorSeverity } from '../utils/errorTracking';
import { validateClientName } from '../utils/validation';

function EnhancedClientsView() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Real-time updates
  const { isConnected } = useCrmRealtime({
    trainerId: user?.id || '',
    onClientUpdate: (client) => {
      setClients(prev => prev.map(c => 
        c.id === client.id ? client : c
      ));
    },
  });

  // Load clients
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const result = await CrmService.getClients(user.id, true);
      
      if (result.success && result.data) {
        setClients(result.data);
      } else if (result.error) {
        errorTracking.track(
          new Error(result.error),
          ErrorSeverity.MEDIUM,
          { component: 'EnhancedClientsView' }
        );
        toast.error(result.error);
      }
    } catch (error) {
      errorTracking.track(error, ErrorSeverity.HIGH);
      toast.error('שגיאה בטעינת לקוחות');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Export
  const handleExport = () => {
    exportClientsToCSV(clients, 'clients');
  };

  return (
    <div>
      {isConnected && <span>מחובר</span>}
      {loading ? <Loading /> : <ClientsList clients={clients} />}
      <button onClick={handleExport}>ייצא CSV</button>
    </div>
  );
}
```

---

**עודכן**: 2025-01-27  
**גרסה**: 1.0
