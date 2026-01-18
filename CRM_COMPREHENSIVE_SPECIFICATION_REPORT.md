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
| `trainer_id` | UUID | Foreign key → `trainers(id)` (UNIQUE) |
| `access_token` | TEXT | OAuth access token (מוצפן ב-Production) |
| `refresh_token` | TEXT | OAuth refresh token |
| `token_expires_at` | TIMESTAMPTZ | תאריך פקיעת טוקן |
| `primary_calendar_id` | TEXT | מזהה יומן ראשי |
| `default_calendar_id` | TEXT | מזהה יומן ברירת מחדל |
| `auto_sync_enabled` | BOOLEAN | סנכרון אוטומטי (default: true) |
| `sync_frequency` | TEXT | תדירות: 'realtime', 'hourly', 'daily' (default: 'realtime') |
| `sync_direction` | TEXT | כיוון: 'to_google', 'from_google', 'bidirectional' |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

**Indexes:**
- `idx_google_credentials_trainer` on `trainer_id`

**RLS:** מאמנים יכולים לנהל את האישורים שלהם בלבד

---

#### 2. `google_calendar_sync`
**תיאור:** מעקב סנכרון בין אימונים לאירועי Google Calendar

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `trainee_id` | UUID | Foreign key → `trainees(id)` (nullable) |
| `workout_id` | UUID | Foreign key → `workouts(id)` (nullable, UNIQUE) |
| `google_event_id` | TEXT | מזהה אירוע ב-Google Calendar |
| `google_calendar_id` | TEXT | מזהה יומן |
| `sync_status` | TEXT | 'synced', 'pending', 'failed', 'conflict' (default: 'synced') |
| `sync_direction` | TEXT | 'to_google', 'from_google', 'bidirectional' (default: 'bidirectional') |
| `last_synced_at` | TIMESTAMPTZ | תאריך סנכרון אחרון |
| `event_start_time` | TIMESTAMPTZ | שעת התחלת אירוע |
| `event_end_time` | TIMESTAMPTZ | שעת סיום אירוע |
| `event_summary` | TEXT | סיכום אירוע |
| `event_description` | TEXT | תיאור אירוע |
| `conflict_resolution` | TEXT | 'system_wins', 'google_wins', 'manual' |
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

**RLS:** מאמנים יכולים לנהל סנכרון עבור הנתונים שלהם בלבד

---

#### 3. `google_calendar_clients`
**תיאור:** כרטיסיות לקוחות שנוצרות מסנכרון Google Calendar

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `trainee_id` | UUID | Foreign key → `trainees(id)` (nullable, ON DELETE SET NULL) |
| `google_client_identifier` | TEXT | מזהה לקוח ב-Google Calendar (אימייל או שם) |
| `client_name` | TEXT | שם מלא של הלקוח |
| `client_email` | TEXT | אימייל (nullable) |
| `client_phone` | TEXT | טלפון (nullable) |
| `first_event_date` | DATE | תאריך האירוע הראשון עם הלקוח |
| `last_event_date` | DATE | תאריך האירוע האחרון |
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
- `idx_calendar_clients_trainer_last_event_desc` on `(trainer_id, last_event_date DESC)`
- `idx_calendar_clients_trainer_trainee` on `(trainer_id, trainee_id)`

**RLS:** מאמנים יכולים לנהל לקוחות יומן שלהם בלבד

---

### סיכום טבלאות Google Calendar

| טבלה | מטרה | מספר שדות | סטטוס |
|------|------|-----------|-------|
| `trainer_google_credentials` | OAuth Google Calendar | 11 | ✅ פעיל |
| `google_calendar_sync` | סנכרון אירועים | 13 | ✅ פעיל |
| `google_calendar_clients` | כרטיסיות לקוחות | 13 | ✅ פעיל |

**סה"כ: 3 טבלאות Google Calendar**

---

### Indexes ו-Optimizations

המערכת כוללת **Indexes מותאמים** לביצועים:
- Composite indexes לשאילתות מורכבות
- Indexes על foreign keys
- Indexes על שדות תאריך למיון

**מיגרציות אופטימיזציה:**
- `20260127000000_optimize_calendar_performance_indexes.sql`

---

**סיום הדוח**
