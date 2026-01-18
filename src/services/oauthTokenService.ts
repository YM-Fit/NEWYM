/**
 * OAuth Token Service
 * Service for managing OAuth tokens with auto-refresh and alerts
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import { SecureTokenStorage } from '../utils/encryption';
import type { ApiResponse } from '../api/types';

export interface OAuthTokenInfo {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  expires_in?: number;
}

export interface TokenRefreshResult {
  access_token: string;
  expires_at: string;
  expires_in: number;
}

/**
 * OAuth Token Service
 * Manages OAuth tokens with automatic refresh and expiration alerts
 */
export class OAuthTokenService {
  private static readonly TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiration
  private static readonly EXPIRATION_ALERT_DAYS = 7; // Alert 7 days before refresh token expires

  /**
   * Get OAuth credentials for a trainer
   * @param trainerId - Trainer ID
   * @returns Promise with OAuth credentials
   */
  static async getCredentials(trainerId: string): Promise<ApiResponse<OAuthTokenInfo>> {
    try {
      const { data, error } = await supabase
        .from('trainer_google_credentials')
        .select('access_token, refresh_token, token_expires_at')
        .eq('trainer_id', trainerId)
        .single();

      if (error) {
        logSupabaseError(error, 'getCredentials', { table: 'trainer_google_credentials', trainerId });
        return { error: error.message };
      }

      if (!data) {
        return { error: 'אין פרטי אימות שמורים' };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error getting credentials', error, 'OAuthTokenService');
      return { error: 'שגיאה בטעינת פרטי אימות' };
    }
  }

  /**
   * Check if access token is expired or about to expire
   * @param expiresAt - Token expiration timestamp
   * @returns Boolean indicating if token needs refresh
   */
  static needsRefresh(expiresAt: string): boolean {
    const expirationTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const bufferTime = this.TOKEN_REFRESH_BUFFER_MS;
    
    return (expirationTime - now) < bufferTime;
  }

  /**
   * Check if token is expired
   * @param expiresAt - Token expiration timestamp
   * @returns Boolean indicating if token is expired
   */
  static isExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() < Date.now();
  }

  /**
   * Refresh access token using refresh token
   * @param trainerId - Trainer ID
   * @param refreshToken - Refresh token
   * @returns Promise with new access token info
   */
  static async refreshAccessToken(
    trainerId: string,
    refreshToken: string
  ): Promise<ApiResponse<TokenRefreshResult>> {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        // Try to refresh via Edge Function instead
        logger.info('OAuth credentials not configured locally, trying Edge Function refresh', { trainerId }, 'OAuthTokenService');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            return { error: 'נדרשת התחברות מחדש' };
          }
          
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(`${supabaseUrl}/functions/v1/google-oauth/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ trainer_id: trainerId }),
          });
          
          if (!response.ok) {
            // If Edge Function refresh also fails, ask user to reconnect
            return { error: 'Token פג תוקף - נדרש חיבור מחדש ל-Google Calendar' };
          }
          
          const data = await response.json();
          if (data.error) {
            return { error: data.error };
          }
          
          return {
            data: {
              access_token: data.access_token,
              expires_at: data.expires_at,
              expires_in: data.expires_in || 3600,
            },
            success: true,
          };
        } catch (edgeFnError) {
          logger.warn('Edge Function refresh failed', edgeFnError, 'OAuthTokenService');
          return { error: 'Token פג תוקף - נדרש חיבור מחדש ל-Google Calendar' };
        }
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to refresh token', { status: response.status, error: errorData }, 'OAuthTokenService');
        return { error: 'שגיאה בחידוש token' };
      }

      const data = await response.json();
      const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();

      // Update database with new token
      const { error: updateError } = await supabase
        .from('trainer_google_credentials')
        .update({
          access_token: data.access_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('trainer_id', trainerId);

      if (updateError) {
        logSupabaseError(updateError, 'refreshAccessToken', { table: 'trainer_google_credentials', trainerId });
        return { error: 'שגיאה בעדכון token' };
      }

      return {
        data: {
          access_token: data.access_token,
          expires_at: expiresAt,
          expires_in: data.expires_in,
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error refreshing token', error, 'OAuthTokenService');
      return { error: 'שגיאה בחידוש token' };
    }
  }

  /**
   * Get valid access token (refresh if needed)
   * @param trainerId - Trainer ID
   * @returns Promise with valid access token
   */
  static async getValidAccessToken(trainerId: string): Promise<ApiResponse<string>> {
    try {
      const credentialsResult = await this.getCredentials(trainerId);
      
      if (!credentialsResult.success || !credentialsResult.data) {
        return { error: credentialsResult.error || 'אין פרטי אימות' };
      }

      const { access_token, refresh_token, token_expires_at } = credentialsResult.data;

      // Check if token needs refresh
      if (this.needsRefresh(token_expires_at)) {
        logger.info('Token needs refresh, refreshing...', { trainerId }, 'OAuthTokenService');
        
        const refreshResult = await this.refreshAccessToken(trainerId, refresh_token);
        
        if (refreshResult.success && refreshResult.data) {
          return { data: refreshResult.data.access_token, success: true };
        } else {
          return { error: refreshResult.error || 'שגיאה בחידוש token' };
        }
      }

      return { data: access_token, success: true };
    } catch (error) {
      logger.error('Error getting valid access token', error, 'OAuthTokenService');
      return { error: 'שגיאה בקבלת token' };
    }
  }

  /**
   * Check if refresh token is about to expire
   * @param trainerId - Trainer ID
   * @returns Promise with expiration warning info
   */
  static async checkRefreshTokenExpiration(trainerId: string): Promise<ApiResponse<{
    expiresSoon: boolean;
    daysUntilExpiration?: number;
    message?: string;
  }>> {
    try {
      // Note: Google refresh tokens don't expire by default, but can be revoked
      // This is a placeholder for checking token validity
      const credentialsResult = await this.getCredentials(trainerId);
      
      if (!credentialsResult.success || !credentialsResult.data) {
        return { error: credentialsResult.error || 'אין פרטי אימות' };
      }

      // Check if access token is expired
      const { token_expires_at } = credentialsResult.data;
      const isExpired = this.isExpired(token_expires_at);
      
      if (isExpired) {
        return {
          data: {
            expiresSoon: true,
            message: 'Token פג תוקף - נדרש חידוש',
          },
          success: true,
        };
      }

      const expirationTime = new Date(token_expires_at).getTime();
      const now = Date.now();
      const daysUntilExpiration = Math.floor((expirationTime - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiration <= this.EXPIRATION_ALERT_DAYS) {
        return {
          data: {
            expiresSoon: true,
            daysUntilExpiration,
            message: `Token יפוג תוקף בעוד ${daysUntilExpiration} ימים`,
          },
          success: true,
        };
      }

      return {
        data: {
          expiresSoon: false,
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error checking token expiration', error, 'OAuthTokenService');
      return { error: 'שגיאה בבדיקת תוקף token' };
    }
  }

  /**
   * Store encrypted token in secure storage (client-side only)
   * @param key - Storage key
   * @param token - Token to store
   * @param encryptionKey - Encryption key
   */
  static storeTokenSecurely(key: string, token: string, encryptionKey: string): void {
    try {
      SecureTokenStorage.setEncryptionKey(encryptionKey);
      SecureTokenStorage.setToken(key, token);
    } catch (error) {
      logger.error('Error storing token securely', error, 'OAuthTokenService');
    }
  }

  /**
   * Get encrypted token from secure storage (client-side only)
   * @param key - Storage key
   * @param encryptionKey - Encryption key
   * @returns Decrypted token or null
   */
  static getStoredToken(key: string, encryptionKey: string): string | null {
    try {
      SecureTokenStorage.setEncryptionKey(encryptionKey);
      return SecureTokenStorage.getToken(key);
    } catch (error) {
      logger.error('Error getting stored token', error, 'OAuthTokenService');
      return null;
    }
  }

  /**
   * Remove stored token
   * @param key - Storage key
   */
  static removeStoredToken(key: string): void {
    try {
      SecureTokenStorage.removeToken(key);
    } catch (error) {
      logger.error('Error removing stored token', error, 'OAuthTokenService');
    }
  }

  /**
   * Store tokens in Vault (requires Vault extension to be enabled)
   * @param trainerId - Trainer ID
   * @param accessToken - Access token
   * @param refreshToken - Refresh token
   * @param expiresAt - Token expiration timestamp
   * @returns Promise with vault secret name
   */
  static async storeTokensInVault(
    trainerId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: string
  ): Promise<ApiResponse<string>> {
    try {
      // Call Edge Function or RPC to store in Vault
      // For now, use RPC function if available
      const { data, error } = await supabase.rpc('store_google_tokens_in_vault', {
        p_trainer_id: trainerId,
        p_access_token: accessToken,
        p_refresh_token: refreshToken,
        p_token_expires_at: expiresAt,
      });

      if (error) {
        logSupabaseError(error, 'storeTokensInVault', { trainerId });
        return { error: 'שגיאה בשמירת tokens ב-Vault' };
      }

      // Update credentials table with vault_secret_name
      const { error: updateError } = await supabase
        .from('trainer_google_credentials')
        .update({ vault_secret_name: data })
        .eq('trainer_id', trainerId);

      if (updateError) {
        logSupabaseError(updateError, 'storeTokensInVault', { table: 'trainer_google_credentials', trainerId });
        return { error: 'שגיאה בעדכון vault_secret_name' };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error storing tokens in Vault', error, 'OAuthTokenService');
      return { error: 'שגיאה בשמירת tokens ב-Vault' };
    }
  }

  /**
   * Get tokens from Vault (requires Vault extension to be enabled)
   * @param trainerId - Trainer ID
   * @returns Promise with OAuth tokens
   */
  static async getTokensFromVault(trainerId: string): Promise<ApiResponse<OAuthTokenInfo>> {
    try {
      const { data, error } = await supabase.rpc('get_google_tokens_from_vault', {
        p_trainer_id: trainerId,
      });

      if (error) {
        logSupabaseError(error, 'getTokensFromVault', { trainerId });
        return { error: 'שגיאה בטעינת tokens מ-Vault' };
      }

      if (!data) {
        return { error: 'אין tokens ב-Vault' };
      }

      return {
        data: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_expires_at: data.token_expires_at,
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error getting tokens from Vault', error, 'OAuthTokenService');
      return { error: 'שגיאה בטעינת tokens מ-Vault' };
    }
  }

  /**
   * Migrate existing tokens to Vault
   * @param trainerId - Trainer ID (optional, if not provided migrates all)
   * @returns Promise with migration results
   */
  static async migrateTokensToVault(trainerId?: string): Promise<ApiResponse<any>> {
    try {
      // Call migration function
      let query = supabase.rpc('migrate_tokens_to_vault');
      
      if (trainerId) {
        // Filter by trainer_id if provided
        const { data, error } = await query;
        
        if (error) {
          logSupabaseError(error, 'migrateTokensToVault', { trainerId });
          return { error: 'שגיאה בהעברת tokens ל-Vault' };
        }

        const trainerResult = data?.find((r: any) => r.trainer_id === trainerId);
        return {
          data: trainerResult || { message: 'No tokens to migrate' },
          success: true,
        };
      }

      const { data, error } = await query;

      if (error) {
        logSupabaseError(error, 'migrateTokensToVault', {});
        return { error: 'שגיאה בהעברת tokens ל-Vault' };
      }

      return {
        data: {
          migrated: data?.filter((r: any) => r.migrated).length || 0,
          failed: data?.filter((r: any) => !r.migrated).length || 0,
          results: data,
        },
        success: true,
      };
    } catch (error) {
      logger.error('Error migrating tokens to Vault', error, 'OAuthTokenService');
      return { error: 'שגיאה בהעברת tokens ל-Vault' };
    }
  }
}
