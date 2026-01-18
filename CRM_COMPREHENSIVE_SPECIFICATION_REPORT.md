# דוח מפרט - יומן Google Calendar

**תאריך:** 2025-01-27  
**מטרה:** סריקה מקיפה של תכונת יומן Google Calendar

---

## 📊 סקירת תכונות

### 1. יומן Google Calendar (`calendar`) - אינטגרציה עם המערכת

- **מיקום:** `src/components/trainer/Calendar/CalendarView.tsx`
- **תיאור:** תצוגת יומן Google Calendar עם סנכרון אירועים
- **קשר למערכת:** 
  - סנכרון אוטומטי של אירועים עם מתאמנים
  - מיפוי לקוחות מ-Google Calendar (`google_calendar_clients`)
  - יצירת אירועים מתוך המערכת
  - מעקב אירועים ומתאמנים

- **תכונות:**
  - תצוגת אירועי Google Calendar
  - Drag & Drop לניהול אירועים
  - סנכרון דו-כיווני עם Google Calendar
  - קישור בין אירועים ומתאמנים
  - הגדרות סנכרון (GoogleCalendarSettings)

- **API:** `src/api/googleCalendarApi.ts`

- **מסד נתונים:**
  - `trainer_google_credentials` - OAuth credentials
  - `google_calendar_sync` - סנכרון אירועים
  - `google_calendar_clients` - כרטיסיות לקוחות

- **סטטוס:** ✅ פעיל ומוטמע
- **Routes:** `case 'calendar'`

---

## 🗄️ מבנה מסד נתונים - Google Calendar

### טבלאות Google Calendar

#### 1. `trainer_google_credentials`
**תיאור:** אחסון OAuth credentials למאמנים לסנכרון עם Google Calendar

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` (UNIQUE, ON DELETE CASCADE) |
| `access_token` | TEXT | OAuth access token (מוצפן ב-Production/Vault) |
| `refresh_token` | TEXT | OAuth refresh token (מוצפן ב-Production/Vault) |
| `token_expires_at` | TIMESTAMPTZ | תאריך פקיעת טוקן |
| `primary_calendar_id` | TEXT | מזהה יומן ראשי (nullable) |
| `default_calendar_id` | TEXT | מזהה יומן ברירת מחדל (nullable) |
| `auto_sync_enabled` | BOOLEAN | סנכרון אוטומטי (default: true) |
| `sync_frequency` | TEXT | תדירות: 'realtime', 'hourly', 'daily' (default: 'realtime') |
| `sync_direction` | TEXT | כיוון: 'to_google', 'from_google', 'bidirectional' (default: 'bidirectional', nullable) |
| `vault_secret_name` | TEXT | שם סוד ב-Vault לאחסון מוצפן של טוקנים (nullable) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

**Indexes:**
- `idx_google_credentials_trainer` on `trainer_id`
- `idx_trainer_google_credentials_vault_secret` on `vault_secret_name` (WHERE vault_secret_name IS NOT NULL)

**פונקציות Vault:**
- `store_google_tokens_in_vault()` - אחסון טוקנים ב-Vault
- `get_google_tokens_from_vault()` - קבלת טוקנים מ-Vault
- `migrate_tokens_to_vault()` - העברת טוקנים קיימים ל-Vault
- `check_token_expiration_alerts()` - בדיקת פקיעת טוקנים והתראות

**RLS:** מאמנים יכולים לנהל את האישורים שלהם בלבד

**Triggers:**
- `update_trainer_google_credentials_updated_at` - עדכון אוטומטי של `updated_at`

---

#### 2. `google_calendar_sync`
**תיאור:** מעקב סנכרון בין אימונים לאירועי Google Calendar

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` (ON DELETE CASCADE) |
| `trainee_id` | UUID | Foreign key → `trainees(id)` (nullable, ON DELETE CASCADE) |
| `workout_id` | UUID | Foreign key → `workouts(id)` (nullable, UNIQUE, ON DELETE CASCADE) |
| `google_event_id` | TEXT | מזהה אירוע ב-Google Calendar |
| `google_calendar_id` | TEXT | מזהה יומן |
| `sync_status` | TEXT | 'synced', 'pending', 'failed', 'conflict' (default: 'synced') |
| `sync_direction` | TEXT | 'to_google', 'from_google', 'bidirectional' (default: 'bidirectional') |
| `last_synced_at` | TIMESTAMPTZ | תאריך סנכרון אחרון |
| `event_start_time` | TIMESTAMPTZ | שעת התחלת אירוע |
| `event_end_time` | TIMESTAMPTZ | שעת סיום אירוע (nullable) |
| `event_summary` | TEXT | סיכום אירוע (nullable) |
| `event_description` | TEXT | תיאור אירוע (nullable) |
| `conflict_resolution` | TEXT | 'system_wins', 'google_wins', 'manual' (nullable) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

**Constraints:**
- `UNIQUE(google_event_id, google_calendar_id)`
- `UNIQUE(workout_id)`

**Indexes:**
- `idx_calendar_sync_trainer` on `trainer_id`
- `idx_calendar_sync_trainee` on `trainee_id`
- `idx_calendar_sync_workout` on `workout_id`
- `idx_calendar_sync_status` on `sync_status`
- `idx_calendar_sync_event_id` on `(google_event_id, google_calendar_id)`
- `idx_calendar_sync_trainer_date_status` on `(trainer_id, event_start_time, sync_status)` WHERE sync_status = 'synced'
- `idx_calendar_sync_event_start_time` on `event_start_time` WHERE sync_status = 'synced'
- `idx_calendar_sync_trainee_date` on `(trainee_id, event_start_time)` WHERE sync_status = 'synced'
- `idx_calendar_sync_upcoming` on `(trainer_id, event_start_time)` WHERE sync_status = 'synced' AND event_start_time >= NOW()
- `idx_calendar_sync_trainer_upcoming` on `(trainer_id, event_start_time, sync_status)` WHERE sync_status = 'synced' AND trainer_id IS NOT NULL

**RLS:** מאמנים יכולים לנהל סנכרון עבור הנתונים שלהם בלבד

**Triggers:**
- `update_google_calendar_sync_updated_at` - עדכון אוטומטי של `updated_at`

---

#### 3. `google_calendar_clients`
**תיאור:** כרטיסיות לקוחות שנוצרות מסנכרון Google Calendar

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` (ON DELETE CASCADE) |
| `trainee_id` | UUID | Foreign key → `trainees(id)` (nullable, ON DELETE SET NULL) |
| `google_client_identifier` | TEXT | מזהה לקוח ב-Google Calendar (אימייל או שם) |
| `client_name` | TEXT | שם מלא של הלקוח |
| `client_email` | TEXT | אימייל (nullable) |
| `client_phone` | TEXT | טלפון (nullable) |
| `first_event_date` | DATE | תאריך האירוע הראשון עם הלקוח (nullable) |
| `last_event_date` | DATE | תאריך האירוע האחרון (nullable) |
| `total_events_count` | INT | סך כל האירועים (default: 0) |
| `upcoming_events_count` | INT | מספר אירועים עתידיים (default: 0) |
| `completed_events_count` | INT | מספר אירועים הושלמו (default: 0) |
| `crm_data` | JSONB | נתוני CRM נוספים (default: '{}') |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

**Constraints:**
- `UNIQUE(trainer_id, google_client_identifier)`

**Indexes:**
- `idx_calendar_clients_trainer` on `trainer_id`
- `idx_calendar_clients_trainee` on `trainee_id`
- `idx_calendar_clients_identifier` on `google_client_identifier`
- `idx_calendar_clients_trainer_last_event_desc` on `(trainer_id, last_event_date DESC NULLS LAST)`
- `idx_calendar_clients_trainer_trainee` on `(trainer_id, trainee_id)` WHERE trainee_id IS NOT NULL
- `idx_calendar_clients_trainee_id` on `(trainee_id, trainer_id, last_event_date)` WHERE trainee_id IS NOT NULL

**RLS:** מאמנים יכולים לנהל לקוחות יומן שלהם בלבד

**Triggers:**
- `update_google_calendar_clients_updated_at` - עדכון אוטומטי של `updated_at`

---

### סיכום טבלאות Google Calendar

| טבלה | מטרה | מספר שדות | מספר אינדקסים | סטטוס |
|------|------|-----------|--------------|-------|
| `trainer_google_credentials` | OAuth Google Calendar | 12 | 2 | ✅ פעיל |
| `google_calendar_sync` | סנכרון אירועים | 13 | 9 | ✅ פעיל |
| `google_calendar_clients` | כרטיסיות לקוחות | 13 | 6 | ✅ פעיל |

**סה"כ: 3 טבלאות Google Calendar, 17 אינדקסים כולל אינדקסים מורכבים ואופטימיזציות**

---

### Indexes ו-Optimizations

המערכת כוללת **Indexes מותאמים** לביצועים:
- Composite indexes לשאילתות מורכבות
- Indexes על foreign keys
- Indexes על שדות תאריך למיון
- Partial indexes (WHERE clauses) לביצועים מיטביים
- Indexes מותאמים לשאילתות Analytics

**מיגרציות אופטימיזציה:**
- `20260126000000_add_sync_direction_to_credentials.sql` - הוספת sync_direction
- `20260127000000_optimize_calendar_performance_indexes.sql` - אופטימיזציה לשאילתות תאריכים
- `20260129000000_optimize_crm_queries_performance.sql` - אופטימיזציה לשאילתות CRM
- `20260131000000_optimize_crm_analytics_queries.sql` - אופטימיזציה לשאילתות Analytics
- `20260131000001_add_vault_support_oauth_tokens.sql` - תמיכה ב-Vault לאבטחת טוקנים

**אבטחה:**
- תמיכה ב-Supabase Vault לאחסון מוצפן של OAuth tokens
- פונקציות לניהול טוקנים ב-Vault
- התראות על פקיעת טוקנים

**פונקציות מסד נתונים:**
- `update_google_calendar_updated_at()` - פונקציה משותפת לעדכון `updated_at` בכל הטבלאות
- `store_google_tokens_in_vault()` - אחסון טוקנים ב-Vault
- `get_google_tokens_from_vault()` - קבלת טוקנים מ-Vault
- `migrate_tokens_to_vault()` - העברת טוקנים קיימים ל-Vault
- `check_token_expiration_alerts()` - בדיקת פקיעת טוקנים והתראות

**Triggers:**
- כל הטבלאות כוללות triggers לעדכון אוטומטי של `updated_at` בעת שינויים

---

**סיום הדוח**
