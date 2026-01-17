/**
 * Validation Schemas using Zod
 * סכמות ולידציה עם Zod
 * 
 * @module validationSchemas
 * @description Zod schemas for runtime type checking and validation
 */

import { z } from 'zod';
import { CRM_VALIDATION, CRM_STATUS, INTERACTION_TYPE } from '../constants/crmConstants';

/**
 * Client/Trainee validation schema
 */
export const ClientSchema = z.object({
  id: z.string().uuid().optional(),
  trainer_id: z.string().uuid(),
  full_name: z
    .string()
    .min(CRM_VALIDATION.MIN_CLIENT_NAME_LENGTH, `שם חייב להכיל לפחות ${CRM_VALIDATION.MIN_CLIENT_NAME_LENGTH} תווים`)
    .max(CRM_VALIDATION.MAX_CLIENT_NAME_LENGTH, `שם לא יכול להכיל יותר מ-${CRM_VALIDATION.MAX_CLIENT_NAME_LENGTH} תווים`),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'מספר טלפון לא תקין')
    .max(CRM_VALIDATION.MAX_PHONE_LENGTH)
    .optional()
    .nullable(),
  email: z
    .string()
    .email('כתובת אימייל לא תקינה')
    .max(CRM_VALIDATION.MAX_EMAIL_LENGTH)
    .optional()
    .nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  birth_date: z.string().date().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  client_since: z.string().date().optional(),
  last_contact_date: z.string().datetime().optional().nullable(),
  next_followup_date: z.string().date().optional().nullable(),
  contract_type: z.enum(['monthly', 'package', 'session', 'trial']).optional().nullable(),
  contract_value: z.number().positive().optional().nullable(),
  payment_status: z.enum(['paid', 'pending', 'overdue', 'free']).optional().nullable(),
  lead_source: z.string().optional().nullable(),
  priority_level: z.enum(['low', 'medium', 'high', 'vip']).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  crm_status: z
    .enum([
      CRM_STATUS.LEAD,
      CRM_STATUS.QUALIFIED,
      CRM_STATUS.ACTIVE,
      CRM_STATUS.INACTIVE,
      CRM_STATUS.CHURNED,
      CRM_STATUS.ON_HOLD,
    ])
    .optional()
    .nullable(),
  notes: z.string().max(CRM_VALIDATION.MAX_NOTES_LENGTH).optional().nullable(),
});

/**
 * Client interaction validation schema
 */
export const InteractionSchema = z.object({
  id: z.string().uuid().optional(),
  trainee_id: z.string().uuid(),
  trainer_id: z.string().uuid(),
  interaction_type: z.enum([
    INTERACTION_TYPE.CALL,
    INTERACTION_TYPE.EMAIL,
    INTERACTION_TYPE.SMS,
    INTERACTION_TYPE.MEETING,
    INTERACTION_TYPE.WORKOUT,
    INTERACTION_TYPE.MESSAGE,
    INTERACTION_TYPE.NOTE,
  ]),
  interaction_date: z.string().datetime(),
  subject: z.string().max(CRM_VALIDATION.MAX_DESCRIPTION_LENGTH).optional().nullable(),
  description: z.string().max(CRM_VALIDATION.MAX_NOTES_LENGTH).optional().nullable(),
  outcome: z.string().max(CRM_VALIDATION.MAX_NOTES_LENGTH).optional().nullable(),
  next_action: z.string().max(CRM_VALIDATION.MAX_DESCRIPTION_LENGTH).optional().nullable(),
  next_action_date: z.string().date().optional().nullable(),
  google_event_id: z.string().optional().nullable(),
});

/**
 * Partial client schema for updates
 */
export const ClientUpdateSchema = ClientSchema.partial().extend({
  id: z.string().uuid(),
  trainer_id: z.string().uuid(),
});

/**
 * Partial interaction schema for updates
 */
export const InteractionUpdateSchema = InteractionSchema.partial().extend({
  id: z.string().uuid(),
  trainee_id: z.string().uuid(),
  trainer_id: z.string().uuid(),
});

/**
 * Validate data against a schema
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    return {
      success: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }
}

/**
 * Validate client data
 * @param data - Client data
 * @returns Validation result
 */
export function validateClient(data: unknown) {
  return validateWithSchema(ClientSchema, data);
}

/**
 * Validate interaction data
 * @param data - Interaction data
 * @returns Validation result
 */
export function validateInteraction(data: unknown) {
  return validateWithSchema(InteractionSchema, data);
}

/**
 * Validate client update data
 * @param data - Client update data
 * @returns Validation result
 */
export function validateClientUpdate(data: unknown) {
  return validateWithSchema(ClientUpdateSchema, data);
}

/**
 * Validate interaction update data
 * @param data - Interaction update data
 * @returns Validation result
 */
export function validateInteractionUpdate(data: unknown) {
  return validateWithSchema(InteractionUpdateSchema, data);
}

// Export types
export type ClientInput = z.infer<typeof ClientSchema>;
export type InteractionInput = z.infer<typeof InteractionSchema>;
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>;
export type InteractionUpdateInput = z.infer<typeof InteractionUpdateSchema>;