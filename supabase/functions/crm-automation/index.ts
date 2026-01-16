/**
 * CRM Automation Edge Function
 * מפעיל כללי אוטומציה על בסיס לוח זמנים
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationRule {
  id: string;
  trainer_id: string;
  rule_type: string;
  name: string;
  enabled: boolean;
  conditions: any[];
  actions: any[];
  schedule?: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all enabled automation rules
    const { data: rules, error: rulesError } = await supabase
      .from('crm_automation_rules')
      .select('*')
      .eq('enabled', true);

    if (rulesError) {
      throw new Error(`Error fetching rules: ${rulesError.message}`);
    }

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No automation rules to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let processedCount = 0;
    const results = [];

    // Process each rule
    for (const rule of rules as AutomationRule[]) {
      try {
        // Get trainer's trainees
        const { data: trainees, error: traineesError } = await supabase
          .from('trainees')
          .select('*')
          .eq('trainer_id', rule.trainer_id);

        if (traineesError) {
          console.error(`Error fetching trainees for rule ${rule.id}:`, traineesError);
          continue;
        }

        if (!trainees || trainees.length === 0) {
          continue;
        }

        // Evaluate conditions for each trainee
        for (const trainee of trainees) {
          const conditionsMatch = evaluateConditions(rule.conditions, trainee);

          if (conditionsMatch) {
            // Execute actions
            await executeActions(rule.actions, trainee, rule.trainer_id, supabase);
            processedCount++;
          }
        }

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          success: true,
        });
      } catch (error) {
        console.error(`Error processing rule ${rule.id}:`, error);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Automation processed successfully',
        processed: processedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in automation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Evaluate automation conditions
 */
function evaluateConditions(conditions: any[], trainee: any): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    const fieldValue = trainee[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return fieldValue && fieldValue !== '';
      default:
        return false;
    }
  });
}

/**
 * Execute automation actions
 */
async function executeActions(
  actions: any[],
  trainee: any,
  trainerId: string,
  supabase: any
): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'create_task':
          await supabase.from('crm_automation_tasks').insert([{
            trainer_id: trainerId,
            trainee_id: trainee.id,
            task_type: action.params?.task_type || 'follow_up',
            due_date: action.params?.due_date || new Date().toISOString(),
            completed: false,
          }]);
          break;

        case 'update_status':
          await supabase
            .from('trainees')
            .update({ crm_status: action.params?.status })
            .eq('id', trainee.id);
          break;

        case 'create_interaction':
          await supabase.from('client_interactions').insert([{
            trainee_id: trainee.id,
            trainer_id: trainerId,
            interaction_type: action.params?.interaction_type || 'note',
            subject: action.params?.subject,
            description: action.params?.description,
          }]);
          break;

        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
    }
  }
}
