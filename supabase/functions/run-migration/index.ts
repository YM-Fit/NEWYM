import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Edge Function to run migration SQL
 * This function executes SQL statements using Supabase service role
 * 
 * Usage: POST /run-migration
 * Body: { sql: "CREATE TABLE ..." }
 */

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { sql } = await req.json();

    if (!sql) {
      return new Response(
        JSON.stringify({ error: 'Missing SQL parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Supabase service role key from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Execute SQL via Supabase
    // Note: Supabase client doesn't support direct SQL execution
    // We need to use the REST API or Management API
    
    // Try via REST API with rpc
    // But we need a function that executes SQL - which requires creating it first
    
    // Actually, we can't execute arbitrary SQL via Supabase REST API
    // The only way is via Management API or Dashboard
    
    return new Response(
      JSON.stringify({
        error: 'Direct SQL execution not supported via Edge Functions',
        message: 'Please run migrations via Supabase Dashboard SQL Editor or Supabase CLI',
        sql: sql.substring(0, 200) + '...',
      }),
      {
        status: 501,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
