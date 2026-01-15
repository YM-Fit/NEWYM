# Supabase Request Failed - Error Fix

## Problem
Multiple "Supabase request failed" errors appearing in the browser console, indicating repeated failed Supabase API requests.

## Changes Made

### 1. Enhanced Error Logging (`src/lib/supabase.ts`)
- Added helper functions `logSupabaseError()` and `handleSupabaseResponse()` for consistent error logging
- Improved error messages with context (table name, method, error codes, etc.)
- Better initialization error handling

### 2. Improved Query Hook (`src/hooks/useSupabaseQuery.ts`)
- Enhanced error logging in `useSupabaseQuery` hook
- Errors now include cache keys and full error details
- Better exception handling

### 3. Debug Utility (`src/utils/supabaseDebug.ts`)
- New utility to diagnose Supabase connection issues
- Automatically runs health check in development mode
- Checks environment variables and connection status
- Logs configuration (without exposing sensitive data)

### 4. App Integration (`src/App.tsx`)
- Imported debug utility to run automatically in development

## Next Steps to Diagnose

### 1. Check Browser Console
After refreshing the page, check the console for detailed error messages. The new logging will show:
- Which table/endpoint is failing
- The specific error code and message
- HTTP status codes
- Full error details

### 2. Verify Environment Variables
Make sure these are set in your `.env` file:
```bash
VITE_SUPABASE_URL=https://vqvczpxmvrwfkecpwovc.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Check Network Tab
1. Open browser DevTools → Network tab
2. Filter by "supabase" or "rest/v1"
3. Look for failed requests (red status)
4. Check the response body for error details

### 4. Common Causes

#### Missing/Invalid Environment Variables
- Check that `.env` file exists and has correct values
- Restart dev server after changing `.env`

#### Authentication Issues
- User session might be expired
- Check if user is properly authenticated
- Try logging out and back in

#### RLS (Row Level Security) Policies
- Requests might be blocked by RLS policies
- Check Supabase Dashboard → Authentication → Policies
- Verify policies allow the current user to access the data

#### Network/CORS Issues
- Check if Supabase URL is accessible
- Verify CORS settings in Supabase Dashboard
- Check for network connectivity issues

#### Rate Limiting
- Too many requests in short time
- Check Supabase Dashboard for rate limit errors

### 5. Use Debug Utility
In development mode, the debug utility will automatically:
- Check environment variables
- Test Supabase connection
- Log configuration details

You can also manually call it:
```typescript
import { runSupabaseHealthCheck } from './utils/supabaseDebug';
runSupabaseHealthCheck();
```

## What to Look For

The enhanced error logging will now show messages like:
```
[SupabaseClient] Supabase request failed: useSupabaseQuery
  - table: trainees
  - error: { message: "...", code: "...", details: "..." }
```

This will help identify:
- Which specific queries are failing
- What error codes are returned
- Which tables/endpoints have issues

## Additional Debugging

If errors persist, check:
1. **Supabase Dashboard Logs**: Check for server-side errors
2. **Browser Network Tab**: See actual HTTP responses
3. **Application State**: Check if user is authenticated
4. **Component State**: See which components are making requests

## Reporting Issues

When reporting issues, include:
- Full error messages from console (with new detailed logging)
- Network tab screenshots of failed requests
- Environment variable status (without exposing actual keys)
- Steps to reproduce
