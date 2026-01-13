import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegisterRequest {
  phone: string;
  password: string;
  trainee_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phone, password, trainee_id }: RegisterRequest = await req.json();

    // Validate input
    if (!phone || !password || !trainee_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role
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

    // Check if trainee exists
    const { data: trainee, error: traineeError } = await supabaseAdmin
      .from("trainees")
      .select("id, full_name")
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

    // Check if trainee_auth already exists for this trainee
    const { data: existingAuth } = await supabaseAdmin
      .from("trainee_auth")
      .select("id")
      .eq("trainee_id", trainee_id)
      .maybeSingle();

    if (existingAuth) {
      return new Response(
        JSON.stringify({ error: "Trainee already registered" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create auth user with phone as email (phone@trainee.local)
    const email = `${phone}@trainee.local`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        phone,
        trainee_id,
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

    // Create trainee_auth record
    const { error: insertError } = await supabaseAdmin
      .from("trainee_auth")
      .insert({
        trainee_id,
        phone,
        password: "", // We don't store password anymore, it's in auth.users
        auth_user_id: authData.user.id,
        is_active: true,
      });

    if (insertError) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return new Response(
        JSON.stringify({ error: "Failed to create trainee auth record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Trainee registered successfully",
        trainee: {
          id: trainee_id,
          phone,
          full_name: trainee.full_name,
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