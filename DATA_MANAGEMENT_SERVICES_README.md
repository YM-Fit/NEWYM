# שירותי ניהול נתונים מתקדמים - תיעוד

## סקירה כללית

משימה 6 הושלמה בהצלחה! נוספו 5 שירותים מרכזיים לניהול נתונים מתקדם:

1. **Data Export Service** - ייצוא נתונים (CSV, JSON, Excel)
2. **Data Import Service** - ייבוא נתונים עם ולידציה (CSV, JSON)
3. **Data Retention Service** - ניהול retention policies וארכוב
4. **Conflict Resolution Service** - פתרון קונפליקטים
5. **Validation Schemas** - ולידציה מתקדמת עם Zod

---

## 1. Data Export Service

### שימוש בסיסי

```typescript
import { DataExportService } from '@/services/dataExportService';

// ייצוא לקוחות ל-CSV
const result = await DataExportService.exportData({
  format: 'csv',
  dataType: 'clients',
  trainerId: 'trainer-123',
  includeMetadata: false,
});

if (result.success && result.data) {
  DataExportService.downloadFile(result.data.data!, result.data.filename!);
}
```

### תכונות

- **פורמטים**: CSV, JSON, Excel (XLSX)
- **סוגי נתונים**: clients, interactions, reports, all
- **פילטרים**: תאריכים, סטטוסים, IDs
- **מטא-דאטה**: אופציונלי (תאריך ייצוא, מספר רשומות, וכו')

### דוגמאות

ראו `src/services/dataExportService.example.ts` לדוגמאות מלאות.

---

## 2. Data Import Service

### שימוש בסיסי

```typescript
import { DataImportService } from '@/services/dataImportService';

// תצוגה מקדימה לפני ייבוא
const preview = await DataImportService.previewImport(
  file,
  'csv',
  'clients',
  trainerId
);

if (preview.data && preview.data.valid > 0) {
  // ייבוא נתונים
  const result = await DataImportService.importData({
    format: 'csv',
    dataType: 'clients',
    trainerId,
    file,
    validateBeforeImport: true,
    skipErrors: false,
  });
}
```

### תכונות

- **ולידציה**: Zod schemas עם הודעות שגיאה בעברית
- **תצוגה מקדימה**: בדיקה לפני ייבוא
- **טיפול בשגיאות**: רשימת שגיאות מפורטת לכל שורה
- **תמיכה בעברית**: CSV עם BOM לפתיחה נכונה ב-Excel

### דוגמאות

ראו `src/services/dataImportService.example.ts` לדוגמאות מלאות.

---

## 3. Data Retention Service

### שימוש בסיסי

```typescript
import { DataRetentionService } from '@/services/dataRetentionService';

// Dry run - בדיקה מה היה קורה
const dryRun = await DataRetentionService.applyRetentionPolicies(
  trainerId,
  true
);

// יישום בפועל
const result = await DataRetentionService.applyRetentionPolicies(
  trainerId,
  false
);
```

### תכונות

- **מדיניות גמישה**: מוגדרת לפי סוג נתונים
- **אסטרטגיות**: archive, delete, anonymize
- **Dry run**: בדיקה לפני יישום
- **סטטיסטיקות**: ניתוח נתונים ישנים

### הגדרת מדיניות

```typescript
DataRetentionService.setConfig({
  defaultRetentionDays: 365,
  enableAutoArchiving: true,
  policies: [
    {
      dataType: 'interactions',
      retentionDays: 365,
      archiveAction: 'archive',
      enabled: true,
    },
  ],
});
```

### דוגמאות

ראו `src/services/dataRetentionService.example.ts` לדוגמאות מלאות.

---

## 4. Conflict Resolution Service

### שימוש בסיסי

```typescript
import { ConflictResolutionService } from '@/services/conflictResolutionService';

// זיהוי קונפליקטים
const result = await ConflictResolutionService.detectConflicts({
  entityType: 'all',
  checkVersionMismatch: true,
  checkSyncStatus: true,
});

// פתרון קונפליקט
if (result.data) {
  await ConflictResolutionService.resolveConflict({
    conflictId: conflict.id,
    strategy: 'merge',
    resolvedData: mergedData,
    resolvedBy: userId,
  });
}
```

### אסטרטגיות פתרון

- **keep_local** - שמירה על נתונים מקומיים
- **keep_remote** - שמירה על נתונים מרוחקים
- **merge** - מיזוג חכם
- **user_choice** - בחירת משתמש

### דוגמאות

ראו `src/services/conflictResolutionService.example.ts` לדוגמאות מלאות.

---

## 5. Validation Schemas

### שימוש בסיסי

```typescript
import { validateClient, validateInteraction } from '@/utils/validationSchemas';

// ולידציה של לקוח
const validation = validateClient({
  trainer_id: 'trainer-123',
  full_name: 'John Doe',
  email: 'john@example.com',
});

if (!validation.success) {
  console.error('Validation errors:', validation.errors);
}
```

### Schemas זמינים

- `ClientSchema` - ולידציה מלאה של לקוח
- `InteractionSchema` - ולידציה של אינטראקציה
- `ClientUpdateSchema` - עדכון לקוח (כל השדות אופציונליים)
- `InteractionUpdateSchema` - עדכון אינטראקציה

### דוגמאות

```typescript
import {
  validateClient,
  validateInteraction,
  ClientInput,
  InteractionInput,
} from '@/utils/validationSchemas';

// Type-safe validation
const clientData: ClientInput = {
  trainer_id: 'uuid',
  full_name: 'John Doe',
  email: 'john@example.com',
};

const result = validateClient(clientData);
if (result.success && result.data) {
  // result.data is fully typed as ClientInput
  console.log(result.data.full_name);
}
```

---

## אינטגרציה ב-React Components

### דוגמה: Export Button Component

```typescript
import { useState } from 'react';
import { DataExportService } from '@/services/dataExportService';

export function ExportButton({ trainerId }: { trainerId: string }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    setLoading(true);
    try {
      const result = await DataExportService.exportData({
        format,
        dataType: 'clients',
        trainerId,
      });

      if (result.success && result.data) {
        DataExportService.downloadFile(
          result.data.data!,
          result.data.filename!
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => handleExport('csv')} disabled={loading}>
        Export CSV
      </button>
      <button onClick={() => handleExport('excel')} disabled={loading}>
        Export Excel
      </button>
    </div>
  );
}
```

### דוגמה: Import Component

```typescript
import { useState } from 'react';
import { DataImportService } from '@/services/dataImportService';

export function ImportComponent({ trainerId }: { trainerId: string }) {
  const [preview, setPreview] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await DataImportService.previewImport(
      file,
      'csv',
      'clients',
      trainerId
    );

    if (result.success && result.data) {
      setPreview(result.data);
    }
  };

  const handleImport = async (file: File) => {
    const result = await DataImportService.importData({
      format: 'csv',
      dataType: 'clients',
      trainerId,
      file,
      validateBeforeImport: true,
    });

    if (result.success && result.data) {
      alert(`Imported ${result.data.imported} records`);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept=".csv,.json" />
      {preview && (
        <div>
          <p>Valid: {preview.valid}</p>
          <p>Invalid: {preview.invalid}</p>
          <button onClick={() => handleImport(file)}>Import</button>
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. תמיד השתמש ב-preview לפני import

```typescript
// ✅ טוב
const preview = await DataImportService.previewImport(...);
if (preview.data?.valid > 0) {
  await DataImportService.importData(...);
}

// ❌ רע
await DataImportService.importData(...); // ללא preview
```

### 2. Dry run לפני retention policies

```typescript
// ✅ טוב
const dryRun = await DataRetentionService.applyRetentionPolicies(id, true);
if (dryRun.data && confirm('Proceed?')) {
  await DataRetentionService.applyRetentionPolicies(id, false);
}
```

### 3. טיפול בשגיאות

```typescript
// ✅ טוב
const result = await DataExportService.exportData(...);
if (!result.success) {
  toast.error(result.error);
  return;
}
```

### 4. ולידציה לפני שמירה

```typescript
// ✅ טוב
const validation = validateClient(data);
if (!validation.success) {
  setErrors(validation.errors);
  return;
}
// Save validated data
```

---

## מבנה קבצים

```
src/
├── services/
│   ├── dataExportService.ts          # Export service
│   ├── dataExportService.example.ts  # Export examples
│   ├── dataImportService.ts          # Import service
│   ├── dataImportService.example.ts  # Import examples
│   ├── dataRetentionService.ts       # Retention service
│   ├── dataRetentionService.example.ts # Retention examples
│   ├── conflictResolutionService.ts  # Conflict resolution
│   ├── conflictResolutionService.example.ts # Conflict examples
│   └── crm/
│       └── index.ts                  # Barrel exports
└── utils/
    ├── validation.ts                 # Original validation utils
    └── validationSchemas.ts          # Zod schemas (NEW)
```

---

## תלותיות

החבילות הבאות נוספו לפרויקט:

```json
{
  "dependencies": {
    "zod": "^3.x.x",
    "xlsx": "^0.x.x"
  }
}
```

---

## הערות טכניות

1. **Excel Export**: משתמש ב-`xlsx` library עם תמיכה ב-Excel modern (`.xlsx`)
2. **CSV Export**: כולל BOM (UTF-8) לתמיכה בעברית ב-Excel
3. **Import Validation**: כל הנתונים עוברים ולידציה עם Zod לפני ייבוא
4. **Error Handling**: כל השירותים מחזירים `ApiResponse<T>` עם error handling עקבי
5. **Type Safety**: TypeScript strict mode עם Zod schemas ל-runtime validation

---

## צעדים הבאים

1. ✅ יצירת השירותים - **הושלם**
2. ⏭️ יצירת UI Components לשירותים
3. ⏭️ יצירת Tests עבור השירותים
4. ⏭️ יצירת Scheduled Tasks ל-retention policies
5. ⏭️ יצירת Admin UI לניהול retention policies

---

**תאריך יצירה**: 2025-01-27  
**גרסה**: 1.0  
**משימה**: 6 - ניהול נתונים מתקדם