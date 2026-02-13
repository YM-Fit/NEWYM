# Google Calendar Name & Session Sync - Testing Guide

## Overview
This guide will help you test the automatic synchronization of trainee names and workout session numbers with Google Calendar events.

## Prerequisites
1. Trainer account with Google Calendar connected
2. At least one trainee in the system
3. Some existing workout events synced to Google Calendar

## Test Scenarios

### 1. Test Name Change Synchronization

**Steps:**
1. Open a trainee's profile in edit mode
2. Note the current name and check Google Calendar for their events
3. Change the trainee's name (e.g., "אריאל" → "אריאל כהן")
4. Save the changes
5. Wait 5-10 seconds for the background sync to complete
6. Open Google Calendar and verify:
   - All current month events show the new name
   - All future events show the new name
   - Past events remain unchanged

**Expected Result:**
- Event titles update from "אימון - אריאל X/Y" to "אימון - אריאל כהן X/Y"
- Database trigger fires automatically
- Edge Function processes the sync in the background
- Success toast notification is not shown (background operation)

### 2. Test New Workout Session Number Update

**Steps:**
1. Select a trainee with existing calendar events
2. Create a new workout for this trainee
3. During save, the system should:
   - Create a new Google Calendar event
   - Include the correct session number in the title
   - Update ALL other events for this trainee with recalculated numbers

**Expected Result:**
- New event shows: "אימון - [שם] [מספר חדש]"
- Existing events in the same month update their position numbers
- If trainee has card tickets: "אימון - [שם] 6/10" (remaining/total)
- If no card: "אימון - [שם] 3/8" (position/total this month)

### 3. Test Manual Sync Button

**Steps:**
1. Edit a trainee's profile
2. If Google Calendar is connected, you should see "סנכרן עם יומן" button
3. Click the button
4. Observe the loading state
5. Wait for completion

**Expected Result:**
- Button shows spinner while syncing
- Toast notification shows result: "עודכנו X אירועים בהצלחה"
- If errors: "עודכנו X אירועים, Y נכשלו"
- Button re-enables after completion

### 4. Test Card Ticket vs Monthly Position

**Test with Card Ticket:**
1. Create a trainee with an active card (e.g., 10 sessions)
2. Mark 3 sessions as used
3. Create a new workout
4. Check Google Calendar event title

**Expected:** "אימון - [שם] 7/10" (7 remaining out of 10)

**Test without Card:**
1. Create a trainee without a card
2. Create multiple workouts in the current month
3. Check Google Calendar event titles

**Expected:** 
- First workout: "אימון - [שם] 1"
- Second workout: "אימון - [שם] 2/2"
- Third workout: "אימון - [שם] 3/3"

### 5. Test Scope Filters

The system updates events based on scope:

**Current Month + Future** (default for name changes):
- Updates all events from start of current month onwards
- Past months remain unchanged

**Current Month Only** (for workout saves):
- Only updates events in the current month
- Optimizes performance for frequent operations

## Database Verification

### Check Trigger is Active
```sql
SELECT * FROM pg_trigger 
WHERE tgname = 'trigger_sync_trainee_calendar_on_name_change';
```

### Check Sync Records
```sql
SELECT 
  t.full_name,
  gcs.event_summary,
  gcs.event_start_time,
  gcs.sync_status,
  gcs.last_synced_at
FROM google_calendar_sync gcs
JOIN trainees t ON t.id = gcs.trainee_id
WHERE gcs.trainer_id = '[YOUR_TRAINER_ID]'
ORDER BY gcs.event_start_time DESC
LIMIT 10;
```

### Check Google Credentials
```sql
SELECT 
  trainer_id,
  auto_sync_enabled,
  default_calendar_id,
  token_expires_at > NOW() as token_valid
FROM trainer_google_credentials
WHERE trainer_id = '[YOUR_TRAINER_ID]';
```

## Troubleshooting

### Sync Not Happening After Name Change
1. Check if pg_net extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```
2. Check Supabase settings are configured:
   ```sql
   SHOW app.supabase_url;
   ```
3. Check Edge Function logs in Supabase dashboard

### Event Titles Not Updating
1. Verify Google Calendar token is valid
2. Check sync status in `google_calendar_sync` table
3. Look for failed sync records with `sync_status = 'failed'`
4. Check Edge Function logs for errors

### Manual Sync Button Not Showing
1. Verify trainer has Google Calendar connected
2. Check console for JavaScript errors
3. Verify `trainer_google_credentials` table has a record for the trainer

### Session Numbers Incorrect
1. Verify trainee's `counting_method` field
2. Check if active card exists in `trainee_cards` table
3. Verify workout dates are in the correct month
4. Check `workout_trainees` links are correct

## Performance Notes

- Each name change triggers background sync (non-blocking)
- Workout saves trigger current month sync only
- Rate limiting: 100ms delay between event updates
- Maximum 5 bulk update requests per minute per trainer

## Security Notes

- Database trigger runs with SECURITY DEFINER
- Edge Function uses service role key
- Rate limiting prevents abuse
- OAuth tokens are automatically refreshed

## Success Criteria Checklist

- [ ] Name changes automatically update Google Calendar (current month + future)
- [ ] New workouts update all event session numbers in current month
- [ ] Manual sync button works and shows proper feedback
- [ ] Card ticket format shows correctly (X/Y remaining/total)
- [ ] Monthly position format shows correctly (X/Y position/total)
- [ ] Only authorized trainers can sync their trainees
- [ ] No errors in console or Edge Function logs
- [ ] Database triggers fire successfully
- [ ] Google Calendar events match expected format

## Support

If issues persist:
1. Check Supabase Edge Function logs
2. Review PostgreSQL logs for trigger errors
3. Verify Google Calendar API quota not exceeded
4. Ensure OAuth tokens are valid and not expired
