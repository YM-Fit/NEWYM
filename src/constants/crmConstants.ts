/**
 * CRM System Constants
 * כל הקבועים של מערכת ה-CRM
 */

/**
 * CRM Status Types
 */
export const CRM_STATUS = {
  LEAD: 'lead',
  QUALIFIED: 'qualified',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  CHURNED: 'churned',
  ON_HOLD: 'on_hold',
} as const;

export type CrmStatus = typeof CRM_STATUS[keyof typeof CRM_STATUS];

/**
 * Contract Types
 */
export const CONTRACT_TYPE = {
  MONTHLY: 'monthly',
  PACKAGE: 'package',
  SESSION: 'session',
  TRIAL: 'trial',
} as const;

export type ContractType = typeof CONTRACT_TYPE[keyof typeof CONTRACT_TYPE];

/**
 * Payment Status
 */
export const PAYMENT_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  FREE: 'free',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

/**
 * Interaction Types
 */
export const INTERACTION_TYPE = {
  CALL: 'call',
  EMAIL: 'email',
  SMS: 'sms',
  MEETING: 'meeting',
  WORKOUT: 'workout',
  MESSAGE: 'message',
  NOTE: 'note',
} as const;

export type InteractionType = typeof INTERACTION_TYPE[keyof typeof INTERACTION_TYPE];

/**
 * Sync Directions
 */
export const SYNC_DIRECTION = {
  TO_GOOGLE: 'to_google',
  FROM_GOOGLE: 'from_google',
  BIDIRECTIONAL: 'bidirectional',
} as const;

export type SyncDirection = typeof SYNC_DIRECTION[keyof typeof SYNC_DIRECTION];

/**
 * Sync Frequency
 */
export const SYNC_FREQUENCY = {
  REALTIME: 'realtime',
  HOURLY: 'hourly',
  DAILY: 'daily',
} as const;

export type SyncFrequency = typeof SYNC_FREQUENCY[keyof typeof SYNC_FREQUENCY];

/**
 * Sync Status
 */
export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  FAILED: 'failed',
  CONFLICT: 'conflict',
} as const;

export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];

/**
 * CRM Status Labels (Hebrew)
 */
export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
  [CRM_STATUS.LEAD]: 'ליד',
  [CRM_STATUS.QUALIFIED]: 'מוסמך',
  [CRM_STATUS.ACTIVE]: 'פעיל',
  [CRM_STATUS.INACTIVE]: 'לא פעיל',
  [CRM_STATUS.CHURNED]: 'נטש',
  [CRM_STATUS.ON_HOLD]: 'מושעה',
};

/**
 * Contract Type Labels (Hebrew)
 */
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  [CONTRACT_TYPE.MONTHLY]: 'חודשי',
  [CONTRACT_TYPE.PACKAGE]: 'חבילה',
  [CONTRACT_TYPE.SESSION]: 'שיעור',
  [CONTRACT_TYPE.TRIAL]: 'ניסיון',
};

/**
 * Payment Status Labels (Hebrew)
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.PAID]: 'שולם',
  [PAYMENT_STATUS.PENDING]: 'ממתין',
  [PAYMENT_STATUS.OVERDUE]: 'מעוכב',
  [PAYMENT_STATUS.FREE]: 'חינם',
};

/**
 * Interaction Type Labels (Hebrew)
 */
export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  [INTERACTION_TYPE.CALL]: 'שיחה',
  [INTERACTION_TYPE.EMAIL]: 'אימייל',
  [INTERACTION_TYPE.SMS]: 'SMS',
  [INTERACTION_TYPE.MEETING]: 'פגישה',
  [INTERACTION_TYPE.WORKOUT]: 'אימון',
  [INTERACTION_TYPE.MESSAGE]: 'הודעה',
  [INTERACTION_TYPE.NOTE]: 'הערה',
};

/**
 * Default Values
 */
export const CRM_DEFAULTS = {
  STATUS: CRM_STATUS.ACTIVE,
  PAYMENT_STATUS: PAYMENT_STATUS.PENDING,
  SYNC_FREQUENCY: SYNC_FREQUENCY.REALTIME,
  SYNC_DIRECTION: SYNC_DIRECTION.BIDIRECTIONAL,
} as const;

/**
 * Validation Rules
 */
export const CRM_VALIDATION = {
  MIN_CLIENT_NAME_LENGTH: 2,
  MAX_CLIENT_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_PHONE_LENGTH: 20,
  MAX_NOTES_LENGTH: 5000,
  MAX_DESCRIPTION_LENGTH: 2000,
} as const;

/**
 * Cache TTL (Time To Live) in milliseconds
 */
export const CRM_CACHE_TTL = {
  CLIENTS_LIST: 5 * 60 * 1000, // 5 minutes
  CLIENT_STATS: 2 * 60 * 1000, // 2 minutes
  INTERACTIONS: 3 * 60 * 1000, // 3 minutes
  CALENDAR_EVENTS: 10 * 60 * 1000, // 10 minutes
} as const;

/**
 * Pagination Defaults
 */
export const CRM_PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

/**
 * Alert Thresholds
 */
export const CRM_ALERTS = {
  INACTIVE_CLIENT_DAYS: 30, // Alert if no contact for 30 days
  OVERDUE_PAYMENT_DAYS: 7, // Alert if payment overdue for 7 days
  UPCOMING_FOLLOWUP_DAYS: 3, // Alert if followup in 3 days
} as const;
