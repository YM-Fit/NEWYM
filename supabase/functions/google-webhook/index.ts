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

      // Find trainer by calendar ID
      const { data: credentials, error: credError } = await supabase
        .from("trainer_google_credentials")
        .select("trainer_id, default_calendar_id")
        .eq("default_calendar_id", resourceUri?.split("/")?.pop() || "")
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

        // Only sync from Google if sync_direction is 'from_google' or 'bidirectional' and auto_sync is enabled
        if (creds && creds.auto_sync_enabled) {
          const shouldSyncFromGoogle = creds.sync_direction === 'from_google' || 
                                      creds.sync_direction === 'bidirectional';
          
          if (!shouldSyncFromGoogle) {
            // If sync direction is 'to_google' only, don't process webhook events from Google
            return new Response(
              JSON.stringify({ success: true, message: "Sync direction set to 'to_google' only, skipping webhook" }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }

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

        // Fetch events from calendar
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 7);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 7);

        const eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${creds.default_calendar_id}/events?` +
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
  for (const event of events) {
    // Check if event is already synced
    const { data: existingSync } = await supabase
      .from("google_calendar_sync")
      .select("workout_id, trainee_id")
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
    
    // If no email match, try name matching
    if (!traineeId && traineeName) {
      // First try exact match (case insensitive)
      const { data: exactMatch } = await supabase
        .from("trainees")
        .select("id")
        .eq("trainer_id", trainerId)
        .ilike("full_name", traineeName)
        .maybeSingle();
      
      if (exactMatch) {
        traineeId = exactMatch.id;
        console.log(`Matched trainee by exact name: ${traineeName} -> ${traineeId}`);
      } else {
        // Try partial match, but check for multiple matches
        const { data: partialMatches } = await supabase
          .from("trainees")
          .select("id, full_name")
          .eq("trainer_id", trainerId)
          .ilike("full_name", `%${traineeName}%`);
        
        if (partialMatches && partialMatches.length === 1) {
          traineeId = partialMatches[0].id;
          console.log(`Matched trainee by partial name: ${traineeName} -> ${traineeId}`);
        } else if (partialMatches && partialMatches.length > 1) {
          // Multiple matches found - don't auto-associate to avoid wrong match
          console.warn(
            `Multiple trainees found for name "${traineeName}": ${partialMatches.map(t => t.full_name).join(", ")}. ` +
            `Skipping auto-association to prevent incorrect matching.`
          );
          continue; // Skip this event to avoid wrong association
        }
      }
    }

    const startTime = new Date(event.start.dateTime || event.start.date);
    const endTime = new Date(event.end.dateTime || event.end.date);

    if (existingSync) {
      // Update existing workout
      if (existingSync.workout_id) {
        await supabase
          .from("workouts")
          .update({
            workout_date: startTime.toISOString().split("T")[0],
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
          .eq("id", existingSync.workout_id);
      }
    } else if (!event.status || event.status !== "cancelled") {
      // Create new workout
      // Mark as completed if the event date is in the past (event already happened)
      const isPastEvent = startTime < new Date();
      if (traineeId) {
        const { data: newWorkout } = await supabase
          .from("workouts")
          .insert({
            trainer_id: trainerId,
            workout_type: "personal",
            workout_date: startTime.toISOString().split("T")[0],
            notes: event.description || null,
            is_completed: isPastEvent,
          })
          .select()
          .single();

        if (newWorkout) {
          await supabase
            .from("workout_trainees")
            .insert({
              workout_id: newWorkout.id,
              trainee_id: traineeId,
            });

          // Use user's preferred sync direction
          const recordSyncDirection = syncDirection === 'bidirectional' 
            ? 'bidirectional' 
            : 'from_google';
          
          await supabase
            .from("google_calendar_sync")
            .insert({
              trainer_id: trainerId,
              trainee_id: traineeId,
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

          // Update or create calendar client
          await updateCalendarClient(trainerId, traineeId, event, supabase);
        }
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
    .select("id, total_events_count, trainee_id")
    .eq("trainer_id", trainerId)
    .eq("google_client_identifier", clientIdentifier)
    .maybeSingle();

  const eventDate = new Date(event.start.dateTime || event.start.date);
  const isUpcoming = eventDate >= new Date();

  if (existingClient) {
    // Update client stats and trainee_id if:
    // 1. traineeId is provided and existing client has no trainee_id, OR
    // 2. traineeId is provided and we want to update it
    const updateData: any = {
      last_event_date: eventDate.toISOString().split("T")[0],
      total_events_count: (existingClient.total_events_count || 0) + 1,
      upcoming_events_count: isUpcoming
        ? (existingClient.upcoming_events_count || 0) + 1
        : existingClient.upcoming_events_count || 0,
      updated_at: new Date().toISOString(),
    };

    // Only update trainee_id if:
    // - We have a traineeId to link, AND
    // - Either the client has no trainee_id OR we want to update it
    if (traineeId && (!existingClient.trainee_id || existingClient.trainee_id !== traineeId)) {
      updateData.trainee_id = traineeId;
    }

    await supabase
      .from("google_calendar_clients")
      .update(updateData)
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
