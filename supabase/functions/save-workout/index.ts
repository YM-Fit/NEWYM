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

/**
 * Increment sessions_used when workout is completed (for card_ticket counting method)
 * Supports both trainee_cards (active card) and trainees.card_sessions_used
 */
async function incrementCardSessionsUsed(
  supabase: any,
  traineeId: string,
  trainerId: string
): Promise<void> {
  try {
    const { data: trainee } = await supabase
      .from('trainees')
      .select('counting_method')
      .eq('id', traineeId)
      .eq('trainer_id', trainerId)
      .single();

    if (!trainee || trainee.counting_method !== 'card_ticket') return;

    // Check for active trainee_cards first
    const { data: activeCard } = await supabase
      .from('trainee_cards')
      .select('id, sessions_used, sessions_purchased')
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .maybeSingle();

    if (activeCard) {
      const newUsed = Math.min((activeCard.sessions_used || 0) + 1, activeCard.sessions_purchased || 999);
      await supabase
        .from('trainee_cards')
        .update({ sessions_used: newUsed })
        .eq('id', activeCard.id);
    } else {
      // Fallback to trainees.card_sessions_used
      const { data: traineeWithCard } = await supabase
        .from('trainees')
        .select('card_sessions_used, card_sessions_total')
        .eq('id', traineeId)
        .single();

      if (traineeWithCard) {
        const currentUsed = traineeWithCard.card_sessions_used || 0;
        const total = traineeWithCard.card_sessions_total || 999;
        const newUsed = Math.min(currentUsed + 1, total);
        await supabase
          .from('trainees')
          .update({ card_sessions_used: newUsed })
          .eq('id', traineeId);
      }
    }
  } catch (err) {
    console.warn('Error incrementing card sessions_used:', err);
  }
}

/**
 * Generate Google Calendar event title with session info
 */
async function generateEventTitle(
  supabase: any,
  traineeId: string,
  trainerId: string,
  traineeName: string,
  eventDate: Date,
  workoutId?: string
): Promise<string> {
  try {
    // Get trainee counting method and card info
    const { data: trainee } = await supabase
      .from('trainees')
      .select('counting_method, card_sessions_total, card_sessions_used')
      .eq('id', traineeId)
      .single();

    if (!trainee) {
      return `אימון - ${traineeName}`;
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
          // Sort workouts by date to ensure correct order
          traineeWorkouts.sort((a: any, b: any) => 
            new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
          );

          let position = 1;
          const totalInMonth = traineeWorkouts.length;

          // If we have workoutId, find its exact position
          if (workoutId) {
            const workoutIndex = traineeWorkouts.findIndex((w: any) => w.id === workoutId);
            if (workoutIndex >= 0) {
              position = workoutIndex + 1;
            } else {
              // New workout, add to count
              position = totalInMonth + 1;
            }
          } else {
            // Fallback: find position by date
            const eventDateMs = eventDate.getTime();
            for (let i = 0; i < traineeWorkouts.length; i++) {
              const workoutDateMs = new Date(traineeWorkouts[i].workout_date).getTime();
              // If dates are within 1 hour of each other, consider it a match
              if (Math.abs(workoutDateMs - eventDateMs) < 3600000) {
                position = i + 1;
                break;
              }
              if (workoutDateMs < eventDateMs) {
                position = i + 2;
              }
            }
            // Make sure position doesn't exceed total
            if (position > totalInMonth) {
              position = totalInMonth;
            }
          }

          // For new workouts (workoutId not found in list), we might need to add 1 to total
          const displayTotal = workoutId && !traineeWorkouts.find((w: any) => w.id === workoutId) 
            ? totalInMonth + 1 
            : totalInMonth;
          
          sessionText = displayTotal > 1 ? `${position}/${displayTotal}` : `${position}`;
        } else {
          // First workout for this trainee this month
          sessionText = '1';
        }
      } else {
        // First workout this month
        sessionText = '1';
      }
    }

    return sessionText ? `אימון - ${traineeName} ${sessionText}` : `אימון - ${traineeName}`;
  } catch (err) {
    console.error('Error generating event title:', err);
    return `אימון - ${traineeName}`;
  }
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
  is_auto_save?: boolean;
  is_prepared?: boolean;
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

    // Apply security middleware (CSRF + Rate Limiting)
    try {
      const { applySecurityMiddleware } = await import("./_shared/middleware.ts");
      const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map(o => o.trim()) || [];
      const middlewareResult = await applySecurityMiddleware(
        req,
        supabase,
        {
          allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
          rateLimitConfig: { maxRequests: 50, windowMs: 60000 }, // 50 requests per minute for save-workout
          skipCSRF: false, // Enable CSRF for state-changing operations
        }
      );

      if (!middlewareResult.allowed) {
        return new Response(
          JSON.stringify({ error: middlewareResult.error }),
          {
            status: middlewareResult.status || 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (middlewareError) {
      // Graceful degradation: if middleware fails, log but continue
      console.warn("Security middleware error:", middlewareError);
      // Continue with request for now (in production, you might want to fail)
    }

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
      is_auto_save,
      is_prepared,
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

    if (!trainee_id || !trainer_id || !workout_type || !exercises) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Allow empty exercises array (for deleting all exercises from a workout)

    let workout;

    // Ensure workout_date includes current time when saving
    // Always use the CURRENT time when saving, regardless of what was sent from frontend
    // The date portion is preserved from user input, but time is always the save time
    const workoutDateObj = new Date(workout_date);
    const now = new Date();
    
    // Parse the date from input (could be date-only string or ISO with time)
    // But ALWAYS use current time for the timestamp portion
    // This ensures workout_date accurately reflects when it was saved
    let finalWorkoutDate: string;
    
    // If workout_date is just a date string (YYYY-MM-DD), parse it properly
    if (workout_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date-only string - use it directly with current time
      const [year, month, day] = workout_date.split('-').map(Number);
      finalWorkoutDate = new Date(Date.UTC(
        year,
        month - 1, // Month is 0-indexed
        day,
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds()
      )).toISOString();
    } else {
      // ISO string with time - preserve date, use current time
      finalWorkoutDate = new Date(Date.UTC(
        workoutDateObj.getUTCFullYear(),
        workoutDateObj.getUTCMonth(),
        workoutDateObj.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds()
      )).toISOString();
    }

    if (workout_id) {
      // Get the list of exercise_ids we're about to save
      const incomingExerciseIds = exercises.map(e => e.exercise_id);
      
      // Find existing workout_exercises for this workout
      const { data: existingWorkoutExercises } = await supabase
        .from('workout_exercises')
        .select('id, exercise_id')
        .eq('workout_id', workout_id);

      // Separate exercises into: to delete, to update, and to create
      const existingExerciseMap = new Map<string, string>();
      const exercisesToDelete: string[] = [];
      
      // If exercises array is empty, mark all existing exercises for deletion
      if (exercises.length === 0) {
        if (existingWorkoutExercises && existingWorkoutExercises.length > 0) {
          exercisesToDelete.push(...existingWorkoutExercises.map(we => we.id));
        }
      } else {
        // Normal flow: compare incoming exercises with existing ones
        if (existingWorkoutExercises) {
          for (const we of existingWorkoutExercises) {
            if (!incomingExerciseIds.includes(we.exercise_id)) {
              // Exercise was removed - delete it
              exercisesToDelete.push(we.id);
            } else {
              // Exercise exists and is in incoming data - will be updated
              existingExerciseMap.set(we.exercise_id, we.id);
            }
          }
        }
      }

      // Delete exercises that were removed (along with their sets)
      if (exercisesToDelete.length > 0) {
        console.log(`Deleting ${exercisesToDelete.length} removed exercises:`, exercisesToDelete);

        // Delete sets first
        const { error: setsDeleteError } = await supabase
          .from('exercise_sets')
          .delete()
          .in('workout_exercise_id', exercisesToDelete);

        if (setsDeleteError) {
          console.error('Error deleting exercise sets:', setsDeleteError);
          throw new Error(`Failed to delete exercise sets: ${setsDeleteError.message}`);
        }

        // Delete workout_exercises
        const { error: exerciseDeleteError } = await supabase
          .from('workout_exercises')
          .delete()
          .in('id', exercisesToDelete);

        if (exerciseDeleteError) {
          console.error('Error deleting exercises:', exerciseDeleteError);
          throw new Error(`Failed to delete exercises: ${exerciseDeleteError.message}`);
        }

        console.log(`Successfully deleted ${exercisesToDelete.length} removed exercises`);
      }

      // Delete sets for exercises that will be updated (we'll re-create them)
      // Only do this if we have exercises to process
      if (exercises.length > 0) {
        const exerciseIdsToUpdate = Array.from(existingExerciseMap.values());
        if (exerciseIdsToUpdate.length > 0) {
          await supabase
            .from('exercise_sets')
            .delete()
            .in('workout_exercise_id', exerciseIdsToUpdate);
        }
      }

      // When updating, preserve the date from input but use current time
      // Check if the workout was already completed - if so, preserve is_completed=true
      const { data: existingWorkout } = await supabase
        .from('workouts')
        .select('is_completed')
        .eq('id', workout_id)
        .single();
      
      const updateData: any = {
        notes: notes || null,
        updated_at: new Date().toISOString(),
        workout_date: finalWorkoutDate, // Preserve date, use current time
      };
      
      // Update is_prepared if provided
      if (is_prepared !== undefined) {
        updateData.is_prepared = is_prepared;
      }
      
      // Preserve is_completed status if workout was already completed
      // Only mark as completed if this is an explicit save (not auto-save) AND workout wasn't already completed
      if (existingWorkout?.is_completed === true) {
        // If workout was already completed, keep it as completed
        updateData.is_completed = true;
      } else if (!is_auto_save) {
        // If workout wasn't completed and this is an explicit save, mark as completed
        updateData.is_completed = true;
      }
      // If is_auto_save and workout wasn't completed, don't change is_completed
      
      const { data: updatedWorkout, error: updateError } = await supabase
        .from('workouts')
        .update(updateData)
        .eq('id', workout_id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      workout = updatedWorkout;

      // Auto-increment card sessions_used when workout is first marked as completed
      if (updateData.is_completed && existingWorkout?.is_completed !== true) {
        await incrementCardSessionsUsed(supabase, trainee_id, trainer_id);
      }
      
      // Process exercises - update existing or create new
      // Only process if we have exercises (skip if empty array)
      if (exercises.length > 0) {
        for (const exercise of exercises) {
        let workoutExerciseId: string;
        
        if (existingExerciseMap.has(exercise.exercise_id)) {
          // Exercise already exists - update it
          workoutExerciseId = existingExerciseMap.get(exercise.exercise_id)!;
          
          await supabase
            .from('workout_exercises')
            .update({
              order_index: exercise.order_index,
              pair_member: pair_member || null,
            })
            .eq('id', workoutExerciseId);
        } else {
          // New exercise - create it
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
            // If it's a duplicate key error, try to get the existing record
            if (exerciseError.code === '23505') {
              console.log(`Duplicate exercise detected for exercise_id ${exercise.exercise_id}, fetching existing record`);
              const { data: existingWe } = await supabase
                .from('workout_exercises')
                .select('id')
                .eq('workout_id', workout.id)
                .eq('exercise_id', exercise.exercise_id)
                .single();
              
              if (existingWe) {
                workoutExerciseId = existingWe.id;
                // Delete existing sets for this exercise
                await supabase
                  .from('exercise_sets')
                  .delete()
                  .eq('workout_exercise_id', workoutExerciseId);
              } else {
                throw exerciseError;
              }
            } else {
              throw exerciseError;
            }
          } else {
            workoutExerciseId = workoutExercise!.id;
          }
        }

        // Insert sets for this exercise
        const setsToInsert = exercise.sets.map((set) => ({
          workout_exercise_id: workoutExerciseId,
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
    } else {
      // Create new workout - allow multiple workouts per day
      // Users can create:
      // 1. A completed workout even if there's a scheduled one (is_completed=false)
      // 2. Multiple workouts per day (morning/evening)
      // 3. Replace a scheduled workout with actual completed data
      
      // When creating new workout, use the date from input but with current time
      // Only mark as completed if this is NOT an auto-save (explicit save by user)
      // Auto-save should keep workouts as incomplete (is_completed=false) so they don't appear in history
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert([
          {
            trainer_id,
            workout_type,
            notes,
            workout_date: finalWorkoutDate,
            is_completed: !is_auto_save, // Only mark as completed if this is an explicit save (not auto-save)
            is_prepared: is_prepared || false, // Default to false (dynamic) if not specified
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

      // Auto-increment card sessions_used when new workout is created as completed
      if (!is_auto_save) {
        await incrementCardSessionsUsed(supabase, trainee_id, trainer_id);
      }
      
      // Insert exercises for new workout
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
          .select('google_event_id, event_start_time, event_end_time, event_summary, event_description')
          .eq('workout_id', workout.id)
          .maybeSingle();

        // Get trainee details (needed for both create and update)
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

          const calendarId = credentials.default_calendar_id || 'primary';
          const eventSummary = await generateEventTitle(
            supabase,
            traineeData.trainee_id,
            trainer_id,
            trainee.full_name,
            workoutDate,
            workout.id
          );

          if (!existingSync) {
            // CREATE: New workout - create calendar event
            const eventPayload: any = {
              summary: eventSummary,
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
          } else {
            // UPDATE: Existing workout - update calendar event
            // Check if anything changed that requires calendar update
            // Compare dates with tolerance (within 1 second) to account for timezone/format differences
            const oldStartTime = existingSync.event_start_time ? new Date(existingSync.event_start_time).getTime() : null;
            const newStartTime = workoutDate.getTime();
            const oldEndTime = existingSync.event_end_time ? new Date(existingSync.event_end_time).getTime() : null;
            const newEndTime = endDate.getTime();
            const oldSummary = existingSync.event_summary;
            const oldDescription = existingSync.event_description || null;
            const newDescription = workout.notes || null;

            // Check if times differ by more than 1 second (to account for rounding)
            const startTimeChanged = oldStartTime === null || Math.abs(oldStartTime - newStartTime) > 1000;
            const endTimeChanged = oldEndTime === null || Math.abs(oldEndTime - newEndTime) > 1000;
            const summaryChanged = oldSummary !== eventSummary;
            const descriptionChanged = oldDescription !== newDescription;

            const needsUpdate = startTimeChanged || endTimeChanged || summaryChanged || descriptionChanged;

            if (needsUpdate) {
              // Get existing event first to preserve other fields
              const getEventResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingSync.google_event_id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (getEventResponse.ok) {
                const existingEvent = await getEventResponse.json();
                
                // Update only changed fields
                const updatedEvent: any = {
                  ...existingEvent,
                  summary: eventSummary,
                  start: {
                    dateTime: workoutDate.toISOString(),
                    timeZone: 'Asia/Jerusalem',
                  },
                  end: {
                    dateTime: endDate.toISOString(),
                    timeZone: 'Asia/Jerusalem',
                  },
                };

                if (workout.notes !== undefined) {
                  updatedEvent.description = workout.notes || '';
                }

                // Update attendees if trainee email exists
                if (trainee.email) {
                  const existingAttendees = existingEvent.attendees || [];
                  const traineeAttendee = existingAttendees.find((a: any) => a.email === trainee.email);
                  if (!traineeAttendee) {
                    updatedEvent.attendees = [...existingAttendees, { email: trainee.email }];
                  }
                }

                const updateEventResponse = await fetch(
                  `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingSync.google_event_id}`,
                  {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedEvent),
                  }
                );

                if (updateEventResponse.ok) {
                  // Update sync record with new values
                  await supabase
                    .from('google_calendar_sync')
                    .update({
                      event_start_time: workoutDate.toISOString(),
                      event_end_time: endDate.toISOString(),
                      event_summary: eventSummary,
                      event_description: workout.notes || null,
                      last_synced_at: new Date().toISOString(),
                      sync_status: 'synced',
                    })
                    .eq('workout_id', workout.id);
                } else {
                  // If update fails, check if event was deleted
                  const errorData = await updateEventResponse.json().catch(() => ({}));
                  if (updateEventResponse.status === 404 || updateEventResponse.status === 410) {
                    // Event was deleted from Google Calendar - try to recreate it
                    console.log(`Event ${existingSync.google_event_id} was deleted during update, recreating...`);
                    
                    // Delete old sync record first
                    await supabase
                      .from('google_calendar_sync')
                      .delete()
                      .eq('workout_id', workout.id);
                    
                    // Create new event (same as CREATE flow)
                    const eventPayload: any = {
                      summary: eventSummary,
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

                    const createEventResponse = await fetch(
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

                    if (createEventResponse.ok) {
                      const newEvent = await createEventResponse.json();
                      
                      // Create new sync record
                      const syncDirection = credentials.sync_direction === 'bidirectional' 
                        ? 'bidirectional' 
                        : 'to_google';
                      
                      await supabase
                        .from('google_calendar_sync')
                        .insert({
                          trainer_id: trainer_id,
                          trainee_id: traineeData.trainee_id,
                          workout_id: workout.id,
                          google_event_id: newEvent.id,
                          google_calendar_id: calendarId,
                          sync_status: 'synced',
                          sync_direction: syncDirection,
                          event_start_time: workoutDate.toISOString(),
                          event_end_time: endDate.toISOString(),
                          event_summary: eventPayload.summary,
                          event_description: workout.notes || null,
                          last_synced_at: new Date().toISOString(),
                        });
                      
                      console.log(`Successfully recreated event ${newEvent.id} for workout ${workout.id}`);
                    } else {
                      const createErrorData = await createEventResponse.json().catch(() => ({}));
                      console.error('Failed to recreate Google Calendar event:', createErrorData);
                    }
                  } else {
                    // Other error - mark as failed
                    await supabase
                      .from('google_calendar_sync')
                      .update({
                        sync_status: 'failed',
                        last_synced_at: new Date().toISOString(),
                      })
                      .eq('workout_id', workout.id);
                    console.error('Failed to update Google Calendar event:', errorData);
                  }
                }
              } else if (getEventResponse.status === 404 || getEventResponse.status === 410) {
                // Event was deleted from Google Calendar - try to recreate it
                console.log(`Event ${existingSync.google_event_id} was deleted, recreating...`);
                
                // Delete old sync record first
                await supabase
                  .from('google_calendar_sync')
                  .delete()
                  .eq('workout_id', workout.id);
                
                // Create new event (same as CREATE flow)
                const eventPayload: any = {
                  summary: eventSummary,
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

                const createEventResponse = await fetch(
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

                if (createEventResponse.ok) {
                  const newEvent = await createEventResponse.json();
                  
                  // Create new sync record
                  const syncDirection = credentials.sync_direction === 'bidirectional' 
                    ? 'bidirectional' 
                    : 'to_google';
                  
                  await supabase
                    .from('google_calendar_sync')
                    .insert({
                      trainer_id: trainer_id,
                      trainee_id: traineeData.trainee_id,
                      workout_id: workout.id,
                      google_event_id: newEvent.id,
                      google_calendar_id: calendarId,
                      sync_status: 'synced',
                      sync_direction: syncDirection,
                      event_start_time: workoutDate.toISOString(),
                      event_end_time: endDate.toISOString(),
                      event_summary: eventPayload.summary,
                      event_description: workout.notes || null,
                      last_synced_at: new Date().toISOString(),
                    });
                  
                  console.log(`Successfully recreated event ${newEvent.id} for workout ${workout.id}`);
                } else {
                  const errorData = await createEventResponse.json().catch(() => ({}));
                  console.error('Failed to recreate Google Calendar event:', errorData);
                }
              } else {
                // Other error getting event - log but don't fail
                const errorData = await getEventResponse.json().catch(() => ({}));
                console.error('Error getting Google Calendar event:', errorData);
              }
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