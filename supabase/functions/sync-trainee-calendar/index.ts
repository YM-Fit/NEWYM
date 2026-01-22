import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Sync Trainee Calendar Edge Function
 * Updates Google Calendar events when trainee information changes
 */

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
    
    if (allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else if (originLower.includes("webcontainer") || originLower.includes("stackblitz") || originLower.includes("webcontainer-api")) {
      allowedOrigin = origin;
    } else if (originLower.includes("localhost") || originLower.startsWith("http://127.0.0.1") || originLower.startsWith("http://0.0.0.0")) {
      allowedOrigin = origin;
    } else {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
}

/**
 * Generate Google Calendar event title with session info
 * This is a simplified version that runs in the Edge Function
 */
async function generateEventTitle(
  supabase: any,
  traineeId: string,
  trainerId: string,
  eventDate: Date
): Promise<string> {
  try {
    // Get trainee info
    const { data: trainee, error: traineeError } = await supabase
      .from('trainees')
      .select('full_name, counting_method, card_sessions_total, card_sessions_used')
      .eq('id', traineeId)
      .eq('trainer_id', trainerId)
      .single();

    if (traineeError || !trainee) {
      console.error('Error fetching trainee:', traineeError);
      return 'אימון';
    }

    // Check for active card
    const { data: activeCard } = await supabase
      .from('trainee_cards')
      .select('sessions_purchased, sessions_used')
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .maybeSingle();

    let sessionText = '';

    // Use card format if available
    if (trainee.counting_method === 'card_ticket' && activeCard) {
      const remaining = (activeCard.sessions_purchased || 0) - (activeCard.sessions_used || 0);
      sessionText = `${remaining}/${activeCard.sessions_purchased}`;
    } else {
      // Calculate monthly position
      const eventMonth = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
      const startOfMonth = new Date(eventMonth.getFullYear(), eventMonth.getMonth(), 1);
      const endOfMonth = new Date(eventMonth.getFullYear(), eventMonth.getMonth() + 1, 0, 23, 59, 59);

      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, workout_date')
        .eq('trainer_id', trainerId)
        .gte('workout_date', startOfMonth.toISOString())
        .lte('workout_date', endOfMonth.toISOString())
        .order('workout_date', { ascending: true });

      if (workouts && workouts.length > 0) {
        const workoutIds = workouts.map((w: any) => w.id);
        const { data: links } = await supabase
          .from('workout_trainees')
          .select('workout_id')
          .eq('trainee_id', traineeId)
          .in('workout_id', workoutIds);

        const traineeWorkoutIds = new Set((links || []).map((l: any) => l.workout_id));
        const traineeWorkouts = workouts.filter((w: any) => traineeWorkoutIds.has(w.id));

        if (traineeWorkouts.length > 0) {
          const eventDateStr = eventDate.toISOString().split('T')[0];
          let position = 1;
          
          for (let i = 0; i < traineeWorkouts.length; i++) {
            const workoutDateStr = new Date(traineeWorkouts[i].workout_date).toISOString().split('T')[0];
            if (workoutDateStr === eventDateStr) {
              position = i + 1;
              break;
            }
            if (new Date(traineeWorkouts[i].workout_date) < eventDate) {
              position = i + 2;
            }
          }

          const totalInMonth = traineeWorkouts.length;
          sessionText = totalInMonth > 1 ? `${position}/${totalInMonth}` : `${position}`;
        }
      }
    }

    return sessionText ? `אימון - ${trainee.full_name} ${sessionText}` : `אימון - ${trainee.full_name}`;
  } catch (err) {
    console.error('Error generating event title:', err);
    return 'אימון';
  }
}

/**
 * Refresh Google OAuth token
 */
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

/**
 * Update a single Google Calendar event
 */
async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  summary: string
): Promise<boolean> {
  try {
    // Get existing event
    const getResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!getResponse.ok) {
      console.error(`Failed to get event ${eventId}:`, getResponse.status);
      return false;
    }

    const existingEvent = await getResponse.json();

    // Update with new summary
    const updatedEvent = { ...existingEvent, summary };

    const updateResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEvent),
      }
    );

    return updateResponse.ok;
  } catch (err) {
    console.error(`Error updating event ${eventId}:`, err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const { trainee_id, trainer_id, scope } = await req.json();

    if (!trainee_id || !trainer_id) {
      return new Response(
        JSON.stringify({ error: "Missing trainee_id or trainer_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if trainer has Google Calendar connected
    const { data: credentials, error: credError } = await supabase
      .from('trainer_google_credentials')
      .select('access_token, refresh_token, token_expires_at, default_calendar_id')
      .eq('trainer_id', trainer_id)
      .maybeSingle();

    if (credError || !credentials) {
      console.log('No Google Calendar credentials found for trainer:', trainer_id);
      return new Response(
        JSON.stringify({ error: "Google Calendar not connected", updated: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if token needs refresh
    let accessToken = credentials.access_token;
    const expiresAt = new Date(credentials.token_expires_at);
    
    if (expiresAt < new Date()) {
      console.log('Token expired, refreshing...');
      const newToken = await refreshGoogleToken(credentials.refresh_token, supabase, trainer_id);
      if (!newToken) {
        return new Response(
          JSON.stringify({ error: "Failed to refresh access token" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      accessToken = newToken;
    }

    // Determine date range based on scope
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (scope === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (scope === 'current_month_and_future') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear() + 2, 11, 31, 23, 59, 59);
    } else {
      // All events
      startDate = new Date(2020, 0, 1);
      endDate = new Date(now.getFullYear() + 2, 11, 31, 23, 59, 59);
    }

    // Get all synced events for this trainee in the date range
    const { data: syncRecords, error: syncError } = await supabase
      .from('google_calendar_sync')
      .select('id, google_event_id, event_start_time')
      .eq('trainer_id', trainer_id)
      .eq('trainee_id', trainee_id)
      .eq('sync_status', 'synced')
      .gte('event_start_time', startDate.toISOString())
      .lte('event_start_time', endDate.toISOString())
      .order('event_start_time', { ascending: true });

    if (syncError || !syncRecords || syncRecords.length === 0) {
      console.log('No synced events found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          updated: 0, 
          failed: 0,
          message: 'No events to sync'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const calendarId = credentials.default_calendar_id || 'primary';
    let updated = 0;
    let failed = 0;

    // Update each event
    for (const record of syncRecords) {
      try {
        const eventDate = new Date(record.event_start_time);
        const newTitle = await generateEventTitle(supabase, trainee_id, trainer_id, eventDate);

        const success = await updateGoogleCalendarEvent(
          accessToken,
          calendarId,
          record.google_event_id,
          newTitle
        );

        if (success) {
          updated++;
          // Update sync record
          await supabase
            .from('google_calendar_sync')
            .update({
              event_summary: newTitle,
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced'
            })
            .eq('id', record.id);
        } else {
          failed++;
          await supabase
            .from('google_calendar_sync')
            .update({ sync_status: 'failed' })
            .eq('id', record.id);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error processing event ${record.google_event_id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        failed,
        total: syncRecords.length,
        message: `Updated ${updated} events, ${failed} failed`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error in sync-trainee-calendar:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
