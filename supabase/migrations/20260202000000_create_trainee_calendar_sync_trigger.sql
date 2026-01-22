/*
  # Create Trainee Calendar Sync Trigger
  
  Creates a trigger that automatically syncs trainee name changes to Google Calendar events.
  When a trainee's name is updated, it triggers the Edge Function to update all calendar events.
  
  1. New Function
    - `sync_trainee_calendar_on_name_change()` - Trigger function
  
  2. Trigger
    - Fires AFTER UPDATE on trainees table
    - Only when full_name changes
    - Calls Edge Function asynchronously via pg_net
*/

-- Enable pg_net extension if not already enabled (for HTTP requests from triggers)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to sync calendar when trainee name changes
CREATE OR REPLACE FUNCTION sync_trainee_calendar_on_name_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url text;
  supabase_anon_key text;
  request_id bigint;
BEGIN
  -- Only sync if name changed
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    -- Get Supabase URL from app settings (should be set via ALTER DATABASE)
    -- Fallback to environment if not set
    BEGIN
      SELECT current_setting('app.supabase_url', true) INTO supabase_url;
      SELECT current_setting('app.supabase_anon_key', true) INTO supabase_anon_key;
    EXCEPTION WHEN OTHERS THEN
      -- If settings not available, log and skip
      RAISE WARNING 'Supabase settings not configured for calendar sync';
      RETURN NEW;
    END;

    -- Only proceed if we have the URL configured
    IF supabase_url IS NOT NULL AND supabase_url != '' THEN
      -- Call Edge Function asynchronously via pg_net
      -- This is fire-and-forget, won't block the UPDATE
      SELECT extensions.pg_net.http_post(
        url := supabase_url || '/functions/v1/sync-trainee-calendar',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(supabase_anon_key, '')
        ),
        body := jsonb_build_object(
          'trainee_id', NEW.id::text,
          'trainer_id', NEW.trainer_id::text,
          'scope', 'current_month_and_future',
          'trigger', 'name_change'
        )
      ) INTO request_id;
      
      -- Log the request (optional, for debugging)
      RAISE LOG 'Calendar sync triggered for trainee % (request_id: %)', NEW.id, request_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_trainee_calendar_on_name_change ON trainees;

CREATE TRIGGER trigger_sync_trainee_calendar_on_name_change
  AFTER UPDATE ON trainees
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION sync_trainee_calendar_on_name_change();

-- Comment on the function
COMMENT ON FUNCTION sync_trainee_calendar_on_name_change() IS 
  'Automatically syncs trainee name changes to Google Calendar events via Edge Function';

-- Comment on the trigger
COMMENT ON TRIGGER trigger_sync_trainee_calendar_on_name_change ON trainees IS
  'Fires when trainee name changes to sync with Google Calendar';
