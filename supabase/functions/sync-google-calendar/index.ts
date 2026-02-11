import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Get CORS headers based on request origin
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map(o => o.trim()) || [
    "http://localhost:5173",
    "http://localhost:3000",
  ];

  let allowedOrigin: string = allowedOrigins[0] || "*";

  if (origin) {
    const originLower = origin.toLowerCase();
    
    // Check if origin is in allowed list (exact match)
    if (allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } 
    // Allow StackBlitz/WebContainer origins (case-insensitive check)
    else if (originLower.includes("webcontainer") || originLower.includes("stackblitz") || originLower.includes("webcontainer-api")) {
      allowedOrigin = origin;
    }
    // Allow localhost variations
    else if (originLower.includes("localhost") || originLower.startsWith("http://127.0.0.1") || originLower.startsWith("http://0.0.0.0")) {
      allowedOrigin = origin;
    }
    // If no match but origin exists, use it (more permissive for development)
    else {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
    "Cross-Origin-Resource-Policy": "cross-origin",
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

  // Process all events (create, update, delete) - user's calendar should be source of truth
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

  // Fetch events from Google Calendar - 30 days back and 30 days forward
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  const calendarId = credentials.default_calendar_id || "primary";
  const eventsResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
    `timeMin=${timeMin.toISOString()}&` +
    `timeMax=${timeMax.toISOString()}&` +
    `singleEvents=true&` +
    `showDeleted=true&` +
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
  
  // Track which event IDs exist in Google Calendar (for cleanup later)
  const existingEventIds = new Set<string>();

  // Process each event
  for (const event of events) {
    // Handle cancelled events - delete their sync records
    if (event.status === "cancelled") {
      const { data: cancelledSync } = await supabase
        .from("google_calendar_sync")
        .select("id, workout_id, sync_direction")
        .eq("google_event_id", event.id)
        .eq("google_calendar_id", calendarId)
        .maybeSingle();
      
      if (cancelledSync) {
        // Always delete workout when deleted from Google - no need to keep if user deleted there
        if (cancelledSync.workout_id) {
          await supabase
            .from("workouts")
            .delete()
            .eq("id", cancelledSync.workout_id)
            .eq("trainer_id", trainerId);
        }
        
        // Delete sync record
        await supabase
          .from("google_calendar_sync")
          .delete()
          .eq("id", cancelledSync.id);
        
        console.log(`Deleted sync record for cancelled event: ${event.id}`);
      }
      continue;
    }
    
    // Track this event as existing
    existingEventIds.add(event.id);

    // Process create/update for all sync directions - events in Google should appear in app
    const startTime = new Date(event.start.dateTime || event.start.date);
    const endTime = new Date(event.end.dateTime || event.end.date);

    // Check if already synced
    const { data: existingSync } = await supabase
      .from("google_calendar_sync")
      .select("id, workout_id, trainee_id")
      .eq("google_event_id", event.id)
      .eq("google_calendar_id", calendarId)
      .maybeSingle();

    // Extract trainee information
    const traineeName = extractTraineeName(event);
    const traineeEmail = extractEmail(event);
    
    if (!traineeName && !traineeEmail) continue;

    // Find trainee with improved matching logic
    let trainee: { id: string } | null = null;
    
    // First, try to match by email (most accurate)
    if (traineeEmail) {
      const { data: traineeByEmail } = await supabase
        .from("trainees")
        .select("id")
        .eq("trainer_id", trainerId)
        .eq("email", traineeEmail)
        .maybeSingle();
      
      if (traineeByEmail) {
        trainee = traineeByEmail;
        console.log(`Matched trainee by email: ${traineeEmail} -> ${trainee.id}`);
      }
    }
    
    // If no email match, try name matching (supports "משה ורינה" - multiple names)
    const traineeIdsToUse: string[] = [];
    if (trainee) {
      traineeIdsToUse.push(trainee.id);
    } else if (traineeName) {
      const nameParts = traineeName.split(/\s+ו\s+|\s*ו\s*|\s*,\s*/).map((n: string) => n.trim()).filter(Boolean);
      for (const part of nameParts) {
        const { data: exactMatch } = await supabase
          .from("trainees")
          .select("id")
          .eq("trainer_id", trainerId)
          .ilike("full_name", part)
          .maybeSingle();
        if (exactMatch) {
          if (!traineeIdsToUse.includes(exactMatch.id)) traineeIdsToUse.push(exactMatch.id);
        } else {
          const { data: partialMatches } = await supabase
            .from("trainees")
            .select("id, full_name")
            .eq("trainer_id", trainerId)
            .ilike("full_name", `%${part}%`);
          if (partialMatches && partialMatches.length === 1 && !traineeIdsToUse.includes(partialMatches[0].id)) {
            traineeIdsToUse.push(partialMatches[0].id);
          } else if (partialMatches && partialMatches.length > 1) {
            console.warn(`Multiple trainees for "${part}", skipping`);
          }
        }
      }
    }

    if (traineeIdsToUse.length === 0) continue;

    const primaryTrainee = { id: traineeIdsToUse[0] };

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
        // IMPORTANT: workout_date is timestamptz, so we need to preserve the full timestamp
        // Use the exact startTime from Google Calendar event to maintain consistency
        await supabase
          .from("workouts")
          .update({
            workout_date: startTime.toISOString(), // Full timestamp, not just date
            notes: event.description || null,
          })
          .eq("id", existingSync.workout_id);
      }
    } else {
      // Re-check for existing sync before create (prevents race with webhook or another sync)
      const { data: recheckSync } = await supabase
        .from("google_calendar_sync")
        .select("id, workout_id, trainee_id")
        .eq("google_event_id", event.id)
        .eq("google_calendar_id", calendarId)
        .maybeSingle();
      if (recheckSync) {
        // Another process created it - treat as update
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
          .eq("id", recheckSync.id);
        if (recheckSync.workout_id) {
          await supabase
            .from("workouts")
            .update({
              workout_date: startTime.toISOString(),
              notes: event.description || null,
            })
            .eq("id", recheckSync.workout_id);
        }
        continue;
      }

      // Create new workout and sync record
      const { data: newWorkout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          trainer_id: trainerId,
          workout_type: "personal",
          workout_date: startTime.toISOString(),
          notes: event.description || null,
          is_completed: false,
        })
        .select()
        .single();

      if (workoutError) {
        console.warn("sync-google-calendar: workout insert failed", workoutError.message);
        continue;
      }
      if (newWorkout) {
        for (const tid of traineeIdsToUse) {
          await supabase
            .from("workout_trainees")
            .insert({ workout_id: newWorkout.id, trainee_id: tid });
        }

        const syncDirection = credentials.sync_direction === 'bidirectional' ? 'bidirectional' : 'from_google';
        const { error: syncInsertError } = await supabase
          .from("google_calendar_sync")
          .insert({
            trainer_id: trainerId,
            trainee_id: primaryTrainee.id,
            workout_id: newWorkout.id,
            google_event_id: event.id,
            google_calendar_id: calendarId,
            sync_status: "synced",
            sync_direction: syncDirection,
            event_start_time: startTime.toISOString(),
            event_end_time: endTime.toISOString(),
            event_summary: event.summary,
            event_description: event.description,
            last_synced_at: new Date().toISOString(),
          });
        if (syncInsertError) {
          if (syncInsertError.code === "23505") {
            console.log("sync-google-calendar: sync record already exists for event (race), skipping");
          } else {
            console.warn("sync-google-calendar: sync insert failed", syncInsertError.message);
          }
        } else {
          await updateCalendarClientStats(trainerId, primaryTrainee.id, event, supabase);
        }
      }
    }
  }

  // Cleanup: Delete sync records for events that no longer exist in Google Calendar
  // (within the time window we're syncing)
  const { data: allSyncRecords } = await supabase
    .from("google_calendar_sync")
    .select("id, google_event_id, workout_id, sync_direction")
    .eq("trainer_id", trainerId)
    .eq("google_calendar_id", calendarId)
    .gte("event_start_time", timeMin.toISOString())
    .lte("event_start_time", timeMax.toISOString());

  if (allSyncRecords) {
    for (const syncRecord of allSyncRecords) {
      // If this sync record's event doesn't exist in Google Calendar, delete it
      if (!existingEventIds.has(syncRecord.google_event_id)) {
        console.log(`Deleting sync record for event that no longer exists: ${syncRecord.google_event_id}`);
        
        // Always delete workout when deleted from Google - no need to keep if user deleted there
        if (syncRecord.workout_id) {
          await supabase
            .from("workouts")
            .delete()
            .eq("id", syncRecord.workout_id)
            .eq("trainer_id", trainerId);
        }
        
        // Delete sync record
        await supabase
          .from("google_calendar_sync")
          .delete()
          .eq("id", syncRecord.id);
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
