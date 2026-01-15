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

interface SetData {
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  set_type: 'regular' | 'superset' | 'dropset';
  failure?: boolean;
  superset_exercise_id?: string | null;
  superset_weight?: number | null;
  superset_reps?: number | null;
  superset_rpe?: number | null;
  superset_equipment_id?: string | null;
  superset_dropset_weight?: number | null;
  superset_dropset_reps?: number | null;
  dropset_weight?: number | null;
  dropset_reps?: number | null;
  equipment_id?: string | null;
}

interface ExerciseData {
  exercise_id: string;
  order_index: number;
  sets: SetData[];
}

interface SaveWorkoutRequest {
  trainee_id: string;
  trainer_id: string;
  workout_type: 'personal' | 'pair';
  notes: string | null;
  workout_date: string;
  exercises: ExerciseData[];
  pair_member?: 'member_1' | 'member_2' | null;
  workout_id?: string;
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

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is a trainer (not a trainee)
    const isTrainee = user.user_metadata?.is_trainee === true;
    if (isTrainee) {
      return new Response(
        JSON.stringify({ error: "Trainees cannot save workouts" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      trainee_id,
      trainer_id,
      workout_type,
      notes,
      workout_date,
      exercises,
      pair_member,
      workout_id,
    }: SaveWorkoutRequest = await req.json();

    // Verify trainer_id matches authenticated user
    if (trainer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Trainer ID mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify trainer has access to this trainee
    const { data: trainee, error: traineeError } = await supabase
      .from("trainees")
      .select("id, trainer_id")
      .eq("id", trainee_id)
      .maybeSingle();

    if (traineeError || !trainee) {
      return new Response(
        JSON.stringify({ error: "Trainee not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (trainee.trainer_id !== trainer_id) {
      return new Response(
        JSON.stringify({ error: "Access denied to this trainee" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!trainee_id || !trainer_id || !workout_type || !exercises || exercises.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let workout;

    if (workout_id) {
      const { data: existingSets } = await supabase
        .from('workout_exercises')
        .select('id')
        .eq('workout_id', workout_id);

      if (existingSets && existingSets.length > 0) {
        await supabase
          .from('exercise_sets')
          .delete()
          .in(
            'workout_exercise_id',
            existingSets.map((we) => we.id)
          );
      }

      await supabase.from('workout_exercises').delete().eq('workout_id', workout_id);

      const { data: updatedWorkout, error: updateError } = await supabase
        .from('workouts')
        .update({
          notes: notes || null,
          updated_at: new Date().toISOString(),
          workout_date: workout_date,
        })
        .eq('id', workout_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      workout = updatedWorkout;
    } else {
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert([
          {
            trainer_id,
            workout_type,
            notes,
            workout_date,
          },
        ])
        .select()
        .single();

      if (workoutError) {
        throw workoutError;
      }

      const { error: traineeError } = await supabase
        .from('workout_trainees')
        .insert([
          {
            workout_id: newWorkout.id,
            trainee_id,
          },
        ]);

      if (traineeError) {
        throw traineeError;
      }

      workout = newWorkout;
    }

    for (const exercise of exercises) {
      const { data: workoutExercise, error: exerciseError } = await supabase
        .from('workout_exercises')
        .insert([
          {
            workout_id: workout.id,
            trainee_id,
            exercise_id: exercise.exercise_id,
            order_index: exercise.order_index,
            pair_member: pair_member || null,
          },
        ])
        .select()
        .single();

      if (exerciseError) {
        throw exerciseError;
      }

      const setsToInsert = exercise.sets.map((set) => ({
        workout_exercise_id: workoutExercise.id,
        set_number: set.set_number,
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe && set.rpe >= 1 && set.rpe <= 10 ? set.rpe : null,
        set_type: set.set_type,
        failure: set.failure || false,
        superset_exercise_id: set.superset_exercise_id || null,
        superset_weight: set.superset_weight || null,
        superset_reps: set.superset_reps || null,
        superset_rpe: set.superset_rpe && set.superset_rpe >= 1 && set.superset_rpe <= 10 ? set.superset_rpe : null,
        superset_equipment_id: set.superset_equipment_id || null,
        superset_dropset_weight: set.superset_dropset_weight || null,
        superset_dropset_reps: set.superset_dropset_reps || null,
        dropset_weight: set.dropset_weight || null,
        dropset_reps: set.dropset_reps || null,
        equipment_id: set.equipment_id || null,
      }));

      const { error: setsError } = await supabase
        .from('exercise_sets')
        .insert(setsToInsert);

      if (setsError) {
        throw setsError;
      }
    }

    // Sync to Google Calendar if enabled
    try {
      const { data: credentials } = await supabase
        .from('trainer_google_credentials')
        .select('auto_sync_enabled, sync_direction, default_calendar_id, access_token, refresh_token, token_expires_at')
        .eq('trainer_id', trainer_id)
        .eq('auto_sync_enabled', true)
        .maybeSingle();

      // Only sync to Google if sync_direction is 'to_google' or 'bidirectional'
      const shouldSyncToGoogle = credentials && 
        (credentials.sync_direction === 'to_google' || credentials.sync_direction === 'bidirectional');

      if (shouldSyncToGoogle) {
        // Check if already synced
        const { data: existingSync } = await supabase
          .from('google_calendar_sync')
          .select('google_event_id')
          .eq('workout_id', workout.id)
          .maybeSingle();

        if (!existingSync) {
          // Get trainee details
          const { data: traineeData } = await supabase
            .from('workout_trainees')
            .select('trainee_id, trainees!inner(full_name, email)')
            .eq('workout_id', workout.id)
            .limit(1)
            .single();

          if (traineeData?.trainees) {
            const trainee = traineeData.trainees;
            const workoutDate = new Date(workout.workout_date);
            const endDate = new Date(workoutDate);
            endDate.setHours(workoutDate.getHours() + 1);

            // Check and refresh token if needed
            let accessToken = credentials.access_token;
            if (new Date(credentials.token_expires_at) < new Date()) {
              const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
                  client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
                  refresh_token: credentials.refresh_token,
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
                  .eq("trainer_id", trainer_id);
              }
            }

            // Create calendar event
            const calendarId = credentials.default_calendar_id || 'primary';
            const eventPayload: any = {
              summary: `אימון - ${trainee.full_name}`,
              start: {
                dateTime: workoutDate.toISOString(),
                timeZone: 'Asia/Jerusalem',
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: 'Asia/Jerusalem',
              },
            };

            if (workout.notes) {
              eventPayload.description = workout.notes;
            }

            if (trainee.email) {
              eventPayload.attendees = [{ email: trainee.email }];
            }

            const eventResponse = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventPayload),
              }
            );

            if (eventResponse.ok) {
              const event = await eventResponse.json();
              
              // Save sync record with user's preferred sync direction
              const syncDirection = credentials.sync_direction === 'bidirectional' 
                ? 'bidirectional' 
                : 'to_google';
              
              await supabase
                .from('google_calendar_sync')
                .insert({
                  trainer_id: trainer_id,
                  trainee_id: traineeData.trainee_id,
                  workout_id: workout.id,
                  google_event_id: event.id,
                  google_calendar_id: calendarId,
                  sync_status: 'synced',
                  sync_direction: syncDirection,
                  event_start_time: workoutDate.toISOString(),
                  event_end_time: endDate.toISOString(),
                  event_summary: eventPayload.summary,
                  event_description: workout.notes || null,
                  last_synced_at: new Date().toISOString(),
                });
            }
          }
        }
      }
    } catch (calendarError) {
      // Don't fail the workout save if calendar sync fails
      console.error('Failed to sync workout to Google Calendar:', calendarError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        workout,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error saving workout:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});