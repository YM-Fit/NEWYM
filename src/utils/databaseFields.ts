/**
 * Database Field Names Constants
 * 
 * This file centralizes all database field names to prevent typos and inconsistencies.
 * Use these constants instead of hardcoded strings when querying the database.
 * 
 * IMPORTANT: When adding new fields, ensure they match the actual database schema.
 */

export const MEASUREMENT_FIELDS = {
  // Measurements table fields
  WEIGHT: 'weight', // NOT weight_kg!
  MEASUREMENT_DATE: 'measurement_date',
  BODY_FAT_PERCENTAGE: 'body_fat_percentage',
  MUSCLE_MASS: 'muscle_mass',
  WATER_PERCENTAGE: 'water_percentage',
  BMI: 'bmi',
  SOURCE: 'source',
  NOTES: 'notes',
} as const;

export const SELF_WEIGHT_FIELDS = {
  // Trainee self weights table fields
  WEIGHT_KG: 'weight_kg', // Different from measurements!
  WEIGHT_DATE: 'weight_date',
  NOTES: 'notes',
  IS_SEEN_BY_TRAINER: 'is_seen_by_trainer',
} as const;

export const WORKOUT_FIELDS = {
  ID: 'id',
  WORKOUT_DATE: 'workout_date',
  WORKOUT_TYPE: 'workout_type',
  IS_COMPLETED: 'is_completed',
  IS_SELF_RECORDED: 'is_self_recorded',
  NOTES: 'notes',
} as const;

export const WORKOUT_TRAINEES_FIELDS = {
  TRAINEE_ID: 'trainee_id',
  WORKOUT_ID: 'workout_id',
} as const;

/**
 * Type-safe field selectors for common queries
 */
export const MEASUREMENT_SELECT = {
  BASIC: `${MEASUREMENT_FIELDS.WEIGHT}, ${MEASUREMENT_FIELDS.MEASUREMENT_DATE}`,
  FULL: `*`,
} as const;

export const SELF_WEIGHT_SELECT = {
  BASIC: `${SELF_WEIGHT_FIELDS.WEIGHT_KG}, ${SELF_WEIGHT_FIELDS.WEIGHT_DATE}`,
  FULL: `*`,
} as const;

/**
 * Helper to get weight field name based on table
 */
export function getWeightField(table: 'measurements' | 'trainee_self_weights'): string {
  return table === 'measurements' 
    ? MEASUREMENT_FIELDS.WEIGHT 
    : SELF_WEIGHT_FIELDS.WEIGHT_KG;
}
