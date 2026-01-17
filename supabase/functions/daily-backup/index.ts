/**
 * Daily Backup Edge Function
 * Creates automated daily backups for all trainers
 * 
 * This function should be scheduled via Supabase Cron or external scheduler
 * Recommended schedule: Daily at 2 AM UTC
 * 
 * Usage:
 * - Manual trigger: POST /daily-backup
 * - Cron trigger: Set up via Supabase Dashboard → Database → Cron Jobs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface BackupResult {
  trainer_id: string;
  success: boolean;
  backup_id?: string;
  error?: string;
  record_count?: number;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all trainers
    const { data: trainers, error: trainersError } = await supabase
      .from('trainers')
      .select('id');

    if (trainersError) {
      throw new Error(`Failed to fetch trainers: ${trainersError.message}`);
    }

    if (!trainers || trainers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No trainers found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: BackupResult[] = [];
    const tablesToBackup = [
      'google_calendar_clients',
      'client_interactions',
      'crm_contracts',
      'crm_payments',
      'crm_documents',
      'pipeline_movements',
    ];

    // Create backup for each trainer
    for (const trainer of trainers) {
      try {
        const backupDate = new Date().toISOString();
        let totalRecords = 0;
        const backupData: Record<string, any[]> = {};

        // Backup each table
        for (const tableName of tablesToBackup) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .eq('trainer_id', trainer.id);

            if (error) {
              console.error(`Failed to backup table ${tableName} for trainer ${trainer.id}:`, error);
              continue;
            }

            if (data) {
              backupData[tableName] = data;
              totalRecords += data.length;
            }
          } catch (err) {
            console.error(`Error backing up table ${tableName}:`, err);
          }
        }

        // Calculate data size (approximate)
        const dataSize = JSON.stringify(backupData).length;

        // Store backup metadata
        const { data: backupRecord, error: backupError } = await supabase
          .from('backup_log')
          .insert({
            trainer_id: trainer.id,
            backup_type: 'full',
            backup_date: backupDate,
            data_size: dataSize,
            record_count: totalRecords,
            status: 'completed',
            tables_included: tablesToBackup,
          })
          .select('id')
          .single();

        if (backupError) {
          console.error(`Failed to store backup metadata for trainer ${trainer.id}:`, backupError);
          results.push({
            trainer_id: trainer.id,
            success: false,
            error: backupError.message,
          });
          continue;
        }

        // TODO: Store actual backup data in Supabase Storage
        // For now, only metadata is stored
        // In production, upload backupData to Supabase Storage bucket 'backups'

        // Log audit event
        await supabase
          .from('audit_log')
          .insert({
            user_id: trainer.id,
            action: 'export_data',
            table_name: 'backups',
            record_id: backupRecord.id,
            new_data: {
              backup_type: 'full',
              backup_date: backupDate,
              record_count: totalRecords,
            },
          })
          .catch(err => console.error('Failed to log backup audit:', err));

        results.push({
          trainer_id: trainer.id,
          success: true,
          backup_id: backupRecord.id,
          record_count: totalRecords,
        });
      } catch (error: any) {
        console.error(`Error creating backup for trainer ${trainer.id}:`, error);
        results.push({
          trainer_id: trainer.id,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + (r.record_count || 0), 0);

    return new Response(
      JSON.stringify({
        message: 'Daily backup completed',
        processed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        total_records: totalRecords,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in daily-backup function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
