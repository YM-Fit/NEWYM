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
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle GET request for webhook verification (Google Calendar Push notifications)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const challenge = url.searchParams.get("challenge");
      
      if (challenge) {
        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }

    // Handle POST request for webhook notifications
    if (req.method === "POST") {
      const notification = await req.json();
      
      // Process notification headers (from Google Calendar)
      const channelId = req.headers.get("X-Goog-Channel-Id");
      const resourceId = req.headers.get("X-Goog-Resource-Id");
      const resourceState = req.headers.get("X-Goog-Resource-State");
      const resourceUri = req.headers.get("X-Goog-Resource-URI");

      if (!resourceState) {
        return new Response(
          JSON.stringify({ error: "Missing resource state" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let extractedCalendarId = "";
      if (resourceUri) {
        const match = resourceUri.match(/\/calendars\/([^/]+)/);
        if (match) {
          extractedCalendarId = decodeURIComponent(match[1]);
        }
      }

      const { data: credentials, error: credError } = await supabase
        .from("trainer_google_credentials")
        .select("trainer_id, default_calendar_id")
        .eq("default_calendar_id", extractedCalendarId)
        .maybeSingle();

      if (credError || !credentials) {
        console.error("Could not find trainer for calendar:", resourceUri);
        return new Response(
          JSON.stringify({ error: "Trainer not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get calendar events that changed
      if (resourceState === "exists") {
        // Fetch the changed event from Google Calendar
        const { data: creds, error: fetchCredError } = await supabase
          .from("trainer_google_credentials")
          .select("access_token, refresh_token, token_expires_at, default_calendar_id, sync_direction, auto_sync_enabled")
          .eq("trainer_id", credentials.trainer_id)
          .single();

        // For sync_direction 'to_google': still process DELETIONS (if user deleted in Google, delete locally)
        // For create/update: only process when sync_direction is 'from_google' or 'bidirectional'
        // Early return removed - we always process to handle deletions

        if (fetchCredError || !creds) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch credentials" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Refresh token if needed
        let accessToken = creds.access_token;
        if (new Date(creds.token_expires_at) < new Date()) {
          // Token expired, refresh it
          const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
              client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
              refresh_token: creds.refresh_token,
              grant_type: "refresh_token",
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;
            
            await supabase
              .from("trainer_google_credentials")
              .update({
                access_token: refreshData.access_token,
                token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
              })
              .eq("trainer_id", credentials.trainer_id);
          }
        }

        // Fetch events from calendar - 30 days back and 30 days forward
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30);

        const eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(creds.default_calendar_id)}/events?` +
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

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          await processCalendarEvents(
            eventsData.items || [], 
            credentials.trainer_id, 
            supabase,
            creds?.sync_direction || 'bidirectional'
          );
        }
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
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in google-webhook:", error);
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

async function processCalendarEvents(
  events: any[],
  trainerId: string,
  supabase: any,
  syncDirection: 'to_google' | 'from_google' | 'bidirectional' = 'bidirectional'
) {
  // Track which event IDs exist in Google Calendar (for cleanup)
  const existingEventIds = new Set<string>();
  const calendarId = events.length > 0 ? (events[0].organizer?.email || "primary") : "primary";
  
  // Calculate time window for cleanup - 30 days back and 30 days forward
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);
  
  for (const event of events) {
    // Handle cancelled events - delete their sync records
    if (event.status === "cancelled") {
      const { data: cancelledSync } = await supabase
        .from("google_calendar_sync")
        .select("id, workout_id, sync_direction")
        .eq("google_event_id", event.id)
        .eq("google_calendar_id", event.organizer?.email || "primary")
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
    
    // Check if event is already synced
    const { data: existingSync } = await supabase
      .from("google_calendar_sync")
      .select("id, workout_id, trainee_id")
      .eq("google_event_id", event.id)
      .eq("google_calendar_id", event.organizer?.email || "primary")
      .maybeSingle();

    // Extract trainee name and email from event
    const traineeName = extractTraineeName(event);
    const traineeEmail = extractEmail(event);
    
    if (!traineeName && !traineeEmail) continue;

    // Find trainee with improved matching logic
    let traineeId: string | null = null;
    
    // First, try to match by email (most accurate)
    if (traineeEmail) {
      const { data: traineeByEmail } = await supabase
        .from("trainees")
        .select("id")
        .eq("trainer_id", trainerId)
        .eq("email", traineeEmail)
        .maybeSingle();
      
      if (traineeByEmail) {
        traineeId = traineeByEmail.id;
        console.log(`Matched trainee by email: ${traineeEmail} -> ${traineeId}`);
      }
    }
    
    // If no email match, try name matching (supports "משה ורינה" - multiple names)
    const traineeIdsToUse: string[] = [];
    if (traineeId) {
      traineeIdsToUse.push(traineeId);
    } else if (traineeName) {
      // Split by " ו " or "ו" or "," for multiple names (e.g. "משה ורינה" -> ["משה", "רינה"])
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
    const effectiveTraineeIds = traineeIdsToUse.length > 0 ? traineeIdsToUse : (traineeId ? [traineeId] : []);

    const startTime = new Date(event.start.dateTime || event.start.date);
    const endTime = new Date(event.end.dateTime || event.end.date);

    if (existingSync) {
      // Update existing workout
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
      }
    } else if (!event.status || event.status !== "cancelled") {
      // Create new workout (supports multiple trainees per event, e.g. "משה ורינה")
      if (effectiveTraineeIds.length > 0) {
        // IMPORTANT: workout_date is timestamptz, so we need to preserve the full timestamp
        const { data: newWorkout } = await supabase
          .from("workouts")
          .insert({
            trainer_id: trainerId,
            workout_type: "personal",
            workout_date: startTime.toISOString(),
            notes: event.description || null,
            is_completed: false,
            is_prepared: false,
          })
          .select()
          .single();

        if (newWorkout) {
          for (const tid of effectiveTraineeIds) {
            await supabase
              .from("workout_trainees")
              .insert({ workout_id: newWorkout.id, trainee_id: tid });
          }

          const recordSyncDirection = syncDirection === 'bidirectional' ? 'bidirectional' : 'from_google';
          // One sync record per trainee (google_calendar_sync has UNIQUE(workout_id) - need to check)
          const primaryTraineeId = effectiveTraineeIds[0];
          await supabase
            .from("google_calendar_sync")
            .insert({
              trainer_id: trainerId,
              trainee_id: primaryTraineeId,
              workout_id: newWorkout.id,
              google_event_id: event.id,
              google_calendar_id: event.organizer?.email || "primary",
              sync_status: "synced",
              sync_direction: recordSyncDirection,
              event_start_time: startTime.toISOString(),
              event_end_time: endTime.toISOString(),
              event_summary: event.summary,
              event_description: event.description,
              last_synced_at: new Date().toISOString(),
            });

          await updateCalendarClient(trainerId, primaryTraineeId, event, supabase);
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
}

function extractTraineeName(event: any): string | null {
  // Try to extract from summary
  if (event.summary) {
    // Look for patterns like "אימון - שם המתאמן"
    const match = event.summary.match(/אימון\s*[-–]\s*(.+)/i);
    if (match) return match[1].trim();
    return event.summary.trim();
  }

  // Try attendees
  if (event.attendees && event.attendees.length > 0) {
    const attendee = event.attendees.find((a: any) => !a.organizer);
    if (attendee && attendee.email) {
      return attendee.email.split("@")[0];
    }
  }

  return null;
}

async function updateCalendarClient(
  trainerId: string,
  traineeId: string | null,
  event: any,
  supabase: any
) {
  const clientIdentifier = extractClientIdentifier(event);
  if (!clientIdentifier) return;

  const { data: existingClient } = await supabase
    .from("google_calendar_clients")
    .select("id, total_events_count")
    .eq("trainer_id", trainerId)
    .eq("google_client_identifier", clientIdentifier)
    .maybeSingle();

  const eventDate = new Date(event.start.dateTime || event.start.date);
  const isUpcoming = eventDate >= new Date();

  if (existingClient) {
    await supabase
      .from("google_calendar_clients")
      .update({
        last_event_date: eventDate.toISOString().split("T")[0],
        total_events_count: (existingClient.total_events_count || 0) + 1,
        upcoming_events_count: isUpcoming
          ? (existingClient.upcoming_events_count || 0) + 1
          : existingClient.upcoming_events_count || 0,
        trainee_id: traineeId || existingClient.trainee_id,
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
