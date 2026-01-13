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

interface LoginRequest {
  phone: string;
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
    const { phone, password }: LoginRequest = await req.json();

    // Validate input
    if (!phone || !password) {
      return new Response(
        JSON.stringify({ error: "Missing phone or password" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client for authentication
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Login with email (phone@trainee.local) and password
    const email = `${phone}@trainee.local`;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid phone or password" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get trainee data using admin client to bypass RLS
    const traineeId = authData.user.user_metadata.trainee_id;

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
      .select(`
        id,
        full_name,
        phone,
        email,
        gender,
        birth_date,
        height,
        status,
        is_pair,
        pair_name_1,
        pair_name_2,
        trainer_id
      `)
      .eq("id", traineeId)
      .maybeSingle();

    if (traineeError || !trainee) {
      return new Response(
        JSON.stringify({ error: "Trainee data not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update last_login
    await supabaseAdmin
      .from("trainee_auth")
      .update({ last_login: new Date().toISOString() })
      .eq("trainee_id", traineeId);

    return new Response(
      JSON.stringify({
        success: true,
        session: authData.session,
        trainee,
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