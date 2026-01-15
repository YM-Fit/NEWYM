import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Get CORS headers based on request origin
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [
    "http://localhost:5173",
    "http://localhost:3000",
  ];

  const allowedOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
  };
}

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-oauth/callback`;
const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Initiate OAuth flow
    if (req.method === "GET" && path.endsWith("/google-oauth")) {
      const trainerId = url.searchParams.get("trainer_id");

      if (!trainerId) {
        return new Response(
          JSON.stringify({ error: "Missing trainer_id parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!GOOGLE_CLIENT_ID) {
        return new Response(
          JSON.stringify({ error: "Google OAuth not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const state = btoa(JSON.stringify({ trainer_id: trainerId }));
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${GOOGLE_CALENDAR_SCOPES.join(" ")}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${state}`;

      return new Response(
        JSON.stringify({ authUrl }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // OAuth callback - Google redirects here with GET request
    if (req.method === "GET" && path.endsWith("/callback")) {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>שגיאה באימות</title></head><body><h1>שגיאה באימות Google Calendar</h1><p>${error}</p><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
          }
        );
      }

      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: "Missing code or state" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let trainerId: string;
      try {
        const stateData = JSON.parse(atob(state));
        trainerId = stateData.trainer_id;
      } catch (e) {
        // Fallback: state might be just the trainer ID
        trainerId = state;
      }

      if (!trainerId) {
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>שגיאה</title></head><body><h1>שגיאה: פרמטר state לא תקין</h1><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
          }
        );
      }

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>שגיאה</title></head><body><h1>Google OAuth לא מוגדר</h1><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
          }
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        console.error("Token exchange error:", error);
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>שגיאה</title></head><body><h1>שגיאה בהחלפת קוד לאימות</h1><p>${error.error || "Unknown error"}</p><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
          }
        );
      }

      const tokens = await tokenResponse.json();
      
      if (!tokens.access_token || !tokens.refresh_token) {
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>שגיאה</title></head><body><h1>לא התקבלו tokens תקינים</h1><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
          }
        );
      }

      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      // Get primary calendar ID
      const calendarResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      let primaryCalendarId = "primary";
      if (calendarResponse.ok) {
        const calendarList = await calendarResponse.json();
        const primary = calendarList.items?.find((cal: any) => cal.primary);
        if (primary) {
          primaryCalendarId = primary.id;
        }
      }

      // Save credentials to database using service role key
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const { error: saveError } = await supabase
        .from("trainer_google_credentials")
        .upsert({
          trainer_id: trainerId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          primary_calendar_id: primaryCalendarId,
          default_calendar_id: primaryCalendarId,
          auto_sync_enabled: true,
          sync_frequency: "realtime",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "trainer_id",
        });

      if (saveError) {
        console.error("Save credentials error:", saveError);
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>שגיאה</title></head><body><h1>שגיאה בשמירת פרטי אימות</h1><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
          }
        );
      }

      // Redirect back to app
      const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": `${appUrl}?google_calendar=connected`,
        },
      });
    }

    // Disconnect
    if (req.method === "POST" && path.endsWith("/disconnect")) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { trainer_id } = await req.json();
      if (trainer_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Trainer ID mismatch" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: deleteError } = await supabase
        .from("trainer_google_credentials")
        .delete()
        .eq("trainer_id", trainer_id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Failed to disconnect", details: deleteError }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in google-oauth:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
