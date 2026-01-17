/**
 * Authentication API layer
 */

import { supabase } from '../lib/supabase';
import type { ApiResponse, TraineeLoginRequest, TraineeLoginResponse } from './types';
import { API_CONFIG } from './config';
import { logger } from '../utils/logger';
import { rateLimiter } from '../utils/rateLimiter';

/**
 * Sign in trainer with email and password
 */
export async function signInTrainer(
  email: string,
  password: string
): Promise<ApiResponse<{ user: any; session: any }>> {
  // Rate limiting: 5 login attempts per minute per email (security)
  const rateLimitKey = `signInTrainer:${email}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 5, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד דקה.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return { data: { user: data.user, session: data.session }, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בהתחברות' };
  }
}

/**
 * Sign up trainer
 */
export async function signUpTrainer(
  email: string,
  password: string,
  fullName: string
): Promise<ApiResponse<{ user: any }>> {
  // Rate limiting: 3 signup attempts per minute per email (security)
  const rateLimitKey = `signUpTrainer:${email}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 3, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי ניסיונות הרשמה. נסה שוב בעוד דקה.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'שגיאה ביצירת המשתמש' };
    }

    // Create trainer profile
    const { error: profileError } = await supabase
      .from('trainers')
      .insert([
        {
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
        },
      ]);

    if (profileError) {
      logger.error('Error creating trainer profile:', profileError, 'authApi');
      return { error: profileError.message };
    }

    return { data: { user: data.user }, success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בהרשמה' };
  }
}

/**
 * Sign in trainee with phone and password
 */
export async function signInTrainee(
  phone: string,
  password: string
): Promise<ApiResponse<TraineeLoginResponse>> {
  // Rate limiting: 5 login attempts per minute per phone (security)
  const rateLimitKey = `signInTrainee:${phone}`;
  const rateLimitResult = rateLimiter.check(rateLimitKey, 5, 60000);
  if (!rateLimitResult.allowed) {
    return { error: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד דקה.' };
  }

  try {
    const response = await fetch(
      `${API_CONFIG.SUPABASE_URL}/functions/v1/trainee-login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone, password } as TraineeLoginRequest),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      return { error: data.error || 'מספר טלפון או סיסמה שגויים' };
    }

    if (data.session && data.trainee) {
      return {
        data: {
          session: data.session,
          trainee: data.trainee,
        },
        success: true,
      };
    }

    return { error: 'שגיאה בהתחברות' };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בהתחברות' };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<ApiResponse> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בהתנתקות' };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<ApiResponse<{ session: any; user: any }>> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { error: error.message };
    }
    return {
      data: {
        session: data.session,
        user: data.session?.user ?? null,
      },
      success: true,
    };
  } catch (err: any) {
    return { error: err.message || 'שגיאה בטעינת המידע' };
  }
}
