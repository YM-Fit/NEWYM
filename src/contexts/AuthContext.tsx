import { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setSecureSession, getSecureSession, removeSecureSession } from '../utils/secureSession';
import { signInTrainer, signInTrainee as apiSignInTrainee, signUpTrainer, signOut as apiSignOut } from '../api/authApi';
import { setUserContext, clearUserContext, setTag } from '../utils/sentry';

interface TraineeSession {
  trainee_id: string;
  trainee_name: string;
  trainer_id: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userType: 'trainer' | 'trainee' | null;
  traineeId: string | null;
  traineeSession: TraineeSession | null;
  /** Returns current user/trainee ID - use instead of user?.id when both trainer and trainee flows need it */
  getCurrentUserId: () => string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInTrainee: (phone: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TRAINEE_SESSION_KEY = 'trainee_session';

/**
 * Extract auth state from session - centralized logic to avoid duplication
 */
function hydrateAuthFromSession(
  session: Session | null,
  setUser: (user: User | null) => void,
  setSession: (session: Session | null) => void,
  setUserType: (type: 'trainer' | 'trainee' | null) => void,
  setTraineeId: (id: string | null) => void,
  setTraineeSession: (session: TraineeSession | null) => void
) {
  setSession(session);
  setUser(session?.user ?? null);

  if (session?.user) {
    const isTrainee = session.user.user_metadata?.is_trainee === true;

    if (isTrainee) {
      const traineeId = session.user.user_metadata.trainee_id;
      setTraineeId(traineeId);
      setUserType('trainee');

      const traineeSession: TraineeSession = {
        trainee_id: traineeId,
        trainee_name: session.user.user_metadata.full_name || '',
        trainer_id: session.user.user_metadata.trainer_id || '',
        phone: session.user.user_metadata.phone || '',
      };
      setTraineeSession(traineeSession);
      setSecureSession(TRAINEE_SESSION_KEY, traineeSession, { expiryHours: 24 });
    } else {
      setUserType('trainer');
      setTraineeId(null);
      setTraineeSession(null);
      removeSecureSession(TRAINEE_SESSION_KEY);
    }
  } else {
    setUserType(null);
    setTraineeId(null);
    setTraineeSession(null);
    removeSecureSession(TRAINEE_SESSION_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'trainer' | 'trainee' | null>(null);
  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [traineeSession, setTraineeSession] = useState<TraineeSession | null>(null);

  // Try to restore trainee session from secure storage
  useEffect(() => {
    const storedSession = getSecureSession<TraineeSession>(
      TRAINEE_SESSION_KEY,
      null,
      { useSessionStorage: false }
    );
    if (storedSession && !user) {
      setTraineeSession(storedSession);
      setTraineeId(storedSession.trainee_id);
      setUserType('trainee');
    }
  }, [user]);

  useEffect(() => {
    console.log('[AuthContext] Starting session check...');
    
    // Set a timeout to prevent infinite loading if Supabase connection fails
    // Reduced to 5 seconds for faster response on TV
    const loadingTimeout = setTimeout(() => {
      console.warn('[AuthContext] Session check timed out after 5 seconds, showing login screen');
      setLoading(false);
    }, 5000); // 5 second timeout for TV

    // Try to get session with error handling
    const sessionPromise = supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(loadingTimeout);
        
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] Session check completed, user:', session?.user?.email || 'none');
        
        hydrateAuthFromSession(
          session,
          setUser,
          setSession,
          setUserType,
          setTraineeId,
          setTraineeSession
        );
        
        // Set Sentry user context
        if (session?.user) {
          setUserContext(session.user.id, session.user.email, {
            userType: session.user.user_metadata?.is_trainee ? 'trainee' : 'trainer',
          });
          setTag('user_type', session.user.user_metadata?.is_trainee ? 'trainee' : 'trainer');
        } else {
          clearUserContext();
        }
        
        setLoading(false);
      })
      .catch((error) => {
        clearTimeout(loadingTimeout);
        console.error('[AuthContext] Failed to get session:', error);
        setLoading(false);
      });
    
    // Also set a fallback timeout in case the promise never resolves
    const fallbackTimeout = setTimeout(() => {
      console.warn('[AuthContext] Fallback timeout - forcing loading to false');
      setLoading(false);
    }, 6000);
    
    // Set up auth state change listener - MUST be before return statement!
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(loadingTimeout);
      clearTimeout(fallbackTimeout);
      
      hydrateAuthFromSession(
        session,
        setUser,
        setSession,
        setUserType,
        setTraineeId,
        setTraineeSession
      );
      
      // Update Sentry user context
      if (session?.user) {
        setUserContext(session.user.id, session.user.email, {
          userType: session.user.user_metadata?.is_trainee ? 'trainee' : 'trainer',
        });
        setTag('user_type', session.user.user_metadata?.is_trainee ? 'trainee' : 'trainer');
      } else {
        clearUserContext();
      }
      
      setLoading(false);
    });

    // Cleanup function - must unsubscribe and clear all timeouts
    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInTrainer(email, password);
    return { error: result.error ? { message: result.error } : null };
  }, []);

  const signInTrainee = useCallback(async (phone: string, password: string) => {
    const result = await apiSignInTrainee(phone, password);
    
    if (result.error) {
      return { error: { message: result.error } };
    }

    if (result.data) {
      await supabase.auth.setSession({
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      });

      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession) {
        hydrateAuthFromSession(
          newSession,
          setUser,
          setSession,
          setUserType,
          setTraineeId,
          setTraineeSession
        );
      }
    }

    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const result = await signUpTrainer(email, password, fullName);
    return { error: result.error ? { message: result.error } : null };
  }, []);

  const signOut = useCallback(async () => {
    // Clear Sentry user context on logout
    clearUserContext();
    
    await apiSignOut();
    await supabase.auth.signOut();

    // Clear trainee session data
    removeSecureSession(TRAINEE_SESSION_KEY);
    setTraineeSession(null);
    setTraineeId(null);

    // Clear auth state
    setUser(null);
    setSession(null);
    setUserType(null);
  }, []);

  const isAuthenticated = user !== null || traineeSession !== null;

  /** Build a minimal User-like object when we have traineeSession but no Supabase user (e.g. restored from storage) */
  const resolvedUser = useMemo((): User | null => {
    if (!isAuthenticated) return null;
    if (user) return user;
    if (traineeSession) {
      return {
        id: traineeSession.trainee_id,
        user_metadata: {
          is_trainee: true,
          trainee_id: traineeSession.trainee_id,
          full_name: traineeSession.trainee_name,
          trainer_id: traineeSession.trainer_id,
          phone: traineeSession.phone,
        },
      } as User;
    }
    return null;
  }, [isAuthenticated, user, traineeSession]);

  const getCurrentUserId = useCallback(() => {
    return user?.id ?? traineeSession?.trainee_id ?? null;
  }, [user, traineeSession]);

  const contextValue = useMemo(() => ({
    user: resolvedUser,
    session,
    loading,
    userType,
    traineeId,
    traineeSession,
    getCurrentUserId,
    signIn,
    signInTrainee,
    signUp,
    signOut,
  }), [resolvedUser, session, loading, userType, traineeId, traineeSession, getCurrentUserId, signIn, signInTrainee, signUp, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
