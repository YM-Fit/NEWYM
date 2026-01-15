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

async function refreshGoogleToken(
  refreshToken: string,
  supabase: any,
  trainerId: string
): Promise<string | null> {
  const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshResponse.ok) {
    console.error("Failed to refresh token");
    return null;
  }

  const refreshData = await refreshResponse.json();
  const newAccessToken = refreshData.access_token;
  const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

  await supabase
    .from("trainer_google_credentials")
    .update({
      access_token: newAccessToken,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq("trainer_id", trainerId);

  return newAccessToken;
}

async function syncTrainerCalendar(
  trainerId: string,
  supabase: any
): Promise<void> {
  // Get trainer credentials
  const { data: credentials, error: credError } = await supabase
    .from("trainer_google_credentials")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("auto_sync_enabled", true)
    .single();

  if (credError || !credentials) {
    throw new Error("No sync credentials found");
  }

  // Check and refresh token if needed
  let accessToken = credentials.access_token;
  if (new Date(credentials.token_expires_at) < new Date()) {
    const refreshed = await refreshGoogleToken(
      credentials.refresh_token,
      supabase,
      trainerId
    );
    if (!refreshed) {
      throw new Error("Failed to refresh token");
    }
    accessToken = refreshed;
  }

  // Fetch events from Google Calendar
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 7);

  const calendarId = credentials.default_calendar_id || "primary";
  const eventsResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
    `timeMin=${timeMin.toISOString()}&` +
    `timeMax=${timeMax.toISOString()}&` +
    `singleEvents=true&` +
    `orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!eventsResponse.ok) {
    throw new Error("Failed to fetch calendar events");
  }

  const eventsData = await eventsResponse.json();
  const events = eventsData.items || [];

  // Process each event
  for (const event of events) {
    if (event.status === "cancelled") continue;

    const startTime = new Date(event.start.dateTime || event.start.date);
    const endTime = new Date(event.end.dateTime || event.end.date);

    // Check if already synced
    const { data: existingSync } = await supabase
      .from("google_calendar_sync")
      .select("workout_id, trainee_id")
      .eq("google_event_id", event.id)
      .eq("google_calendar_id", calendarId)
      .maybeSingle();

    // Extract trainee information
    const traineeName = extractTraineeName(event);
    if (!traineeName) continue;

    // Find trainee
    const { data: trainee } = await supabase
      .from("trainees")
      .select("id")
      .eq("trainer_id", trainerId)
      .ilike("full_name", `%${traineeName}%`)
      .maybeSingle();

    if (!trainee) continue;

    if (existingSync) {
      // Update existing sync record
      await supabase
        .from("google_calendar_sync")
        .update({
          event_start_time: startTime.toISOString(),
          event_end_time: endTime.toISOString(),
          event_summary: event.summary,
          event_description: event.description,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", existingSync.id);

      // Update workout if exists
      if (existingSync.workout_id) {
        await supabase
          .from("workouts")
          .update({
            workout_date: startTime.toISOString().split("T")[0],
            notes: event.description || null,
          })
          .eq("id", existingSync.workout_id);
      }
    } else {
      // Create new workout and sync record
      const { data: newWorkout } = await supabase
        .from("workouts")
        .insert({
          trainer_id: trainerId,
          workout_type: "personal",
          workout_date: startTime.toISOString().split("T")[0],
          notes: event.description || null,
          is_completed: false,
        })
        .select()
        .single();

      if (newWorkout) {
        await supabase
          .from("workout_trainees")
          .insert({
            workout_id: newWorkout.id,
            trainee_id: trainee.id,
          });

        await supabase
          .from("google_calendar_sync")
          .insert({
            trainer_id: trainerId,
            trainee_id: trainee.id,
            workout_id: newWorkout.id,
            google_event_id: event.id,
            google_calendar_id: calendarId,
            sync_status: "synced",
            sync_direction: "from_google",
            event_start_time: startTime.toISOString(),
            event_end_time: endTime.toISOString(),
            event_summary: event.summary,
            event_description: event.description,
            last_synced_at: new Date().toISOString(),
          });

        // Update calendar client stats
        await updateCalendarClientStats(trainerId, trainee.id, event, supabase);
      }
    }
  }

  // Update calendar client statistics
  await updateAllClientStats(trainerId, supabase);
}

async function updateCalendarClientStats(
  trainerId: string,
  traineeId: string,
  event: any,
  supabase: any
) {
  const clientIdentifier = extractClientIdentifier(event);
  if (!clientIdentifier) return;

  const eventDate = new Date(event.start.dateTime || event.start.date);
  const isUpcoming = eventDate >= new Date();

  const { data: existingClient } = await supabase
    .from("google_calendar_clients")
    .select("id, total_events_count")
    .eq("trainer_id", trainerId)
    .eq("google_client_identifier", clientIdentifier)
    .maybeSingle();

  if (existingClient) {
    await supabase
      .from("google_calendar_clients")
      .update({
        last_event_date: eventDate.toISOString().split("T")[0],
        total_events_count: (existingClient.total_events_count || 0) + 1,
        upcoming_events_count: isUpcoming
          ? (existingClient.upcoming_events_count || 0) + 1
          : existingClient.upcoming_events_count || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingClient.id);
  } else {
    await supabase
      .from("google_calendar_clients")
      .insert({
        trainer_id: trainerId,
        trainee_id: traineeId,
        google_client_identifier: clientIdentifier,
        client_name: event.summary || clientIdentifier,
        client_email: extractEmail(event),
        first_event_date: eventDate.toISOString().split("T")[0],
        last_event_date: eventDate.toISOString().split("T")[0],
        total_events_count: 1,
        upcoming_events_count: isUpcoming ? 1 : 0,
        completed_events_count: isUpcoming ? 0 : 1,
      });
  }
}

async function updateAllClientStats(trainerId: string, supabase: any) {
  // Get all clients for trainer
  const { data: clients } = await supabase
    .from("google_calendar_clients")
    .select("id")
    .eq("trainer_id", trainerId);

  if (!clients) return;

  // Update stats for each client based on sync records
  for (const client of clients) {
    const now = new Date();
    const { data: syncs } = await supabase
      .from("google_calendar_sync")
      .select("event_start_time")
      .eq("trainer_id", trainerId)
      .eq("sync_status", "synced");

    if (!syncs) continue;

    const upcoming = syncs.filter(
      (s) => new Date(s.event_start_time) >= now
    ).length;
    const completed = syncs.filter(
      (s) => new Date(s.event_start_time) < now
    ).length;

    await supabase
      .from("google_calendar_clients")
      .update({
        total_events_count: syncs.length,
        upcoming_events_count: upcoming,
        completed_events_count: completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);
  }
}

function extractTraineeName(event: any): string | null {
  if (event.summary) {
    const match = event.summary.match(/אימון\s*[-–]\s*(.+)/i);
    if (match) return match[1].trim();
    return event.summary.trim();
  }
  if (event.attendees && event.attendees.length > 0) {
    const attendee = event.attendees.find((a: any) => !a.organizer);
    if (attendee) {
      return attendee.displayName || attendee.email?.split("@")[0] || null;
    }
  }
  return null;
}

function extractClientIdentifier(event: any): string | null {
  if (event.attendees && event.attendees.length > 0) {
    const attendee = event.attendees.find((a: any) => !a.organizer);
    if (attendee) {
      return attendee.email || attendee.displayName || null;
    }
  }
  return event.summary || null;
}

function extractEmail(event: any): string | null {
  if (event.attendees && event.attendees.length > 0) {
    const attendee = event.attendees.find((a: any) => !a.organizer);
    return attendee?.email || null;
  }
  return null;
}

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

    // Manual sync endpoint
    if (req.method === "POST" && path.endsWith("/sync-google-calendar")) {
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

      try {
        await syncTrainerCalendar(trainer_id, supabase);
        return new Response(
          JSON.stringify({ success: true }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: error.message || "Sync failed" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Periodic sync endpoint (for cron jobs)
    if (req.method === "POST" && path.endsWith("/periodic")) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Get all trainers with auto sync enabled
      const { data: trainers } = await supabase
        .from("trainer_google_credentials")
        .select("trainer_id")
        .eq("auto_sync_enabled", true);

      if (!trainers) {
        return new Response(
          JSON.stringify({ success: true, synced: 0 }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let synced = 0;
      for (const trainer of trainers) {
        try {
          await syncTrainerCalendar(trainer.trainer_id, supabase);
          synced++;
        } catch (error) {
          console.error(`Failed to sync for trainer ${trainer.trainer_id}:`, error);
        }
      }

      return new Response(
        JSON.stringify({ success: true, synced }),
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
    console.error("Error in sync-google-calendar:", error);
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
