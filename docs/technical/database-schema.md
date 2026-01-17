# Database Schema Documentation

תיעוד מפורט של מבנה מסד הנתונים במערכת ה-CRM של NEWYM.

## סקירה כללית

מסד הנתונים מבוסס על **PostgreSQL** דרך **Supabase**, עם **Row Level Security (RLS)** לאבטחה.

## טבלאות CRM

### google_calendar_clients

כרטיסיות לקוחות שנוצרות מסנכרון Google Calendar.

**Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `trainee_id` | UUID | Foreign key → `trainees(id)` (nullable) |
| `google_client_identifier` | TEXT | Client identifier in Google Calendar (email or name) |
| `client_name` | TEXT | Full name of the client |
| `client_email` | TEXT | Email address (nullable) |
| `client_phone` | TEXT | Phone number (nullable) |
| `first_event_date` | DATE | Date of the first event with this client |
| `last_event_date` | DATE | Date of the most recent event |
| `total_events_count` | INT | Total number of events (default: 0) |
| `upcoming_events_count` | INT | Number of upcoming events (default: 0) |
| `completed_events_count` | INT | Number of completed events (default: 0) |
| `crm_data` | JSONB | Additional CRM data (default: '{}') |
| `created_at` | TIMESTAMPTZ | Timestamp when created |
| `updated_at` | TIMESTAMPTZ | Timestamp when last updated |

**Indexes**:
- `idx_calendar_clients_trainer` on `trainer_id`
- `idx_calendar_clients_trainee` on `trainee_id`
- `idx_calendar_clients_identifier` on `google_client_identifier`

**Constraints**:
- `UNIQUE(trainer_id, google_client_identifier)` - One client per trainer per identifier

**RLS Policy**:
- Trainers can manage their own calendar clients

**Example Query**:
```sql
SELECT * FROM google_calendar_clients
WHERE trainer_id = 'trainer-uuid'
ORDER BY last_event_date DESC;
```

### client_interactions

אינטראקציות עם לקוחות (שיחות, אימיילים, SMS, וכו').

**Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `trainee_id` | UUID | Foreign key → `trainees(id)` |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `interaction_type` | TEXT | Type: 'call', 'email', 'sms', 'meeting', 'workout', 'message', 'note' |
| `interaction_date` | TIMESTAMPTZ | Date and time of interaction (default: NOW()) |
| `subject` | TEXT | Subject/title (nullable) |
| `description` | TEXT | Detailed description (nullable) |
| `outcome` | TEXT | Outcome of interaction (nullable) |
| `next_action` | TEXT | Next action required (nullable) |
| `next_action_date` | DATE | Date for next action (nullable) |
| `google_event_id` | TEXT | Google Calendar event ID if linked (nullable) |
| `created_at` | TIMESTAMPTZ | Timestamp when created |

**Indexes**:
- `idx_client_interactions_trainee` on `(trainee_id, interaction_date DESC)`
- `idx_client_interactions_trainer` on `(trainer_id, interaction_date DESC)`

**Constraints**:
- `CHECK(interaction_type IN (...))` - Valid interaction types

**RLS Policy**:
- Trainers can manage interactions for their trainees

**Example Query**:
```sql
SELECT * FROM client_interactions
WHERE trainee_id = 'trainee-uuid'
ORDER BY interaction_date DESC;
```

### trainer_google_credentials

OAuth credentials ל-Google Calendar.

**Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` (UNIQUE) |
| `access_token` | TEXT | OAuth access token (should be encrypted) |
| `refresh_token` | TEXT | OAuth refresh token (should be encrypted) |
| `token_expires_at` | TIMESTAMPTZ | Token expiration timestamp |
| `primary_calendar_id` | TEXT | Primary calendar ID (nullable) |
| `default_calendar_id` | TEXT | Default calendar ID (nullable) |
| `auto_sync_enabled` | BOOLEAN | Enable auto sync (default: true) |
| `sync_frequency` | TEXT | Frequency: 'realtime', 'hourly', 'daily' (default: 'realtime') |
| `sync_direction` | TEXT | Direction: 'to_google', 'from_google', 'bidirectional' (nullable) |
| `created_at` | TIMESTAMPTZ | Timestamp when created |
| `updated_at` | TIMESTAMPTZ | Timestamp when last updated |

**Indexes**:
- `idx_google_credentials_trainer` on `trainer_id`

**Constraints**:
- `UNIQUE(trainer_id)` - One credential set per trainer
- `CHECK(sync_frequency IN (...))` - Valid sync frequencies

**RLS Policy**:
- Trainers can manage their own credentials

**Security Note**: Tokens should be encrypted using Supabase Vault in production.

### google_calendar_sync

מעקב אחר סנכרון אירועים בין המערכת ל-Google Calendar.

**Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `trainer_id` | UUID | Foreign key → `trainers(id)` |
| `trainee_id` | UUID | Foreign key → `trainees(id)` (nullable) |
| `workout_id` | UUID | Foreign key → `workouts(id)` (nullable) |
| `google_event_id` | TEXT | Google Calendar event ID |
| `google_calendar_id` | TEXT | Google Calendar ID |
| `sync_status` | TEXT | Status: 'synced', 'pending', 'failed', 'conflict' (default: 'synced') |
| `sync_direction` | TEXT | Direction: 'to_google', 'from_google', 'bidirectional' (default: 'bidirectional') |
| `last_synced_at` | TIMESTAMPTZ | Last sync timestamp (nullable) |
| `event_start_time` | TIMESTAMPTZ | Event start time |
| `event_end_time` | TIMESTAMPTZ | Event end time (nullable) |
| `event_summary` | TEXT | Event summary (nullable) |
| `event_description` | TEXT | Event description (nullable) |
| `conflict_resolution` | TEXT | Resolution: 'system_wins', 'google_wins', 'manual' (nullable) |
| `created_at` | TIMESTAMPTZ | Timestamp when created |
| `updated_at` | TIMESTAMPTZ | Timestamp when last updated |

**Indexes**:
- `idx_calendar_sync_trainer` on `trainer_id`
- `idx_calendar_sync_trainee` on `trainee_id`
- `idx_calendar_sync_workout` on `workout_id`
- `idx_calendar_sync_status` on `sync_status`
- `idx_calendar_sync_event_id` on `(google_event_id, google_calendar_id)`

**Constraints**:
- `UNIQUE(google_event_id, google_calendar_id)` - One sync per event
- `UNIQUE(workout_id)` - One sync per workout
- `CHECK(sync_status IN (...))` - Valid sync statuses

**RLS Policy**:
- Trainers can manage sync for their own data

## טבלאות מורחבות

### trainees (Extended with CRM fields)

הטבלה `trainees` הורחבה עם שדות CRM:

**Additional CRM Columns**:

| Column | Type | Description |
|--------|------|-------------|
| `google_calendar_client_id` | UUID | Foreign key → `google_calendar_clients(id)` (nullable) |
| `crm_status` | TEXT | Status: 'lead', 'qualified', 'active', 'inactive', 'churned', 'on_hold' (default: 'active') |
| `client_since` | DATE | Date when became client (default: CURRENT_DATE) |
| `last_contact_date` | TIMESTAMPTZ | Last contact date (nullable) |
| `next_followup_date` | DATE | Next follow-up date (nullable) |
| `contract_type` | TEXT | Type: 'monthly', 'package', 'session', 'trial' (nullable) |
| `contract_value` | DECIMAL(10,2) | Contract value (nullable) |
| `payment_status` | TEXT | Status: 'paid', 'pending', 'overdue', 'free' (default: 'pending') |
| `tags` | TEXT[] | Array of tags (nullable) |
| `notes_history` | JSONB | Notes history (default: '[]') |

**Indexes**:
- `idx_trainees_crm_status` on `crm_status`
- `idx_trainees_google_client` on `google_calendar_client_id`
- `idx_trainees_next_followup` on `next_followup_date` (WHERE next_followup_date IS NOT NULL)
- `idx_trainees_last_contact` on `last_contact_date DESC` (WHERE last_contact_date IS NOT NULL)

## Relationships

### Entity Relationship Diagram

```
trainers
  ├── trainer_google_credentials (1:1)
  ├── google_calendar_clients (1:N)
  ├── client_interactions (1:N)
  └── trainees (1:N)
      └── google_calendar_clients (1:1 via google_calendar_client_id)
      └── client_interactions (1:N)
      └── google_calendar_sync (1:N)
```

### Foreign Keys

- `google_calendar_clients.trainer_id` → `trainers.id`
- `google_calendar_clients.trainee_id` → `trainees.id`
- `client_interactions.trainee_id` → `trainees.id`
- `client_interactions.trainer_id` → `trainers.id`
- `trainer_google_credentials.trainer_id` → `trainers.id`
- `google_calendar_sync.trainer_id` → `trainers.id`
- `google_calendar_sync.trainee_id` → `trainees.id`
- `google_calendar_sync.workout_id` → `workouts.id`
- `trainees.google_calendar_client_id` → `google_calendar_clients.id`

## Triggers

### Auto-update `updated_at`

כל הטבלאות עם `updated_at` יש להן trigger שמעדכן את השדה אוטומטית:

```sql
CREATE TRIGGER update_google_calendar_clients_updated_at
  BEFORE UPDATE ON google_calendar_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_updated_at();
```

## Row Level Security (RLS)

כל הטבלאות מוגנות עם RLS policies:

### Policy Pattern

```sql
CREATE POLICY "Trainers can manage own data"
  ON table_name FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());
```

### Policies

- **trainer_google_credentials**: Trainers can manage own credentials
- **google_calendar_clients**: Trainers can manage own clients
- **client_interactions**: Trainers can manage interactions for own trainees
- **google_calendar_sync**: Trainers can manage sync for own data

## Indexes

### Performance Indexes

כל הטבלאות כוללות indexes לביצועים:

- **Primary keys**: UUID indexes
- **Foreign keys**: Indexes on foreign key columns
- **Query patterns**: Indexes on commonly queried columns
- **Composite indexes**: For complex queries

### Index Strategy

1. **Primary keys** - Always indexed
2. **Foreign keys** - Always indexed
3. **Frequently queried columns** - Indexed
4. **WHERE clauses** - Indexed
5. **ORDER BY clauses** - Indexed when possible

## Migrations

### Running Migrations

```bash
# Apply all migrations
npm run db:migrate

# Check database sync
npm run db:check
```

### Migration Files

Migrations are located in `supabase/migrations/`:

- `20260125000000_create_google_calendar_tables.sql` - Initial CRM tables
- `20260125000001_extend_trainees_crm.sql` - Extended trainees table
- `20260125000002_create_client_interactions.sql` - Client interactions table

## Best Practices

### 1. Always Use RLS

Never disable RLS. Always create policies for data access.

### 2. Index Foreign Keys

Always index foreign key columns for performance.

### 3. Use Appropriate Types

- Use `TIMESTAMPTZ` for timestamps (not `TIMESTAMP`)
- Use `TEXT` for strings (not `VARCHAR` without limit)
- Use `JSONB` for JSON data (not `JSON`)

### 4. Constraints

- Use `CHECK` constraints for enums
- Use `UNIQUE` constraints for unique values
- Use `NOT NULL` for required fields

### 5. Triggers

- Use triggers for `updated_at` timestamps
- Use triggers for data validation (if needed)

## Queries Examples

### Get all clients for a trainer

```sql
SELECT 
  c.*,
  t.full_name as trainee_name,
  COUNT(i.id) as interaction_count
FROM google_calendar_clients c
LEFT JOIN trainees t ON c.trainee_id = t.id
LEFT JOIN client_interactions i ON i.trainee_id = t.id
WHERE c.trainer_id = $1
GROUP BY c.id, t.id
ORDER BY c.last_event_date DESC;
```

### Get clients needing follow-up

```sql
SELECT 
  c.*,
  t.full_name,
  t.next_followup_date
FROM google_calendar_clients c
JOIN trainees t ON c.trainee_id = t.id
WHERE c.trainer_id = $1
  AND (
    t.next_followup_date < CURRENT_DATE
    OR (t.last_contact_date IS NULL AND c.created_at < NOW() - INTERVAL '30 days')
    OR (t.last_contact_date < NOW() - INTERVAL '30 days')
  )
ORDER BY t.next_followup_date ASC NULLS LAST;
```

### Get client statistics

```sql
SELECT 
  c.id,
  c.client_name,
  c.total_events_count,
  c.upcoming_events_count,
  c.completed_events_count,
  COUNT(DISTINCT i.id) as interaction_count,
  MAX(i.interaction_date) as last_interaction_date
FROM google_calendar_clients c
LEFT JOIN client_interactions i ON i.trainee_id = c.trainee_id
WHERE c.id = $1
GROUP BY c.id;
```

---

**עוד תיעוד**: [Edge Functions](./edge-functions.md) | [אינטגרציות](./integrations.md) | [תיעוד מפתחים](../developer/architecture.md)
