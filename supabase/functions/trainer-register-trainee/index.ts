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

interface RegisterTraineeRequest {
  trainee_id: string;
  password: string;
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { trainee_id, password }: RegisterTraineeRequest = await req.json();

    if (!trainee_id || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: trainee, error: traineeError } = await supabaseAdmin
      .from("trainees")
      .select("id, full_name, phone, trainer_id")
      .eq("id", trainee_id)
      .eq("trainer_id", user.id)
      .maybeSingle();

    if (traineeError || !trainee) {
      return new Response(
        JSON.stringify({ error: "Trainee not found or doesn't belong to you" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!trainee.phone) {
      return new Response(
        JSON.stringify({ error: "Trainee must have a phone number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existingAuth } = await supabaseAdmin
      .from("trainee_auth")
      .select("id, auth_user_id")
      .eq("trainee_id", trainee_id)
      .maybeSingle();

    if (existingAuth?.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Trainee already has authentication set up" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const email = `${trainee.phone}@trainee.local`;

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    if (existingUser) {
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        phone: trainee.phone,
        trainee_id: trainee.id,
        full_name: trainee.full_name,
        is_trainee: true,
      },
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || "Failed to create auth user" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (existingAuth) {
      const { error: updateError } = await supabaseAdmin
        .from("trainee_auth")
        .update({
          password: password,
          auth_user_id: authData.user.id,
          is_active: true,
        })
        .eq("id", existingAuth.id);

      if (updateError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: "Failed to update trainee auth" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("trainee_auth")
        .insert({
          trainee_id,
          phone: trainee.phone,
          password: password,
          auth_user_id: authData.user.id,
          is_active: true,
        });

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: "Failed to create trainee auth record" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Trainee authentication created successfully",
        trainee: {
          id: trainee.id,
          full_name: trainee.full_name,
          phone: trainee.phone,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});