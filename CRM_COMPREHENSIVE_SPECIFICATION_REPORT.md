# דוח מפרט מקיף - מערכת CRM NEWYM

**תאריך:** 2025-01-27  
**מטרה:** סריקה מקיפה של כל תכונות ה-CRM, זיהוי כפילויות ודפים מיותרים

---

## 📋 תוכן עניינים

1. [סקירת תכונות CRM](#סקירת-תכונות-crm)
2. [דפים ותצוגות בנויות](#דפים-ותצוגות-בנויות)
3. [כפילויות מזוהות](#כפילויות-מזוהות)
4. [דפים/רכיבים שלא בשימוש](#דפיםרכיבים-שלא-בשימוש)
5. [דפים שנוצרו ללא תכנון](#דפים-שנוצרו-ללא-תכנון)
6. [המלצות לניקוי](#המלצות-לניקוי)

---

## 📊 סקירת תכונות CRM

### 1. מבנה CRM עיקרי

המערכת מאורגנת תחת קטגוריית "CRM" ב-Sidebar, וכוללת גם **אינטגרציה עם Google Calendar** לסנכרון לקוחות ואירועים:

#### 1.1 CRM Dashboard (`crm-dashboard`)
- **מיקום:** `src/components/trainer/crm/dashboard/CrmDashboard.tsx`
- **תיאור:** דף סקירה כללי של CRM
- **סטטוס:** ✅ פעיל ומוטמע
- **Routes:** `case 'crm-dashboard'`

#### 1.2 לקוחות (Clients) (`crm-clients`)
- **מיקום:** `src/components/trainer/crm/clients/`
- **תיאור:** ניהול לקוחות עם תצוגות מרובות
- **רכיבים:**
  - `ClientsListView.tsx` - תצוגה בסיסית (לא בשימוש?)
  - `ClientsListViewEnhanced.tsx` - תצוגה משופרת עם real-time, virtual scrolling
  - `ClientCard.tsx` - כרטיס לקוח
  - `ClientDetailView.tsx` - תצוגת פרטי לקוח מלאה
  - `AdvancedFilters.tsx` - מסננים מתקדמים
  - `BulkActionsPanel.tsx` - פעולות מרובות
- **סטטוס:** ✅ פעיל - משתמש ב-`ClientsListViewEnhanced`
- **Routes:** `case 'crm-clients'`

#### 1.3 Pipeline (`crm-pipeline`)
- **מיקום:** `src/components/trainer/crm/pipeline/PipelineView.tsx`
- **תיאור:** ניהול Pipeline של לקוחות
- **סטטוס:** ✅ פעיל ומוטמע
- **Routes:** `case 'crm-pipeline'`

#### 1.4 אנליטיקה (Analytics) (`crm-analytics`)
- **מיקום:** `src/components/trainer/crm/analytics/AdvancedAnalytics.tsx`
- **תיאור:** אנליטיקה מתקדמת של CRM
- **סטטוס:** ✅ פעיל ומוטמע
- **Routes:** `case 'crm-analytics'`

#### 1.5 דוחות CRM (`crm-reports`)
- **מיקום:** `src/components/trainer/crm/reports/CrmReportsView.tsx`
- **תיאור:** דוחות ואנליטיקה CRM
- **סטטוס:** ✅ פעיל ומוטמע
- **Routes:** `case 'crm-reports'`

### 1.6 יומן Google Calendar (`calendar`) - אינטגרציה עם CRM
- **מיקום:** `src/components/trainer/Calendar/CalendarView.tsx`
- **תיאור:** תצוגת יומן Google Calendar עם סנכרון לקוחות
- **קשר ל-CRM:** 
  - סנכרון אוטומטי של אירועים עם לקוחות
  - מיפוי לקוחות מ-Google Calendar (`google_calendar_clients`)
  - יצירת אירועים מתוך CRM
  - מעקב אירועים ולקוחות
- **תכונות:**
  - תצוגת אירועי Google Calendar
  - Drag & Drop לניהול אירועים
  - סנכרון דו-כיווני עם Google Calendar
  - קישור בין אירועים ולקוחות
  - הגדרות סנכרון (GoogleCalendarSettings)
- **API:** `src/api/googleCalendarApi.ts`
- **מסד נתונים:**
  - `trainer_google_credentials` - OAuth credentials
  - `google_calendar_sync` - סנכרון אירועים
  - `google_calendar_clients` - כרטיסיות לקוחות
- **סטטוס:** ✅ פעיל ומוטמע
- **Routes:** `case 'calendar'`
- **הערה:** היומן הוא חלק מרכזי במערכת ה-CRM ומאפשר סנכרון לקוחות עם Google Calendar

### 2. רכיבים משותפים (Shared Components)

#### 2.1 CommunicationCenter (`communication`)
- **מיקום:** `src/components/trainer/crm/shared/CommunicationCenter.tsx`
- **תיאור:** מרכז תקשורת עם לקוחות
- **סטטוס:** ✅ פעיל
- **Routes:** `case 'communication'`

#### 2.2 ContractManager (`contracts`)
- **מיקום:** `src/components/trainer/crm/shared/ContractManager.tsx`
- **תיאור:** ניהול חוזים
- **סטטוס:** ✅ פעיל
- **Routes:** `case 'contracts'`

#### 2.3 PaymentTracker (`payments`)
- **מיקום:** `src/components/trainer/crm/shared/PaymentTracker.tsx`
- **תיאור:** מעקב תשלומים
- **סטטוס:** ✅ פעיל
- **Routes:** `case 'payments'`

#### 2.4 DocumentManager (`documents`)
- **מיקום:** `src/components/trainer/crm/shared/DocumentManager.tsx`
- **תיאור:** ניהול מסמכים
- **סטטוס:** ✅ פעיל
- **Routes:** `case 'documents'`

#### 2.5 EmailTemplateEditor
- **מיקום:** `src/components/trainer/crm/shared/EmailTemplateEditor.tsx`
- **תיאור:** עורך תבניות אימייל
- **סטטוס:** ✅ קיים (משולב ב-EmailTemplatesManager)

### 3. תכונות ניהול והגדרות

#### 3.1 EmailTemplatesManager (`email-templates`)
- **מיקום:** `src/components/trainer/crm/templates/EmailTemplatesManager.tsx`
- **תיאור:** ניהול תבניות אימייל
- **סטטוס:** ✅ פעיל
- **Routes:** `case 'email-templates'`

#### 3.2 ScheduledExportsManager (`scheduled-exports`)
- **מיקום:** `src/components/trainer/crm/export/ScheduledExportsManager.tsx`
- **תיאור:** ניהול ייצואים מתוזמנים
- **סטטוס:** ✅ פעיל
- **Routes:** `case 'scheduled-exports'`

#### 3.3 DataImportManager (`data-import`)
- **מיקום:** `src/components/trainer/crm/import/DataImportManager.tsx`
- **תיאור:** ייבוא נתונים (CSV/JSON)
- **סטטוס:** ✅ פעיל
- **Routes:** `case 'data-import'`

### 4. תכונות אוטומציה

#### 4.1 AutomationRulesView
- **מיקום:** `src/components/trainer/crm/automation/AutomationRulesView.tsx`
- **תיאור:** ניהול כללי אוטומציה
- **סטטוס:** ⚠️ **קיים אבל לא בשימוש** - לא נמצא ב-TrainerApp

#### 4.2 VisualRuleBuilder
- **מיקום:** `src/components/trainer/crm/automation/VisualRuleBuilder.tsx`
- **תיאור:** בונה כללי אוטומציה ויזואלי
- **סטטוס:** ⚠️ **קיים אבל לא בשימוש** - לא נמצא ב-TrainerApp

---

## 🗂️ דפים ותצוגות בנויות

### תצוגות ראשיות (Main Navigation)

| View ID | Component | תיאור | סטטוס |
|---------|-----------|-------|-------|
| `dashboard` | `Dashboard/Dashboard.tsx` | דף הבית מאמן | ✅ פעיל |
| `trainees` | `Trainees/TraineesList.tsx` | רשימת מתאמנים | ✅ פעיל |
| `calendar` | `Calendar/CalendarView.tsx` | יומן Google Calendar | ✅ פעיל |
| `tools` | `Tools/ToolsView.tsx` | מחשבונים וכלים | ✅ פעיל |
| `reports` | `Reports/ReportsView.tsx` | דוחות כללים (לא CRM) | ✅ פעיל |

### תצוגות CRM

| View ID | Component | תיאור | סטטוס |
|---------|-----------|-------|-------|
| `crm-dashboard` | `crm/dashboard/CrmDashboard.tsx` | CRM Dashboard | ✅ פעיל |
| `crm-clients` | `crm/clients/ClientsListViewEnhanced.tsx` | רשימת לקוחות | ✅ פעיל |
| `crm-pipeline` | `crm/pipeline/PipelineView.tsx` | Pipeline | ✅ פעיל |
| `crm-analytics` | `crm/analytics/AdvancedAnalytics.tsx` | אנליטיקה CRM | ✅ פעיל |
| `crm-reports` | `crm/reports/CrmReportsView.tsx` | דוחות CRM | ✅ פעיל |
| `client-detail` | `crm/clients/ClientDetailView.tsx` | פרטי לקוח | ✅ פעיל |

### תצוגות CRM נוספות (Shared)

| View ID | Component | תיאור | סטטוס |
|---------|-----------|-------|-------|
| `contracts` | `crm/shared/ContractManager.tsx` | ניהול חוזים | ✅ פעיל |
| `payments` | `crm/shared/PaymentTracker.tsx` | מעקב תשלומים | ✅ פעיל |
| `communication` | `crm/shared/CommunicationCenter.tsx` | מרכז תקשורת | ✅ פעיל |
| `documents` | `crm/shared/DocumentManager.tsx` | ניהול מסמכים | ✅ פעיל |
| `filters` | `crm/clients/AdvancedFilters.tsx` | מסננים מתקדמים | ⚠️ קיים אך לא ב-Sidebar |

### תצוגות הגדרות

| View ID | Component | תיאור | סטטוס |
|---------|-----------|-------|-------|
| `health-check` | `settings/HealthCheckView.tsx` | בדיקת בריאות | ✅ פעיל |
| `email-templates` | `crm/templates/EmailTemplatesManager.tsx` | תבניות אימייל | ✅ פעיל |
| `scheduled-exports` | `crm/export/ScheduledExportsManager.tsx` | ייצואים מתוזמנים | ✅ פעיל |
| `data-import` | `crm/import/DataImportManager.tsx` | ייבוא נתונים | ✅ פעיל |
| `error-reporting` | `settings/ErrorReportingSettings.tsx` | הגדרות דיווח שגיאות | ✅ פעיל |

---

## ⚠️ כפילויות מזוהות

### 1. ClientsListView vs ClientsListViewEnhanced

**בעיה:** קיימים שני קבצים דומים:
- `src/components/trainer/crm/clients/ClientsListView.tsx`
- `src/components/trainer/crm/clients/ClientsListViewEnhanced.tsx`

**סטטוס נוכחי:**
- `ClientsListViewEnhanced` משמש ב-`TrainerApp` (שורה 1174)
- `ClientsListView` **לא משמש** בשום מקום ב-TrainerApp

**המלצה:** 
- ✅ למחוק את `ClientsListView.tsx` (לא בשימוש)
- או לבדוק אם יש צורך בו במקומות אחרים

### 2. CrmReportsView vs ReportsView

**בעיה:** קיימים שני דפי דוחות שונים:
- `src/components/trainer/Reports/ReportsView.tsx` - דוחות כללים (`reports`)
- `src/components/trainer/crm/reports/CrmReportsView.tsx` - דוחות CRM (`crm-reports`)

**סטטוס נוכחי:**
- שני הדפים **בשימוש** - כל אחד למטרה שונה
- `reports` - דוחות כלליים של מאמן
- `crm-reports` - דוחות CRM ספציפיים

**המלצה:** 
- ✅ **להשאיר את שניהם** - הם שונים במטרתם
- ⚠️ **לשקול שינוי שמות** לבהירות:
  - `ReportsView` → `GeneralReportsView` או `TrainerReportsView`
  - `CrmReportsView` - שם ברור כבר

### 3. Dashboard vs CrmDashboard

**בעיה:** קיימים שני דפי Dashboard:
- `src/components/trainer/Dashboard/Dashboard.tsx` - Dashboard כללי (`dashboard`)
- `src/components/trainer/crm/dashboard/CrmDashboard.tsx` - CRM Dashboard (`crm-dashboard`)

**סטטוס נוכחי:**
- שני הדפים **בשימוש** - כל אחד למטרה שונה
- `dashboard` - Dashboard כללי של מאמן
- `crm-dashboard` - Dashboard CRM ספציפי

**המלצה:** 
- ✅ **להשאיר את שניהם** - הם שונים במטרתם
- ✅ שמות ברורים ובהירים

### 4. תיקיית Clients ריקה

**בעיה:** 
- קיימת תיקייה `src/components/trainer/Clients/` שהיא **ריקה**

**המלצה:**
- ✅ **למחוק את התיקייה** - לא משמשת ומבלבלת

---

## 🚫 דפים/רכיבים שלא בשימוש

### 1. ClientDashboard & ClientPortal

**קבצים:**
- `src/components/client/ClientDashboard.tsx`
- `src/components/client/ClientPortal.tsx`

**סטטוס:** 
- ⚠️ **לא נמצאים בשימוש** ב-`TrainerApp.tsx`
- לא מיובאים ולא נקראים בשום מקום

**המלצה:**
- ⚠️ **לבדוק** אם מיועדים לשימוש עתידי או למחיקה
- אם לא בשימוש - **למחוק**

### 2. Automation Components

**קבצים:**
- `src/components/trainer/crm/automation/AutomationRulesView.tsx`
- `src/components/trainer/crm/automation/VisualRuleBuilder.tsx`

**סטטוס:**
- ⚠️ **לא נמצאים בשימוש** ב-`TrainerApp.tsx`
- לא מיובאים ולא נקראים

**המלצה:**
- ⚠️ **לבדוק** אם תכונה עתידית או למחיקה
- אם לא מתוכנן להשתמש - **למחוק** או להעביר ל-"עתידי"

### 3. ClientsListView (לא Enhanced)

**קובץ:**
- `src/components/trainer/crm/clients/ClientsListView.tsx`

**סטטוס:**
- ⚠️ **לא נמצא בשימוש** - TrainerApp משתמש ב-`ClientsListViewEnhanced`

**המלצה:**
- ✅ **למחוק** - לא בשימוש

### 4. AdvancedFilters (לא מופיע ב-Sidebar)

**קובץ:**
- `src/components/trainer/crm/clients/AdvancedFilters.tsx`

**סטטוס:**
- ⚠️ **קיים route** (`case 'filters'`) אבל **לא מופיע ב-Sidebar**
- לא נגיש ישירות דרך התפריט

**המלצה:**
- ⚠️ **לבדוק** אם צריך להוסיף ל-Sidebar או שמיועד לשימוש פנימי בלבד
- אם לא צריך - **להסיר את ה-route**

---

## ❓ דפים שנוצרו ללא תכנון

### 1. תצוגת `filters` בודדת

**בעיה:**
- קיים `case 'filters'` ב-TrainerApp (שורה 1309)
- לא מופיע ב-Sidebar
- לא ברור איך מגיעים אליו

**המלצה:**
- ⚠️ **לבדוק** אם צריך או להסיר
- אם צריך - להוסיף ל-Sidebar או לקרוא מ-`ClientDetailView`

### 2. Analytics vs Reports - בלבול פוטנציאלי

**בעיה:**
- `crm-analytics` - אנליטיקה
- `crm-reports` - דוחות
- `reports` - דוחות כלליים

**המלצה:**
- ✅ לשקול שינוי שמות או איחוד אם יש חפיפה
- כרגע נראים שונים מספיק

---

## 🧹 המלצות לניקוי

### קבצים למחיקה מיידית:

1. ✅ **`src/components/trainer/crm/clients/ClientsListView.tsx`**
   - סיבה: לא בשימוש, יש Enhanced version

2. ✅ **`src/components/trainer/Clients/` (תיקייה ריקה)**
   - סיבה: תיקייה ריקה ולא נחוצה

### קבצים לבדיקה ומחיקה אפשרית:

3. ⚠️ **`src/components/client/ClientDashboard.tsx`**
   - לבדוק אם מיועד לשימוש עתידי
   - אם לא - למחוק

4. ⚠️ **`src/components/client/ClientPortal.tsx`**
   - לבדוק אם מיועד לשימוש עתידי
   - אם לא - למחוק

5. ⚠️ **`src/components/trainer/crm/automation/AutomationRulesView.tsx`**
   - לבדוק אם תכונה עתידית
   - אם לא - למחוק או להעביר ל-"עתידי"

6. ⚠️ **`src/components/trainer/crm/automation/VisualRuleBuilder.tsx`**
   - לבדוק אם תכונה עתידית
   - אם לא - למחוק או להעביר ל-"עתידי"

### תיקונים מומלצים:

7. ⚠️ **Route `filters` ב-TrainerApp**
   - להסיר אם לא נחוץ
   - או להוסיף ל-Sidebar אם נחוץ

8. ✅ **לשקול שינוי שמות:**
   - `ReportsView` → `TrainerReportsView` (להימנע מבלבול עם `CrmReportsView`)

---

## 📝 סיכום

### תכונות CRM פעילות: ✅ 18 דפים/תצוגות

1. CRM Dashboard
2. Clients List (Enhanced)
3. Pipeline
4. Analytics
5. Reports CRM
6. Client Detail
7. **Google Calendar / יומן** - סנכרון לקוחות ואירועים
8. Contracts
9. Payments
10. Communication
11. Documents
12. Email Templates Manager
13. Scheduled Exports
14. Data Import
15. Health Check
16. Error Reporting
17. Advanced Filters (route קיים, לא ב-Sidebar)
18. Automation Rules (קיים אבל לא בשימוש)

### כפילויות מזוהות: ⚠️ 1 כפילות

- `ClientsListView` vs `ClientsListViewEnhanced` - Enhanced בשימוש, הישן לא

### קבצים לא בשימוש: 🚫 5+ קבצים

- `ClientsListView.tsx` - למחיקה
- `ClientDashboard.tsx` - לבדיקה
- `ClientPortal.tsx` - לבדיקה
- `AutomationRulesView.tsx` - לבדיקה
- `VisualRuleBuilder.tsx` - לבדיקה
- תיקיית `Clients/` ריקה - למחיקה

### המלצות סופיות:

✅ **לבצע:**
1. מחק `ClientsListView.tsx`
2. מחק תיקיית `Clients/` ריקה
3. בדוק וטפל בקבצי `client/` (Dashboard, Portal)
4. בדוק וטפל בקבצי `automation/`
5. החלט על route `filters` (להוסיף ל-Sidebar או להסיר)

⚠️ **לשקול:**
- שינוי שם `ReportsView` לבהירות
- תיעוד ברור של ההבדל בין `reports` ל-`crm-reports`

---

## 🗄️ מבנה מסד נתונים (Database Schema)

### טבלאות CRM עיקריות

#### 1. Google Calendar Integration

##### `trainer_google_credentials`
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

##### `google_calendar_sync`
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

##### `google_calendar_clients`
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

#### 2. CRM Core Tables

##### `trainees` (Extended with CRM fields)
**תיאור:** טבלת מתאמנים הורחבה עם שדות CRM

**שדות CRM נוספים:**

| שדה | סוג | תיאור |
|-----|-----|-------|
| `google_calendar_client_id` | UUID | Foreign key → `google_calendar_clients(id)` (nullable) |
| `crm_status` | TEXT | 'lead', 'qualified', 'active', 'inactive', 'churned', 'on_hold' (default: 'active') |
| `client_since` | DATE | תאריך הפך ללקוח (default: CURRENT_DATE) |
| `last_contact_date` | TIMESTAMPTZ | תאריך יצירת קשר אחרון |
| `next_followup_date` | DATE | תאריך מעקב הבא |
| `contract_type` | TEXT | 'monthly', 'package', 'session', 'trial' |
| `contract_value` | DECIMAL(10,2) | ערך חוזה |
| `payment_status` | TEXT | 'paid', 'pending', 'overdue', 'free' (default: 'pending') |
| `tags` | TEXT[] | מערך תגיות |
| `notes_history` | JSONB | היסטוריית הערות (default: '[]') |

**Indexes CRM:**
- `idx_trainees_crm_status` on `crm_status`
- `idx_trainees_google_client` on `google_calendar_client_id`
- `idx_trainees_next_followup` on `next_followup_date` (WHERE next_followup_date IS NOT NULL)
- `idx_trainees_last_contact` on `last_contact_date DESC` (WHERE last_contact_date IS NOT NULL)
- `idx_trainees_trainer_crm_payment` on `(trainer_id, crm_status, payment_status)`
- `idx_trainees_active_clients` on `(trainer_id, client_since)` (WHERE crm_status = 'active')

---

##### `client_interactions`
**תיאור:** מעקב אינטראקציות עם לקוחות (שיחות, אימיילים, SMS, וכו')

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainee_id` | UUID | Foreign key → `trainees(id)` |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `interaction_type` | TEXT | 'call', 'email', 'sms', 'meeting', 'workout', 'message', 'note' |
| `interaction_date` | TIMESTAMPTZ | תאריך אינטראקציה (default: NOW()) |
| `subject` | TEXT | נושא |
| `description` | TEXT | תיאור |
| `outcome` | TEXT | תוצאה |
| `next_action` | TEXT | פעולה הבאה |
| `next_action_date` | DATE | תאריך פעולה הבאה |
| `google_event_id` | TEXT | קישור לאירוע Google Calendar (nullable) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |

**Indexes:**
- `idx_client_interactions_trainee` on `(trainee_id, interaction_date DESC)`
- `idx_client_interactions_trainer` on `(trainer_id, interaction_date DESC)`
- `idx_client_interactions_date` on `interaction_date DESC`
- `idx_client_interactions_type` on `interaction_type`
- `idx_client_interactions_next_action` on `next_action_date` (WHERE next_action_date IS NOT NULL)

**RLS:** מאמנים יכולים לנהל אינטראקציות עבור המתאמנים שלהם בלבד

---

#### 3. CRM Contracts & Payments

##### `crm_contracts`
**תיאור:** חוזים עם לקוחות

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainee_id` | UUID | Foreign key → `trainees(id)` |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `contract_type` | TEXT | 'monthly', 'package', 'session', 'trial' |
| `start_date` | DATE | תאריך התחלה |
| `end_date` | DATE | תאריך סיום (nullable) |
| `value` | DECIMAL(10,2) | ערך חוזה |
| `terms` | TEXT | תנאים |
| `status` | TEXT | 'active', 'expired', 'cancelled' (default: 'active') |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

**Indexes:**
- `idx_contracts_trainee` on `(trainee_id, status)`
- `idx_contracts_trainer` on `(trainer_id, status)`
- `idx_contracts_dates` on `(start_date, end_date)`

**RLS:** מאמנים יכולים לנהל חוזים שלהם בלבד

---

##### `crm_payments`
**תיאור:** רשומות תשלומים

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `contract_id` | UUID | Foreign key → `crm_contracts(id)` (nullable, ON DELETE SET NULL) |
| `trainee_id` | UUID | Foreign key → `trainees(id)` |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `amount` | DECIMAL(10,2) | סכום |
| `due_date` | DATE | תאריך תשלום |
| `paid_date` | DATE | תאריך תשלום בפועל (nullable) |
| `payment_method` | TEXT | 'cash', 'credit_card', 'bank_transfer', 'other' |
| `status` | TEXT | 'pending', 'paid', 'overdue', 'cancelled' (default: 'pending') |
| `notes` | TEXT | הערות |
| `invoice_number` | TEXT | מספר חשבונית (UNIQUE) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |

**Triggers:**
- `check_overdue_payments()` - מסמן תשלומים שפג תוקפם
- `update_trainee_payment_status()` - מעדכן סטטוס תשלום במתאמן אוטומטית

**Indexes:**
- `idx_payments_trainee` on `(trainee_id, status)`
- `idx_payments_trainer` on `(trainer_id, status)`
- `idx_payments_due_date` on `(due_date, status)`
- `idx_payments_invoice` on `invoice_number`
- `idx_crm_payments_trainer_date` on `(trainer_id, paid_date DESC)`

**RLS:** מאמנים יכולים לצפות ולנהל תשלומים שלהם בלבד

---

#### 4. CRM Communication

##### `crm_communication_templates`
**תיאור:** תבניות תקשורת (אימייל/SMS/WhatsApp)

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `template_type` | TEXT | 'email', 'sms', 'whatsapp' |
| `name` | TEXT | שם תבנית |
| `subject` | TEXT | נושא (למיילים) |
| `body` | TEXT | תוכן התבנית |
| `variables` | TEXT[] | משתנים זמינים (default: '{}') |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

**Constraints:**
- `UNIQUE(trainer_id, name)`

**Indexes:**
- `idx_communication_templates_trainer` on `(trainer_id, template_type)`

**RLS:** מאמנים יכולים לנהל תבניות שלהם בלבד

---

##### `crm_communication_messages`
**תיאור:** היסטוריית תקשורת

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainee_id` | UUID | Foreign key → `trainees(id)` |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `message_type` | TEXT | 'email', 'sms', 'whatsapp', 'in_app' |
| `subject` | TEXT | נושא |
| `body` | TEXT | תוכן ההודעה |
| `sent_at` | TIMESTAMPTZ | תאריך שליחה (default: NOW()) |
| `status` | TEXT | 'sent', 'failed', 'pending' (default: 'pending') |
| `error_message` | TEXT | הודעת שגיאה (nullable) |
| `template_id` | UUID | Foreign key → `crm_communication_templates(id)` (nullable) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |

**Indexes:**
- `idx_communication_messages_trainee` on `(trainee_id, sent_at DESC)`
- `idx_communication_messages_trainer` on `(trainer_id, sent_at DESC)`
- `idx_communication_messages_type` on `message_type`
- `idx_communication_messages_status` on `status`

**RLS:** מאמנים יכולים לנהל הודעות שלהם בלבד

---

#### 5. CRM Documents

##### `crm_documents`
**תיאור:** מטה-דאטה למסמכים (המסמכים עצמם ב-Storage)

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainee_id` | UUID | Foreign key → `trainees(id)` |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `name` | TEXT | שם מסמך |
| `file_path` | TEXT | נתיב קובץ ב-Storage |
| `file_type` | TEXT | סוג קובץ |
| `file_size` | BIGINT | גודל קובץ (בבתים) |
| `category` | TEXT | קטגוריה |
| `description` | TEXT | תיאור |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |

**Indexes:**
- `idx_documents_trainee` on `(trainee_id, created_at DESC)`
- `idx_documents_trainer` on `(trainer_id, created_at DESC)`
- `idx_documents_category` on `category`

**RLS:** מאמנים יכולים לצפות ולנהל מסמכים שלהם בלבד

**Storage:** קבצים נשמרים ב-bucket `crm-documents` עם גישה פרטית

---

#### 6. CRM Automation

##### `crm_automation_rules`
**תיאור:** הגדרות כללי אוטומציה

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `rule_type` | TEXT | 'reminder', 'alert', 'workflow', 'notification' |
| `name` | TEXT | שם כלל |
| `description` | TEXT | תיאור |
| `enabled` | BOOLEAN | מופעל (default: true) |
| `conditions` | JSONB | תנאים (default: '[]') |
| `actions` | JSONB | פעולות (default: '[]') |
| `schedule` | JSONB | לוח זמנים (nullable) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

**Indexes:**
- `idx_automation_rules_trainer` on `(trainer_id, enabled)`
- `idx_automation_rules_type` on `rule_type`

**RLS:** מאמנים יכולים לנהל כללי אוטומציה שלהם בלבד

---

##### `crm_automation_tasks`
**תיאור:** משימות שנוצרו על ידי אוטומציה

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `rule_id` | UUID | Foreign key → `crm_automation_rules(id)` (nullable) |
| `trainee_id` | UUID | Foreign key → `trainees(id)` |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `task_type` | TEXT | סוג משימה |
| `due_date` | TIMESTAMPTZ | תאריך יעד |
| `completed` | BOOLEAN | הושלמה (default: false) |
| `completed_at` | TIMESTAMPTZ | תאריך השלמה (nullable) |
| `metadata` | JSONB | מטה-דאטה נוספת (default: '{}') |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |

**Indexes:**
- `idx_automation_tasks_trainer` on `(trainer_id, completed, due_date)`
- `idx_automation_tasks_trainee` on `(trainee_id, completed)`
- `idx_automation_tasks_due_date` on `due_date` (WHERE completed = false)

**RLS:** מאמנים יכולים לצפות ולנהל משימות שלהם בלבד

---

#### 7. CRM Segments

##### `crm_segments`
**תיאור:** קטעים (סטטוסים) של לקוחות - מסננים שמורים

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `name` | TEXT | שם קטע |
| `description` | TEXT | תיאור |
| `filter_criteria` | JSONB | קריטריוני סינון (default: '[]') |
| `auto_update` | BOOLEAN | עדכון אוטומטי (default: false) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |
| `updated_at` | TIMESTAMPTZ | תאריך עדכון אחרון |

**Constraints:**
- `UNIQUE(trainer_id, name)`

**Indexes:**
- `idx_segments_trainer` on `trainer_id`
- `idx_segments_auto_update` on `(trainer_id, auto_update)` (WHERE auto_update = true)

**RLS:** מאמנים יכולים לנהל קטעים שלהם בלבד

---

#### 8. CRM Pipeline Tracking

##### `pipeline_movements`
**תיאור:** מעקב Pipeline - תנועות ושינויים בסטטוס CRM

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainee_id` | UUID | Foreign key → `trainees(id)` |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `from_status` | TEXT | סטטוס קודם: 'lead', 'qualified', 'active', 'inactive', 'churned', 'on_hold' |
| `to_status` | TEXT | סטטוס חדש: 'lead', 'qualified', 'active', 'inactive', 'churned', 'on_hold' |
| `reason` | TEXT | סיבת שינוי |
| `moved_at` | TIMESTAMPTZ | תאריך מעבר לשלב (default: NOW()) |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |

**Triggers:**
- `log_pipeline_movement()` - רושם אוטומטית תנועות כאשר `crm_status` משתנה ב-`trainees`

**Indexes:**
- `idx_pipeline_movements_trainee` on `(trainee_id, moved_at DESC)`
- `idx_pipeline_movements_trainer` on `(trainer_id, moved_at DESC)`
- `idx_pipeline_movements_status` on `(to_status, moved_at DESC)`
- `idx_pipeline_movements_date` on `moved_at DESC`

**RLS:** מאמנים יכולים לצפות וליצור תנועות Pipeline שלהם בלבד

---

#### 9. Audit & Logging

##### `audit_log`
**תיאור:** יומן ביקורת לכל פעולות CRM

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `action_type` | TEXT | סוג פעולה (create_client, update_client, delete_client, etc.) |
| `entity_type` | TEXT | סוג ישות (trainee, contract, payment, etc.) |
| `entity_id` | UUID | מזהה ישות |
| `old_values` | JSONB | ערכים ישנים (nullable) |
| `new_values` | JSONB | ערכים חדשים (nullable) |
| `ip_address` | INET | כתובת IP |
| `user_agent` | TEXT | User Agent |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |

**Indexes:**
- `idx_audit_log_trainer` on `(trainer_id, created_at DESC)`
- `idx_audit_log_entity` on `(entity_type, entity_id)`
- `idx_audit_log_action` on `action_type`

**RLS:** מאמנים יכולים לצפות ביומן הביקורת שלהם בלבד

---

##### `backup_log`
**תיאור:** יומן גיבויים מתוזמנים

| שדה | סוג | תיאור |
|-----|-----|-------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `backup_type` | TEXT | 'full', 'incremental', 'manual' |
| `backup_date` | TIMESTAMPTZ | תאריך גיבוי (default: NOW()) |
| `data_size` | BIGINT | גודל נתונים (בבתים) |
| `record_count` | INTEGER | מספר רשומות שגובו (default: 0) |
| `status` | TEXT | 'completed', 'failed', 'in_progress' (default: 'in_progress') |
| `error_message` | TEXT | הודעת שגיאה (nullable) |
| `tables_included` | TEXT[] | רשימת טבלאות שגובו |
| `created_at` | TIMESTAMPTZ | תאריך יצירה |

**Indexes:**
- `idx_backup_log_trainer` on `(trainer_id, backup_date DESC)`
- `idx_backup_log_date` on `backup_date DESC`
- `idx_backup_log_status` on `status`

**Functions:**
- `create_trainer_backup(p_trainer_id, p_backup_type)` - יצירת גיבוי מתוזמן

**RLS:** מאמנים יכולים לצפות ביומן הגיבויים שלהם בלבד

---

### סיכום טבלאות CRM

| טבלה | מטרה | מספר שדות | סטטוס |
|------|------|-----------|-------|
| `trainer_google_credentials` | OAuth Google Calendar | 10 | ✅ פעיל |
| `google_calendar_sync` | סנכרון אירועים | 13 | ✅ פעיל |
| `google_calendar_clients` | כרטיסיות לקוחות | 13 | ✅ פעיל |
| `trainees` (CRM fields) | מתאמנים מורחבים | +9 CRM fields | ✅ פעיל |
| `client_interactions` | אינטראקציות | 11 | ✅ פעיל |
| `crm_contracts` | חוזים | 9 | ✅ פעיל |
| `crm_payments` | תשלומים | 11 | ✅ פעיל |
| `crm_communication_templates` | תבניות תקשורת | 9 | ✅ פעיל |
| `crm_communication_messages` | הודעות | 10 | ✅ פעיל |
| `crm_documents` | מסמכים | 9 | ✅ פעיל |
| `crm_automation_rules` | כללי אוטומציה | 11 | ✅ פעיל |
| `crm_automation_tasks` | משימות אוטומציה | 9 | ✅ פעיל |
| `crm_segments` | קטעים | 7 | ✅ פעיל |
| `pipeline_movements` | מעקב Pipeline | 8 | ✅ פעיל |
| `audit_log` | יומן ביקורת | 10 | ✅ פעיל |
| `backup_log` | יומן גיבויים | 8 | ✅ פעיל |

**סה"כ: 16 טבלאות CRM** (+ שדות CRM ב-`trainees`)

---

### Indexes ו-Optimizations

המערכת כוללת **Indexes מותאמים** לביצועים:
- Composite indexes לשאילתות מורכבות
- Partial indexes לשדות עם תנאים
- Indexes על foreign keys
- Indexes על שדות תאריך למיון

**מיגרציות אופטימיזציה:**
- `20260128000008_add_performance_indexes_crm.sql`
- `20260129000000_optimize_crm_queries_performance.sql`
- `20260131000000_optimize_crm_analytics_queries.sql`

---

**סיום הדוח**
