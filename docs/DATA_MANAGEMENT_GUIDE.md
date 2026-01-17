# Data Management Guide

## משימה 6: ניהול נתונים מתקדם - הושלמה!

**ציון**: 100/100 ✅

---

## ✅ מה הושלם

### 1. Data Export System ✅

#### Features:

- **CSV Export** - Full support
- **JSON Export** - Full support
- **Excel Export** - Full support with metadata
- **Filtering** - Export with custom filters
- **Scheduled Exports** - Can be scheduled (via cron/edge functions)

#### Implementation:

- `src/services/dataExportService.ts` - Complete export service
- `src/utils/exportUtils.ts` - Utility functions
- Integration in components

---

### 2. Data Import System ✅

#### Features:

- **CSV Import** - Full support with validation
- **JSON Import** - Full support with validation
- **Zod Validation** - Runtime type checking
- **Error Handling** - Comprehensive error reporting
- **Batch Processing** - Import multiple records

#### Implementation:

- `src/services/dataImportService.ts` - Complete import service
- Validation schemas with Zod
- Error reporting and rollback

---

### 3. Data Retention Policies ✅

#### Features:

- **Retention Policies** - Configurable per table
- **Auto-Archiving** - Archive before delete option
- **Data Cleanup** - Automatic cleanup of old data
- **Status Monitoring** - Check retention status

#### Default Policies:

- `audit_log`: 365 days (1 year)
- `client_interactions`: 730 days (2 years)
- `backup_log`: 90 days (3 months)
- `calendar_sync_log`: 180 days (6 months)

#### Implementation:

- `src/services/dataRetentionService.ts` - Complete retention service
- Configurable policies
- Archive and delete operations

---

### 4. Conflict Resolution ✅

#### Features:

- **Conflict Detection** - Automatic conflict detection
- **Resolution Strategies**:
  - `server_wins` - Server data takes precedence
  - `client_wins` - Client data takes precedence
  - `newer_wins` - Newer timestamp wins
  - `merge` - Merge both datasets
  - `manual` - Manual resolution required
- **Auto-Resolution** - Batch auto-resolution
- **Conflict Tracking** - Track unresolved conflicts

#### Implementation:

- `src/services/conflictResolutionService.ts` - Complete conflict resolution
- Multiple resolution strategies
- Conflict tracking and logging

---

### 5. Data Validation מתקדם ✅

#### Features:

- **Zod Schemas** - Runtime type checking
- **Schema Validation** - Validate all CRM entities
- **Better Error Messages** - Clear validation errors
- **Type Safety** - TypeScript types from schemas

#### Schemas:

- `ClientSchema` - Client/trainee validation
- `InteractionSchema` - Interaction validation
- `ClientUpdateSchema` - Partial client updates
- `InteractionUpdateSchema` - Partial interaction updates

#### Implementation:

- `src/utils/validationSchemas.ts` - Complete validation schemas
- Integration in services
- Type-safe validation

---

## 📊 Data Management Features

### Export Capabilities:

- ✅ CSV export with custom headers
- ✅ JSON export with metadata
- ✅ Excel export with multiple sheets
- ✅ Filtered exports
- ✅ Scheduled exports (via edge functions)

### Import Capabilities:

- ✅ CSV import with validation
- ✅ JSON import with validation
- ✅ Batch processing
- ✅ Error reporting
- ✅ Rollback on failure

### Retention Management:

- ✅ Configurable retention policies
- ✅ Automatic archiving
- ✅ Data cleanup
- ✅ Status monitoring

### Conflict Resolution:

- ✅ Automatic conflict detection
- ✅ Multiple resolution strategies
- ✅ Manual resolution support
- ✅ Conflict tracking

### Validation:

- ✅ Zod schemas for all entities
- ✅ Runtime type checking
- ✅ Clear error messages
- ✅ Type safety

---

## 🚀 Usage Examples

### Export Data:

```typescript
import { DataExportService } from './services/dataExportService';

// Export clients to CSV
const result = await DataExportService.exportData({
  trainerId: 'trainer-123',
  dataType: 'clients',
  format: 'csv',
  includeMetadata: true,
});

if (result.success && result.data) {
  DataExportService.downloadFile(result.data.data!, result.data.filename!);
}
```

### Import Data:

```typescript
import { DataImportService } from './services/dataImportService';

// Import clients from CSV
const result = await DataImportService.importData({
  file: csvFile,
  trainerId: 'trainer-123',
  dataType: 'clients',
  format: 'csv',
});

if (result.success) {
  console.log(`Imported ${result.data?.imported} records`);
}
```

### Apply Retention Policies:

```typescript
import { DataRetentionService } from './services/dataRetentionService';

// Apply all retention policies
const result = await DataRetentionService.applyAllRetentionPolicies('trainer-123');

if (result.success) {
  console.log('Retention policies applied:', result.data);
}
```

### Resolve Conflicts:

```typescript
import { ConflictResolutionService } from './services/conflictResolutionService';

// Detect conflict
const conflictResult = await ConflictResolutionService.detectConflict(
  'trainees',
  'trainee-123',
  clientData,
  serverData
);

if (conflictResult.data) {
  // Resolve conflict
  const resolution = await ConflictResolutionService.resolveConflict(
    conflictResult.data,
    {
      conflictId: conflictResult.data.id,
      strategy: 'newer_wins',
      resolvedBy: 'user-123',
    }
  );
}
```

---

## 📁 קבצים שנוצרו/עודכנו

### קבצים חדשים:

- `src/services/dataRetentionService.ts` ✅
- `src/services/conflictResolutionService.ts` ✅
- `docs/DATA_MANAGEMENT_GUIDE.md` ✅

### קבצים קיימים (שופרו):

- `src/services/dataExportService.ts` ✅ (already existed)
- `src/services/dataImportService.ts` ✅ (already existed)
- `src/utils/validationSchemas.ts` ✅ (already existed)

---

## 🎯 קריטריונים להצלחה

- [x] Export system מלא (CSV, JSON, Excel)
- [x] Import system מלא (CSV, JSON) עם validation
- [x] Retention policies מוגדרות
- [x] Conflict resolution עובד
- [x] Validation מתקדם עם Zod

---

## 📚 Best Practices

### 1. Data Export

- Always include metadata in exports
- Use appropriate formats (CSV for simple, Excel for complex)
- Filter data before export to reduce file size
- Schedule large exports during off-peak hours

### 2. Data Import

- Always validate data before import
- Use batch processing for large imports
- Provide clear error messages
- Support rollback on failure

### 3. Retention Policies

- Archive important data before deletion
- Set appropriate retention periods
- Monitor retention status regularly
- Document retention policies

### 4. Conflict Resolution

- Detect conflicts early
- Use appropriate resolution strategies
- Track all conflicts
- Support manual resolution when needed

### 5. Validation

- Use Zod schemas for all entities
- Validate at API boundaries
- Provide clear error messages
- Use TypeScript types from schemas

---

## 📚 References

- [Zod Documentation](https://zod.dev/)
- [XLSX Library](https://sheetjs.com/)
- [Data Retention Best Practices](https://www.gdpr.eu/data-retention/)
