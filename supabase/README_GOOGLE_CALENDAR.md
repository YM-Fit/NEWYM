# Google Calendar Edge Functions - Environment Variables

## Required Secrets

Set these in Supabase Dashboard → Edge Functions → Settings → Secrets:

```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://vqvczpxmvrwfkecpwovc.supabase.co/functions/v1/google-oauth/callback
```

Replace `vqvczpxmvrwfkecpwovc` with your actual Supabase project reference ID.

## How to Set Secrets

1. Go to https://app.supabase.com/
2. Select your project
3. Navigate to: Settings → Edge Functions → Secrets
4. Click "Add secret" for each variable above
5. Redeploy the functions after adding secrets

## Functions That Use These Secrets

- `google-oauth` - OAuth flow initiation and callback
- `google-webhook` - Token refresh for webhooks
- `sync-google-calendar` - Token refresh for periodic sync
- `save-workout` - Token refresh when syncing workouts to Calendar
