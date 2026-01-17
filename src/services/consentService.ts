/**
 * Consent Management Service
 * Service for managing user consent for GDPR compliance
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import type { ApiResponse } from '../api/types';
import { AuditService } from './auditService';

export interface ConsentRecord {
  id: string;
  user_id: string;
  user_type: 'trainer' | 'trainee';
  consent_type: 'data_processing' | 'marketing' | 'analytics' | 'cookies' | 'third_party';
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  ip_address?: string;
  user_agent?: string;
  version: string; // Policy version at time of consent
  created_at: string;
  updated_at: string;
}

export interface ConsentPreferences {
  data_processing: boolean;
  marketing: boolean;
  analytics: boolean;
  cookies: boolean;
  third_party: boolean;
}

/**
 * Get user consent records
 */
export async function getUserConsents(
  userId: string,
  userType: 'trainer' | 'trainee'
): Promise<ApiResponse<ConsentRecord[]>> {
  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError(error, 'getUserConsents', { userId, userType });
      return { error: error.message };
    }

    return { data: data || [], success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to get user consents' };
  }
}

/**
 * Grant consent for a specific type
 */
export async function grantConsent(
  userId: string,
  userType: 'trainer' | 'trainee',
  consentType: ConsentRecord['consent_type'],
  version: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ApiResponse<ConsentRecord>> {
  try {
    // Check if consent already exists
    const { data: existing } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('consent_type', consentType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.granted) {
      // Update existing consent
      const { data, error } = await supabase
        .from('user_consents')
        .update({
          granted: true,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          version,
          ip_address: ipAddress,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'grantConsent', { userId, consentType });
        return { error: error.message };
      }

      // Log audit event
      await AuditService.logUpdate(userId, 'user_consents', existing.id, existing, data);

      return { data, success: true };
    } else {
      // Create new consent record
      const { data, error } = await supabase
        .from('user_consents')
        .insert({
          user_id: userId,
          user_type: userType,
          consent_type: consentType,
          granted: true,
          granted_at: new Date().toISOString(),
          version,
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'grantConsent', { userId, consentType });
        return { error: error.message };
      }

      // Log audit event
      await AuditService.logCreate(userId, 'user_consents', data.id, data);

      return { data, success: true };
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to grant consent' };
  }
}

/**
 * Revoke consent for a specific type
 */
export async function revokeConsent(
  userId: string,
  userType: 'trainer' | 'trainee',
  consentType: ConsentRecord['consent_type']
): Promise<ApiResponse<ConsentRecord>> {
  try {
    const { data: existing } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('consent_type', consentType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing) {
      return { error: 'Consent record not found' };
    }

    const { data, error } = await supabase
      .from('user_consents')
      .update({
        granted: false,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      logSupabaseError(error, 'revokeConsent', { userId, consentType });
      return { error: error.message };
    }

    // Log audit event
    await AuditService.logUpdate(userId, 'user_consents', existing.id, existing, data);

    return { data, success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to revoke consent' };
  }
}

/**
 * Update consent preferences (bulk)
 */
export async function updateConsentPreferences(
  userId: string,
  userType: 'trainer' | 'trainee',
  preferences: ConsentPreferences,
  version: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ApiResponse<ConsentRecord[]>> {
  try {
    const results: ConsentRecord[] = [];

    for (const [consentType, granted] of Object.entries(preferences)) {
      if (granted) {
        const result = await grantConsent(
          userId,
          userType,
          consentType as ConsentRecord['consent_type'],
          version,
          ipAddress,
          userAgent
        );
        if (result.success && result.data) {
          results.push(result.data);
        }
      } else {
        const result = await revokeConsent(
          userId,
          userType,
          consentType as ConsentRecord['consent_type']
        );
        if (result.success && result.data) {
          results.push(result.data);
        }
      }
    }

    return { data: results, success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update consent preferences' };
  }
}

/**
 * Get current consent preferences
 */
export async function getConsentPreferences(
  userId: string,
  userType: 'trainer' | 'trainee'
): Promise<ApiResponse<ConsentPreferences>> {
  try {
    const consentsResult = await getUserConsents(userId, userType);
    if (!consentsResult.success || !consentsResult.data) {
      return { error: 'Failed to get consents' };
    }

    const consents = consentsResult.data;
    const preferences: ConsentPreferences = {
      data_processing: false,
      marketing: false,
      analytics: false,
      cookies: false,
      third_party: false,
    };

    // Get the most recent consent for each type
    const consentMap = new Map<string, ConsentRecord>();
    for (const consent of consents) {
      const existing = consentMap.get(consent.consent_type);
      if (!existing || new Date(consent.created_at) > new Date(existing.created_at)) {
        consentMap.set(consent.consent_type, consent);
      }
    }

    for (const [type, consent] of consentMap.entries()) {
      if (consent.granted && !consent.revoked_at) {
        preferences[type as keyof ConsentPreferences] = true;
      }
    }

    return { data: preferences, success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to get consent preferences' };
  }
}

/**
 * Consent Service class - convenience wrapper
 */
export class ConsentService {
  static async getUserConsents(userId: string, userType: 'trainer' | 'trainee') {
    return getUserConsents(userId, userType);
  }

  static async grantConsent(
    userId: string,
    userType: 'trainer' | 'trainee',
    consentType: ConsentRecord['consent_type'],
    version: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return grantConsent(userId, userType, consentType, version, ipAddress, userAgent);
  }

  static async revokeConsent(
    userId: string,
    userType: 'trainer' | 'trainee',
    consentType: ConsentRecord['consent_type']
  ) {
    return revokeConsent(userId, userType, consentType);
  }

  static async updateConsentPreferences(
    userId: string,
    userType: 'trainer' | 'trainee',
    preferences: ConsentPreferences,
    version: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return updateConsentPreferences(userId, userType, preferences, version, ipAddress, userAgent);
  }

  static async getConsentPreferences(userId: string, userType: 'trainer' | 'trainee') {
    return getConsentPreferences(userId, userType);
  }
}
