/**
 * Supabase Query Helpers
 * 
 * This file provides type-safe helper functions for common Supabase query patterns.
 * These helpers prevent common mistakes like:
 * - Querying from wrong table
 * - Using incorrect field names
 * - Incorrect join syntax
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { MEASUREMENT_FIELDS, SELF_WEIGHT_FIELDS } from './databaseFields';

type Supabase = SupabaseClient<Database>;

/**
 * Get trainee workouts with proper join syntax
 * 
 * @example
 * const workouts = await getTraineeWorkouts(supabase, traineeId);
 */
export async function getTraineeWorkouts(
  supabase: Supabase,
  traineeId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    completed?: boolean;
    limit?: number;
  }
) {
  let query = supabase
    .from('workout_trainees')
    .select(`
      workouts!inner (
        id,
        workout_date,
        workout_type,
        notes,
        is_completed,
        is_self_recorded,
        workout_exercises (
          id,
          exercises (name),
          exercise_sets (weight, reps)
        )
      )
    `)
    .eq('trainee_id', traineeId);

  if (options?.completed !== undefined) {
    query = query.eq('workouts.is_completed', options.completed);
  }

  if (options?.startDate) {
    query = query.gte('workouts.workout_date', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('workouts.workout_date', options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Extract workouts from workout_trainees structure
  return data?.map((wt: any) => wt.workouts).filter(Boolean) || [];
}

/**
 * Get measurements with correct field names
 */
export async function getMeasurements(
  supabase: Supabase,
  traineeId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    orderBy?: 'asc' | 'desc';
  }
) {
  let query = supabase
    .from('measurements')
    .select(`${MEASUREMENT_FIELDS.WEIGHT}, ${MEASUREMENT_FIELDS.MEASUREMENT_DATE}`)
    .eq('trainee_id', traineeId);

  if (options?.startDate) {
    query = query.gte(MEASUREMENT_FIELDS.MEASUREMENT_DATE, options.startDate);
  }

  if (options?.endDate) {
    query = query.lte(MEASUREMENT_FIELDS.MEASUREMENT_DATE, options.endDate);
  }

  query = query.order(MEASUREMENT_FIELDS.MEASUREMENT_DATE, {
    ascending: options?.orderBy !== 'desc',
  });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get self weights with correct field names
 */
export async function getSelfWeights(
  supabase: Supabase,
  traineeId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    orderBy?: 'asc' | 'desc';
  }
) {
  let query = supabase
    .from('trainee_self_weights')
    .select(`${SELF_WEIGHT_FIELDS.WEIGHT_KG}, ${SELF_WEIGHT_FIELDS.WEIGHT_DATE}`)
    .eq('trainee_id', traineeId);

  if (options?.startDate) {
    query = query.gte(SELF_WEIGHT_FIELDS.WEIGHT_DATE, options.startDate);
  }

  if (options?.endDate) {
    query = query.lte(SELF_WEIGHT_FIELDS.WEIGHT_DATE, options.endDate);
  }

  query = query.order(SELF_WEIGHT_FIELDS.WEIGHT_DATE, {
    ascending: options?.orderBy !== 'desc',
  });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Combine measurements and self weights into unified weight data
 */
export interface WeightDataPoint {
  date: string;
  weight: number;
  source: 'measurement' | 'self_weight';
}

export async function getCombinedWeights(
  supabase: Supabase,
  traineeId: string,
  options?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<WeightDataPoint[]> {
  const [measurements, selfWeights] = await Promise.all([
    getMeasurements(supabase, traineeId, options),
    getSelfWeights(supabase, traineeId, options),
  ]);

  const allWeights: WeightDataPoint[] = [
    ...measurements.map((m: any) => ({
      date: m.measurement_date,
      weight: m.weight, // Note: field name is 'weight' not 'weight_kg'
      source: 'measurement' as const,
    })),
    ...selfWeights.map((sw: any) => ({
      date: sw.weight_date,
      weight: sw.weight_kg, // Note: field name is 'weight_kg' not 'weight'
      source: 'self_weight' as const,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return allWeights;
}
